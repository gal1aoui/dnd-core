import {
  __spreadProps,
  __spreadValues
} from "./chunk-WDMUDEB6.js";

// ../../packages/dnd-core/dist/chunk-GH5ZRS47.mjs
var DEFAULT_CONFIG = {
  dragThreshold: 5,
  capturePointer: false,
  // Disabled by default - can cause issues with window event listeners
  draggingBodyClass: "dnd-dragging"
};
function createInitialState() {
  return {
    phase: "idle",
    dragData: null,
    pointerPosition: null,
    startPosition: null,
    dragOffset: null,
    activeDropZone: null,
    dropZones: /* @__PURE__ */ new Map()
  };
}
function createDndEngine(config = {}) {
  const mergedConfig = __spreadProps(__spreadValues({}, DEFAULT_CONFIG), {
    callbacks: config.callbacks || {}
  });
  if (config.dragThreshold !== void 0) {
    mergedConfig.dragThreshold = config.dragThreshold;
  }
  if (config.capturePointer !== void 0) {
    mergedConfig.capturePointer = config.capturePointer;
  }
  if (config.draggingBodyClass !== void 0) {
    mergedConfig.draggingBodyClass = config.draggingBodyClass;
  }
  let state = createInitialState();
  const subscribers = /* @__PURE__ */ new Set();
  const draggables = /* @__PURE__ */ new Map();
  const droppables = /* @__PURE__ */ new Map();
  let activeDragElement = null;
  let pendingDragStart = null;
  function notifySubscribers() {
    subscribers.forEach((callback) => callback(state));
  }
  function setState(updates) {
    state = __spreadValues(__spreadValues({}, state), updates);
    notifySubscribers();
  }
  function distance(a, b) {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }
  function getRect(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  }
  function isPointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }
  function findDropZoneAtPoint(point) {
    for (const [element, { options }] of droppables) {
      if (options.disabled) continue;
      const rect = getRect(element);
      if (!isPointInRect(point, rect)) continue;
      if (state.dragData) {
        const accepts = options.accepts || [];
        if (accepts.length > 0 && !accepts.includes(state.dragData.type)) {
          continue;
        }
      }
      return {
        element,
        data: {
          id: options.id,
          accepts: options.accepts || [],
          payload: options.payload
        }
      };
    }
    return null;
  }
  function handlePointerDown(element, options, event) {
    if (options.disabled) return;
    if (state.phase !== "idle") return;
    if (options.handleSelector) {
      const target = event.target;
      if (!target.closest(options.handleSelector)) return;
    }
    event.preventDefault();
    pendingDragStart = { element, event };
    const rect = getRect(element);
    const dragOffset = {
      x: event.clientX - rect.x,
      y: event.clientY - rect.y
    };
    setState({
      startPosition: { x: event.clientX, y: event.clientY },
      pointerPosition: { x: event.clientX, y: event.clientY },
      dragOffset
    });
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    if (mergedConfig.capturePointer) {
      element.setPointerCapture(event.pointerId);
    }
  }
  function handlePointerMove(event) {
    const currentPos = { x: event.clientX, y: event.clientY };
    if (pendingDragStart && state.startPosition) {
      const dist = distance(state.startPosition, currentPos);
      if (dist >= mergedConfig.dragThreshold) {
        const { element, event: startEvent } = pendingDragStart;
        const options = draggables.get(element)?.options;
        if (!options) return;
        const dragData = {
          id: options.id,
          type: options.type,
          payload: options.payload
        };
        activeDragElement = element;
        pendingDragStart = null;
        setState({
          phase: "dragging",
          dragData,
          pointerPosition: currentPos
        });
        document.body.classList.add(mergedConfig.draggingBodyClass);
        mergedConfig.callbacks.onDragStart?.({
          item: dragData,
          element,
          position: state.startPosition,
          dragOffset: state.dragOffset || { x: 0, y: 0 },
          originalEvent: startEvent
        });
      }
    } else if (state.phase === "dragging") {
      setState({ pointerPosition: currentPos });
      const dropZone = findDropZoneAtPoint(currentPos);
      const previousDropZone = state.activeDropZone;
      if (dropZone) {
        if (!previousDropZone || previousDropZone.id !== dropZone.data.id) {
          if (previousDropZone) {
            mergedConfig.callbacks.onDragLeave?.(previousDropZone);
          }
          setState({ activeDropZone: dropZone.data });
        }
        if (state.dragData) {
          mergedConfig.callbacks.onDragOver?.({
            item: state.dragData,
            dropZone: dropZone.data,
            position: currentPos,
            dropZoneElement: dropZone.element
          });
        }
      } else if (previousDropZone) {
        mergedConfig.callbacks.onDragLeave?.(previousDropZone);
        setState({ activeDropZone: null });
      }
    }
  }
  function handlePointerUp(event) {
    const finalPos = { x: event.clientX, y: event.clientY };
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    if (activeDragElement && mergedConfig.capturePointer) {
      activeDragElement.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove(mergedConfig.draggingBodyClass);
    const wasDragging = state.phase === "dragging";
    const dragData = state.dragData;
    const dropZone = findDropZoneAtPoint(finalPos);
    let dropped = false;
    if (wasDragging && dragData && dropZone) {
      dropped = true;
      mergedConfig.callbacks.onDrop?.({
        item: dragData,
        dropZone: dropZone.data,
        position: finalPos,
        dropZoneElement: dropZone.element
      });
    }
    if (wasDragging && dragData) {
      mergedConfig.callbacks.onDragEnd?.({
        item: dragData,
        dropped,
        position: finalPos
      });
    }
    pendingDragStart = null;
    activeDragElement = null;
    setState(createInitialState());
  }
  function registerDraggable(element, options) {
    const onPointerDown = (e) => {
      const currentOptions = draggables.get(element)?.options;
      if (currentOptions) {
        handlePointerDown(element, currentOptions, e);
      }
    };
    element.addEventListener("pointerdown", onPointerDown, { passive: false });
    element.style.touchAction = "none";
    element.style.userSelect = "none";
    element.draggable = false;
    const cleanup = () => {
      element.removeEventListener("pointerdown", onPointerDown, { passive: false });
      element.style.touchAction = "";
      element.style.userSelect = "";
      element.draggable = true;
    };
    draggables.set(element, { options, cleanup });
    const initialId = options.id;
    return {
      destroy: () => {
        cleanup();
        draggables.delete(element);
      },
      update: (newOptions) => {
        const existing = draggables.get(element);
        if (existing) {
          existing.options = __spreadValues(__spreadValues({}, existing.options), newOptions);
        }
      },
      isDragging: () => {
        const currentOptions = draggables.get(element)?.options;
        return state.phase === "dragging" && state.dragData?.id === (currentOptions?.id ?? initialId);
      }
    };
  }
  function registerDroppable(element, options) {
    const dropZoneData = {
      id: options.id,
      accepts: options.accepts || [],
      payload: options.payload
    };
    state.dropZones.set(options.id, dropZoneData);
    const cleanup = () => {
      state.dropZones.delete(options.id);
    };
    droppables.set(element, { options, cleanup });
    return {
      destroy: () => {
        cleanup();
        droppables.delete(element);
      },
      update: (newOptions) => {
        const existing = droppables.get(element);
        if (existing) {
          existing.options = __spreadValues(__spreadValues({}, existing.options), newOptions);
          const updatedData = {
            id: existing.options.id,
            accepts: existing.options.accepts || [],
            payload: existing.options.payload
          };
          state.dropZones.set(existing.options.id, updatedData);
        }
      },
      isOver: () => state.activeDropZone?.id === options.id
    };
  }
  return {
    registerDraggable,
    registerDroppable,
    getState: () => state,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    updateConfig: (newConfig) => {
      if (newConfig.dragThreshold !== void 0) {
        mergedConfig.dragThreshold = newConfig.dragThreshold;
      }
      if (newConfig.capturePointer !== void 0) {
        mergedConfig.capturePointer = newConfig.capturePointer;
      }
      if (newConfig.draggingBodyClass !== void 0) {
        mergedConfig.draggingBodyClass = newConfig.draggingBodyClass;
      }
      if (newConfig.callbacks) {
        Object.assign(mergedConfig.callbacks, newConfig.callbacks);
      }
    },
    cancel: () => {
      if (state.phase !== "idle") {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        document.body.classList.remove(mergedConfig.draggingBodyClass);
        if (state.dragData) {
          mergedConfig.callbacks.onDragEnd?.({
            item: state.dragData,
            dropped: false,
            position: state.pointerPosition || { x: 0, y: 0 }
          });
        }
        pendingDragStart = null;
        activeDragElement = null;
        setState(createInitialState());
      }
    },
    destroy: () => {
      if (state.phase !== "idle") {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        document.body.classList.remove(mergedConfig.draggingBodyClass);
      }
      draggables.forEach(({ cleanup }) => cleanup());
      draggables.clear();
      droppables.forEach(({ cleanup }) => cleanup());
      droppables.clear();
      subscribers.clear();
      state = createInitialState();
    }
  };
}

