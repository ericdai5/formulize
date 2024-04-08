import { types, IAnyModelType, Instance } from "mobx-state-tree";

import { populateFormulaStore } from "./mathjax";

export const Transform = types
  .model({
    translate: types.maybe(
      types.model({
        x: types.number,
        y: types.number,
      }),
    ),
    scale: types.maybe(
      types.model({
        x: types.number,
        y: types.number,
      }),
    ),
  })
  .views((self) => ({
    get asAttr() {
      let transform = "";
      if (self.translate) {
        transform += `translate(${self.translate.x},${self.translate.y}) `;
      }
      if (self.scale) {
        transform += `scale(${self.scale.x},${self.scale.y})`;
      }
      return transform.length > 0 ? transform : undefined;
    },
  }));

export type ITransform = Instance<typeof Transform>;

export const FormulaNode = types
  .model("FormulaNode", {
    id: types.string,
    nodeType: types.string,

    mmlNode: types.maybe(types.string),

    transform: types.maybe(Transform),

    scaleX: types.maybe(types.number),
    scaleY: types.maybe(types.number),
    translateX: types.maybe(types.number),
    translateY: types.maybe(types.number),

    linkHref: types.maybe(types.string),

    _children: types.maybe(
      types.array(types.late((): IAnyModelType => FormulaNode)),
    ),
  })
  .views((self) => ({
    get children(): Instance<typeof FormulaNode>[] | undefined {
      return self._children;
    },
    get transformAttr() {
      return self.transform?.asAttr;
    },
  }));

export type IFormulaNode = Instance<typeof FormulaNode>;

// TODO: There should be more than one Formula eventually
export const FormulaStore = types
  .model("FormulaStore", {
    root: FormulaNode,

    defs: types.array(
      types.model({
        id: types.string,
        d: types.string,
      }),
    ),

    // element dimensions
    dimensions: types
      .model({
        width: types.number,
        height: types.number,
        unit: types.string,
      })
      .actions((self) => ({
        setDimensions(dimensions: {
          width: number;
          height: number;
          unit: string;
        }) {
          self.width = dimensions.width;
          self.height = dimensions.height;
          self.unit = dimensions.unit;
        },
      }))
      .views((self) => ({
        get widthAsAttr() {
          return `${self.width}${self.unit}`;
        },
        get heightAsAttr() {
          return `${self.height}${self.unit}`;
        },
      })),

    // svg viewbox
    viewBox: types
      .model({
        x: types.number,
        y: types.number,
        width: types.number,
        height: types.number,
      })
      .views((self) => ({
        get asAttr() {
          return `${self.x} ${self.y} ${self.width} ${self.height}`;
        },
      }))
      .actions((self) => ({
        setViewBox(viewBox: {
          x: number;
          y: number;
          width: number;
          height: number;
        }) {
          self.x = viewBox.x;
          self.y = viewBox.y;
          self.width = viewBox.width;
          self.height = viewBox.height;
        },
      })),
  })
  .actions((self) => ({
    setDefs(defs: { id: string; d: string }[]) {
      self.defs.replace(defs);
    },
    setRoot(root: IFormulaNode) {
      self.root = root;
    },
  }))
  .views((self) => ({
    // views here
  }));

export const formulaStore = FormulaStore.create({
  root: {
    id: "root",
    nodeType: "g",
    _children: [],
  },

  defs: [],

  dimensions: {
    width: 11.893,
    height: 2.185,
    unit: "ex",
  },

  viewBox: {
    x: 0,
    y: -883.9,
    width: 5256.7,
    height: 965.9,
  },
});

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
    toggle(id: string) {
      if (self.selected.includes(id)) {
        self.selected.remove(id);
      } else {
        self.selected.push(id);
      }
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
