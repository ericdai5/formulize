import { createContext, useContext } from "react";

import { Config, Instance } from "../../formulize";
import { ComputationStore } from "../../store/computation";

export interface StoreContextValue {
  instance: Instance | null;
  config: Config | null;
  isLoading: boolean;
  error: string | null;
  computationStore: ComputationStore | null;
  /** Reinitialize steps by re-running the semantics function */
  reinitialize: () => void;
}

export const StoreContext = createContext<StoreContextValue | null>(
  null
);

/**
 * Hook to access the Core context.
 * Returns null if not within Provider, allowing components
 * to work both with context and with explicit props.
 */
export const useStore = (): StoreContextValue | null => {
  return useContext(StoreContext);
};