// ../../packages/board-dnd/dist/chunk-QRDBVVJ2.mjs
var DEFAULT_CONFIG2 = {
  animate: true,
  animationDuration: 200,
  itemGap: 8,
  itemType: "board-item"
};
function createInitialBoardState() {
  return {
    isDragging: false,
    draggedItem: null,
    sourceColumnId: null,
    sourceIndex: null,
    dropIndicator: null,
    dragOffset: null
  };
}
function calculateDropIndicator(pointerY, columnId, itemPositions, itemGap) {
  if (itemPositions.length === 0) {
    return {
      columnId,
      insertIndex: 0,
      position: { x: 0, y: 0 }
    };
  }
  for (let i = 0; i < itemPositions.length; i++) {
    const item = itemPositions[i];
    const midpoint = item.top + item.height / 2;
    if (pointerY < midpoint) {
      return {
        columnId,
        insertIndex: i,
        position: { x: 0, y: item.top - itemGap / 2 }
      };
    }
  }
  const lastItem = itemPositions[itemPositions.length - 1];
  return {
    columnId,
    insertIndex: itemPositions.length,
    position: { x: 0, y: lastItem.bottom + itemGap / 2 }
  };
}
function createBoardEngine(config = {}) {
  const mergedConfig = __spreadProps(__spreadValues(__spreadValues({}, DEFAULT_CONFIG2), config), {
    callbacks: config.callbacks || {}
  });
  let boardState = createInitialBoardState();
  const subscribers = /* @__PURE__ */ new Set();
  const columnGetters = /* @__PURE__ */ new Map();
  function notifySubscribers() {
    subscribers.forEach((callback) => callback(boardState));
  }
  function setBoardState(updates) {
    boardState = __spreadValues(__spreadValues({}, boardState), updates);
    notifySubscribers();
  }
  const coreEngine = createDndEngine({
    dragThreshold: 5,
    draggingBodyClass: "board-dnd-dragging",
    callbacks: {
      onDragStart: (event) => {
        const { item, columnId, index } = event.item.payload;
        setBoardState({
          isDragging: true,
          draggedItem: item,
          sourceColumnId: columnId,
          sourceIndex: index,
          dropIndicator: null,
          dragOffset: event.dragOffset
        });
        mergedConfig.callbacks.onDragStart?.(item, columnId);
      },
      onDragOver: (event) => {
        const { item } = event.item.payload;
        const { columnId, getItemPositions } = event.dropZone.payload;
        const itemPositions = getItemPositions();
        const indicator = calculateDropIndicator(
          event.position.y,
          columnId,
          itemPositions,
          mergedConfig.itemGap
        );
        let adjustedIndex = indicator.insertIndex;
        if (columnId === boardState.sourceColumnId && boardState.sourceIndex !== null && indicator.insertIndex > boardState.sourceIndex) {
          adjustedIndex = indicator.insertIndex - 1;
        }
        setBoardState({
          dropIndicator: __spreadProps(__spreadValues({}, indicator), { insertIndex: adjustedIndex })
        });
        mergedConfig.callbacks.onDragOver?.(item, columnId, adjustedIndex);
      },
      onDrop: (event) => {
        const { item, columnId: sourceColumnId, index: sourceIndex } = event.item.payload;
        const { columnId: targetColumnId } = event.dropZone.payload;
        const toIndex = boardState.dropIndicator?.insertIndex ?? 0;
        const result = {
          item,
          fromColumnId: sourceColumnId,
          fromIndex: sourceIndex,
          toColumnId: targetColumnId,
          toIndex
        };
        setBoardState(createInitialBoardState());
        mergedConfig.callbacks.onDrop?.(result);
      },
      onDragEnd: (event) => {
        const { item } = event.item.payload;
        if (!event.dropped) {
          mergedConfig.callbacks.onDragCancel?.(item);
        }
        setBoardState(createInitialBoardState());
      }
    }
  });
  return {
    registerColumn: (element, options) => {
      const { id, data, getItemPositions } = options;
      columnGetters.set(id, getItemPositions);
      const handle = coreEngine.registerDroppable(element, {
        id,
        accepts: [mergedConfig.itemType],
        payload: {
          columnId: id,
          data,
          getItemPositions
        }
      });
      return {
        destroy: () => {
          columnGetters.delete(id);
          handle.destroy();
        },
        update: (newOptions) => {
          handle.update({
            disabled: newOptions.disabled,
            payload: {
              columnId: id,
              data: newOptions.data ?? data,
              getItemPositions
            }
          });
        }
      };
    },
    registerItem: (element, options) => {
      const { id, data, columnId, index, disabled } = options;
      const handle = coreEngine.registerDraggable(element, {
        id,
        type: mergedConfig.itemType,
        disabled,
        payload: {
          item: { id, data },
          columnId,
          index
        }
      });
      return {
        destroy: () => handle.destroy(),
        update: (newOptions) => {
          handle.update({
            disabled: newOptions.disabled,
            payload: {
              item: { id, data: newOptions.data ?? data },
              columnId: newOptions.columnId ?? columnId,
              index: newOptions.index ?? index
            }
          });
        }
      };
    },
    getState: () => boardState,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    cancel: () => {
      coreEngine.cancel();
      setBoardState(createInitialBoardState());
    },
    destroy: () => {
      coreEngine.destroy();
      columnGetters.clear();
      subscribers.clear();
      boardState = createInitialBoardState();
    }
  };
}

