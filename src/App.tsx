import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

// import { mathjax } from "mathjax-full/ts/mathjax.ts";
// import { TeX } from "mathjax-full/ts/input/tex.ts";
// import { SVG } from "mathjax-full/ts/output/svg.ts";
// import { CHTML } from "mathjax-full/ts/output/chtml.ts";
// import { liteAdaptor } from "mathjax-full/ts/adaptors/liteAdaptor.ts";
// import { RegisterHTMLHandler } from "mathjax-full/ts/handlers/html.ts";
// import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

function App() {
  const [count, setCount] = useState(1);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    if (!rendered) {
      const tree = MathJax.tex2mml("a^2 + b^2 = c^2", {});
      const treeNode = new DOMParser().parseFromString(tree, "text/xml");
      console.log(treeNode);
      const node = MathJax.tex2svg("a^2 + b^2 = c^2", {});
      console.log(node);
      document.body.appendChild(node);
      setRendered(true);
    }
  }, [rendered, setRendered]);

  // const html = mathjax.document(document, { InputJax: tex, OutputJax: chtml });
  // const adaptor = liteAdaptor();;
  // const handler = RegisterHTMLHandler(adaptor);;

  // const tex = new TeX({ packages: ["base", "ams"] });;
  // const svg = new SVG({ fontCache: "local" });;
  // const chtml = new CHTML({;
  //   fontURL:;
  //     "https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2",;
  // });;
  // const node = html.convert("a^2 + b^2 = c^2", {
  //   display: true,
  //   // em: argv.em,
  //   // ex: argv.ex,
  //   // containerWidth: argv.width
  // });
  // console.log(adaptor.outerHTML(node));

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
