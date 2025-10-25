import { createContext, useContext } from "react";

import { FormulizeConfig, FormulizeInstance } from "../formulize";

export interface FormulizeContextValue {
  instance: FormulizeInstance | null;
  config: FormulizeConfig | null;
  isLoading: boolean;
  error: string | null;
}

export const FormulizeContext = createContext<FormulizeContextValue | null>(null);

export const useFormulize = () => {
  const context = useContext(FormulizeContext);
  if (!context) {
    throw new Error("useFormulize must be used within FormulizeProvider");
  }
  return context;
};
