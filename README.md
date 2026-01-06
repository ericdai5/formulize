# Formulize

An API for interactive mathematical formula built with React, TypeScript, and Vite that provides real-time formula visualization and computation capabilities.

## Features

- **Formulize API** - Declarative API for programmatic "executable" formula configuration
- **Multi-Engine Computation** - Support for manual step-through, symbolic algebra, and LLM-powered function generation
- **Real-time Visualization** - 2D/3D plotting with D3.js and Plotly.js integration
- **Variable Management** - Dependency tracking and automatic recomputation

## Installation

### Quick Start (Recommended)

Install with all peer dependencies automatically:

```bash
npx install-peerdeps formulize-math
```

```bash
npm install formulize-math
```

### Manual Peer Dependencies Installation

Formulize requires several peer dependencies. Install them based on your needs:

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

**3D Plotting (Optional - for Plot3D):**

```bash
npm install plotly.js-dist d3
```

**Code Editor (Optional - for step-through debugging):**

```bash
npm install codemirror @codemirror/autocomplete @codemirror/lang-javascript @codemirror/language @codemirror/legacy-modes @codemirror/state @codemirror/view @uiw/react-codemirror js-interpreter
```

**All-in-one installation:**

```bash
npm install formulize-math react react-dom mobx mobx-react-lite mobx-state-tree mathjax-full better-react-mathjax katex mathjs @xyflow/react lucide-react lodash plotly.js-dist d3 codemirror @codemirror/autocomplete @codemirror/lang-javascript @codemirror/language @codemirror/legacy-modes @codemirror/state @codemirror/view @uiw/react-codemirror js-interpreter
```

Don't forget to import the CSS:

```tsx
import "formulize-math/style.css";
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

- Node.js (version 16 or higher)
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

- `src/api/` - Formulize API and computation engines
- `src/renderer/` - Core interactive formula components
- `src/visualizations/` - 2D/3D plotting engines
- `src/types/` - TypeScript type definitions
- `src/examples/` - Example formula API configurations

## Architecture

The application uses a multi-store MobX architecture with:

- **computationStore** - Variable computation and evaluation
- **formulaStoreManager** - Individual formula store management

Three computation engines are available:

- **manual** - Manual step-through with JS interpreter
- **symbolic-algebra** - Mathematical computation engine
- **llm** - LLM-powered function generation
