---
sidebar_position: 2
---

# Known issues

We are aware of the following issues in the current release candidate, and we're working on fixing them.

## Gameplay

* Hovering over another player shows "Player #0" instead of their name. Overhead name is correct.
* After spawning, the player character's body may not match their head.
* The player character's voice may not match their race or sex.
* Weather is not decided by the server, so it can change abruptly, for example when you move between a city and the open world.
* Items with custom enchantments cannot be dropped yet.
* Physics and ragdolls of items and of NPC and player bodies make their positions go out of sync.
* Not everything about a player is saved yet: name, race, class, birthsign and faction membership are lost.
* The sitting animation is shown in the wrong state.
* Using the `Rebirth` console command after dying lowers your Speed attribute by 20.
* NPCs cannot be pickpocketed.
* Loot on killed NPCs is rolled again after a server restart, instead of staying the same.
* Fire-shooting turrets in the Oblivion realm crash the game.
* After using the `Rebirth` command a player may become invisible to others.

## SDK

* Position of dropped items is not synchronized. Dragging them around will not be seen by other players, but they will disappear for everyone when picked up.
* Small changes to replicated decimal values are dropped. A write that changes a `float` or `double` by 0.1 or less, or moves a vector by 0.1 or less, is not stored or sent. The same threshold applies to values marked `[Quantize]` or `[HalfPrecision]`. More robust controls over this are coming.
* Some attributes are ignored without an error: a second `[Index]` on one shape, `[Tag]` on a mixin, and `[Extends]` on an archetype. Diagnostics for these are coming.

## Missing features

These are planned for a patch soon after release:

* **No way to remove a key binding.** Once registered, a binding stays. See [Input and key bindings](Modding/Game/input.md).
* **No broadcast send.** A server message goes to one player at a time; to reach everyone, loop over the players. See [RPC](Modding/Concepts/rpc.md).
* **No way to react to entities arriving on the client.** Create handlers on the client do not run for entities the server sends. See [Entities and queries](Modding/Concepts/entities-and-queries.md).
