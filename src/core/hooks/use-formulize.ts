import { createContext, useContext } from "react";

import { FormulizeConfig, FormulizeInstance } from "../../formulize";
import { ComputationStore } from "../../store/computation";

export interface FormulizeContextValue {
  instance: FormulizeInstance | null;
  config: FormulizeConfig | null;
  isLoading: boolean;
  error: string | null;
  computationStore: ComputationStore | null;
  /** Reinitialize steps by re-running the semantics function */
  reinitialize: () => void;
}

export const FormulizeContext = createContext<FormulizeContextValue | null>(
  null
);

/**
 * Hook to access the Formulize context.
 * Returns null if not within FormulizeProvider, allowing components
 * to work both with context and with explicit props.
 */
export const useFormulize = (): FormulizeContextValue | null => {
  return useContext(FormulizeContext);
};
