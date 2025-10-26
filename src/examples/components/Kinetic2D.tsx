import React from "react";

import { FormulaComponent } from "../../components/FormulaComponent";
import { FormulizeProvider } from "../../components/FormulizeProvider";
import { VisualizationComponent } from "../../components/VisualizationComponent";
import { FormulizeConfig } from "../../formulize";

const kineticConfig: FormulizeConfig = {
  formulas: [
    {
      formulaId: "kinetic-energy",
      latex: "K = \\frac{1}{2}mv^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}",
      manual: function (variables: any) {
        const m = variables.m.value;
        const v = variables.v.value;
        return 0.5 * m * Math.pow(v, 2);
      },
    },
  ],
  variables: {
    K: {
      type: "dependent",
      units: "J",
      name: "Kinetic Energy",
      precision: 2,
    },
    m: {
      type: "input",
      value: 1,
      range: [0.1, 10],
      step: 1,
      units: "kg",
      name: "Mass",
    },
    v: {
      type: "input",
      value: 2,
      range: [0.1, 100],
      step: 1,
      units: "m/s",
      name: "Velocity",
    },
  },
  computation: {
    engine: "manual",
  },
  visualizations: [
    {
      type: "plot2d" as const,
      xAxisVar: "v",
      yAxisVar: "K",
      height: 400,
      width: 400,
      lines: [
        {
          name: "Kinetic Energy Formula",
        },
      ],
    },
  ],
  fontSize: 0.8,
};

export const Kinetic2DExample: React.FC = () => {
  return (
    <FormulizeProvider config={kineticConfig}>
      <div className="example-description mb-4">
        <h2 className="text-2xl font-bold mb-2">Kinetic Energy</h2>
        <p className="text-gray-700 leading-relaxed">
          Kinetic energy is the energy possessed by an object due to its motion.
          The formula shows that kinetic energy is directly proportional to the
          mass of the object and the square of its velocity. This means that
          doubling the velocity quadruples the kinetic energy, making speed a
          much more significant factor than mass in determining how much energy
          a moving object has.
        </p>
      </div>
      <div className="formulize-example grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        <div className="formula-section">
          <FormulaComponent
            formulaId="kinetic-energy"
            style={{ height: "200px" }}
          />
        </div>
        <div className="visualization-section">
          {kineticConfig.visualizations && kineticConfig.visualizations[0] && (
            <VisualizationComponent
              type="plot2d"
              config={kineticConfig.visualizations[0]}
              height={400}
            />
          )}
        </div>
      </div>
    </FormulizeProvider>
  );
};

export default Kinetic2DExample;
