import { observable, action, computed } from "mobx";

export type VariableType = 'fixed' | 'slidable' | 'dependent' | 'none';

export type VariableState = {
    isFixed: boolean;
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
    accessor variables = new Map<string, VariableState>();

    @observable
    accessor isInteractive = false;

    @observable
    accessor formula: string = "";

    @observable
    accessor formulaError: string | null = null;

    @observable
    accessor lastGeneratedCode: string | null = null;

    private evaluationFunction: Function | null = null;
    private isUpdatingDependents = false;

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
    async setFormula(formula: string) {
        console.log("🔵 Setting formula:", formula);
        this.formula = formula;
        
        try {
            // getting all dependent variables
            const dependentVars = Array.from(this.variables.values())
                .filter(v => v.type === 'dependent')
                .map(v => v.symbol);

            if (dependentVars.length > 0) {
                console.log("🔵 Dependent variables:", dependentVars);
                
                // now using LLM to generate function
                const functionCode = await this.generateEvaluationFunction(formula, dependentVars);
                this.setLastGeneratedCode(functionCode);
                console.log("🔵 Generated function code:", functionCode);
                
                // creating the function based on the generated code
                try {
                    this.evaluationFunction = new Function(
                        'variables', 
                        `"use strict";
                         ${functionCode}
                         return evaluate(variables);`
                    );
                    console.log("🔵 Successfully created evaluation function");
                    
                    // // testing the function with current values
                    // const testValues = Object.fromEntries(
                    //     Array.from(this.variables.entries())
                    //         .filter(([_, v]) => v.type !== 'dependent')
                    //         .map(([_, v]) => [v.symbol, v.value])
                    // );
                    // console.log("🔵 Testing function with values:", testValues);
                    // const testResult = this.evaluationFunction(testValues);
                    // console.log("🔵 Test evaluation result:", testResult);
                } catch (evalError) {
                    console.error("🔴 Error creating function:", evalError);
                    const errorMessage = evalError instanceof Error ? evalError.message : String(evalError);
                    this.setFormulaError(`Error creating evaluation function: ${errorMessage}`);
                    return;
                }
                
                this.setFormulaError(null);
                this.updateDependentVariables();
            } else {
                console.log("🔵 No dependent variables to evaluate");
            }
        } catch (error) {
            console.error("🔴 Error setting formula:", error);
            this.setFormulaError("Invalid formula syntax");
        }
    }

    private async generateEvaluationFunction(formula: string, dependentVars: string[]): Promise<string> {
        console.log("🔵 Generating evaluation function for:", {formula, dependentVars});
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        console.log('API Key:', apiKey);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: `You are a precise code generator that creates JavaScript functions to evaluate mathematical formulas. 
                                 Return ONLY the function code without any explanation or markdown.`
                    }, {
                        role: "user",
                        content: `
                            Create a JavaScript function that evaluates this formula: ${formula}
                            Dependent variables: ${dependentVars.join(', ')}
                            Requirements:
                            1. Function must be named 'evaluate'
                            2. Takes a single parameter 'variables' containing variable values as numbers
                            3. Returns an object with computed values for ALL dependent variables
                            4. Must handle division by zero and invalid operations
                            5. Return ONLY the function code, no explanation
                            
                            Example format:
                            function evaluate(variables) {
                              try {
                                return {
                                  y: variables.x * 2 + variables.z
                                };
                              } catch (error) {
                                return {
                                  y: NaN
                                };
                              }
                            }
                        `
                    }],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("🔴 OpenAI API error:", errorData);
                throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log("🔵 OpenAI API response:", result);

            const generatedCode = result.choices[0].message.content.trim();
            
            if (!generatedCode.includes('function evaluate')) {
                console.error("🔴 Invalid generated code - missing evaluate function");
                throw new Error("Generated code does not contain evaluate function");
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
            console.log("🔵 Adding new variable:", {id, symbol});
            this.variables.set(id, {
                isFixed: false,
                value: 0,
                symbol: symbol,
                type: 'none',
                dependencies: new Set()
            });
        } else {
            console.log("🔵 Variable exists, preserving state:", {id, symbol});
        }
    }

    @action
    cleanup(currentVariables: Set<string>) {
        console.log("🔵 Cleaning up variables. Current:", Array.from(currentVariables));
        
        const variablesToRemove = new Set<string>();
        
        for (const [id, variable] of this.variables.entries()) {
            if (!currentVariables.has(variable.symbol)) {
                variablesToRemove.add(id);
            }
        }

        if (variablesToRemove.size > 0) {
            console.log("🔵 Removing variables:", Array.from(variablesToRemove));
            variablesToRemove.forEach(id => {
                this.variables.delete(id);
            });
        }
    }

    @action
    setVariableType(id: string, type: VariableType) {
        console.log("🔵 Setting variable type:", {id, type});
        const variable = this.variables.get(id);
        if (!variable) {
            console.log("🔴 Variable not found:", id);
            return;
        }

        variable.type = type;
        variable.error = undefined;

        if (type === 'slidable') {
            variable.min = -100;
            variable.max = 100;
        }

        // need to regenerate evaluation function if changing a variable's type to/from dependent
        if (type === 'dependent' || variable.type === 'dependent') {
            this.setFormula(this.formula);
        }

        if (type !== 'dependent') {
            this.updateDependentVariables();
        }
    }

    @action
    setValue(id: string, value: number) {
        console.log("🔵 Setting value:", {id, value});
        const variable = this.variables.get(id);
        if (!variable) {
            console.log("🔴 Variable not found:", id);
            return;
        }

        if (variable.type === 'dependent' && !this.isUpdatingDependents) {
            console.log("🔴 Attempted to set dependent variable directly");
            return;
        }

        variable.value = value;
        variable.error = undefined;

        if (!this.isUpdatingDependents) {
            this.updateDependentVariables();
        }
    }

    @action
    private updateDependentVariables() {
        if (this.isUpdatingDependents || !this.formula || !this.evaluationFunction) {
            console.log("🔵 Skipping dependent variable update:", {
                isUpdating: this.isUpdatingDependents,
                hasFormula: !!this.formula,
                hasFunction: !!this.evaluationFunction
            });
            return;
        }
        
        try {
            console.log("🔵 Updating dependent variables");
            this.isUpdatingDependents = true;

            const values = Object.fromEntries(
                Array.from(this.variables.entries())
                    .filter(([_, v]) => v.type !== 'dependent')
                    .map(([_, v]) => [v.symbol, v.value])
            );
            console.log("🔵 Current variable values:", values);

            // evaluating using the generated function
            const results = this.evaluationFunction(values);
            console.log("🔵 Evaluation results:", results);

            for (const [id, variable] of this.variables.entries()) {
                if (variable.type === 'dependent') {
                    const result = results[variable.symbol];
                    if (typeof result === 'number' && !isNaN(result)) {
                        console.log("🔵 Updating dependent variable:", {
                            symbol: variable.symbol,
                            value: result
                        });
                        this.updateVariableValue(id, result);
                    } else {
                        console.log("🔴 Invalid result for variable:", {
                            symbol: variable.symbol,
                            result
                        });
                        this.updateVariableError(id, "Invalid computation result");
                    }
                }
            }
        } catch (error) {
            console.error("🔴 Error updating dependent variables:", error);
            for (const [id, variable] of this.variables.entries()) {
                if (variable.type === 'dependent') {
                    this.updateVariableError(id, "Evaluation error");
                }
            }
        } finally {
            this.isUpdatingDependents = false;
        }
    }

    @computed
    get hasInteractiveVariables() {
        return Array.from(this.variables.values()).some(v => v.type !== 'none');
    }

    @computed
    get hasErrors(): boolean {
        return !!this.formulaError || 
            Array.from(this.variables.values()).some(v => !!v.error);
    }

    getDebugState() {
        return {
            variables: Array.from(this.variables.entries()),
            formula: this.formula,
            formulaError: this.formulaError,
            lastGeneratedCode: this.lastGeneratedCode,
            hasFunction: !!this.evaluationFunction
        };
    }
}

export const computationStore = new ComputationStore();

// window for debugging
(window as any).computationStore = computationStore;