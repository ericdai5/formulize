/**
 * LLM Function Generator
 *
 * Handles generating JavaScript evaluation functions from mathematical formulas
 * using OpenAI's API for natural language processing.
 */

export interface GenerateFunctionParams {
  formula: string;
  computedVars: string[];
  inputVars: string[];
}

export async function generateEvaluationFunction({
  formula,
  computedVars,
  inputVars,
}: GenerateFunctionParams): Promise<string> {
  // Validate inputs
  if (!formula?.trim()) {
    throw new Error("Cannot generate function from empty formula");
  }

  if (computedVars.length === 0) {
    throw new Error("Cannot generate function without computed variables");
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content:
              "You are a precise code generator that creates JavaScript functions to evaluate mathematical formulas. Return ONLY the function code without any explanation or markdown.",
          },
          {
            role: "user",
            content: buildPrompt(formula, inputVars, computedVars),
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const result = await response.json();
    const generatedCode = result.choices[0].message.content.trim();

    validateGeneratedCode(generatedCode, computedVars, inputVars, formula);

    return generatedCode;
  } catch (error) {
    console.error("🔴 Error generating function:", error);
    throw error;
  }
}

function buildPrompt(
  formula: string,
  inputVars: string[],
  computedVars: string[]
): string {
  return `Create a JavaScript function that evaluates this formula: ${formula}
Input variables: ${inputVars.join(", ")}
Computed variables to calculate: ${computedVars.join(", ")}

Requirements:
1. Function must be named 'evaluate'
2. Takes a single parameter 'variables' containing input variable values as numbers
3. Must use ONLY the specified input variables
4. Returns object with computed values for computed variables
5. Must handle division by zero and invalid operations
6. Return ONLY the function code

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
}`;
}

function validateGeneratedCode(
  generatedCode: string,
  computedVars: string[],
  inputVars: string[],
  formula: string
): void {
  // Check if function exists
  if (!generatedCode.includes("function evaluate")) {
    throw new Error("Generated code does not contain evaluate function");
  }

  // Warn about unused input variables
  for (const inputVar of inputVars) {
    if (!generatedCode.includes(`variables.${inputVar}`)) {
      console.warn(`⚠️ Generated code not using input variable: ${inputVar}`);
    }
  }

  // Check for computed variables in the generated code
  const computedVarPatterns = computedVars.map(
    (v) => new RegExp(`["']?${v}["']?\\s*:`, "i")
  );

  // Extract the formula's left-side variable (the computed variable)
  const formulaMatch = formula.match(/^\s*([A-Za-z])\s*=/);
  const formulaDepVar = formulaMatch ? formulaMatch[1] : null;

  // If we have a formula-defined computed variable, include it in our check
  if (formulaDepVar) {
    computedVarPatterns.push(
      new RegExp(`["']?${formulaDepVar}["']?\\s*:`, "i")
    );
  }

  // Check if any of the computed vars are in the generated code
  const foundDepVar = computedVarPatterns.some((pattern) =>
    pattern.test(generatedCode)
  );

  if (!foundDepVar) {
    throw new Error(
      `Generated code is missing computed variables: ${computedVars.join(", ")}${formulaDepVar ? ` and ${formulaDepVar}` : ""}`
    );
  }
}
