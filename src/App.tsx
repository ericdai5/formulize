import { Global, css } from "@emotion/react";
import { useEffect, useState } from "react";

import { Editor } from "./Editor";
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
      />
      <div
        css={css`
          display: flex;
          flex-direction: row;
          width: 100%;
          height: 100%;
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            position: relative;
            height: 100%;
            width: 50%;
            border-right: 2px solid black;
            overflow-x: hidden;
            overflow-y: auto;
          `}
        >
          <Editor />
        </div>
        <Workspace />
      </div>
    </>
  );
}

export default App;
