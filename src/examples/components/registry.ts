// Example registry for dynamic loading
import { Kinetic2DExample } from "./Kinetic2D";

export const exampleComponents = {
  kinetic2D: Kinetic2DExample,
} as const;

export type ExampleComponentKey = keyof typeof exampleComponents;
