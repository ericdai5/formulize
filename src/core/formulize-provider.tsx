import React, { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import beautify from "js-beautify";

import { refresh } from "../engine/execute";
import { extractManual } from "../engine/extract";
import Formulize, { FormulizeConfig, FormulizeInstance } from "../formulize";
import { MathJaxLoader } from "../internal/mathjax-loader";
import { FormulizeContext, FormulizeContextValue } from "./hooks/use-formulize";
import { useMathJax } from "../util/use-mathjax";

interface FormulizeProviderProps {
  config?: FormulizeConfig;
  children: React.ReactNode;
  onError?: (error: string | null) => void;
  onReady?: (instance: FormulizeInstance) => void;
}

// Inner provider that runs after MathJax is loaded
const FormulizeProviderInner: React.FC<FormulizeProviderProps> = observer(
  ({ config, children, onError, onReady }) => {
    const [instance, setInstance] = useState<FormulizeInstance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const instanceRef = useRef<FormulizeInstance | null>(null);
    const { isLoaded: mathJaxLoaded } = useMathJax();

    useEffect(() => {
      // Only initialize after MathJax is loaded
      if (!mathJaxLoaded) {
        return;
      }

      if (!config) {
        setInstance(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const initializeFormulize = async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Clean up previous instance
          if (instanceRef.current) {
            instanceRef.current.destroy();
            instanceRef.current = null;
          }

          // Double-check MathJax is available
          if (!window.MathJax || !window.MathJax.tex2chtml) {
            throw new Error("MathJax is not properly loaded");
          }

          // Create new Formulize instance
          const instance = await Formulize.create(config);
          instanceRef.current = instance;

          // Extract and store the code in executionStore
          const result = extractManual(config);
          if (result.code && instance.executionStore) {
            instance.executionStore.setCode(result.code);
            instance.executionStore.setEnvironment(config);
            // Format user-facing code
            // Note: If extractManual returned code, config.semantics must exist
            const semanticFunction = config.semantics!;
            const functionString = semanticFunction.toString();
            const formattedCode = beautify.js(functionString, {
              indent_size: 2,
              space_in_empty_paren: false,
              preserve_newlines: true,
              max_preserve_newlines: 2,
              brace_style: "collapse",
              keep_array_indentation: false,
            });
            // Initialize the interpreter (this calls reset() which clears userCode)
            if (instance.computationStore) {
              refresh(
                result.code,
                config,
                instance.executionStore,
                instance.computationStore
              );
            }
            // Set userCode AFTER refresh() since refresh() calls reset() which clears userCode
            instance.executionStore.setUserCode(formattedCode);
          }
          setInstance(instance);
          if (onReady) {
            onReady(instance);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setInstance(null);

          if (onError) {
            onError(errorMessage);
          }
        } finally {
          setIsLoading(false);
        }
      };

      initializeFormulize();

      // Cleanup on unmount or config change
      return () => {
        if (instanceRef.current) {
          instanceRef.current.destroy();
          instanceRef.current = null;
        }
      };
    }, [config, onError, onReady, mathJaxLoaded]);

    const reinitialize = useCallback(() => {
      if (!instance?.executionStore || !instance?.computationStore || !config) {
        return;
      }
      const result = extractManual(config);
      if (result.code) {
        refresh(
          result.code,
          config,
          instance.executionStore,
          instance.computationStore
        );
      }
    }, [instance, config]);

    const contextValue: FormulizeContextValue = {
      instance,
      config: config || null,
      isLoading,
      error,
      computationStore: instance?.computationStore ?? null,
      executionStore: instance?.executionStore ?? null,
      reinitialize,
    };

    return (
      <FormulizeContext.Provider value={contextValue}>
        {children}
      </FormulizeContext.Provider>
    );
  }
);

// Outer provider that ensures MathJax is loaded first
export const FormulizeProvider: React.FC<FormulizeProviderProps> = (props) => {
  return (
    <MathJaxLoader>
      <FormulizeProviderInner {...props} />
    </MathJaxLoader>
  );
};

export default FormulizeProvider;
