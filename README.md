# Delta DSL

A DSL for interactive mathematical formulas built with React, TypeScript, and Vite that provides real-time visualization and computation capabilities.

## Features

- **Delta DSL API** - Declarative API for programmatic "executable" formula configuration
- **Multi-Engine Computation** - Support for manual step-through, symbolic algebra
- **Real-time Visualization** - 2D/3D plotting with D3.js and Plotly.js integration
- **Variable Management** - Dependency tracking and automatic recomputation

## Installation

### Quick Start (Recommended)

```bash
npm install delta-dsl
```

### Manual Peer Dependencies Installation

Delta DSL requires several peer dependencies. Install them based on your needs:

**Core (Required):**

```bash
npm install react react-dom mobx mobx-react-lite mobx-state-tree
```

**Math Rendering (Required):**

```bash
npm install mathjax-full better-react-mathjax katex mathjs
```

**Formula Canvas (Required for FormulaComponent):**

```bash
npm install @xyflow/react lucide-react lodash
```

**2D/3D Plotting (Required for Graph):**

```bash
npm install plotly.js-dist d3
```

**Code Editor (Optional - for step-through debugging):**

```bash
npm install codemirror @codemirror/autocomplete @codemirror/lang-javascript @codemirror/language @codemirror/legacy-modes @codemirror/state @codemirror/view @uiw/react-codemirror
```

**All-in-one installation:**

```bash
npm install delta-dsl react react-dom mobx mobx-react-lite mobx-state-tree mathjax-full better-react-mathjax katex mathjs @xyflow/react lucide-react lodash plotly.js-dist d3 codemirror @codemirror/autocomplete @codemirror/lang-javascript @codemirror/language @codemirror/legacy-modes @codemirror/state @codemirror/view @uiw/react-codemirror
```

Don't forget to import the CSS:

```tsx
import "delta-dsl/style.css";
```

### Basic Usage

```tsx
import { type Config, Formula, Provider } from "delta-dsl";
import "delta-dsl/style.css";

const config: Config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: String.raw`K = \frac{1}{2}mv^2`,
    },
  ],
  variables: {
    K: { name: "Kinetic energy", units: "J" },
    m: {
      default: 1,
      input: "inline",
      range: [0, 10],
      name: "Mass",
      units: "kg",
    },
    v: {
      default: 2,
      input: "drag",
      range: [0, 10],
      name: "Velocity",
      units: "m/s",
    },
  },
  semantics: ({ vars }) => {
    vars.K = 0.5 * vars.m * vars.v ** 2;
  },
};

export default function App() {
  return (
    <Provider config={config}>
      <Formula id="kinetic-energy" />
    </Provider>
  );
}
```

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: MobX with decorators
- **Math Rendering**: KaTeX, MathJax
- **Code Editor**: CodeMirror 6
- **Visualization**: D3.js, Plotly.js

---

## Development

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Setup

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3005`

### Building

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Code Quality

Run the focused test suite:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Run TypeScript type checking:

```bash
tsc
```

### Deployment

Deploy to docs/forge/ directory:

```bash
npm run deploy
```

## Project Structure

- `src/api/` - Delta DSL API and computation engines
- `src/renderer/` - Core interactive formula components
- `src/visualizations/` - 2D/3D plotting engines
- `src/types/` - TypeScript type definitions
- `src/examples/` - Example formula API configurations

## Architecture

The application uses a multi-store MobX architecture with:

- **computationStore** - Variable computation and evaluation

Three computation engines are available:

- **manual** - Manual step-through with JS interpreter
- **symbolic-algebra** - Mathematical computation engine
