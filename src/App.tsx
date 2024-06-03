import { Global, css } from "@emotion/react";

import { Editor } from "./Editor";
import { Menu } from "./Menu";
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
            overflow: hidden;
          }

          .inactive-styled-range {
            border-top: 2px solid red;
          }

          .active-styled-range {
            border-top: 5px solid red;
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
        <div
          css={css`
            display: flex;
            flex-direction: column;
            position: relative;
            width: 100%;
            height: 100%;
          `}
        >
          <Menu />
          <Workspace />
        </div>
      </div>
    </>
  );
}

export default App;
