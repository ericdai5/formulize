export const setOperations = `const config = {
  formulas: [
    {
      formulaId: "set-intersection",
      latex: "P = M \\\\cap B",
      expression: "{P} = {M} ∩ {B}"
    },
    {
      formulaId: "set-union",
      latex: "U = M \\\\cup B", 
      expression: "{U} = {M} ∪ {B}"
    }
  ],
  variables: {
    M: {
      type: "input",
      dataType: "set",
      setValue: ["elephant", "platypus", "kangaroo", "dog", "giraffe"],
      name: "Mammals",
      description: "Set of mammals",
      labelDisplay: "value"
    },
    B: {
      type: "input", 
      dataType: "set",
      setValue: ["platypus", "duck", "goose", "parrot", "flamingo"],
      name: "Billed Animals",
      description: "Set of animals with bills",
      labelDisplay: "value"
    },
    P: {
      type: "dependent",
      dataType: "set",
      setValue: [],
      name: "Platypus",
      description: "Intersection of mammals and billed animals",
      labelDisplay: "value"
    },
    U: {
      type: "dependent",
      dataType: "set", 
      setValue: [],
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
    engine: "manual",
    setFunctions: {
      P: (variables) => {
        const M = variables.M?.setValue || [];
        const B = variables.B?.setValue || [];
        return M.filter(item => B.includes(item));
      },
      U: (variables) => {
        const M = variables.M?.setValue || [];
        const B = variables.B?.setValue || [];
        return [...new Set([...M, ...B])];
      }
    }
  },
  fontSize: 0.6
};`;
