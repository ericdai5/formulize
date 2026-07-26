import { beforeEach, describe, expect, it } from "vitest";

import { debugStore } from "./debug";

const configCode = `const config = {
  variables: {
    v: {
      default: 1,
      filter: [{ formula: ["formula-a"], instance: [1] }],
    },
    w: 2,
  },
};`;

describe("debug variable serialization", () => {
  beforeEach(() => {
    debugStore.setCode(configCode);
  });

  it("updates variable objects containing nested occurrence rules", () => {
    debugStore.updateVariable("v", {
      default: 3,
      filter: [{ formula: ["formula-a"], instance: [2, 3] }],
      exclude: [],
    });

    expect(debugStore.code).toContain("default: 3");
    expect(debugStore.code).toContain(
      'filter: [{"formula":["formula-a"],"instance":[2,3]}]'
    );
    expect(debugStore.code).toContain("exclude: []");
    expect(debugStore.code).toContain("w: 2");
    expect(debugStore.findVariableRange("v")).not.toBeNull();
  });

  it("deletes a nested variable object without consuming its neighbor", () => {
    debugStore.deleteVariable("v");

    expect(debugStore.code).not.toContain("formula-a");
    expect(debugStore.code).toContain("w: 2");
  });
});
