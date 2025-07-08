import { StateEffect, StateField } from "@codemirror/state";
import { RangeSet } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  GutterMarker,
  gutter,
} from "@codemirror/view";

// Create effect for updating line marker
export const addLineMarker = StateEffect.define<{ line: number }>();
export const clearLineMarkers = StateEffect.define();

// State field to manage line markers
export const lineMarkerField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(markers, tr) {
    markers = markers.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(addLineMarker)) {
        const { line } = effect.value;
        const lineStart = tr.state.doc.line(line + 1).from; // line is 0-based, convert to 1-based
        const marker = Decoration.line({
          attributes: {
            style: "background-color: #dcfce7; border-left: 4px solid #16a34a;", // light green background with green left border
          },
        }).range(lineStart);
        markers = Decoration.set([marker]);
      } else if (effect.is(clearLineMarkers)) {
        markers = Decoration.none;
      }
    }

    return markers;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Custom arrow gutter marker class
class ArrowGutterMarker extends GutterMarker {
  toDOM() {
    const marker = document.createElement("div");
    marker.style.cssText = `
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-left: 12px solid #16a34a;
      margin-left: 2px;
      cursor: pointer;
    `;
    marker.setAttribute("aria-label", "Current execution line");
    return marker;
  }
}

const arrowMarker = new ArrowGutterMarker();

// Create effect for updating arrow gutter marker
export const addArrowMarker = StateEffect.define<{ line: number }>();
export const clearArrowMarkers = StateEffect.define();

// State field to manage arrow gutter markers
export const arrowGutterField = StateField.define<Set<number>>({
  create() {
    return new Set();
  },
  update(markers, tr) {
    const newMarkers = new Set(markers);
    for (const effect of tr.effects) {
      if (effect.is(addArrowMarker)) {
        newMarkers.clear();
        newMarkers.add(effect.value.line);
      } else if (effect.is(clearArrowMarkers)) {
        newMarkers.clear();
      }
    }
    return newMarkers;
  },
});

// Create the gutter extension with arrow markers
export const arrowGutter = gutter({
  class: "cm-execution-gutter",
  markers: (view) => {
    const markers = view.state.field(arrowGutterField);
    const gutterMarkers = [];

    for (const line of markers) {
      const lineStart = view.state.doc.line(line + 1).from; // Convert 0-based to 1-based line number
      gutterMarkers.push(arrowMarker.range(lineStart));
    }

    return RangeSet.of(gutterMarkers);
  },
  initialSpacer: () => arrowMarker,
});

// Extension that includes both line marker and arrow gutter functionality
export const debugExtensions = [lineMarkerField, arrowGutterField, arrowGutter];