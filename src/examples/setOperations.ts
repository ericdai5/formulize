export const setOperations = `const config = {
  formulas: [
    {
      formulaId: "set-intersection",
      latex: "P = M \\\\cap B",
      manual: (variables) => {
        const M = variables.M?.set || [];
        const B = variables.B?.set || [];
        variables.P.set = M.filter(item => B.includes(item));
      }
    },
    {
      formulaId: "set-union",
      latex: "U = M \\\\cup B",
      manual: (variables) => {
        const M = variables.M?.set || [];
        const B = variables.B?.set || [];
        variables.U.set = [...new Set([...M, ...B])];
      }
    }
  ],
  variables: {
    M: {
      type: "input",
      dataType: "set",
      set: ["elephant", "platypus", "kangaroo", "dog", "giraffe"],
      name: "Mammals",
      description: "Set of mammals",
      labelDisplay: "value"
    },
    B: {
      type: "input", 
      dataType: "set",
      set: ["platypus", "duck", "goose", "parrot", "flamingo"],
      name: "Billed Animals",
      description: "Set of animals with bills",
      labelDisplay: "value"
    },
    P: {
      type: "dependent",
      dataType: "set",
      set: [],
      name: "Platypus",
      description: "Intersection of mammals and billed animals",
      labelDisplay: "value"
    },
    U: {
      type: "dependent",
      dataType: "set", 
      set: [],
      name: "All Animals",
      description: "Union of mammals and billed animals",
      labelDisplay: "value"
    }
  },
  controls: [
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
