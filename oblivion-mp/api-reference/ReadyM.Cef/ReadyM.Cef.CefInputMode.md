# Enum CefInputMode

Namespace: [ReadyM.Cef](../ReadyM.Cef/ReadyM.Cef.md)  
Assembly: ReadyM.Cef.dll  

What should happen to input while a page is on screen.

```csharp
public enum CefInputMode
```

## Fields

`DisplayOnly = 0` 

A picture. Nothing is routed to the overlay at all, so ordinary play pays nothing for it.



`Bubbling = 1` 

The page gets it first, and what the page does not use reaches the game.



`Exclusive = 2` 

The page takes everything while it is up, and the game gets nothing.



## Remarks

GLOBAL rather than per viewport. The values mirror <code>CefInputMode.h</code> and are read across the binding as
an int, so the two have to be edited together.


