import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getVariableElement,
  getVariableElements,
} from "./variable-occurrence";

const makeElement = (id: string, classes: string[]): HTMLElement =>
  ({
    id,
    classList: {
      contains: (className: string) => classes.includes(className),
      [Symbol.iterator]: () => classes[Symbol.iterator](),
    },
  }) as unknown as HTMLElement;

const selectedBase = makeElement("v", [
  "var",
  "var-base",
  "var-instance-1",
]);
const selectedInput = makeElement("v", [
  "var",
  "var-input",
  "var-instance-2",
]);
const baseWithoutMarker = makeElement("v", [
  "var-base",
  "var-instance-3",
]);
const inputWithoutMarker = makeElement("v", [
  "var-input",
  "var-instance-4",
]);
const neutralOccurrence = makeElement("v", ["var-instance-5"]);
const markerWithoutInstance = makeElement("v", ["var", "var-base"]);
const elements = [
  selectedBase,
  selectedInput,
  baseWithoutMarker,
  inputWithoutMarker,
  neutralOccurrence,
  markerWithoutInstance,
];
const container = {
  querySelectorAll: () => elements,
  querySelector: (selector: string) => {
    const instanceClass = selector.slice(selector.lastIndexOf(".") + 1);
    return (
      elements.find((element) =>
        element.classList.contains(instanceClass)
      ) ?? null
    );
  },
} as unknown as ParentNode;

describe("variable element helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("CSS", { escape: (value: string) => value });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses var as the augmentation marker, independently of modifiers", () => {
    expect(getVariableElements(container, "v")).toEqual([
      selectedBase,
      selectedInput,
    ]);
  });

  it("reuses the exact occurrence lookup and rejects unselected instances", () => {
    expect(getVariableElement(container, "v", 2)).toBe(selectedInput);
    expect(getVariableElement(container, "v", 3)).toBeNull();
    expect(getVariableElement(container, "v", 5)).toBeNull();
    expect(getVariableElement(container, "v", 99)).toBeNull();
  });
});
