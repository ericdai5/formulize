import { types, IAnyModelType, Instance } from "mobx-state-tree";

export const FormulaNode = types
  .model("FormulaNode", {
    id: types.string,
    nodeType: types.string,

    mmlNode: types.maybe(types.string),

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
    elementWidth: types.number,
    elementHeight: types.number,

    // svg viewbox
    viewMinX: types.number,
    viewMinY: types.number,
    viewWidth: types.number,
    viewHeight: types.number,
  })
  .actions((self) => ({
    // actions here
  }))
  .views((self) => ({
    // views here
  }));

export const formulaStore = FormulaStore.create({
  root: {
    id: "root",
    nodeType: "g",
    scaleX: 1,
    scaleY: -1,
    _children: [
      {
        id: "math",
        nodeType: "g",
        mmlNode: "math",
        _children: [
          {
            id: "a^2",
            nodeType: "g",
            mmlNode: "msup",
            _children: [
              {
                id: "a",
                nodeType: "g",
                mmlNode: "mi",
                _children: [
                  {
                    id: "a",
                    nodeType: "use",
                    linkHref: "#MJX-1-TEX-I-1D44E",
                  },
                ],
              },
              {
                id: "(a)^2",
                nodeType: "g",
                mmlNode: "mn",
                scaleX: 0.707,
                scaleY: 0.707,
                translateX: 562,
                translateY: 413,
                _children: [
                  {
                    id: "(a)^2",
                    nodeType: "use",
                    linkHref: "#MJX-1-TEX-N-32",
                  },
                ],
              },
            ],
          },
          {
            id: "+",
            nodeType: "g",
            mmlNode: "mo",
            translateX: 1187.8,
            translateY: 0,
            _children: [
              {
                id: "+",
                nodeType: "use",
                linkHref: "#MJX-1-TEX-N-2B",
              },
            ],
          },
          {
            id: "b^2",
            nodeType: "g",
            mmlNode: "msup",
            translateX: 2188,
            translateY: 0,
            _children: [
              {
                id: "b",
                nodeType: "g",
                mmlNode: "mi",
                _children: [
                  {
                    id: "b",
                    nodeType: "use",
                    linkHref: "#MJX-1-TEX-I-1D44F",
                  },
                ],
              },
              {
                id: "(b)^2",
                nodeType: "g",
                mmlNode: "mn",
                scaleX: 0.707,
                scaleY: 0.707,
                translateX: 462,
                translateY: 413,
                _children: [
                  {
                    id: "(b)^2",
                    nodeType: "use",
                    linkHref: "#MJX-1-TEX-N-32",
                  },
                ],
              },
            ],
          },
          {
            id: "=",
            nodeType: "g",
            mmlNode: "mo",
            translateX: 3331.3,
            translateY: 0,
            _children: [
              {
                id: "=",
                nodeType: "use",
                linkHref: "#MJX-1-TEX-N-3D",
              },
            ],
          },
          {
            id: "c^2",
            nodeType: "g",
            mmlNode: "msup",
            translateX: 4387.1,
            translateY: 0,
            _children: [
              {
                id: "c",
                nodeType: "g",
                mmlNode: "mi",
                _children: [
                  {
                    id: "c",
                    nodeType: "use",
                    linkHref: "#MJX-1-TEX-I-1D450",
                  },
                ],
              },
              {
                id: "(c)^2",
                nodeType: "g",
                mmlNode: "mn",
                scaleX: 0.707,
                scaleY: 0.707,
                translateX: 466,
                translateY: 413,
                _children: [
                  {
                    id: "(c)^2",
                    nodeType: "use",
                    linkHref: "#MJX-1-TEX-N-32",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  defs: [
    {
      id: "MJX-1-TEX-I-1D44E",
      d: "M33 157Q33 258 109 349T280 441Q331 441 370 392Q386 422 416 422Q429 422 439 414T449 394Q449 381 412 234T374 68Q374 43 381 35T402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487Q506 153 506 144Q506 138 501 117T481 63T449 13Q436 0 417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157ZM351 328Q351 334 346 350T323 385T277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q217 26 254 59T298 110Q300 114 325 217T351 328Z",
    },
    {
      id: "MJX-1-TEX-N-32",
      d: "M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",
    },
    {
      id: "MJX-1-TEX-N-2B",
      d: "M56 237T56 250T70 270H369V420L370 570Q380 583 389 583Q402 583 409 568V270H707Q722 262 722 250T707 230H409V-68Q401 -82 391 -82H389H387Q375 -82 369 -68V230H70Q56 237 56 250Z",
    },
    {
      id: "MJX-1-TEX-I-1D44F",
      d: "M73 647Q73 657 77 670T89 683Q90 683 161 688T234 694Q246 694 246 685T212 542Q204 508 195 472T180 418L176 399Q176 396 182 402Q231 442 283 442Q345 442 383 396T422 280Q422 169 343 79T173 -11Q123 -11 82 27T40 150V159Q40 180 48 217T97 414Q147 611 147 623T109 637Q104 637 101 637H96Q86 637 83 637T76 640T73 647ZM336 325V331Q336 405 275 405Q258 405 240 397T207 376T181 352T163 330L157 322L136 236Q114 150 114 114Q114 66 138 42Q154 26 178 26Q211 26 245 58Q270 81 285 114T318 219Q336 291 336 325Z",
    },
    {
      id: "MJX-1-TEX-N-3D",
      d: "M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z",
    },
    {
      id: "MJX-1-TEX-I-1D450",
      d: "M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",
    },
  ],

  elementWidth: 11.893,
  elementHeight: 2.185,

  viewMinX: 0,
  viewMinY: -883.9,
  viewWidth: 5256.7,
  viewHeight: 965.9,
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
