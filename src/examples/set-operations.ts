export const setOperations = `const config = {
  formulas: [
    {
      id: "set-intersection",
      latex: "P = M \\\\cap B"
    },
    {
      id: "set-union",
      latex: "U = M \\\\cup B"
    }
  ],
  variables: {
    M: {
      role: "input",
      default: ["elephant", "platypus", "kangaroo", "dog", "giraffe"],
      name: "Mammals",
      description: "Set of mammals",
      labelDisplay: "value"
    },
    B: {
      role: "input",
      default: ["platypus", "duck", "goose", "parrot", "flamingo"],
      name: "Billed Animals",
      description: "Set of animals with bills",
      labelDisplay: "value"
    },
    P: {
      role: "computed",
      default: [],
      name: "Platypus",
      description: "Intersection of mammals and billed animals",
      labelDisplay: "value"
    },
    U: {
      role: "computed",
      default: [],
      name: "All Animals",
      description: "Union of mammals and billed animals",
      labelDisplay: "value"
    }
  },
  controls: [
    {
      type: "checkbox",
      variable: "M",
      availableElements: ["elephant", "platypus", "kangaroo", "dog", "giraffe", "whale", "dolphin", "bat", "mouse", "cat"],
      orientation: "vertical"
    },
    {
      type: "checkbox",
      variable: "B",
      availableElements: ["platypus", "duck", "goose", "parrot", "flamingo", "penguin", "toucan", "pelican", "swan", "eagle"],
      orientation: "vertical"
    },
    {
      type: "set",
      variable: "M",
      availableElements: ["elephant", "platypus", "kangaroo", "dog", "giraffe", "whale", "dolphin", "bat", "mouse", "cat"],
      color: "#3b82f6"
    },
    {
      type: "set",
      variable: "B",
      availableElements: ["platypus", "duck", "goose", "parrot", "flamingo", "penguin", "toucan", "pelican", "swan", "eagle"],
      color: "#ef4444"
    }
  ],
  semantics: {
    manual: (vars) => {
      // Set intersection: P = M ∩ B
      const M = vars.M;
      const B = vars.B;
      vars.P = M.filter(item => B.includes(item));
      // Set union: U = M ∪ B
      vars.U = [...new Set([...M, ...B])];
    }
  },
  fontSize: 1.5
};`;
