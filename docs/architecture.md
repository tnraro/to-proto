# Architecture

High-level structural rules. Component and module behavior is visible in the code; this file records the boundaries and invariants the code does not show.

## Pointer gestures go through one binding helper

Use `bindGestureListeners` (`src/lib/gestureListeners.ts`) for any pointer gesture that must work with mouse/pen and touch and stay live during native scroll. Hand-writing the raw listener set means duplicating the same subtle wiring every time (dual pointer/touch path, non-passive touchmove, window-level move) — a fix or bug in one gesture then has to be mirrored in every copy. Gestures that never need the touch path live in the component instead.