// ../../packages/board-dnd/dist/angular/index.mjs
var BoardDndServiceBase = class {
  constructor(config = {}) {
    this.stateListeners = /* @__PURE__ */ new Set();
    this.engine = createBoardEngine(config);
    this._state = this.engine.getState();
    this.engine.subscribe((state) => {
      this._state = state;
      this.stateListeners.forEach((listener) => listener(state));
    });
  }
  /**
   * Current board drag state
   */
  get state() {
    return this._state;
  }
  /**
   * Subscribe to state changes
   *
   * @returns Unsubscribe function
   */
  subscribe(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }
  /**
   * Register an element as a column (drop zone)
   */
  registerColumn(element, options) {
    return this.engine.registerColumn(element, options);
  }
  /**
   * Register an element as a draggable item
   */
  registerItem(element, options) {
    return this.engine.registerItem(element, options);
  }
  /**
   * Cancel current drag operation
   */
  cancel() {
    this.engine.cancel();
  }
  /**
   * Clean up resources (call in ngOnDestroy)
   */
  destroy() {
    this.engine.destroy();
    this.stateListeners.clear();
  }
};
function createBoardColumnDirective(service, element, inputs, getItemPositions) {
  const handle = service.registerColumn(element, {
    id: inputs.boardColumnId,
    data: inputs.boardColumnData,
    getItemPositions
  });
  return {
    update: (newInputs) => {
      handle.update({
        data: newInputs.boardColumnData,
        disabled: newInputs.boardColumnDisabled
      });
    },
    destroy: () => handle.destroy()
  };
}
function createBoardItemDirective(service, element, inputs) {
  element.setAttribute("data-board-item", "true");
  element.setAttribute("data-board-item-id", String(inputs.boardItemId));
  const handle = service.registerItem(element, {
    id: inputs.boardItemId,
    data: inputs.boardItemData,
    columnId: inputs.boardItemColumnId,
    index: inputs.boardItemIndex,
    disabled: inputs.boardItemDisabled
  });
  return {
    update: (newInputs) => {
      if (newInputs.boardItemId !== void 0) {
        element.setAttribute("data-board-item-id", String(newInputs.boardItemId));
      }
      handle.update({
        data: newInputs.boardItemData,
        index: newInputs.boardItemIndex,
        disabled: newInputs.boardItemDisabled
      });
    },
    destroy: () => {
      element.removeAttribute("data-board-item");
      element.removeAttribute("data-board-item-id");
      handle.destroy();
    }
  };
}
export {
  BoardDndServiceBase,
  createBoardColumnDirective,
  createBoardItemDirective
};
//# sourceMappingURL=@agallaoui_board-dnd_angular.js.map
