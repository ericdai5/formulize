# Formulize

An API for interactive mathematical formula built with React, TypeScript, and Vite that provides real-time formula visualization and computation capabilities.

## Features

- **Formulize API** - Declarative API for programmatic "executable" formula configuration
- **Multi-Engine Computation** - Support for manual step-through, symbolic algebra, and LLM-powered function generation
- **Real-time Visualization** - 2D/3D plotting with D3.js and Plotly.js integration
- **Variable Management** - Dependency tracking and automatic recomputation

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: MobX with decorators
- **Math Rendering**: KaTeX, MathJax
- **Code Editor**: CodeMirror 6
- **Visualization**: D3.js, Plotly.js

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

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
