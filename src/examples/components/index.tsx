import React from "react";

import { type ExampleComponentKey, exampleComponents } from "./registry";

// Re-export all example components
export { Kinetic2DExample } from "./Kinetic2D";
export type { ExampleComponentKey } from "./registry";

// Helper component to dynamically render examples
interface ExampleRendererProps {
  exampleKey: ExampleComponentKey;
}

export const ExampleRenderer: React.FC<ExampleRendererProps> = ({
  exampleKey,
}) => {
  const Component = exampleComponents[exampleKey];
  if (!Component) {
    return (
      <div className="p-8 text-center text-red-600">
        Example component not found: {exampleKey}
      </div>
    );
  }

  return <Component />;
};
