---
sidebar_position: 4
---

# Replication and authority

Replication keeps a value in sync for every player: you change it in one place and the others see the change.
Authority decides who may make that change, so a client cannot hand itself gold or overwrite another player's
health. Both are declared on the [shape](shapes.md) that holds the value.

```csharp title="MyMod.Common/Wallet.cs"
using ReadyM.SDK.Archetypes.Core;
using ReadyM.SDK.Attributes;

namespace MyMod.Common;

[ArchetypeMixin]
[Extends(typeof(Player))]
[Replicated]
[Propagates(Propagation.ServerAuthoritative)]
public readonly partial struct Wallet
{
    public partial int Balance { get; set; }
}
```

`[Replicated]` sends `Balance` to the players. `ServerAuthoritative` means only the server writes it:

```csharp
// On the server, in an RPC handler: credit the player who asked.
if (entities.TryLookup(context.Sender, out Player player))
    player.Balance += 100;
```

```csharp
// On any client: read it. On the client, Balance has no setter.
if (players.LocalPlayer is { } me)
    logger.LogInformation("You have {Balance} gold.", me.Balance);
```

## How it works

### What replicates

| Shape | How it asks to replicate | What travels |
| --- | --- | --- |
| Archetype | `[Archetype(replicated: true)]` | The entity itself (other players learn it exists, and who owns it) and the archetype's own fields. |
| Mixin | `[Replicated]` | The mixin's fields, on every replicated entity that includes it or that it extends. |

A mixin without `[Replicated]` stays local even on a replicated entity: each half keeps its own copy, and nothing is
sent. A `[Replicated]` mixin on an archetype declared `replicated: false` is not sent either, because the entity
itself is local.

An archetype says whether it replicates in `[Archetype]`; putting `[Replicated]` on it is an error (`READYM036`). A
replicated archetype with no fields of its own is fine: its entities still travel, carrying their mixins.

A replicated entity reaches the players who can see where it is. [Scopes](scopes.md) explains who that is.

### Delivery

How a shape's changes travel:

| `Delivery` | Meaning | Use it for |
| --- | --- | --- |
| `Reliable` (default) | Guaranteed to arrive, in the order it was sent. | Almost everything: balances, flags, states. |
| `Unreliable` | Sent once and never resent. | A value written so often that the next write corrects a lost one, such as a position. |

Set it on a mixin with `[Replicated(Delivery.Unreliable)]`, and for an archetype's own fields with
`[Archetype(replicated: true, Delivery = Delivery.Unreliable)]`.

### Who may write: `[Propagates]`

Every replicated shape with fields of its own says who may write them, with `[Propagates(Propagation.X)]`. Without
it the build stops (`READYM014`). A shape that does not replicate must not say it (`READYM016`).

Propagation talks about two copies of a value: **the game's** (the actual health of the actor in Oblivion) and **the
SDK's** (the value on the entity that your mod reads and that replicates). It decides which way values may travel
between the two, and who may change the SDK's copy. In the value names, "ECS" means the SDK's copy.

| `Propagation` | Who may write | Which way values travel | Example |
| --- | --- | --- | --- |
| `ToEcsOnly` | The game. A client cannot override it; the server can still write it. | Read from the game into the SDK and replicated; never written back to the game. | A flag read from the game, such as whether an enemy is a boss. |
| `ToGameOnly` | Your mod, on the server or with `Override` on a client. | From the SDK to the game; the game is never read for it. | A value your mod decides and the game only shows. |
| `Both` | Anyone. | Both ways. | Data you want anyone to be able to set. |
| `ServerAuthoritative` | Only the server. | From the server to the clients; the client that owns the entity applies it to its game. | The template's `Wallet`; rule flags that forbid certain abilities; anything you cannot trust a client to send. |
| `OwnershipBased` | Whoever owns the entity. The rest read it. | The owner's game reports it; everyone else's game shows it. | A player's health and inventory. Use it in mods that trust their clients. |

For a value only your mod uses, with no counterpart in the game, the direction does not matter: choose by who may
write. `ServerAuthoritative` for anything the server decides, `OwnershipBased` for what each player reports about
their own character.

### Who owns an entity

Ownership is what `OwnershipBased` checks, and it also limits every client write:

* Each player owns their own `MainCharacter`.
* An entity a client creates is that client's.
* An entity the server creates is the server's, unless it names an owner: `entities.Create<T>(scope, owner)` (see
  [Entities and queries](entities-and-queries.md)).
