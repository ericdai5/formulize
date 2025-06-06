import { action, computed, observable } from "mobx";

import { IComputation } from "./api";
import { computeWithSymbolicEngine } from "./api/SymbolicAlgebraEngine";

export type VariableType = "fixed" | "slidable" | "dependent" | "none";

export type VariableState = {
  value: number;
  symbol: string;
  type: VariableType;
  min?: number;
  max?: number;
  dependencies?: Set<string>;
  error?: string;
};

class ComputationStore {
  @observable
  accessor variables = new Map<
    string,
    {
      value: number;
      symbol: string;
      type: VariableType;
      min?: number;
      max?: number;
      dependencies?: Set<string>;
      error?: string;
    }
  >();

  @observable
  accessor formula: string = "";

  @observable
  accessor formulaError: string | null = null;

  @observable
  accessor lastGeneratedCode: string | null = null;

  @observable
  accessor computationEngine: "llm" | "symbolic-algebra" | "manual" = "llm";

  @observable
  accessor computationConfig: IComputation | null = null;

  @observable
  accessor originalExpressions: string[] = [];

  private evaluationFunction:
    | ((variables: Record<string, number>) => Record<string, number>)
    | null = null;
  private isUpdatingDependents = false;
  private dependentVariableTypes = new Set<string>();

  // Getter to safely access the evaluation function without triggering API calls
  get evaluateFormula():
    | ((variables: Record<string, number>) => Record<string, number>)
    | null {
    return this.evaluationFunction;
  }

  @observable
  accessor variableTypesChanged = 0;

  @action
  setLastGeneratedCode(code: string | null) {
    this.lastGeneratedCode = code;
  }

  @action
  setFormulaError(error: string | null) {
    this.formulaError = error;
  }

  @action
  updateVariableValue(id: string, value: number) {
    const variable = this.variables.get(id);
    if (variable) {
      variable.value = value;
      variable.error = undefined;

      if (!this.isUpdatingDependents && variable.type !== "dependent") {
        this.updateDependentVariables();
      }
    }
  }

  @action
  updateVariableError(id: string, error: string) {
    const variable = this.variables.get(id);
    if (variable) {
      variable.error = error;
    }
  }

  @action
  setValue(id: string, value: number) {
    console.log(`🔵 ComputationStore: Setting value for ${id}: ${value}`);
    const variable = this.variables.get(id);
    if (!variable) {
      console.log(`🔴 ComputationStore: Variable not found: ${id}`);
      return;
    }

    // Update the value
    variable.value = value;
    variable.error = undefined;

    console.log(`🔵 ComputationStore: Value set for ${id}: ${value}`);

    // Only update dependent variables if we're not already in an update cycle
    if (!this.isUpdatingDependents) {
      console.log(`🔵 ComputationStore: Updating dependent variables`);
      this.updateDependentVariables();
    }
  }

  // Private method to normalize formulas for caching
  private normalizeFormula(formula: string): string {
    // Remove extra spaces and normalize whitespace
    return formula.trim().replace(/\s+/g, " ");
  }

  // Private cache to store already generated functions
  private formulaCache = new Map<string, string>();

