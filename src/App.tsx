import { useEffect, useState } from "react";
import { Global, css } from "@emotion/react";

import { Workspace } from "./Workspace";

function App() {
  // Convert TeX to MathML & SVG
  // const [rendered, setRendered] = useState(false);
  // useEffect(() => {
  //   if (!rendered) {
  //     const tree = MathJax.tex2mml("a^2 + b^2 = c^2", {});
  //     const treeNode = new DOMParser().parseFromString(tree, "text/xml");
  //     console.log(treeNode);
  //     const node = MathJax.tex2svg("a^2 + b^2 = c^2", {});
  //     console.log(node);
  //     document.body.appendChild(node);
  //     setRendered(true);
  //   }
  // }, [rendered, setRendered]);

  return (
    <>
      <Global
        styles={css`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html,
          body {
            width: 100vw;
            height: 100vh;
          }
        `}
      ></Global>
      <Workspace />
    </>
  );
}

export default App;
