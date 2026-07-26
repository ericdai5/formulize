# Delta DSL

Delta is a JSON DSL and React component library for adding interactivity to
typeset formulas in web documents. It lets authors make formulas computable,
explain them with step-by-step walkthroughs, and synchronize manipulation
across formulas, prose, and visualizations.

The npm package is
[`delta-dsl`](https://www.npmjs.com/package/delta-dsl).

## Installation

Delta currently supports React 18.

```bash
npm install delta-dsl react@18 react-dom@18
```

npm 7 and newer install the package's declared peer dependencies
automatically when normal peer resolution is enabled. If
`npm config get legacy-peer-deps` prints `true`, use:

```bash
npm install delta-dsl react@18 react-dom@18 --legacy-peer-deps=false
```

Import Delta's stylesheet once in the application:

```tsx
import "delta-dsl/style.css";
```

Import package APIs from `delta-dsl` and the stylesheet from
`delta-dsl/style.css`. Other deep-import paths are not public package exports.

## Getting started

This example follows the kinetic-energy calculator from the Delta paper. It
adds a LaTeX formula, makes mass directly editable, makes velocity draggable,
and recomputes kinetic energy whenever either input changes.

```tsx
import { type Config, Formula, Provider } from "delta-dsl";
import "delta-dsl/style.css";

const kineticConfig: Config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\frac{1}{2}mv^2",
    },
  ],
  variables: {
    K: {
      name: "Kinetic Energy",
      precision: 2,
      latexDisplay: "value",
      labelDisplay: "name",
    },
    m: {
      name: "Mass",
      default: 5,
      input: "inline",
      range: [0, 20],
      latexDisplay: "value",
      labelDisplay: "name",
    },
    v: {
      name: "Velocity",
      default: 2,
      input: "drag",
      range: [0, 10],
      labelDisplay: "value",
    },
  },
  semantics: function ({ vars }) {
    vars.K = 0.5 * vars.m * Math.pow(vars.v, 2);
  },
};

export default function App() {
  return (
    <Provider config={kineticConfig}>
      <Formula id="kinetic-energy" />
    </Provider>
  );
}
```

Click the mass value in the formula, enter a number, and press Enter. Drag the
velocity value vertically to scrub it. Delta reruns `semantics`, updates
`vars.K`, and rerenders the affected formula.

## Language constructs

A Delta `Config` has three main constructs:

1. `formulas` declares the LaTeX expressions.
2. `variables` selects expressions from that LaTeX and describes how readers
   can view or manipulate them.
3. `semantics` computes values, records graph samples, and inserts walkthrough
   steps.

The optional top-level constructs are `graph2d`, `graph3d`, and `stepping`.
The paper also identifies styling properties such as `color`, `fontSize`,
`labelFontSize`, `lineWidth`, and `opacity`, while omitting styling fields from
its formal grammar.

### Formulas

Each formula has two fields:

| Field   | Description                                             |
| ------- | ------------------------------------------------------- |
| `id`    | Handle used by the React `Formula` component            |
| `latex` | Formula written as a JavaScript string containing LaTeX |

LaTeX command backslashes must be escaped in ordinary JavaScript strings:

```tsx
{
  id: "quadratic",
  latex: "y = ax^2 + bx + c",
}
```

Wrap related artifacts in one provider and render a formula by its ID:

```tsx
<Provider config={config}>
  <Formula id="quadratic" />
</Provider>
```

### Variables

Variable keys are literal selectors copied from the formula's LaTeX. A
selector can be one symbol or a longer expression.

```tsx
variables: {
  x: {
    name: "Input",
    default: 2,
    input: "drag",
    range: [-10, 10],
    step: 0.25,
    precision: 2,
  },
}
```

A variable may also use a number as shorthand:

```tsx
variables: {
  c: 299_792_458,
}
```

The variable properties described in the paper are:

| Property       | Purpose                                                      |
| -------------- | ------------------------------------------------------------ |
| `name`         | Descriptive label                                            |
| `default`      | Initial value                                                |
| `input`        | `"drag"` for scrubbing or `"inline"` for direct entry        |
| `range`        | Minimum and maximum interactive values                       |
| `step`         | Change applied by one interaction increment                  |
| `precision`    | Fixed numeric precision                                      |
| `sigFigs`      | Number of significant figures                                |
| `latexDisplay` | Show the selector's `"name"`, `"value"`, or `"svg"` in situ  |
| `labelDisplay` | Show `"name"`, `"value"`, `"svg"`, or `"none"` in its label  |
| `svgContent`   | Function that maps the value and variable environment to SVG |
| `svgSize`      | SVG dimensions as `{ w, h }`                                 |

Values can be numbers or lists. Lists can be displayed and used by
`semantics`, but they are not interactive. A variable's `svgContent` can
replace notation with a graphical representation that changes with the
variable value.

### Semantics

`semantics` is a JavaScript function whose context contains:

| Context member | Purpose                                                 |
| -------------- | ------------------------------------------------------- |
| `vars`         | Read declared inputs and assign computed outputs        |
| `sample`       | Record a named `{ x, y, z? }` point for a linked graph  |
| `step`         | Insert a walkthrough step                               |
| `latex`        | Format calculated numeric values for walkthrough labels |

Updating an interactive variable reruns the function and propagates affected
values to formulas and other linked artifacts.

```tsx
semantics: function ({ vars, sample }) {
  vars.y = Math.pow(vars.x, 2);
  sample("square", { x: vars.x, y: vars.y });
},
```

Ordinary JavaScript control flow, local values, loops, and conditionals can be
used inside `semantics`.

### Walkthroughs

Set `stepping: true` and call `step` from `semantics` to define an ordered
walkthrough. A step may have a description for the full formula and labels
attached to variables or expressions selected by literal LaTeX.

```tsx
stepping: true,
semantics: function ({ vars, step, latex }) {
  vars.y = Math.pow(vars.x, 2);

  step(
    {
      description: "Square the current input.",
      labels: {
        x: latex(vars.x).precision(2),
        y: latex(vars.y).precision(2),
      },
    },
    "square-step",
  );
},
```

Any number of steps can be emitted. They appear in execution order and can be
navigated forward and backward. The optional second `step` argument identifies
the step so linked graph elements can refer to it.

### Linked graphs

Graph samples are recorded in `semantics` and referenced by `sampleId`. Render
a configured 2D or 3D graph with the `Graph` component and its graph ID.

```tsx
import { Formula, Graph, Provider } from "delta-dsl";

<Provider config={config}>
  <Formula id="kinetic-energy" />
  <Graph id="energy-graph" />
</Provider>;
```

A 2D graph can contain lines, points, and vectors:

```tsx
graph2d: [
  {
    id: "energy-graph",
    xAxisVar: "v",
    yAxisVar: "K",
    lines: [
      {
        sampleId: "energy",
        parameter: "v",
        interaction: ["vertical-drag", "m"],
      },
    ],
    points: [
      {
        sampleId: "energy",
        interaction: ["horizontal-drag", "v"],
      },
    ],
  },
],
```

The paper describes these 2D graph properties:

- Graph: `id`, `xAxisVar`, `yAxisVar`, `xAxisLabel`, `yAxisLabel`, `xRange`,
  `yRange`, `lines`, `points`, and `vectors`.
- Line: `sampleId`, `parameter`, `range`, `samples`, and `interaction`.
- Point: `sampleId`, `interaction`, `stepId`, and `persistence`.
- Vector: `startSampleId`, `endSampleId`, `label`, `interaction`, `curved`,
  `stepId`, and `persistence`.
- Drag interaction: `["horizontal-drag", variableId]` or
  `["vertical-drag", variableId]`.

A 3D graph can contain surfaces, lines, and points. Its paper-described
properties are:

- Graph: `id`, `xRange`, `yRange`, `zRange`, `surfaces`, `lines`, and `points`.
- Surface: `sampleId`, `parameters`, `ranges`, and `samples`.
- Line: `sampleId`, `parameter`, `range`, and `samples`.
- Point: `sampleId`.

Points and vectors can use `stepId` to synchronize with a walkthrough. Setting
`persistence: true` keeps them visible as later steps are reached.

### Synchronization

Artifacts inside the same `Provider` share variable values and hover state.
This supports:

- variables embedded in prose that stay linked to formula occurrences;
- multiple formulas synchronized through shared variable selectors;
- custom content that reads and writes the shared `vars` object; and
- bidirectional links between formulas and graphs.

The paper describes inline prose variables and custom content as integration
mechanisms, but does not define their exact exported component names or prop
contracts.

## Implementation

As described in the paper, Delta parses a formula's LaTeX into an AST with
KaTeX, identifies configured variables, and renders the augmented LaTeX to
HTML with MathJax. Formula labels use a ReactFlow canvas. A MobX store keeps
variable values, hover state, steps, and samples synchronized through React
context.

## Repository development

The development application requires Node.js 20 or newer.

```bash
git clone https://github.com/ericdai5/delta-dsl.git
cd delta-dsl
npm install
npm run dev
```

The development server runs at `http://localhost:3005`.

Run the repository checks with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` creates the publishable library in `dist/`.
`prepublishOnly` runs tests, type checking, and the production build before
publication.

## License and support

Delta is available under the [MIT License](./LICENSE).

- [Source](https://github.com/ericdai5/delta-dsl)
- [Issues](https://github.com/ericdai5/delta-dsl/issues)
- [npm package](https://www.npmjs.com/package/delta-dsl)
