# Lightweight Drag & Drop Library for React & Angular

## Objective
Build a **high-performance, lightweight Drag & Drop (DnD) library** targeting **React** and **Angular**, optimized for minimal bundle size, predictable performance, and framework-agnostic core logic.

This document outlines architectural principles, performance constraints, and implementation guidance to ensure the library remains fast, maintainable, and competitive.

---

## 1. Explicit Non-Goals (Critical for Scope Control)

To avoid unnecessary complexity and bloat, the following are **intentionally excluded** from v1:

- Complex nested drag hierarchies
- Built-in animations or physics engines
- Opinionated styling or CSS frameworks
- Framework-specific state management
- HTML5 native Drag & Drop API usage
- Automatic drag previews via portals

**Primary value proposition:**
- Minimal bundle size
- Zero or near-zero allocations during drag
- Framework-agnostic core
- Predictable performance on large DOM trees

---

## 2. Framework-Agnostic Core (Mandatory)

The core engine must be implemented as **pure TypeScript**, with no dependency on:

- React
- Angular
- JSX
- Zone.js
- RxJS

### Core Responsibilities
- Pointer lifecycle handling
- Drag state management
- Collision / hit-testing
- Position calculation
- Event subscription system

### Conceptual API
```ts
interface DragContext {
  start(event: PointerEvent, target: HTMLElement): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  destroy(): void;
}
```

This enables:
- Shared logic across frameworks
- Isolated performance optimization
- Easier benchmarking and testing

---

## 3. Pointer Events Over HTML5 Drag API

**Do not use the native HTML5 drag-and-drop API.**

### Reasons
- Poor mobile and touch support
- Forced ghost images
- Browser inconsistencies
- Limited performance control

### Recommended Approach
- Use `PointerEvent`
- Explicitly manage:
  - `pointerdown`
  - `pointermove`
  - `pointerup`
  - `pointercancel`

### Performance Optimizations
- Use `setPointerCapture`
- Single global `pointermove` listener during active drag
- `passive: false` only when required

---

## 4. Zero Re-Renders During Drag

**Dragging must never trigger framework re-renders.**

### Strategy
- Mutate DOM styles directly
- Use GPU-accelerated transforms
- Avoid `top` / `left`

```ts
element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
```

### State Management
- Drag state stored in plain objects
- Frameworks interact only at initialization and drop completion

---

## 5. One-Way Data Flow

Recommended lifecycle:

1. Pointer event → core engine
2. Core computes position and collisions
3. Core emits minimal callbacks:
   - `onDragStart`
   - `onDragMove`
   - `onDrop`
4. Application state updates **only on drop**

This prevents:
- UI jank
- React reconciliation pressure
- Angular change detection storms

---

## 6. Angular Integration Guidelines

Angular performance requires explicit opt-out from change detection.

### Requirements
- Execute drag logic in `NgZone.runOutsideAngular`
- Do not bind drag position to templates
- Re-enter Angular only on drop

```ts
this.zone.runOutsideAngular(() => {
  initDragEngine(...)
});
```

Failure to do this will cause severe performance degradation.

---

## 7. React Integration Guidelines

- Avoid React synthetic events
- Use `addEventListener`
- Use `useRef` for mutable drag state
- No React state updates during drag

React adapter should be:
- Thin
- Stateless
- Effect-driven

---

## 8. Collision Detection Strategy

Initial implementation should prioritize simplicity and speed.

### Supported
- Rectangular hit testing (AABB)
- Cached bounding boxes at drag start
- Optional recalculation on scroll / resize

### Avoid
- Tree traversal
- Layout queries per frame
- Mutation observers

---

## 9. Animation Policy (Optional)

If animations are provided:
- Use `requestAnimationFrame`
- Keep them optional
- No physics engines in core

Allow users to integrate external animation solutions.

---

## 10. Package & Bundle Strategy

### Output Targets
- `esm`
- `cjs`
- `types`

### Package Structure
```
/core
/react
/angular
```

### Rules
- No framework code in core
- Fully tree-shakable exports
- Prefer zero runtime dependencies

---

## 11. Benchmarking & Validation

Benchmark against:
- dnd-kit
- react-beautiful-dnd
- Angular CDK DragDrop

### Metrics
- FPS during drag
- CPU utilization
- Bundle size (min+gzip)
- Memory allocations per frame

Publish benchmark results to establish credibility.

---

## 12. Differentiation Criteria

To be competitive, the library should deliver at least two of the following:

- < 10kb min+gzip
- Zero framework re-renders during drag
- Identical behavior across React & Angular
- Explicit performance documentation
- Advanced escape hatches for power users
