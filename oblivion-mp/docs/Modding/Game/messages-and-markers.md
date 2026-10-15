---
sidebar_position: 10
---

# On-screen messages and markers

Two client services put text in front of the player. [`IUserInterface`](../../../api-reference/OblivionMp.Sdk/OblivionMp.Sdk.IUserInterface.md)
drives the game's own message widgets, so what you show looks like the rest of Oblivion's UI.
[`IMarkers`](../../../api-reference/OblivionMp.Sdk/OblivionMp.Sdk.IMarkers.md) floats a line of text over another
player's character. Both only change what this one player sees. To show something to everyone, send an
[RPC](../Concepts/rpc.md) and have each client show it, as the Arena mod does:

```csharp title="MyMod.Common/RpcContracts.cs"
using ReadyM.Api.Multiplayer;
using ReadyM.SDK.Attributes;

namespace MyMod.Common;

[RpcContracts]
public static partial class RpcContracts
{
    [ServerToClient] public static partial void WaitingForPlayers(int ready, int total);
    [ServerToClient] public static partial void Countdown(int secondsLeft);
    [ServerToClient] public static partial void FightStarted();
}
```

```csharp title="MyMod.Client/RpcHandlers.cs"
using MyMod.Common;
using OblivionMp.Sdk;
using OblivionMpCSharpMod;
using ReadyM.SDK.Attributes;

namespace MyMod.Client;

[RpcHandlersFor(typeof(RpcContracts))]
public sealed partial class RpcHandlers(IUserInterface ui)
{
    // Stays up until it is hidden or replaced.
    partial void OnWaitingForPlayers(int ready, int total)
        => ui.ShowInfoMessage($"{ready} of {total} players ready");

    // Shown for two seconds, in the middle of the screen.
    partial void OnCountdown(int secondsLeft)
        => ui.ShowMessage($"Fight starts in {secondsLeft} second(s)!", MessagePosition.Center, 2);

    partial void OnFightStarted()
    {
        ui.HideInfoMessage();
        ui.ShowMessage("Fight started!", MessagePosition.Center, 5);
    }
}
```

## Messages

| Method | What it shows |
|---|---|
| `ShowMessage(message, position, duration)` | A short notification that goes away on its own. `position` is a [`MessagePosition`](../../../api-reference/OblivionMpCSharpMod/OblivionMpCSharpMod.MessagePosition.md), `Center` (the default) or `TopLeft`. `duration` is in seconds, 3 by default. |
| `ShowInfoMessage(message)` | A line that stays on screen until `HideInfoMessage()`. There is one: showing another replaces it. |
| `ShowGameMessage(mainText, secondText, thirdText)` | Up to three lines that stay until `HideGameMessage()`. The second and third are optional. |
| `IsCharacterCreatorOpen()` | Not a message: whether the character creator, class or birthsign menu is open. |

`MessagePosition` lives in the `OblivionMpCSharpMod` namespace, so add `using OblivionMpCSharpMod;` to use it.

Use `ShowMessage` for something that happened, and the info or game message for a state that lasts, such as
"waiting for players". Nothing hides those two for you.

For a line the player can scroll back to, the optional chat mod shows local lines in its chat log, in any color
you give as a [`Color`](../../../api-reference/OblivionMpCSharpMod.Values/OblivionMpCSharpMod.Values.Color.md)
(`OblivionMpCSharpMod.Values`, red, green, blue and alpha from 0 to 1). See [Chat](../Optional-mods/chat.md).

## Markers

A marker is a line of text above another player's head, in a color of your choice. This service keeps a nameplate
over every other player in your area, a smaller version of the `OblivionMp.MarkerMod` example:

