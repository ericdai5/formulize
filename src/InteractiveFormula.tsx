import { css } from "@emotion/react";
import { useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { formulaStore } from "./store";
import { computationStore } from './computation';

const extractVariablesFromMathML = (mathml: string): Set<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(mathml, 'application/xml');
    
    // finding all <mi> elements (mathematical identifiers)
    const variables = new Set<string>();
    const miElements = doc.getElementsByTagName('mi');
    
    for (const mi of Array.from(miElements)) {
        const text = mi.textContent?.trim();
        // right now, only considering single-letter variables
        if (text && text.length === 1 && /[a-zA-Z]/.test(text)) {
            variables.add(text);
        }
    }
    
    return variables;
};

const InteractiveVariable = observer(({ id, variable }: { 
    id: string, 
    variable: { 
        symbol: string;
        type: 'fixed' | 'slidable' | 'dependent' | 'none';
        value: number;
        min?: number;
        max?: number;
        dependencies?: Set<string>;
        error?: string;
    } 
}) => {
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        computationStore.setValue(id, parseFloat(e.target.value));
    };

    if (variable.type === 'none') return null;

    return (
        <div css={css`
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 8px;
            background: white;
            border-radius: 4px;
            border: 1px solid ${variable.error ? '#ff0000' : '#ddd'};
        `}>
            <div css={css`
                display: flex;
                align-items: center;
                gap: 8px;
            `}>
                <span css={css`
                    font-weight: 500;
                    color: ${variable.type === 'dependent' ? 'green' : 
                           variable.type === 'slidable' ? 'blue' : 
                           variable.type === 'fixed' ? '#666' : 'black'};
                `}>
                    {variable.symbol}
                </span>
                {variable.dependencies?.size ? (
                    <span css={css`
                        font-size: 0.8em;
                        color: #666;
                    `}>
                        (depends on: {Array.from(variable.dependencies).join(', ')})
                    </span>
                ) : null}
            </div>

            <div css={css`
                display: flex;
                align-items: center;
                gap: 8px;
            `}>
                {variable.type === 'slidable' ? (
                    <>
                        <input 
                            type="range"
                            min={variable.min ?? -100}
                            max={variable.max ?? 100}
                            step="0.1"
                            value={variable.value}
                            onChange={handleSliderChange}
                            css={css`flex: 1;`}
                        />
                        <span css={css`min-width: 50px; text-align: right;`}>
                            {variable.value.toFixed(1)}
                        </span>
                    </>
                ) : variable.type === 'fixed' ? (
                    <input
                        type="number"
                        value={variable.value}
                        onChange={(e) => computationStore.setValue(id, parseFloat(e.target.value))}
                        css={css`
                            width: 80px;
                            padding: 4px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        `}
                    />
                ) : (
                    <span css={css`color: #666;`}>
                        {variable.value.toFixed(1)}
                    </span>
                )}
            </div>

            {variable.error && (
                <div css={css`
                    color: #ff0000;
                    font-size: 0.8em;
                    margin-top: 4px;
                `}>
                    {variable.error}
                </div>
            )}
        </div>
    );
});

export const InteractiveFormula = observer(() => {
    const containerRef = useRef<HTMLDivElement>(null);

    // initializing variables from MathML
    useEffect(() => {
        console.log("Initializing variables from MathML");
        formulaStore.mathML.then(mathml => {
            console.log("MathML received:", mathml);
            
            const variables = extractVariablesFromMathML(mathml);
            console.log("Found variables:", Array.from(variables));

            computationStore.cleanup(variables);

            computationStore.setFormula(formulaStore.latexWithoutStyling);

            variables.forEach(symbol => {
                const id = `var-${symbol}`;
                console.log("Adding variable to store:", id, symbol);
                computationStore.addVariable(id, symbol);
            });
        });
    }, [formulaStore.augmentedFormula]);

    // handling MathML rendering and interactive setup
    useEffect(() => {
        if (!containerRef.current || !computationStore.hasInteractiveVariables) {
            return;
        }

        formulaStore.mathML.then(mathml => {
            if (!containerRef.current) return;
            
            containerRef.current.innerHTML = mathml;

            const miElements = containerRef.current.getElementsByTagName('mi');
            Array.from(miElements).forEach(el => {
                const symbol = el.textContent?.trim();
                if (!symbol) return;
                
                const variable = Array.from(computationStore.variables.entries())
                    .find(([_, v]) => v.symbol === symbol)?.[1];
                    
                if (variable) {
                    el.setAttribute('data-type', variable.type);
                    el.setAttribute('title', `${symbol} = ${variable.value.toFixed(1)}`);
                    if (variable.error) {
                        el.setAttribute('data-error', 'true');
                    }
                }
            });
        });
    }, [
        computationStore.hasInteractiveVariables,
        Array.from(computationStore.variables.entries())
            .map(([id, v]) => `${id}:${v.value}:${v.type}:${v.error}`)
            .join(',')
    ]);

    const hasVariables = computationStore.variables.size > 0;
    if (!hasVariables) {
        console.log("No variables found, returning null");
        return null;
    }

    return (
        <div css={css`
            display: flex;
            flex-direction: column;
            padding: 20px;
            border-top: 2px solid #ccc;
            background: #f8f8f8;
            gap: 20px;
        `}>
            {computationStore.formulaError && (
                <div css={css`
                    color: #ff0000;
                    padding: 8px;
                    background: #fff;
                    border: 1px solid #ff0000;
                    border-radius: 4px;
                `}>
                    Formula Error: {computationStore.formulaError}
                </div>
            )}

            <div css={css`
                font-size: 1.2em;
                padding: 16px;
                background: white;
                border-radius: 4px;
                border: 1px solid #ddd;
                
                mi {
                    cursor: pointer;
                    &:hover { color: blue; }
                    &[data-type="dependent"] { color: green; }
                    &[data-type="fixed"] { color: #666; }
                    &[data-type="slidable"] { color: blue; }
                    &[data-error="true"] { 
                        color: #ff0000;
                        text-decoration: wavy underline #ff0000;
                    }
                }
            `} ref={containerRef} />

            {computationStore.hasInteractiveVariables && (
                <div css={css`
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 16px;
                `}>
                    {Array.from(computationStore.variables.entries())
                        .filter(([_, v]) => v.type !== 'none')
                        .map(([id, variable]) => (
                            <InteractiveVariable 
                                key={id} 
                                id={id} 
                                variable={variable}
                            />
                        ))}
                </div>
            )}
        </div>
    );
});

export default InteractiveFormula;