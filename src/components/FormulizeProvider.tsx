import React, { useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import Formulize, { FormulizeConfig, FormulizeInstance } from "../formulize";
import { FormulizeContext, FormulizeContextValue } from "./useFormulize";

interface FormulizeProviderProps {
  config?: FormulizeConfig;
  children: React.ReactNode;
  onError?: (error: string | null) => void;
  onReady?: (instance: FormulizeInstance) => void;
}

export const FormulizeProvider: React.FC<FormulizeProviderProps> = observer(
  ({ config, children, onError, onReady }) => {
    const [instance, setInstance] = useState<FormulizeInstance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const instanceRef = useRef<FormulizeInstance | null>(null);

    useEffect(() => {
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

          // Create new Formulize instance
          const instance = await Formulize.create(config);
          instanceRef.current = instance;
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
    }, [config, onError, onReady]);

    const contextValue: FormulizeContextValue = {
      instance,
      config: config || null,
      isLoading,
      error,
    };

    return (
      <FormulizeContext.Provider value={contextValue}>
        {children}
      </FormulizeContext.Provider>
    );
  }
);

export default FormulizeProvider;
