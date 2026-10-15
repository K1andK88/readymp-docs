---
sidebar_position: 9
---

# Input and key bindings

A key binding runs your code when the player presses a key, alone or with Ctrl, Alt or Shift held. Bindings live on
the client, through [`IInput`](../../../api-reference/OblivionMp.Sdk/OblivionMp.Sdk.IInput.md): ask for it in the
constructor of a service or of your mod entry, and register your keys once when the mod starts.

This is the mod template's `WalletKeys.cs`. Each key sends a message to the server through the template's
`RpcHandlers` (see [RPC](../Concepts/rpc.md)):

```csharp title="MyMod.Client/WalletKeys.cs"
using OblivionMp.Sdk;
using ReadyM.SDK.Attributes;
using ReadyM.Sdk.Common.Input;

namespace MyMod.Client;

// A service: the SDK creates one, hands it what its constructor asks for, and calls Start once
// every mod has loaded.
[Service]
public sealed partial class WalletKeys(IInput input, RpcHandlers rpc)
{
    private void Start()
    {
        input.RegisterKeyBind(ModifierKeys.Alt, Key.N, () => rpc.SendAddWalletBalance());
        input.RegisterKeyBind(ModifierKeys.Alt, Key.B, () => rpc.SendGetWalletBalance());
        input.RegisterKeyBind(ModifierKeys.Alt, Key.P, () => rpc.SendPing("Hello!"));
    }
}
```

## How it works

`RegisterKeyBind` takes the key, what to run, and optionally the modifier keys and where the press comes from:

```csharp
void RegisterKeyBind(Key key, Action action, KeySource source = KeySource.Polled);
void RegisterKeyBind(ModifierKeys modifiers, Key key, Action action, KeySource source = KeySource.Polled);
```

- [`Key`](../../../api-reference/ReadyM.Sdk.Common.Input/ReadyM.Sdk.Common.Input.Key.md) names keys in capitals:
  `Key.A` to `Key.Z`, `Key.ZERO` to `Key.NINE`, `Key.F1` to `Key.F24`, `Key.NUM_ZERO` to `Key.NUM_NINE`,
  `Key.SPACE`, `Key.RETURN`, `Key.ESCAPE`, `Key.TAB` and so on.
- [`ModifierKeys`](../../../api-reference/ReadyM.Sdk.Common.Input/ReadyM.Sdk.Common.Input.ModifierKeys.md) is `None`,
  `Alt`, `Control` or `Shift`. Combine them with `|`: `ModifierKeys.Control | ModifierKeys.Shift`.
- Your action runs at the same point in the frame as a service's `Update`, so it can read and change entities
  directly.
- A binding lasts as long as your mod is loaded. There is no call to remove one, so check inside the action
  whether it should do anything right now.

You can also register keys from your mod entry's `Init`, as the Arena mod does for its debug keys:

```csharp title="MyMod.Client/Mod.cs"
using Microsoft.Extensions.Logging;
using OblivionMp.Sdk;
using ReadyM.SDK.Attributes;
using ReadyM.Sdk.Common.Input;

namespace MyMod.Client;

[ModEntry]
public sealed partial class Mod(IInput input, IPlayers players, ILogger logger)
{
    private void Init()
    {
        input.RegisterKeyBind(Key.NUM_TWO, () =>
        {
            if (players.LocalMainCharacter is { } me)
                logger.LogInformation("You are at {Position}.", me.Position);
        });
    }
}
```

### Polled or only when the UI did not want it

The last parameter, [`KeySource`](../../../api-reference/ReadyM.Sdk.Common.Input/ReadyM.Sdk.Common.Input.KeySource.md),
decides which presses reach your binding:

| `KeySource` | Fires | The press also reaches the game |
|---|---|---|
| `Polled` (the default) | Whenever the key is pressed, whatever else is going on, including while the player types into a text field. | Yes |
| `UnhandledByUi` | Only when nothing in the game's UI took the press. | No, it stops at your binding. |

Use `UnhandledByUi` for a key that opens something. The chat mod opens its entry line on K this way, so the K is
not also typed into the line it opened, and pressing K while typing a message types a K instead of reopening
chat:

```csharp
input.RegisterKeyBind(Key.K, Open, KeySource.UnhandledByUi);
```

With a `Polled` binding, ask `CanApplyInput()` when the key should do nothing while the player is typing. It is
`false` while a text field or menu has the keyboard:

```csharp
input.RegisterKeyBind(Key.NUM_FIVE, () =>
{
    if (input.CanApplyInput())
        ShowScores();
});
```

### Picking a key

The game already uses many keys, and a `Polled` binding does not stop the game from seeing the press:

- **Letters are the game's controls.** Ctrl makes the character sneak and Shift makes it run, so Ctrl or Shift with
  a letter moves the character before your binding does anything.
- **The number row** holds the game's hotkeys.
- **F5** is quicksave in the game, which OblivionMP blocks. **F7** is taken by the game.
- **Ctrl+Shift+F5** is taken by the SDK: it reloads every web page (see [Web UI](web-ui.md)).
- Alt with a letter and the numpad are the safe choices. The template uses Alt with letters, and Arena uses the
  numpad for its debug keys.

## Reference

- [`IInput`](../../../api-reference/OblivionMp.Sdk/OblivionMp.Sdk.IInput.md)
- [`Key`](../../../api-reference/ReadyM.Sdk.Common.Input/ReadyM.Sdk.Common.Input.Key.md)
- [`ModifierKeys`](../../../api-reference/ReadyM.Sdk.Common.Input/ReadyM.Sdk.Common.Input.ModifierKeys.md)
- [`KeySource`](../../../api-reference/ReadyM.Sdk.Common.Input/ReadyM.Sdk.Common.Input.KeySource.md)
