import { types } from "mobx-state-tree";

export const SelectionStore = types
  .model("SelectionStore", {
    selected: types.array(types.string),
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
      self.selectionRect = undefined;
    },
  }))
  .views((self) => ({
    get selectionRectLeft() {
      return Math.min(self.selectionRect!.x1, self.selectionRect!.x2);
    },
    get selectionRectTop() {
      return Math.min(self.selectionRect!.y1, self.selectionRect!.y2);
    },
    get selectionRectWidth() {
      return Math.abs(self.selectionRect!.x1 - self.selectionRect!.x2);
    },
    get selectionRectHeight() {
      return Math.abs(self.selectionRect!.y1 - self.selectionRect!.y2);
    },
  }));

export const selectionStore = SelectionStore.create({
  selected: [],
  selectionRect: undefined,
});
