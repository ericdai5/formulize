import { observable, action, computed } from "mobx";
import { evaluateFormula, parseFormula, validateFormula, findDependencies } from "./mathParser";

export type VariableType = 'fixed' | 'slidable' | 'dependent' | 'none';

export type VariableState = {
    isFixed: boolean;
    value: number;
    symbol: string;
    type: VariableType;
    min?: number;
    max?: number;
    dependencies?: Set<string>; // variables this one depends on
    error?: string; // for storing evaluation errors
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

    private isUpdatingDependents = false;

    @action
    setFormula(formula: string) {
        this.formula = formula;
        if (validateFormula(formula)) {
            this.formulaError = null;
            this.updateDependencies();
            this.updateDependentVariables();
        } else {
            this.formulaError = "Invalid formula syntax";
        }
    }

    @action
    addVariable(id: string, symbol: string) {
        console.log(`Adding variable: ${id} (${symbol})`);
        if (!this.variables.has(id)) {
            this.variables.set(id, {
                isFixed: false,
                value: 0,
                symbol: symbol,
                type: 'none',
                dependencies: new Set()
            });
        }
    }

    // removing variables that are no longer in the formula
    @action
    cleanup(currentVariables: Set<string>) {
        const variablesToRemove = new Set<string>();
        
        for (const [id, variable] of this.variables.entries()) {
            if (!currentVariables.has(variable.symbol)) {
                variablesToRemove.add(id);
            }
        }

        variablesToRemove.forEach(id => {
            this.variables.delete(id);
        });

        console.log("Cleanup completed. Removed variables:", 
            Array.from(variablesToRemove));
        console.log("Remaining variables:", 
            Array.from(this.variables.entries())
                .map(([id, v]) => `${id}: ${v.symbol}`));
    }

    @action
    setVariableType(id: string, type: VariableType) {
        console.log(`Setting variable type: ${id} -> ${type}`);
        const variable = this.variables.get(id);
        if (!variable) return;

        if (type === 'dependent') {
            try {
                const tempDeps = this.calculateDependencies(variable.symbol);
                if (this.wouldCreateCircularDependency(variable.symbol, tempDeps)) {
                    console.error("Cannot set as dependent - would create circular dependency");
                    return;
                }
            } catch (error) {
                console.error("Error checking dependencies:", error);
                return;
            }
        }

        variable.type = type;
        if (type === 'slidable') {
            variable.min = -100;
            variable.max = 100;
        }

        variable.error = undefined;

        this.updateDependencies();
        if (type !== 'dependent') {
            this.updateDependentVariables();
        }
    }

    @action
    setValue(id: string, value: number) {
        console.log(`Setting value: ${id} -> ${value}`);
        const variable = this.variables.get(id);
        if (!variable) return;

        if (variable.type === 'dependent' && !this.isUpdatingDependents) {
            console.log('Attempted to set dependent variable directly');
            return;
        }

        variable.value = value;
        variable.error = undefined;

        if (!this.isUpdatingDependents) {
            this.updateDependentVariables();
        }
    }

    private calculateDependencies(symbol: string): Set<string> {
        try {
            const ast = parseFormula(this.formula);
            return findDependencies(ast, symbol);
        } catch (error) {
            console.error("Error calculating dependencies:", error);
            return new Set();
        }
    }

    private wouldCreateCircularDependency(
        symbol: string, 
        newDeps: Set<string>
    ): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const checkVariable = (currentSymbol: string): boolean => {
            if (recursionStack.has(currentSymbol)) return true;
            if (visited.has(currentSymbol)) return false;

            visited.add(currentSymbol);
            recursionStack.add(currentSymbol);

            const dependencies = currentSymbol === symbol ? 
                newDeps : 
                this.variables.get(`var-${currentSymbol}`)?.dependencies ?? new Set();

            for (const dep of dependencies) {
                if (checkVariable(dep)) return true;
            }

            recursionStack.delete(currentSymbol);
            return false;
        };

        return checkVariable(symbol);
    }

    private updateDependencies() {
        if (!this.formula) return;

        try {
            const ast = parseFormula(this.formula);
            
            for (const [_, variable] of this.variables.entries()) {
                if (variable.type === 'dependent') {
                    variable.dependencies = findDependencies(ast, variable.symbol);
                } else {
                    variable.dependencies = new Set();
                }
            }

            this.validateDependencies();
            
        } catch (error) {
            console.error("Error updating dependencies:", error);
            this.formulaError = "Error updating variable dependencies";
        }
    }

    private validateDependencies() {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const checkVariable = (symbol: string): boolean => {
            if (recursionStack.has(symbol)) {
                throw new Error(`Circular dependency detected involving ${symbol}`);
            }
            if (visited.has(symbol)) return false;

            visited.add(symbol);
            recursionStack.add(symbol);

            const variable = Array.from(this.variables.values())
                .find(v => v.symbol === symbol);
            
            if (variable?.dependencies) {
                for (const dep of variable.dependencies) {
                    if (checkVariable(dep)) return true;
                }
            }

            recursionStack.delete(symbol);
            return false;
        };

        for (const variable of this.variables.values()) {
            if (variable.type === 'dependent') {
                checkVariable(variable.symbol);
            }
        }
    }

    @action
    private updateDependentVariables() {
        if (this.isUpdatingDependents || !this.formula) return;
        
        try {
            this.isUpdatingDependents = true;

            const values = new Map<string, number>();
            for (const [_, variable] of this.variables.entries()) {
                values.set(variable.symbol, variable.value);
            }

            for (const [id, variable] of this.variables.entries()) {
                if (variable.type === 'dependent') {
                    try {
                        const result = evaluateFormula(
                            this.formula,
                            variable.symbol,
                            values
                        );
                        
                        if (isNaN(result)) {
                            variable.error = "Cannot evaluate formula";
                        } else {
                            variable.value = result;
                            variable.error = undefined;
                        }
                    } catch (error) {
                        console.error(
                            `Error evaluating dependent variable ${variable.symbol}:`,
                            error
                        );
                        variable.error = "Evaluation error";
                    }
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
    get dependencyGraph() {
        const graph: Record<string, string[]> = {};
        for (const [_, variable] of this.variables.entries()) {
            if (variable.dependencies) {
                graph[variable.symbol] = Array.from(variable.dependencies);
            }
        }
        return graph;
    }

    @computed 
    get hasErrors(): boolean {
        return !!this.formulaError || 
            Array.from(this.variables.values()).some(v => !!v.error);
    }
}

export const computationStore = new ComputationStore();