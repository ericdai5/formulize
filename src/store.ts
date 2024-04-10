import { types } from "mobx-state-tree";

export const SelectionStore = types
  .model("SelectionStore", {
    selected: types.array(types.string),
    targets: types.map(
      types.model({
        id: types.string,
        left: types.number,
        top: types.number,
        width: types.number,
        height: types.number,
      }),
    ),
    selectionRect: types.maybe(
      types.model({
        x1: types.number,
        y1: types.number,
        x2: types.number,
        y2: types.number,
      }),
    ),
  })
  .actions((self) => ({
    startDragSelection(x: number, y: number) {
      self.selectionRect = {
        x1: x,
        y1: y,
        x2: x,
        y2: y,
      };
    },
    updateDragSelection(x2: number, y2: number) {
      if (!self.selectionRect) {
        return;
      }
      self.selectionRect.x2 = x2;
      self.selectionRect.y2 = y2;
    },
    stopDragSelection() {
      self.currentlyDragged.forEach((id) => {
        if (!self.selected.includes(id)) {
          self.selected.push(id);
        }
      });
      self.selectionRect = undefined;
    },
    clearSelection() {
      self.selected.clear();
    },
    updateTarget(
      id: string,
      left: number,
      top: number,
      width: number,
      height: number,
    ) {
      self.targets.set(id, { id, left, top, width, height });
    },
  }))
  .views((self) => ({
    get selectionRectDimensions() {
      return {
        left: Math.min(self.selectionRect!.x1, self.selectionRect!.x2),
        top: Math.min(self.selectionRect!.y1, self.selectionRect!.y2),
        width: Math.abs(self.selectionRect!.x1 - self.selectionRect!.x2),
        height: Math.abs(self.selectionRect!.y1 - self.selectionRect!.y2),
      };
    },
    get currentlyDragged() {
      if (!self.selectionRect) {
        return [];
      }

      const { x1, x2, y1, y2 } = self.selectionRect;
      const dragLeft = Math.min(x1, x2);
      const dragRight = Math.max(x1, x2);
      const dragTop = Math.min(y1, y2);
      const dragBottom = Math.max(y1, y2);

      const dragged = Array.from(self.targets.values()).flatMap((target) => {
        const { left, top, width, height } = target;
        const right = left + width;
        const bottom = top + height;
        return left <= dragRight &&
          right >= dragLeft &&
          top <= dragBottom &&
          bottom >= dragTop
          ? [target.id]
          : [];
      });
      return dragged;
    },
  }));

export const selectionStore = SelectionStore.create({
  selected: [],
  selectionRect: undefined,
});

export const StyleStore = types
  .model("StyleStore", {
    color: types.map(types.string),
  })
  .actions((self) => ({
    setSelectionColor(color: string) {
      for (const id of selectionStore.selected) {
        self.color.set(id, color);
      }
    },
    }));

export const styleStore = StyleStore.create({
  color: {},
});
