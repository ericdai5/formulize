import React from "react";

import { observer } from "mobx-react-lite";

import LatexLabel from "../../components/latex";
import { computationStore } from "../../store/computation";
import { type AxisLabelInfo } from "./axes";

interface AxisLabelsProps {
  labelInfo: AxisLabelInfo;
  xAxisHovered?: boolean;
  yAxisHovered?: boolean;
}

export const AxisLabels: React.FC<AxisLabelsProps> = observer(
  ({ labelInfo, xAxisHovered = false, yAxisHovered = false }) => {
    // Get fontSize from environment, with default and scaling for MathJax scale=1.0
    const fontSize = computationStore.environment?.fontSize ?? 1;

    const handleXLabelMouseEnter = () => {
      if (labelInfo.xLabel?.xAxis) {
        computationStore.setVariableHover(labelInfo.xLabel.xAxis, true);
      }
      labelInfo.xLabel?.allXVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, true);
      });
    };

    const handleXLabelMouseLeave = () => {
      if (labelInfo.xLabel?.xAxis) {
        computationStore.setVariableHover(labelInfo.xLabel.xAxis, false);
      }
      labelInfo.xLabel?.allXVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, false);
      });
    };

    const handleYLabelMouseEnter = () => {
      if (labelInfo.yLabel?.yAxis) {
        computationStore.setVariableHover(labelInfo.yLabel.yAxis, true);
      }
      labelInfo.yLabel?.allYVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, true);
      });
    };

    const handleYLabelMouseLeave = () => {
      if (labelInfo.yLabel?.yAxis) {
        computationStore.setVariableHover(labelInfo.yLabel.yAxis, false);
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
              backgroundColor: xAxisHovered ? "#f3f4f6" : "transparent",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={handleXLabelMouseEnter}
            onMouseLeave={handleXLabelMouseLeave}
          >
            <LatexLabel latex={labelInfo.xLabel.text} fontSize={fontSize} />
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
              backgroundColor: yAxisHovered ? "#f3f4f6" : "transparent",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={handleYLabelMouseEnter}
            onMouseLeave={handleYLabelMouseLeave}
          >
            <LatexLabel latex={labelInfo.yLabel.text} fontSize={fontSize} />
          </div>
        )}
      </>
    );
  }
);

AxisLabels.displayName = "AxisLabels";
