import { type ComponentType, type ReactElement, useMemo } from "react";

import { observer } from "mobx-react-lite";

import { useStore } from "./hooks";

/**
 * Mutable variable bag exposed to custom visualizations.
 * Reads pull from the computation store; writes push back into the store.
 */
export type Vars = Record<string, number>;

/** Props injected into custom visualizations by this module. */
export interface VarsProps {
  vars: Vars;
}

type RenderFn<P extends object = Record<string, never>> = (
  props: P & VarsProps
) => ReactElement | null;

/**
 * Signature for `Custom(...)`.
 * It accepts a render function (`RenderFn`) and returns a React component
 * that can receive its own props `P`, with `vars` optionally overrideable.
 */
type Define = <P extends object = Record<string, never>>(
  render: RenderFn<P>
) => ComponentType<P & { vars?: Vars }>;

const EMPTY_VARS: Vars = {};

/**
 * Creates a proxy so custom code can read/write `vars.<name>` directly.
 * - `get` reads from the store
 * - `set` writes back to the store (only for valid numbers)
 * - `ownKeys` + descriptor keep enumeration (`Object.keys`, spread) working
 */
const createVarsProxy = (
  getVariable: (varId: string) => number,
  setVariable: (varId: string, value: number) => boolean,
  getVariableKeys: () => string[]
): Vars =>
  new Proxy({} as Vars, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return getVariable(prop);
    },
    set(_target, prop, value) {
      if (typeof prop !== "string") return true;
      if (typeof value !== "number" || Number.isNaN(value)) return true;
      setVariable(prop, value);
      return true;
    },
    ownKeys() {
      return getVariableKeys();
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  });

/**
 * Builds a stable proxy for custom visualizations.
 * Recreated only when the backing store reference changes.
 */
const useVars = (): Vars => {
  const store = useStore();
  return useMemo<Vars>(
    () =>
      createVarsProxy(
        (variableName) => store?.getVariable(variableName) ?? 0,
        (variableName, value) =>
          store?.setVariable(variableName, value) ?? false,
        () =>
          store?.computationStore
            ? Array.from(store.computationStore.variables.keys())
            : []
      ),
    [store]
  );
};

/**
 * Public API:
 * `const MyViz = Custom(({ vars }) => ...)`
 *
 * The returned component is observed so it reacts to MobX-backed `vars` reads.
 * `vars` can still be passed explicitly for tests or advanced composition.
 */
const define: Define = <P extends object = Record<string, never>>(
  render: RenderFn<P>
) => {
  return observer((props: P & { vars?: Vars }) => {
    const injectedVars = useVars();
    return render({
      ...(props as P),
      vars: props.vars ?? injectedVars ?? EMPTY_VARS,
    } as P & VarsProps);
  });
};

/** Callable API: `Custom(({ vars }) => ...)`. */
export const Custom: Define = define;