* For some of the SDK's shapes, such as NPCs and items on the ground, ownership moves between players as they come
  and go. Your own archetypes choose this with [tags](shapes.md#tags). Without one, an entity a player owns is deleted
  when that player leaves its area or cell.

:::important
A client sends its changes only for entities it owns, and the server drops a change to a `ServerAuthoritative` value
from any client. So whatever the propagation says, a client's change to an entity it does not own stays on that
client. When a client needs to change something it does not own, it asks the server with an [RPC](rpc.md), as the
template's wallet does.
:::

### Lists and dictionaries

A replicated shape can hold a list, `NativeList<T>` from `Yooni.Native.Container`, where `T` is a plain struct or a
number (a dictionary, `NativeDictionary`, works the same way). Declare it `private`; the SDK generates the members you
use instead:

```csharp title="MyMod.Common/Achievements.cs"
using ReadyM.SDK.Archetypes.Core;
using ReadyM.SDK.Attributes;
using Yooni.Native.Container;

namespace MyMod.Common;

[ArchetypeMixin]
[Extends(typeof(Player))]
[Replicated]
[Propagates(Propagation.ServerAuthoritative)]
public readonly partial struct Achievements
{
    private partial NativeList<int> Unlocked { get; set; }
}
```

For a list called `Unlocked` you get `UnlockedCount`, `GetUnlocked(index)`, `SetUnlocked(index, value)`,
`ContainsUnlocked(value)`, `AddUnlocked(value)`, `InsertUnlocked(index, value)`, `RemoveAtUnlocked(index)` and
`ClearUnlocked()`, on the mixin and on every player: `player.AddUnlocked(7)`. A dictionary gets the same family keyed by its key, plus `ContainsXKey`. A public collection is an
error (`READYM011`): a caller holding the list itself could change it without the change being sent. A collection on a
shape that does not replicate is an error too (`READYM018`).

### Small changes to decimals

:::warning
On a replicated shape, writing a `float` or `double` that differs from the current value by 0.1 or less changes
nothing, and a vector moved by 0.1 or less stays where it was. This keeps tiny jitters off the network. For a value
that moves in finer steps, such as a 0 to 1 progress bar, store it scaled as a whole number (0 to 100).
:::

### Wire precision

By default a `float` costs 4 bytes on the wire and a `Vector3` 12. For values that change often, you can trade
precision for size with these attributes from `ReadyM.Api.Multiplayer.Generators`, on a property of a replicated
shape:

| Attribute | On | What it does |
| --- | --- | --- |
| `[Quantize(min, max, bits)]` | `float`, vectors | Sends each number as a whole number of 8, 16 or 24 bits between `min` and `max`. Values outside the range are clamped, so pick a range the value can never leave. The smallest step is `(max - min) / (2^bits - 2)`. |
| `[QuantizeAngle(bits)]` | `float` in degrees | Sends an angle in 8 bits (about 1.4 degree steps) or 16 bits (about 0.0055 degree steps). The angle wraps: 190 arrives as -170, always in [-180, 180). |
| `[HalfPrecision]` | `float`, vectors | Sends 16-bit floats: about three significant digits, up to 65504. Good for speeds and rates; not for world positions, which lose whole units far from the origin. |
| `[Interned]` | `NativeString256`, or a `NativeList` of them | Sends text as a small number once the server has seen that text. Good for names that repeat. |

```csharp title="MyMod.Common/Pose.cs"
using System.Numerics;
using ReadyM.Api.Multiplayer.Generators;
using ReadyM.SDK.Attributes;

namespace MyMod.Common;

[ArchetypeMixin]
[Replicated(Delivery.Unreliable)]
[Propagates(Propagation.OwnershipBased)]
public readonly partial struct Pose
{
    [Quantize(-1048576f, 1048576f, 24)] public partial Vector3 Position { get; set; }
    [QuantizeAngle(16)] public partial float Yaw { get; set; }
    [HalfPrecision] public partial float Speed { get; set; }
}
```

On a shape that does not replicate, these attributes would do nothing, so they are errors (`READYM038`,
`READYM040`).

## On the client

A client reads every replicated value it can see. Writing one is different, because the setter cannot say whether
the client is allowed to:

* Where a replicated value appears on another shape (an archetype that includes the mixin, or a shape the mixin
  extends), the client has no setter at all: `me.Balance` is read-only.
* Assigning it through the mixin's own property is an error, `READYM017`. The exceptions are a `[CreateHandler]`
  filling in a new entity (see [Entities and queries](entities-and-queries.md)) and a game-state mapping (see
  [Game state mapping](../Advanced/game-state-mapping.md)).

To change a replicated value from a client, override it with `Override`, from `ReadyM.SDK.Client`, passing the
value's [field token](shapes.md#what-every-shape-can-do):

```csharp title="MyMod.Common/Emote.cs"
using OblivionMp.Sdk.Common.Archetypes;
using ReadyM.SDK.Attributes;

namespace MyMod.Common;

// Each player sets their own emote, and everyone sees it as character.EmoteId.
[ArchetypeMixin]
[Extends(typeof(MainCharacter), "Emote")]
[Replicated]
[Propagates(Propagation.OwnershipBased)]
public readonly partial struct Emote
{
    public partial int Id { get; set; }
}
```

```csharp title="MyMod.Client/EmoteKeys.cs"
using MyMod.Common;
using OblivionMp.Sdk;
using ReadyM.SDK.Attributes;
using ReadyM.SDK.Client;
using ReadyM.Sdk.Common.Input;

namespace MyMod.Client;

[Service]
public sealed partial class EmoteKeys(IInput input, IPlayers players)
{
    private void Start()
    {
        input.RegisterKeyBind(ModifierKeys.Alt, Key.W, Wave);
    }

    private void Wave()
    {
        if (players.LocalMainCharacter is { } me)
            me.Override(Emote.Field.Id, 1);
    }
}
```

`Override` checks the propagation first. When this client may set the value, the value is claimed: it is applied to
the owner's game and replicated, and `Override` returns `true`. When it may not (a `ToEcsOnly` value, or an
`OwnershipBased` or `ServerAuthoritative` one on an entity this client does not own), nothing changes, the client log
gets a warning, and `Override` returns `false`. Even a successful override reaches other players only for an entity
this client owns, and never for a `ServerAuthoritative` value (see [Who owns an entity](#who-owns-an-entity)).

A replicated list or dictionary has no `Override`. On a client, change it only inside a game-state mapping; anywhere
else its `AddX`, `ClearX` and the other changing members are an error (`READYM019`). Most mods change collections on
the server.

## On the server

The server writes what it likes: it is the one deciding. Assign the property, or call `SetX(value)` for a field added
with `[Extends]` inside a `foreach` (see [Shapes](shapes.md#adding-fields-to-a-shape-you-do-not-own)). Its changes
reach every client that can see the entity. `Override` does not exist on the server.

## Mistakes the build catches

| Id | What it means | How to fix it |
| --- | --- | --- |
| `READYM009` | A `[Replicated]` mixin has no fields, so there is nothing to send. | Remove `[Replicated]`: the entity's existence already travels. Or give the mixin fields. |
| `READYM011` | A list or dictionary on a replicated shape is public. | Declare it `private` and use the generated `AddX`, `GetX` and the rest. |
| `READYM014` | A replicated shape with fields of its own does not say who may write them. | Add `[Propagates(Propagation.X)]`. |
| `READYM016` | `[Propagates]` is on a shape that sends nothing. | Remove it, or replicate the shape. |
| `READYM017` | Client code assigns a replicated value through its setter. | Use `shape.Override(Mixin.Field.X, value)`, write it on the server, or map it from the game (see [Game state mapping](../Advanced/game-state-mapping.md)). |
| `READYM018` | A list or dictionary is on a shape that does not replicate. | Replicate the shape, or keep the values somewhere else. |
| `READYM019` | Client code changes a replicated list or dictionary. | Change it on the server, or inside a game-state mapping. |
| `READYM036` | `[Replicated]` is on an archetype. | Remove it and use `[Archetype(replicated: true)]`. Set delivery with `[Archetype(replicated: true, Delivery = ...)]`. |
| `READYM038` | `[Interned]` is on a shape that does not replicate. | Remove it, or replicate the shape. |
| `READYM040` | `[Quantize]`, `[QuantizeAngle]` or `[HalfPrecision]` is on a shape that does not replicate. | Remove it, or replicate the shape. |

## Reference

* [ArchetypeAttribute](../../../api-reference/ReadyM.SDK.Attributes/ReadyM.SDK.Attributes.ArchetypeAttribute.md)
* [ReplicatedAttribute](../../../api-reference/ReadyM.SDK.Attributes/ReadyM.SDK.Attributes.ReplicatedAttribute.md)
* [Delivery](../../../api-reference/ReadyM.SDK.Attributes/ReadyM.SDK.Attributes.Delivery.md)
* [PropagatesAttribute](../../../api-reference/ReadyM.SDK.Attributes/ReadyM.SDK.Attributes.PropagatesAttribute.md)
* [Propagation](../../../api-reference/ReadyM.SDK.Attributes/ReadyM.SDK.Attributes.Propagation.md)
* [WriteExtensions](../../../api-reference/ReadyM.SDK.Client/ReadyM.SDK.Client.WriteExtensions.md)
* [Value&lt;TShape, TValue&gt;](../../../api-reference/ReadyM.SDK.Archetypes.Access/ReadyM.SDK.Archetypes.Access.Value-2.md),
  [Collection&lt;TShape, TAccess&gt;](../../../api-reference/ReadyM.SDK.Archetypes.Access/ReadyM.SDK.Archetypes.Access.Collection-2.md)
* [QuantizeAttribute](../../../api-reference/ReadyM.Api.Multiplayer.Generators/ReadyM.Api.Multiplayer.Generators.QuantizeAttribute.md)
* [QuantizeAngleAttribute](../../../api-reference/ReadyM.Api.Multiplayer.Generators/ReadyM.Api.Multiplayer.Generators.QuantizeAngleAttribute.md)
* [HalfPrecisionAttribute](../../../api-reference/ReadyM.Api.Multiplayer.Generators/ReadyM.Api.Multiplayer.Generators.HalfPrecisionAttribute.md)
* [InternedAttribute](../../../api-reference/ReadyM.Api.Multiplayer.Generators/ReadyM.Api.Multiplayer.Generators.InternedAttribute.md)
