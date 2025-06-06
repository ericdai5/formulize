import gravitationalPotential from "../examples/gravitationalPotential.ts";
import kineticEnergy3D from "../examples/kineticEnergy3D.ts";
import kineticEnergy from "../examples/kineticEnergy.ts";
import parametric3D from "../examples/parametric3D.ts";
import quadraticEquation3D from "../examples/quadraticEquation3D.ts";
import quadraticEquation from "../examples/quadraticEquation.ts";

interface FormulaCodeEditorProps {
  formulizeInput: string;
  onInputChange: (value: string) => void;
  onRender: (value?: string) => void;
  error: string | null;
}

const FormulaCodeEditor = ({
  formulizeInput,
  onInputChange,
  onRender,
  error,
}: FormulaCodeEditorProps) => {
  // Example formula configurations
  const formulaExamples = {
    kineticEnergy,
    gravitationalPotential,
    kineticEnergy3D,
    quadraticEquation,
    quadraticEquation3D,
    parametric3D,
  };

  // Display names for examples
  const exampleDisplayNames = {
    kineticEnergy: "Kinetic Energy",
    gravitationalPotential: "Gravitational Potential",
    kineticEnergy3D: "Kinetic Energy 3D",
    quadraticEquation: "Quadratic Equation",
    quadraticEquation3D: "Quadratic Equation 3D",
    parametric3D: "Parametric 3D",
  };

  // Handler for example button clicks
  const handleExampleClick = (example: keyof typeof formulaExamples) => {
    const newFormula = formulaExamples[example];
    onInputChange(newFormula);
    onRender(newFormula); // Pass the new formula directly to render
  };

  return (
    <div className="p-4 flex flex-col gap-3 border-t border-slate-200 h-full">
      <div className="flex flex-row gap-0 border border-slate-200 rounded-xl">
        <div className="text-sm text-slate-950 py-1 px-3 border-r border-slate-200 h-full flex items-center">
          Templates
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide p-2">
          {(
            Object.keys(formulaExamples) as Array<keyof typeof formulaExamples>
          ).map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1 border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-950 rounded-lg hover:bg-slate-100 text-sm flex-shrink-0"
            >
              {exampleDisplayNames[example]}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={formulizeInput}
        onChange={(e) => onInputChange(e.target.value)}
        onBlur={() => onRender()}
        className="w-full p-4 border bg-slate-50 rounded-xl font-mono text-sm h-full"
      />

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
    </div>
  );
};

export default FormulaCodeEditor;
