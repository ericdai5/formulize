import { IContext } from "../../types/custom";

// Registry for custom visualization components - starts empty for dynamic registration
const CUSTOM_COMPONENT_REGISTRY: Record<
  string,
  React.ComponentType<{ context: IContext }>
> = {
  // Components will be registered dynamically via the API
};

// Register a custom visualization component
export const register = (
  name: string,
  component: React.ComponentType<{ context: IContext }>
) => {
  CUSTOM_COMPONENT_REGISTRY[name] = component;
};

// Get all registered component names
export const getAllRegistered = (): string[] => {
  return Object.keys(CUSTOM_COMPONENT_REGISTRY);
};

// Check if a component is registered
export const isRegistered = (name: string): boolean => {
  return name in CUSTOM_COMPONENT_REGISTRY;
};

// Unregister a custom visualization component
export const unRegister = (name: string): boolean => {
  if (name in CUSTOM_COMPONENT_REGISTRY) {
    delete CUSTOM_COMPONENT_REGISTRY[name];
    return true;
  }
  return false;
};

// Get a registered component
export const getRegistered = (
  name: string
): React.ComponentType<{ context: IContext }> | undefined => {
  return CUSTOM_COMPONENT_REGISTRY[name];
};
