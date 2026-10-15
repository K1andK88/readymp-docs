# Class ServerEventsApi

Namespace: [ReadyM.Relay.Server.Sdk.Events](../ReadyM.Relay.Server.Sdk.Events/ReadyM.Relay.Server.Sdk.Events.md)  
Assembly: ReadyM.Relay.Server.Sdk.dll  

Provides an API for subscribing to server events.

```csharp
public sealed class ServerEventsApi : IDisposable
```

#### Inheritance

[object](https://learn.microsoft.com/dotnet/api/system.object) ← 
[ServerEventsApi](../ReadyM.Relay.Server.Sdk.Events/ReadyM.Relay.Server.Sdk.Events.ServerEventsApi.md)

#### Implements

[IDisposable](https://learn.microsoft.com/dotnet/api/system.idisposable)

#### Inherited Members

[object.GetType\(\)](https://learn.microsoft.com/dotnet/api/system.object.gettype), 
[object.ToString\(\)](https://learn.microsoft.com/dotnet/api/system.object.tostring), 
[object.Equals\(object?\)](https://learn.microsoft.com/dotnet/api/system.object.equals\#system\-object\-equals\(system\-object\)), 
[object.Equals\(object?, object?\)](https://learn.microsoft.com/dotnet/api/system.object.equals\#system\-object\-equals\(system\-object\-system\-object\)), 
[object.ReferenceEquals\(object?, object?\)](https://learn.microsoft.com/dotnet/api/system.object.referenceequals), 
[object.GetHashCode\(\)](https://learn.microsoft.com/dotnet/api/system.object.gethashcode)

## Methods

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_Dispose"></a> Dispose\(\)

Stops receiving the server's events.

```csharp
public void Dispose()
```

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnAreaCreated"></a> OnAreaCreated

Fires when an area comes into use, as the first player enters it.

```csharp
public event Action<AreaId?, Entity>? OnAreaCreated
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-2)<AreaId?, [Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md)\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnAreaDeleted"></a> OnAreaDeleted

Fires when the last player has left an area, unless the server keeps it while empty.

```csharp
public event Action<AreaId?, Entity>? OnAreaDeleted
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-2)<AreaId?, [Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md)\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnCellCreated"></a> OnCellCreated

Fires when a cell comes into use, as the first player loads it.

```csharp
public event Action<AreaId?, CellId?, Entity>? OnCellCreated
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-3)<AreaId?, CellId?, [Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md)\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnCellDeleted"></a> OnCellDeleted

Fires when the last player has unloaded a cell, unless the server keeps it while empty.

```csharp
public event Action<AreaId?, CellId?, Entity>? OnCellDeleted
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-3)<AreaId?, CellId?, [Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md)\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnPlayerActivatedCell"></a> OnPlayerActivatedCell

Fires when any player loads a cell, the first one included.

```csharp
public event Action<PlayerId?, AreaId?, CellId?>? OnPlayerActivatedCell
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-3)<PlayerId?, AreaId?, CellId?\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnPlayerConnected"></a> OnPlayerConnected

Fires when a player has connected and their player entity exists.

```csharp
public event Action<PlayerId?, Entity>? OnPlayerConnected
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-2)<PlayerId?, [Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md)\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnPlayerDeactivatedCell"></a> OnPlayerDeactivatedCell

Fires when any player unloads a cell.

```csharp
public event Action<PlayerId?, AreaId?, CellId?>? OnPlayerDeactivatedCell
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-3)<PlayerId?, AreaId?, CellId?\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnPlayerDisconnected"></a> OnPlayerDisconnected

Fires when a player has left or dropped, after they left their area.

```csharp
public event Action<PlayerId?, Entity, DisconnectReason?>? OnPlayerDisconnected
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-3)<PlayerId?, [Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md), DisconnectReason?\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnPlayerJoinedArea"></a> OnPlayerJoinedArea

Fires when any player enters an area, the first one included.

```csharp
public event Action<PlayerId?, AreaId?>? OnPlayerJoinedArea
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-2)<PlayerId?, AreaId?\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnPlayerLeftArea"></a> OnPlayerLeftArea

Fires when any player leaves an area.

```csharp
public event Action<PlayerId?, AreaId?>? OnPlayerLeftArea
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-2)<PlayerId?, AreaId?\>?

### <a id="ReadyM_Relay_Server_Sdk_Events_ServerEventsApi_OnWorldEntityCreated"></a> OnWorldEntityCreated

Raised once, when the world entity exists. A mod's Init runs before that, so this is the earliest
point at which world components can be written.

```csharp
public event Action<Entity>? OnWorldEntityCreated
```

#### Event Type

 [Action](https://learn.microsoft.com/dotnet/api/system.action-1)<[Entity](../ReadyM.Relay.Server.Sdk.Ecs/ReadyM.Relay.Server.Sdk.Ecs.Entity.md)\>?


