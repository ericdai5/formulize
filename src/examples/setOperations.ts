export const setOperations = `const config = {
  formulas: [
    {
      id: "set-intersection",
      latex: "P = M \\\\cap B",
      manual: (vars) => {
        const M = vars.M;
        const B = vars.B;
        vars.P = M.filter(item => B.includes(item));
      }
    },
    {
      id: "set-union",
      latex: "U = M \\\\cup B",
      manual: (vars) => {
        const M = vars.M;
        const B = vars.B;
        vars.U = [...new Set([...M, ...B])];
      }
    }
  ],
  variables: {
    M: {
      type: "input",
      value: ["elephant", "platypus", "kangaroo", "dog", "giraffe"],
      name: "Mammals",
      description: "Set of mammals",
      labelDisplay: "value"
    },
    B: {
      type: "input",
      value: ["platypus", "duck", "goose", "parrot", "flamingo"],
      name: "Billed Animals",
      description: "Set of animals with bills",
      labelDisplay: "value"
    },
    P: {
      type: "dependent",
      value: [],
      name: "Platypus",
      description: "Intersection of mammals and billed animals",
      labelDisplay: "value"
    },
    U: {
      type: "dependent",
      value: [],
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
  computation: {
    engine: "manual"
  },
  fontSize: 0.6
};`;
