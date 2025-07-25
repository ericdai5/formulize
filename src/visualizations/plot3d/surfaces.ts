import { computationStore } from "../../api/computation";
import { solveSingularFormula } from "../../engine/singular-formula-solver";
import { IPoint3D, ISurface } from "../../types/plot3d";
import { ColorScale, resolveColor } from "./color";

interface SurfaceCalculationParams {
  xAxis: string;
  yAxis: string;
  zAxis: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  samples: number;
  getFormulaByName: (formulaName: string) => string | null;
}

// Helper function to solve equations using singular formula solver
const solveForVariable = (
  formulaExpression: string,
  variables: Record<string, number>,
  solveFor: string
): number | null => {
  try {
    // Use the singular formula solver
    const result = solveSingularFormula(formulaExpression, variables, solveFor);
    return result;
  } catch (error) {
    console.debug("Error solving for variable:", error);
    return null;
  }
};

export const getSurface = (
  surfaceConfig: ISurface,
  index: number,
  params: SurfaceCalculationParams
): ISurface | null => {
  const {
    xAxis,
    yAxis,
    zAxis,
    xMin,
    xMax,
    yMin,
    yMax,
    samples,
    getFormulaByName,
  } = params;

  const formulaExpression = getFormulaByName(surfaceConfig.formulaName);
  if (!formulaExpression) {
    console.warn(`Formula not found: ${surfaceConfig.formulaName}`);
    return null;
  }

  const points: IPoint3D[] = [];
  const xStep = (xMax - xMin) / samples;
  const yStep = (yMax - yMin) / samples;

  // Generate coordinates without excessive rounding to avoid aliasing
  // Use higher precision for parametric surfaces
  const xCoords = Array.from({ length: samples + 1 }, (_, i) =>
    Number((xMin + i * xStep).toFixed(6))
  );
  const yCoords = Array.from({ length: samples + 1 }, (_, i) =>
    Number((yMin + i * yStep).toFixed(6))
  );

  const zCoords: (number | null)[][] = [];

  // Get current variable values as base context
  const baseVariables = Object.fromEntries(
    Array.from(computationStore.variables.entries()).map(([symbol, v]) => [
      symbol,
      v.value ?? 0,
    ])
  );

  for (let i = 0; i <= samples; i++) {
    const row: (number | null)[] = [];
    const y = yCoords[i];

    for (let j = 0; j <= samples; j++) {
      const x = xCoords[j];
      let z: number | null = null;

      try {
        // Create variable context for this point
        const variablesMap = { ...baseVariables };
        variablesMap[xAxis] = x;
        variablesMap[yAxis] = y;

        // Solve for the z variable using the singular formula solver
        z = solveForVariable(formulaExpression, variablesMap, zAxis);

        // Enhanced validation - allow parametric surfaces to extend beyond display limits
        if (z !== null && isFinite(z)) {
          // Round to reasonable precision to avoid floating point artifacts
          const roundedZ = Number(z.toFixed(8));
          row.push(roundedZ);
          points.push({ x, y, z: roundedZ });
        } else {
          // Only set to null for actual calculation failures, not range limits
          row.push(null);
          points.push({ x, y, z: null });
        }
      } catch (error) {
        // Keep z as null for failed evaluations
        row.push(null);
        points.push({ x, y, z: null });
      }
    }
    zCoords.push(row);
  }

  return {
    formulaName: surfaceConfig.formulaName,
    matrixData: { xCoords, yCoords, zCoords },
    points,
    color: resolveColor(surfaceConfig.color as ColorScale, index),
    opacity: surfaceConfig.opacity ?? 0.7,
    showInLegend: surfaceConfig.showInLegend !== false,
    showColorbar: surfaceConfig.showColorbar,
  };
};

// Main calculation function for all surfaces
export const getSurfaces = (
  surfaces: ISurface[] | null,
  params: SurfaceCalculationParams
): ISurface[] => {
  const surfacesToProcess = surfaces;
  if (!surfacesToProcess || surfacesToProcess.length === 0) {
    console.warn("No surfaces configuration provided, using default");
    return [];
  }

  const results: ISurface[] = [];

  surfacesToProcess.forEach((surfaceConfig, index) => {
    const surfaceData = getSurface(surfaceConfig, index, params);
    if (surfaceData) {
      results.push(surfaceData);
    } else {
      console.warn(`Failed to calculate surface: ${surfaceConfig.formulaName}`);
    }
  });

  return results;
};