  @action
  async setFormula(formula: string) {
    console.log("🔎 setFormula called with:", formula);

    // Check for empty formula
    if (!formula || formula.trim() === "") {
      console.error("❌ Empty formula provided to setFormula");
      this.setFormulaError("Formula cannot be empty");
      return;
    }

    // Normalize formula to improve cache hits
    const normalizedFormula = this.normalizeFormula(formula);

    // Check if this formula is identical to current one
    if (normalizedFormula === this.formula && this.evaluationFunction) {
      console.log("🎯 Formula is identical to current one, reusing function");
      // Just update dependent variables and return
      this.updateDependentVariables();
      return;
    }

    // Check if we have this formula in our cache but ONLY for LLM engine
    // Never use cache for symbolic-algebra engine
    if (
      this.computationEngine === "llm" &&
      this.formulaCache.has(normalizedFormula)
    ) {
      console.log(
        "💾 Found cached function code for formula, avoiding API call"
      );
      const cachedCode = this.formulaCache.get(normalizedFormula)!;

      // Set the cached code
      this.setLastGeneratedCode(cachedCode);

      // Create the function from cached code
      this.evaluationFunction = new Function(
        "variables",
        `"use strict";\n${cachedCode}\nreturn evaluate(variables);`
      ) as (variables: Record<string, number>) => Record<string, number>;

      // Update formula and dependent variables
      this.formula = normalizedFormula;
      this.setFormulaError(null);
      this.updateDependentVariables();
      return;
    }

    // If we got here, we need to possibly generate a new function
    const prevFormula = this.formula;
    this.formula = normalizedFormula;

    console.log(
      "🔎 Current dependent variable types:",
      Array.from(this.dependentVariableTypes)
    );

    // Clear existing code if formula changed significantly
    if (prevFormula !== normalizedFormula) {
      console.log("🔎 Formula changed, clearing previous code");
      this.setLastGeneratedCode(null);
      this.evaluationFunction = null;
    }

    // Only generate a new function if we need to
    // 1. We have dependent variables that need calculation
    // 2. We don't have a function yet OR the formula has changed
    if (
      this.dependentVariableTypes.size > 0 &&
      (!this.evaluationFunction || normalizedFormula !== prevFormula)
    ) {
      try {
        // Use the appropriate computation engine based on the configuration
        if (
          this.computationEngine === "symbolic-algebra" &&
          this.computationConfig
        ) {
          console.log(
            "🧠 Using symbolic algebra engine for formula:",
            normalizedFormula
          );

          const dependentVars = Array.from(this.dependentVariableTypes)
            .map((id) => {
              const variable = this.variables.get(id);
              return variable?.symbol;
            })
            .filter((symbol): symbol is string => symbol !== undefined);

          console.log(
            "🔎 Dependent variables for symbolic algebra:",
            dependentVars
          );

          // Create a function that uses the symbolic algebra engine
          this.evaluationFunction = (variables: Record<string, number>) => {
            if (!this.computationConfig) return {};

            // Reconstruct the formula object from the current state
            const formulaObj = {
              expressions: [normalizedFormula],
              variables: Object.fromEntries(
                Array.from(this.variables.entries()).map(([id, v]) => {
                  const varType: "constant" | "input" | "dependent" =
                    v.type === "fixed"
                      ? "constant"
                      : v.type === "slidable"
                        ? "input"
                        : v.type === "dependent"
                          ? "dependent"
                          : "constant";
                  return [v.symbol, { type: varType } as const];
                })
              ),
            };

            // Compute using the symbolic algebra engine
            return computeWithSymbolicEngine(
              formulaObj,
              this.computationConfig,
              variables
            );
          };

          // Generate a simplified evaluation function for display
          const formulaRelation =
            this.computationConfig?.expressions?.[0] || "";

          // Process the formula string for evaluation (remove the curly braces)
          const processedFormula = formulaRelation.replace(
            /\{([^}]+)\}/g,
            "$1"
          );

          // Generate evaluation function that matches what's really used by SymbolicAlgebraEngine
          let functionCode = `function evaluate(variables) {
  // Using math.js for symbolic evaluation
  // const math = require('mathjs');

  try {
`;

          // Add input variable declarations
          const inputVars = Array.from(this.variables.entries())
            .filter(([, v]) => v.type !== "dependent")
            .map(([, v]) => v.symbol);

          inputVars.forEach((varName) => {
            functionCode += `    var ${varName} = variables.${varName};\n`;
          });

          // Structure the code to match the real implementation in SymbolicAlgebraEngine.ts
          functionCode += `    // Create a scope object with input variables
    const scope = { ...variables };
    const result = {};\n`;

          // For each dependent variable, generate code similar to the actual implementation
          dependentVars.forEach((varName) => {
            functionCode += `
    // Calculate ${varName}
`;
            // Check if there's an explicit mapping function in the config
            if (
              this.computationConfig?.mappings &&
              typeof this.computationConfig.mappings[varName] === "function"
            ) {
              // Use the mapping function if available
              functionCode += `    // Using custom mapping function
    result.${varName} = computation.mappings.${varName}(variables);\n`;
            } else {
              // Otherwise use math.js for symbolic evaluation
              functionCode += `    // Try to solve symbolically using math.js
    const equationMatch = "${processedFormula}".match(/${varName}\\s*=\\s*(.+)/);

    if (equationMatch) {
      // Extract the right side of the equation and evaluate it
      const rightSide = equationMatch[1];
      result.${varName} = math.evaluate(rightSide, scope);
    } else {
      // Fall back to evaluating the full formula
      try {
        result.${varName} = math.evaluate("${processedFormula}", scope);
      } catch (error) {
        console.error("Could not solve for ${varName} symbolically", error);
        result.${varName} = NaN;
      }
    }\n`;
            }
          });

          // Return the results
          functionCode += `    return result;
  } catch (error) {
    console.error("Error in symbolic algebra evaluation:", error);
    return { ${dependentVars.map((v) => `${v}: NaN`).join(", ")} };
  }
}`;

          this.setLastGeneratedCode(functionCode);
          this.setFormulaError(null);
        } else {
          // Fallback to the OpenAI API for LLM-based computation
          console.log(
            "🚀 Generating function via OpenAI API for formula:",
            normalizedFormula
          );

          const dependentVars = Array.from(this.dependentVariableTypes)
            .map((id) => {
              const variable = this.variables.get(id);
              return variable?.symbol;
            })
            .filter((symbol): symbol is string => symbol !== undefined);

          console.log(
            "🔎 Dependent variables for function generation:",
            dependentVars
          );

          // Generate and set up evaluation function via API call
          const functionCode = await this.generateEvaluationFunction(
            normalizedFormula,
            dependentVars
          );

          // Cache the generated code for future identical formulas
          this.formulaCache.set(normalizedFormula, functionCode);
          this.setLastGeneratedCode(functionCode);

          this.evaluationFunction = new Function(
            "variables",
            `"use strict";\n${functionCode}\nreturn evaluate(variables);`
          ) as (variables: Record<string, number>) => Record<string, number>;

          this.setFormulaError(null);
        }
      } catch (error) {
        console.error("❌ Error setting formula:", error);
        this.setFormulaError(String(error));
      }
    } else {
      console.log(
        "🔎 Skipping function generation - no dependent variables or formula hasn't changed"
      );
    }

