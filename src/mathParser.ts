import { evaluate, parse, MathNode } from 'mathjs';

export type ASTNode = MathNode;

export function parseFormula(formula: string): ASTNode {
    try {
        // Convert equation to expression if needed (e.g., "y = 2x + 1" -> "2x + 1")
        const expression = formula.includes('=') ? 
            formula.split('=')[1].trim() : formula;
            
        // Parse the formula into an AST
        return parse(expression);
    } catch (error) {
        console.error("Error parsing formula:", error);
        throw error;
    }
}

export function findDependencies(ast: ASTNode, targetVariable: string): Set<string> {
    const dependencies = new Set<string>();

    // Recursively traverse the AST to find variables
    const traverse = (node: ASTNode) => {
        if (node.type === 'SymbolNode') {
            // Add symbol to dependencies if it's not the target variable
            if (node.name !== targetVariable) {
                dependencies.add(node.name);
            }
        }
        // Recurse through child nodes
        if ('args' in node && Array.isArray(node.args)) {
            node.args.forEach(traverse);
        }
    };

    traverse(ast);
    return dependencies;
}

export function evaluateFormula(
    formula: string,
    targetVariable: string,
    values: Map<string, number>
): number {
    try {
        // Convert equation to expression if needed
        const expression = formula.includes('=') ? 
            formula.split('=')[1].trim() : formula;

        // Create scope object with current values
        const scope: Record<string, number> = {};
        for (const [symbol, value] of values.entries()) {
            scope[symbol] = value;
        }

        // Evaluate the expression with the given scope
        return evaluate(expression, scope);
    } catch (error) {
        console.error("Error evaluating formula:", error);
        return NaN; // Return NaN for invalid evaluations
    }
}

// Helper function to rearrange equation to solve for a variable
export function solveFor(formula: string, variable: string): string {
    // simplified implementation
    if (!formula.includes('=')) {
        return formula;
    }

    const [left, right] = formula.split('=').map(s => s.trim());
    
    // If variable is on the left side, rearrange to isolate it
    if (left.includes(variable)) {
        return `${variable} = ${right}`;
    }
    
    return formula;
}

/**
 * Validates if a formula string is syntactically correct
 */
export function validateFormula(formula: string): boolean {
    try {
        if (formula.includes('=')) {
            const [left, right] = formula.split('=').map(s => s.trim());
            parse(left);
            parse(right);
        } else {
            parse(formula);
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Gets a list of all variables in a formula
 */
export function getAllVariables(formula: string): Set<string> {
    try {
        const ast = parseFormula(formula);
        const variables = new Set<string>();
        
        const traverse = (node: ASTNode) => {
            if (node.type === 'SymbolNode') {
                variables.add(node.name);
            }
            if ('args' in node && Array.isArray(node.args)) {
                node.args.forEach(traverse);
            }
        };

        traverse(ast);
        return variables;
    } catch {
        return new Set();
    }
}