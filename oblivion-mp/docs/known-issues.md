---
sidebar_position: 2
---

# Known issues

We are aware of the following issues in the current release of the SDK:

* Position of dropped items is not synchronized. Dragging them around will not be seen by other players, but they will disappear for everyone when picked up.
* Small changes to replicated decimal values are dropped. A write that changes a `float` or `double` by 0.1 or less, or moves a vector by 0.1 or less, is not stored or sent. The same threshold applies to values marked `[Quantize]` or `[HalfPrecision]`. More robust controls over this are coming.
* Some attributes are ignored without an error: a second `[Index]` on one shape, `[Tag]` on a mixin, and `[Extends]` on an archetype. Diagnostics for these are coming.

## Missing features

These are planned for a patch soon after release:

* **No mouse in web UI.** A page can take the keyboard, but not the mouse. See [Web UI](Modding/Game/web-ui.md).
* **No way to remove a key binding.** Once registered, a binding stays. See [Input and key bindings](Modding/Game/input.md).
* **No broadcast send.** A server message goes to one player at a time; to reach everyone, loop over the players. See [RPC](Modding/Concepts/rpc.md).
* **No way to react to entities arriving on the client.** Create handlers on the client do not run for entities the server sends. See [Entities and queries](Modding/Concepts/entities-and-queries.md).
