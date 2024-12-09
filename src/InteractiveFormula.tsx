import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { css } from '@emotion/react';
import { computationStore, VariableType } from './computation';
import { formulaStore } from './store';
import { reaction } from 'mobx';

type VariableInfo = {
  rect: DOMRect;
  type: 'fixed' | 'slidable' | 'dependent' | 'none';
  value: number;
  error?: string;
};

const extractVariablesFromMathML = (mathml: string): Set<string> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mathml, 'application/xml');
  const variables = new Set<string>();
  const miElements = doc.getElementsByTagName('mi');
  
  for (const mi of Array.from(miElements)) {
    const text = mi.textContent?.trim();
    if (text && text.length === 1 && /[a-zA-Z]/.test(text)) {
      variables.add(text);
    }
  }
  return variables;
};

// Extended mapping of TeX codes to symbols
const texToSymbol: {[key: string]: string} = {
  // Lowercase letters
  '1D44E': 'a', '1D44F': 'b', '1D450': 'c', '1D451': 'd',
  '1D452': 'e', '1D453': 'f', '1D454': 'g', '1D455': 'h',
  '1D456': 'i', '1D457': 'j', '1D458': 'k', '1D459': 'l',
  '1D45A': 'm', '1D45B': 'n', '1D45C': 'o', '1D45D': 'p',
  '1D45E': 'q', '1D45F': 'r', '1D460': 's', '1D461': 't',
  '1D462': 'u', '1D463': 'v', '1D464': 'w', '1D465': 'x',
  '1D466': 'y', '1D467': 'z',
  // Uppercase letters
  '1D434': 'A', '1D435': 'B', '1D436': 'C', '1D437': 'D',
  '1D438': 'E', '1D439': 'F', '1D43A': 'G', '1D43B': 'H',
  '1D43C': 'I', '1D43D': 'J', '1D43E': 'K', '1D43F': 'L',
  '1D440': 'M', '1D441': 'N', '1D442': 'O', '1D443': 'P',
  '1D444': 'Q', '1D445': 'R', '1D446': 'S', '1D447': 'T',
  '1D448': 'U', '1D449': 'V', '1D44A': 'W', '1D44B': 'X',
  '1D44C': 'Y', '1D44D': 'Z'
};

