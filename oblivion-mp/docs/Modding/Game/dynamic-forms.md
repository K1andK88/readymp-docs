---
sidebar_position: 8
---

# Dynamic forms

A potion a player brews, or a spell they make, is created by the game while it runs. It exists only in that
player's game, and every other game has never heard of it. The SDK fixes that for you: each potion and spell a
player carries becomes an entity every client and the server can see, and every other client makes its own copy of
it in its game. Your mod reads these entities to find out what a player made.

```csharp title="MyMod.Client/PotionList.cs"
using Microsoft.Extensions.Logging;
using OblivionMp.Sdk;
using OblivionMp.Sdk.Common.Archetypes;
using ReadyM.SDK.Attributes;
using ReadyM.SDK.Client.Entities;
using ReadyM.Sdk.Common.Input;

namespace MyMod.Client;

// Alt+L writes every player-made potion in the session to the log.
[Service]
public sealed partial class PotionList(IEntities entities, IInput input, ILogger logger)
{
    private void Start()
        => input.RegisterKeyBind(ModifierKeys.Alt, Key.L, ListPotions);

    private void ListPotions()
    {
        foreach (var potion in entities.Query<AlchemyForm>())
        {
            logger.LogInformation("{Name}: {Value} gold, {Weight} weight, {Count} effect(s)",
                potion.Name.ToString(), potion.Value, potion.Weight, potion.EffectsCount);

            for (var i = 0; i < potion.EffectsCount; i++)
            {
                var effect = potion.GetEffects(i);
                logger.LogInformation("  effect {Code:X8}: magnitude {Magnitude}, {Duration} s, {Range}",
                    effect.EffectCode, effect.Magnitude, effect.Duration, effect.Range);
            }
        }
    }
}
```

## How it works

There are two shapes, one per kind of form. Both are shared, so the same code works on the server.

| Shape | Values | Effects |
|---|---|---|
| [`AlchemyForm`](../../../api-reference/OblivionMp.Sdk.Common.Archetypes/OblivionMp.Sdk.Common.Archetypes.AlchemyForm.md), a potion | `Name`, `Value` (gold), `Weight`, `ModelPath` (the 3D model, in the inventory and on the ground), `Flags` (the game's flags, as a raw byte) | `EffectsCount`, `GetEffects()`, `GetEffects(index)` |
| [`SpellForm`](../../../api-reference/OblivionMp.Sdk.Common.Archetypes/OblivionMp.Sdk.Common.Archetypes.SpellForm.md), a spell | `MagickaCost`, `SpellType` ([`SpellType`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.SpellType.md): `Spell`, `Power`, `Ability`, ...), `Flags` | `EffectsCount`, `GetEffects()`, `GetEffects(index)` |

Each effect is a [`MagicEffectEntry`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.MagicEffectEntry.md):

| Field | Meaning |
|---|---|
| `EffectCode` | Which magic effect it is. |
| `Magnitude` | How strong it is. |
| `Area` | Its area, 0 for none. |
| `Duration` | How long it lasts, in seconds. |
| `Range` | [`MagicEffectRange`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.MagicEffectRange.md): `Self`, `Touch` or `Target`. |
| `ActorValueOrOther` | The attribute or skill the effect works on, for effects that name one. |

How a form travels:

1. A player brews a potion or makes a spell. As soon as it is on their character, their client creates the form
   entity and fills it in. That player owns it.
2. Every other client receives it and creates the same potion or spell in its own game. Each game gives it a
   different form id of its own, and the SDK keeps track of which is which.
3. The entity stays for the rest of the session, even when nobody carries the item any more.

Treat the values as read-only. A game makes its copy once, from the values it has at that moment, so changing them
later would not reach games that already made theirs.

In an inventory, an item made from one of these forms is named by a
[`NetworkFormId`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.NetworkFormId.md)
whose `FormId` is 0, because it has no id from the game files. See
[Items and inventories](items-and-inventories.md).

:::note
Not in 1.0 yet: going from such a `NetworkFormId` to the `AlchemyForm` or `SpellForm` it names, and creating a
potion or spell from a mod.
:::

## Related diagnostics

| Id | What it means | How to fix it |
|---|---|---|
| `READYM017` | A client mod sets a value of a form, such as `potion.Name`. | Read forms only. The player's game fills them in. |
| `READYM019` | A client mod changes a form's effects, such as with `AddEffects`. | The same: read them only. |

## Reference

- [`AlchemyForm`](../../../api-reference/OblivionMp.Sdk.Common.Archetypes/OblivionMp.Sdk.Common.Archetypes.AlchemyForm.md)
- [`SpellForm`](../../../api-reference/OblivionMp.Sdk.Common.Archetypes/OblivionMp.Sdk.Common.Archetypes.SpellForm.md)
- [`MagicEffectEntry`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.MagicEffectEntry.md)
- [`MagicEffectRange`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.MagicEffectRange.md)
- [`SpellType`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.SpellType.md)
- [`NetworkFormId`](../../../api-reference/ReadyM.Relay.Common.Oblivion.ECS.Values/ReadyM.Relay.Common.Oblivion.ECS.Values.NetworkFormId.md)