    // Always update dependent variables when formula changes
    if (this.dependentVariableTypes.size > 0) {
      this.updateDependentVariables();
    }
  }

  private async generateEvaluationFunction(
    formula: string,
    dependentVars: string[]
  ): Promise<string> {
    // Check formula validity before even trying
    if (!formula || formula.trim() === "") {
      console.error("❌ generateEvaluationFunction received empty formula");
      throw new Error("Cannot generate function from empty formula");
    }

    // Log that we're making an OpenAI API call for this formula
    console.log("🔥 MAKING OPENAI API CALL for formula:", formula);

    // Get all non-dependent variables and their current values
    const inputVars = Array.from(this.variables.entries())
      .filter(([, v]) => v.type !== "dependent")
      .map(([, v]) => v.symbol);

    console.log("🔵 Generating evaluation function for:", {
      formula,
      dependentVars,
      inputVars,
    });

    // Extra diagnostic info
    console.log("🔎 Formula type:", typeof formula);
    console.log("🔎 Formula length:", formula.length);
    console.log(
      "🔎 Formula characters:",
      [...formula].map((c) => c.charCodeAt(0))
    );
    console.log("🔎 Input variable count:", inputVars.length);
    console.log("🔎 Dependent variable count:", dependentVars.length);

    if (dependentVars.length === 0) {
      console.error("❌ No dependent variables found for function generation");
      throw new Error("Cannot generate function without dependent variables");
    }

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are a precise code generator that creates JavaScript functions to evaluate mathematical formulas. 
                                 Return ONLY the function code without any explanation or markdown.`,
              },
              {
                role: "user",
                content: `
                            Create a JavaScript function that evaluates this formula: ${formula}
                            Input variables: ${inputVars.join(", ")}
                            Dependent variables to calculate: ${dependentVars.join(", ")}
                            
                            Requirements:
                            1. Function must be named 'evaluate'
                            2. Takes a single parameter 'variables' containing input variable values as numbers
                            3. Must use ONLY the specified input variables
                            4. Returns object with computed values for dependent variables
                            5. Must handle division by zero and invalid operations
                            6. Return ONLY the function code
                            
                            Input Formula: ${formula}
                            Parse this formula and create a corresponding JavaScript function.
                            DO NOT use the example format below - it's just to show the structure.
                            Example structure (NOT the formula to implement):
                            function evaluate(variables) {
                              try {
                                return {
                                  output: someCalculation
                                };
                              } catch (error) {
                                return {
                                  output: NaN
                                };
                              }
                            }
                        `,
              },
            ],
            temperature: 0.1,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔴 OpenAI API error:", errorData);
        throw new Error(
          `API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const result = await response.json();
      console.log("🔵 OpenAI API response:", result);

      const generatedCode = result.choices[0].message.content.trim();

      // Validate the code
      if (!generatedCode.includes("function evaluate")) {
        console.error("🔴 Invalid generated code - missing evaluate function");
        throw new Error("Generated code does not contain evaluate function");
      }

      // Validate all input vars are used
      for (const inputVar of inputVars) {
        if (!generatedCode.includes(`variables.${inputVar}`)) {
          console.warn(
            `⚠️ Generated code not using input variable: ${inputVar}`
          );
        }
      }

      // Check for dependent variables in the generated code
      // Look for the dependent variables more flexibly with various delimiters
      const dependentVarPatterns = dependentVars.map(
        (v) => new RegExp(`["']?${v}["']?\\s*:`, "i")
      );

      // Extract the formula's left-side variable (the dependent variable)
      const formulaMatch = formula.match(/^\s*([A-Za-z])\s*=/);
      const formulaDepVar = formulaMatch ? formulaMatch[1] : null;

      // If we have a formula-defined dependent variable, include it in our check
      if (formulaDepVar) {
        dependentVarPatterns.push(
          new RegExp(`["']?${formulaDepVar}["']?\\s*:`, "i")
        );
      }

      // Check if any of the dependent vars are in the generated code
      const foundDepVar = dependentVarPatterns.some((pattern) =>
        pattern.test(generatedCode)
      );

      if (!foundDepVar) {
        console.error(
          "🔴 Generated code missing all dependent variables:",
          dependentVars.join(", "),
          formulaDepVar ? `and ${formulaDepVar}` : ""
        );

        throw new Error(
          `Generated code is missing dependent variables. Please check your formula.`
        );
      }

      return generatedCode;
    } catch (error) {
      console.error("🔴 Error generating function:", error);
      throw error;
    }
  }

  @action
  addVariable(id: string, symbol: string) {
    if (!this.variables.has(id)) {
      console.log("🔵 Adding new variable:", { id, symbol });
      this.variables.set(id, {
        value: 0,
        symbol: symbol,
        type: "none",
      });
    } else {
      console.log("🔵 Variable exists, preserving state:", { id, symbol });
    }
  }

  @action
  cleanup(currentVariables: Set<string>) {
    console.log(
      "🔵 Cleaning up variables. Current:",
      Array.from(currentVariables)
    );

    const variablesToRemove = new Set<string>();
    let dependentVariablesChanged = false;

    // Check which variables need to be removed
    for (const [id, variable] of this.variables.entries()) {
      if (!currentVariables.has(variable.symbol)) {
        variablesToRemove.add(id);
        if (this.dependentVariableTypes.has(id)) {
          dependentVariablesChanged = true;
        }
      }
    }

    if (variablesToRemove.size > 0) {
      console.log("🔵 Removing variables:", Array.from(variablesToRemove));
      variablesToRemove.forEach((id) => {
        this.dependentVariableTypes.delete(id);
        this.variables.delete(id);
      });

      // Clear generated code if no dependent variables remain
      if (this.dependentVariableTypes.size === 0) {
        this.setLastGeneratedCode(null);
        this.evaluationFunction = null;
      }
    }

    // Only set formula if dependent variables were affected
    if (dependentVariablesChanged && this.formula) {
      console.log(
        "🔵 Dependent variables changed during cleanup, updating formula"
      );
      this.setFormula(this.formula);
    }
  }

  @action
  setVariableType(id: string, type: VariableType) {
    const variable = this.variables.get(id);
    if (!variable) return;

    const wasDependentBefore = this.dependentVariableTypes.has(id);
    variable.type = type;
    variable.error = undefined;

    if (type === "slidable") {
      variable.min = -100;
      variable.max = 100;
    }

    // Handle dependent variable updates
    if (type === "dependent") {
      this.dependentVariableTypes.add(id);
      if (!wasDependentBefore) {
        this.setFormula(this.formula);
      }
    } else {
      if (wasDependentBefore) {
        this.dependentVariableTypes.delete(id);
        if (this.dependentVariableTypes.size > 0) {
          this.setFormula(this.formula);
        } else {
          this.evaluationFunction = null;
          this.lastGeneratedCode = null;
        }
      }
    }

    this.variableTypesChanged++;
    this.updateDependentVariables();
  }

  @action
  private updateDependentVariables() {
    if (!this.formula || !this.evaluationFunction) return;

    try {
      this.isUpdatingDependents = true;
      const values = Object.fromEntries(
        Array.from(this.variables.entries()).map(([, v]) => [v.symbol, v.value])
      );
      const results = this.evaluationFunction(values);

      for (const [, variable] of this.variables.entries()) {
        if (variable.type === "dependent") {
          const result = results[variable.symbol];
          if (typeof result === "number" && !isNaN(result)) {
            const variableId = Array.from(this.variables.entries()).find(
              ([, v]) => v === variable
            )?.[0];
            if (variableId) {
              this.updateVariableValue(variableId, result);
            }
          } else {
            variable.error = "Invalid computation result";
          }
        }
      }
    } catch (error) {
      console.error("Error updating dependent variables:", error);
      for (const [, variable] of this.variables.entries()) {
        if (variable.type === "dependent") {
          variable.error = "Evaluation error";
        }
      }
    } finally {
      this.isUpdatingDependents = false;
    }
  }

  @computed
  get hasInteractiveVariables() {
    return Array.from(this.variables.values()).some((v) => v.type !== "none");
  }

  @computed
  get hasErrors(): boolean {
    return (
      !!this.formulaError ||
      Array.from(this.variables.values()).some((v) => !!v.error)
    );
  }

  getDebugState() {
    return {
      variables: Array.from(this.variables.entries()),
      formula: this.formula,
      formulaError: this.formulaError,
      lastGeneratedCode: this.lastGeneratedCode,
      hasFunction: !!this.evaluationFunction,
    };
  }
}

export const computationStore = new ComputationStore();

// window for debugging
(window as unknown as Record<string, unknown>).computationStore =
  computationStore;
