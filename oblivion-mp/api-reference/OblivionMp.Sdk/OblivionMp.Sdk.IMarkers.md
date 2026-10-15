---
title: 'Interface IMarkers'
description: 'Markers over player characters: a line of text above their head, seen only by this player.'
---
# Interface IMarkers

Namespace: [OblivionMp.Sdk](../OblivionMp.Sdk/OblivionMp.Sdk.md)  
Assembly: OblivionMp.Sdk.dll  

Markers over player characters: a line of text above their head, seen only by this player.

```csharp
public interface IMarkers
```

## Methods

### <a id="OblivionMp_Sdk_IMarkers_CreateMarker_OblivionMp_Sdk_Common_Archetypes_MainCharacter_System_String_OblivionMp_Sdk_Values_MarkerColor_"></a> CreateMarker\(MainCharacter, string, MarkerColor\)

Creates a marker over <code class="paramref">target</code> showing <code class="paramref">text</code> in <code class="paramref">color</code>.

```csharp
MarkerHandle CreateMarker(MainCharacter target, string text, MarkerColor color)
```

#### Parameters

`target` MainCharacter

`text` [string](https://learn.microsoft.com/dotnet/api/system.string)

`color` [MarkerColor](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerColor.md)

#### Returns

 [MarkerHandle](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md)

The marker, or **None** if the target has no spawned pawn yet.

### <a id="OblivionMp_Sdk_IMarkers_DestroyMarker_OblivionMp_Sdk_Values_MarkerHandle_"></a> DestroyMarker\(MarkerHandle\)

Removes a marker. Does nothing for **None** or a marker already removed.

```csharp
void DestroyMarker(MarkerHandle handle)
```

#### Parameters

`handle` [MarkerHandle](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md)

### <a id="OblivionMp_Sdk_IMarkers_SetMarkerOpacity_OblivionMp_Sdk_Values_MarkerHandle_System_Single_"></a> SetMarkerOpacity\(MarkerHandle, float\)

Sets a marker's opacity, from 0 (fully transparent) to 1 (fully opaque). Does nothing for **None**.

```csharp
void SetMarkerOpacity(MarkerHandle handle, float opacity)
```

#### Parameters

`handle` [MarkerHandle](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md)

`opacity` [float](https://learn.microsoft.com/dotnet/api/system.single)

### <a id="OblivionMp_Sdk_IMarkers_SetMarkerText_OblivionMp_Sdk_Values_MarkerHandle_System_String_OblivionMp_Sdk_Values_MarkerColor_"></a> SetMarkerText\(MarkerHandle, string, MarkerColor\)

Changes the text and color of a marker. Does nothing for **None**.

```csharp
void SetMarkerText(MarkerHandle handle, string text, MarkerColor color)
```

#### Parameters

`handle` [MarkerHandle](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md)

`text` [string](https://learn.microsoft.com/dotnet/api/system.string)

`color` [MarkerColor](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerColor.md)

### <a id="OblivionMp_Sdk_IMarkers_SetMarkerVisible_OblivionMp_Sdk_Values_MarkerHandle_System_Boolean_"></a> SetMarkerVisible\(MarkerHandle, bool\)

Shows or hides a marker without removing it. Does nothing for **None**.

```csharp
void SetMarkerVisible(MarkerHandle handle, bool visible)
```

#### Parameters

`handle` [MarkerHandle](../OblivionMp.Sdk.Values/OblivionMp.Sdk.Values.MarkerHandle.md)

`visible` [bool](https://learn.microsoft.com/dotnet/api/system.boolean)