```csharp title="MyMod.Client/Nameplates.cs"
using OblivionMp.Sdk;
using OblivionMp.Sdk.Common.Archetypes.Mixins;
using OblivionMp.Sdk.Values;
using ReadyM.Api.Idents;
using ReadyM.SDK.Archetypes.Core;
using ReadyM.SDK.Attributes;
using ReadyM.SDK.Client.Entities;

namespace MyMod.Client;

[Service]
public sealed partial class Nameplates(IEntities entities, IPlayers players, IMarkers markers)
{
    private static readonly MarkerColor Blue = new(0.4f, 0.7f, 1f);

    private readonly Dictionary<PlayerId, MarkerHandle> _markers = [];
    private readonly HashSet<PlayerId> _seen = [];
    private readonly List<PlayerId> _gone = [];

    private void Update()
    {
        _seen.Clear();
        var me = players.LocalPlayer?.PlayerId;

        foreach (var character in players.AreaPlayers)
        {
            var id = character.PlayerId;
            if (id == me)
                continue;

            _seen.Add(id);
            if (_markers.ContainsKey(id) || !entities.TryLookup(id, out Player player))
                continue;

            // None while the character is not in the world yet. Try again next frame.
            var handle = markers.CreateMarker(character, player.Nickname.ToString(), Blue);
            if (!handle.IsNone)
                _markers[id] = handle;
        }

        // Players who left the area take their marker with them.
        _gone.Clear();
        foreach (var id in _markers.Keys)
            if (!_seen.Contains(id))
                _gone.Add(id);

        foreach (var id in _gone)
        {
            markers.DestroyMarker(_markers[id]);
            _markers.Remove(id);
        }
    }
}
```

| Method | What it does |
|---|---|
| `CreateMarker(target, text, color)` | Puts a marker over a [`MainCharacter`](../../../api-reference/OblivionMp.Sdk.Common.Archetypes/OblivionMp.Sdk.Common.Archetypes.MainCharacter.md) and returns its [`MarkerHandle`](../../../api-reference/OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md). |
| `SetMarkerText(handle, text, color)` | Changes the text and color. |
| `SetMarkerVisible(handle, visible)` | Hides or shows it, keeping it. |
| `SetMarkerOpacity(handle, opacity)` | From 0 (invisible) to 1 (solid). |
| `DestroyMarker(handle)` | Removes it. |

A [`MarkerColor`](../../../api-reference/OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerColor.md) is red, green,
blue and an optional alpha, each from 0 to 1: `new MarkerColor(1f, 0f, 0f)` is red, and `MarkerColor.White` is
there for the common case. `Color` and `MarkerColor` are separate types for now, with the same meaning.

### Keeping markers right

- `CreateMarker` returns `MarkerHandle.None` when the character is not in the world yet. No marker was made, so
  try again later. Every other method does nothing for `None`, or for a marker already removed, so you need no
  checks before calling them.
- A marker belongs to the character it was created on. When that player leaves your area, or their character is
  replaced, the marker goes with it: forget the handle and create a new one when they are back.
- Keep handles in a dictionary keyed by `PlayerId`, as above, and remove the ones of players you no longer see.

`OblivionMp.MarkerMod` goes further: it notices when a player's character is replaced, and fades the marker as
the player sneaks out of sight. It does that with two client values on every `MainCharacter`, `Pawn` from
[`MappedActor`](../../../api-reference/OblivionMp.Sdk.Archetypes.Mixins/OblivionMp.Sdk.Archetypes.Mixins.MappedActor.md),
which changes when the character is replaced, and `Hidden` from
[`LocalVisibility`](../../../api-reference/OblivionMp.Sdk.Archetypes.Mixins/OblivionMp.Sdk.Archetypes.Mixins.LocalVisibility.md),
from 0 for a player in plain sight to 1 for an invisible one. See
[Players and characters](players-and-characters.md).

## Reference

- [`IUserInterface`](../../../api-reference/OblivionMp.Sdk/OblivionMp.Sdk.IUserInterface.md)
- [`MessagePosition`](../../../api-reference/OblivionMpCSharpMod/OblivionMpCSharpMod.MessagePosition.md)
- [`Color`](../../../api-reference/OblivionMpCSharpMod.Values/OblivionMpCSharpMod.Values.Color.md)
- [`IMarkers`](../../../api-reference/OblivionMp.Sdk/OblivionMp.Sdk.IMarkers.md)
- [`MarkerHandle`](../../../api-reference/OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md)
- [`MarkerColor`](../../../api-reference/OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerColor.md)
- [`MainCharacter`](../../../api-reference/OblivionMp.Sdk.Common.Archetypes/OblivionMp.Sdk.Common.Archetypes.MainCharacter.md)
