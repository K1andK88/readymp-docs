# Enum Propagation

Namespace: [ReadyM.SDK.Attributes](../ReadyM.SDK.Attributes/ReadyM.SDK.Attributes.md)  
Assembly: ReadyM.SDK.dll  

Which way a shape's values may travel between the game and the ECS, and who may write them.

```csharp
public enum Propagation
```

## Fields

`ToEcsOnly = 0` 

The game owns it. It is read into the ECS and replicated, and nothing writes it back.



`ToGameOnly = 1` 

The ECS owns it. It is shown to the game, and the game is never read for it.



`Both = 2` 

Both ways, and anyone may set or override it.



`ServerAuthoritative = 3` 

Only the server sets it. A client reads it and applies it to the game state.

Use it for server-side configuration replicated to players, or data that cannot be trusted to be sent by the clients (e.g. for cheating prevention).

`OwnershipBased = 4` 

Only whoever owns the entity may report or override it. The rest read it.




