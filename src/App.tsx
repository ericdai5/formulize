import { useEffect, useState } from "react";
import { Global, css } from "@emotion/react";

import { Workspace } from "./Workspace";

function App() {
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
