import React from "react";

import { observer } from "mobx-react-lite";

import LatexLabel from "../../components/latex";
import { computationStore } from "../../store/computation";
import { type AxisLabelInfo } from "./axes";

interface AxisLabelsProps {
  labelInfo: AxisLabelInfo;
  xAxisVarHovered?: boolean;
  yAxisVarHovered?: boolean;
}

export const AxisLabels: React.FC<AxisLabelsProps> = observer(
  ({ labelInfo, xAxisVarHovered = false, yAxisVarHovered = false }) => {
    const handleXLabelMouseEnter = () => {
      if (labelInfo.xLabel?.xAxisVar) {
        computationStore.setVariableHover(labelInfo.xLabel.xAxisVar, true);
      }
      labelInfo.xLabel?.allXVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, true);
      });
    };

    const handleXLabelMouseLeave = () => {
      if (labelInfo.xLabel?.xAxisVar) {
        computationStore.setVariableHover(labelInfo.xLabel.xAxisVar, false);
      }
      labelInfo.xLabel?.allXVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, false);
      });
    };

    const handleYLabelMouseEnter = () => {
      if (labelInfo.yLabel?.yAxisVar) {
        computationStore.setVariableHover(labelInfo.yLabel.yAxisVar, true);
      }
      labelInfo.yLabel?.allYVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, true);
      });
    };

    const handleYLabelMouseLeave = () => {
      if (labelInfo.yLabel?.yAxisVar) {
        computationStore.setVariableHover(labelInfo.yLabel.yAxisVar, false);
      }
      labelInfo.yLabel?.allYVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, false);
      });
    };

    return (
      <>
        {labelInfo.xLabel && (
          <div
            style={{
              position: "absolute",
              left: `${labelInfo.xLabel.x}px`,
              top: `${labelInfo.xLabel.y}px`,
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "6px",
              backgroundColor: xAxisVarHovered ? "#f3f4f6" : "transparent",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={handleXLabelMouseEnter}
            onMouseLeave={handleXLabelMouseLeave}
          >
            <LatexLabel latex={labelInfo.xLabel.text} fontSize={0.65} />
          </div>
        )}
        {labelInfo.yLabel && (
          <div
            style={{
              position: "absolute",
              left: `${labelInfo.yLabel.x}px`,
              top: `${labelInfo.yLabel.y}px`,
              transform: `translate(-50%, -50%) rotate(${labelInfo.yLabel.rotation}deg)`,
              cursor: "pointer",
              padding: "8px",
              borderRadius: "6px",
              backgroundColor: yAxisVarHovered ? "#f3f4f6" : "transparent",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={handleYLabelMouseEnter}
            onMouseLeave={handleYLabelMouseLeave}
          >
            <LatexLabel latex={labelInfo.yLabel.text} fontSize={0.65} />
          </div>
        )}
      </>
    );
  }
);

AxisLabels.displayName = "AxisLabels";