const VariableOverlay = ({ 
  symbol, 
  value, 
  type, 
  error,
  onSlideChange 
}: { 
  symbol: string; 
  value: number; 
  type: 'fixed' | 'slidable' | 'dependent' | 'none';
  error?: string;
  onSlideChange?: (value: number) => void; 
}) => {
  if (type === 'fixed' || type === 'none') return null;

  return (
    <div css={css`
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    `}>
      <div css={css`
        position: absolute;
        inset: 0;
        background: white;
        z-index: 51;
      `} />
      
      <div css={css`
        background-color: ${type === 'dependent' ? '#f3f4f6' : '#e8f0fe'};
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        font-size: 2rem;
        color: ${error ? '#ef4444' : '#374151'};
        white-space: nowrap;
        text-align: left;
        font-family: sans-serif;
        z-index: 52;
        min-width: max-content;
        display: flex;
        align-items: center;
        position: relative;
        padding-right: ${type === 'slidable' ? '1.2rem' : '1.2rem'};
      `}>
        {error ? error : `${symbol}: ${value.toFixed(1)}`}
        
        {type === 'slidable' && !error && (
          <div css={css`
            position: absolute;
            right: -5px;
            top: 0;
            bottom: 0;
            width: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}>
            <input
              type="range"
              min="-100"
              max="100"
              step="0.1"
              value={value}
              onChange={(e) => onSlideChange?.(parseFloat(e.target.value))}
              css={css`
                width: calc(100% + 50px);
                height: 20%;
                -webkit-appearance: none;
                background: #e5e7eb;
                border-radius: 2px;
                transform: rotate(-90deg);
                transform-origin: center center;
                margin: 0;

                &::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 14px;
                  height: 14px;
                  background: #3b82f6;
                  border-radius: 50%;
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                }
              `}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const InteractiveOverlay = ({
  symbol,
  varInfo,
  onClick,
  onSlideChange
}: {
  symbol: string;
  varInfo: {
    rect: DOMRect;
    type: 'fixed' | 'slidable' | 'dependent' | 'none';
    value: number;
    error?: string;
  };
  onClick: (e: React.MouseEvent) => void;
  onSlideChange?: (value: number) => void;
}) => (
  <div
    className="variable-container"
    css={css`
      position: absolute;
      left: ${varInfo.rect.left}px;
      top: ${varInfo.rect.top}px;
      width: ${varInfo.rect.width}px;
      height: ${varInfo.rect.height}px;
      pointer-events: auto;
      cursor: pointer;
    `}
    onClick={onClick}
  >
    <VariableOverlay
      symbol={symbol}
      value={varInfo.value}
      type={varInfo.type}
      error={varInfo.error}
      onSlideChange={onSlideChange}
    />
  </div>
);

const processVariableElement = (miElement: Element, symbol: string, varId: string) => {
  const variable = computationStore.variables.get(varId);
  if (!variable) return;

  // Only add padding for dependent or slidable variables
  if (variable.type === 'dependent' || variable.type === 'slidable') {
    miElement.setAttribute('style', `
      padding-left: 2em !important;
      padding-right: 0.75em !important;
      padding-top: 0.25em !important;
      padding-bottom: 0.25em !important;
    `);
  } else {
    miElement.removeAttribute('style');
  }
};

const InteractiveFormula = observer(() => {
  const formulaRef = useRef<HTMLDivElement>(null);
  const [variables, setVariables] = useState<Map<string, {
    rect: DOMRect,
    type: 'fixed' | 'slidable' | 'dependent' | 'none',
    value: number,
    error?: string
  }>>(new Map());
  const [, forceUpdate] = useState({});

  const updateVariablePositions = useCallback(async () => {
    console.log("🔍 Updating variable positions");
    if (!formulaRef.current) return;
    await new Promise(resolve => requestAnimationFrame(resolve));

    const mjxContainer = formulaRef.current.querySelector('mjx-container');
    if (!mjxContainer) return;
    
    const containerRect = formulaRef.current.getBoundingClientRect();
    const newVariables = new Map<string, VariableInfo>();
  
    mjxContainer.querySelectorAll('mjx-mi').forEach(miElement => {
      const cElement = miElement.children[0];
      if (!cElement) return;
  
      const texClass = Array.from(cElement.classList)
        .find(c => c.startsWith('mjx-c1D'));
      if (!texClass) return;
  
      const texCode = texClass.substring(5, 10);
      const symbol = texToSymbol[texCode];
      if (!symbol) return;
  
      const varId = `var-${symbol}`;

      const variable = computationStore.variables.get(varId);
      if (!variable) return;
  
      // If the variable is fixed, modify the display element to show the value
      if (variable.type === 'fixed') {
        const value = variable.value;
        // Create a new text node with the value
        const valueText = document.createTextNode(value.toString());
        // Replace the variable symbol with its value
        miElement.innerHTML = '';
        miElement.appendChild(valueText);
      }

      processVariableElement(miElement, symbol, varId);
  
      const rect = miElement.getBoundingClientRect();
      newVariables.set(symbol, {
        rect: new DOMRect(
          rect.left - containerRect.left,
          rect.top - containerRect.top,
          rect.width,
          rect.height
        ),
        type: variable.type,
        value: variable.value,
        error: variable.error
      });
    });
  
    setVariables(newVariables);
    console.log("✅ Variable positions updated", newVariables);
    forceUpdate({});
  }, []);

  useEffect(() => {
    // Set up a reaction to observe changes in variable types
    const disposer = reaction(
      () => computationStore.variableTypesChanged,
      () => {
        console.log("🔍 Variable types changed, updating positions");
        updateVariablePositions();
      }
    );

    return () => disposer();
  }, [updateVariablePositions]);
  
  useEffect(() => {
    const initializeFormula = async () => {
      try {
        let mathml = await formulaStore.mathML;
        console.log("🔍 Starting MathML update with:", mathml);
        
        if (!formulaRef.current) return;

        // Update the display
        formulaRef.current.innerHTML = mathml;

        // Wait for MathJax to complete rendering
        if (window.MathJax?.typesetPromise) {
          await window.MathJax.typesetPromise([formulaRef.current]);
        }
    
        // Parse and modify the MathML
        const parser = new DOMParser();
        const doc = parser.parseFromString(mathml, 'application/xml');
        
        // Debug the parsed document
        console.log("🔍 Parsed MathML structure:", doc);
        
        // First find all variables and their parent mjx-c elements
        doc.querySelectorAll('mjx-c').forEach(element => {
          const texClass = Array.from(element.classList)
            .find(c => c.startsWith('mjx-c1D'));
            
          if (!texClass) return;
          
          const texCode = texClass.substring(5, 10);
          const symbol = texToSymbol[texCode];
          
          if (!symbol) return;
          
          const varId = `var-${symbol}`;
          const variable = computationStore.variables.get(varId);
          
          console.log("🔍 Processing variable:", {
            symbol,
            varId,
            variable,
            element
          });
          
          if (variable?.type === 'fixed') {
            // Get the parent mjx-mi element
            const miElement = element.closest('mjx-mi');
            if (miElement && miElement.parentNode) {
              console.log("🔍 Found mjx-mi parent for replacement:", miElement);
              
              // Create new mjx-mn element
              const mnElement = document.createElement('mjx-mn');
              mnElement.innerHTML = `<mjx-c class="mjx-c${variable.value}"></mjx-c>`;
              
              // Replace the mjx-mi with mjx-mn
              miElement.parentNode.replaceChild(mnElement, miElement);
              console.log("🔍 Replaced variable with value:", variable.value);
            }
          }
        });
    
        // Convert back to string
        const serializer = new XMLSerializer();
        const updatedMathml = serializer.serializeToString(doc);
        console.log("🔍 Final MathML after updates:", updatedMathml);
    
        // Update the display
        formulaRef.current.innerHTML = updatedMathml;
    
        // Configure container styles
        const mjxContainer = formulaRef.current.querySelector("mjx-container");
        if (mjxContainer) {
          mjxContainer.style.fontSize = "2em";
          mjxContainer.style.padding = "1rem";
        }
    
        // Refresh MathJax rendering
        if (window.MathJax?.typesetPromise) {
          await window.MathJax.typesetPromise([formulaRef.current]);
          
          // Extract and initialize variables
          const extractedVars = extractVariablesFromMathML(updatedMathml);
          
          // Initialize variables in computation store
          computationStore.cleanup(extractedVars);
          computationStore.setFormula(formulaStore.latexWithoutStyling);
          
          extractedVars.forEach(symbol => {
            const id = `var-${symbol}`;
            computationStore.addVariable(id, symbol);
          });
        }
      } catch (error) {
        console.error("🔴 Error initializing formula:", error);
      }
    };
    console.log("🔍 Formula effect triggered. Variables state:", 
      Array.from(computationStore.variables.entries())
        .map(([id, v]) => `${id}:${v.type}:${v.value}`));

    initializeFormula();
  }, [
    formulaStore.mathML,
    // Watch for changes in variable values and types
    Array.from(computationStore.variables.entries())
      .map(([id, v]) => `${id}:${v.type}`)
      .join(','),
    formulaStore.latexWithoutStyling
  ]);

  useEffect(() => {
      // Only update variable positions after MathJax rendering
      updateVariablePositions();
  }, [
      Array.from(computationStore.variables.entries())
          .map(([id, v]) => `${id}:${v.type}:${v.value}`)
          .join(',')
  ]);

  // const handleVariableClick = (symbol: string, event: React.MouseEvent) => {
  //   event.stopPropagation();
  //   const varId = `var-${symbol}`;
  //   const variable = computationStore.variables.get(varId);
  //   if (!variable) return;

  //   const types: VariableType[] = ['fixed', 'slidable', 'dependent'];
  //   const currentIndex = types.indexOf(variable.type);
  //   const nextType = types[(currentIndex + 1) % types.length];
  //   computationStore.setVariableType(varId, nextType);
  // };

  return (
    <div css={css`
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      background-color: #f8fafc;
    `}>
      <div css={css`
        position: relative;
        padding: 2rem; // Increased padding
        background-color: white;
        border-radius: 0.5rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        min-height: 100px; // Increased min-height
      `}>
        {/* MathML Formula */}
        <div ref={formulaRef} css={css`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;

          & mjx-container {
            font-size: 3em !important; 
            transform-origin: center center;
            padding: 1.5rem;
          }

          & mjx-math {
            padding: 0.5rem 0;
            margin: 0;
            transform-origin: center center;
          }

          & mjx-mi {
            position: relative !important;
            transform-origin: center center;
          }
        `} />

        {/* Interactive Overlay */}
        <div css={css`
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
        `}>
          {Array.from(variables.entries()).map(([symbol, varInfo]) => (
            <InteractiveOverlay
              key={symbol}
              symbol={symbol}
              varInfo={varInfo}
              onClick={(e) => handleVariableClick(symbol, e)}
              onSlideChange={
                varInfo.type === 'slidable'
                  ? (value) => computationStore.setValue(`var-${symbol}`, value)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default InteractiveFormula;