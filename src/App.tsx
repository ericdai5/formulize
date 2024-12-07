import { Global, css } from "@emotion/react";

import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
import { Menu } from "./Menu";
import { Workspace } from "./Workspace";
import { InteractiveFormula } from "./InteractiveFormula";
import LLMFunction from './LLMFunction';


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
          <div css={css`
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
          `}>
            <div css={css`
              flex: 1;
              position: relative;
              overflow: auto;
            `}>
              <Editor />
            </div>
            <div css={css`
              flex: 0.5;
              min-height: 200px;
              border-top: 2px solid black;
              overflow: auto;
            `}>
              <LLMFunction />
            </div>
          </div>
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
          <div css={css`
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
          `}>
            <div css={css`
              flex: 1;
              position: relative;
              overflow: auto;
            `}>
              <Workspace />
            </div>
            <div css={css`
              flex: 0.5;
              min-height: 200px;
              border-top: 2px solid black;
              overflow: auto;
            `}>
              <InteractiveFormula />
            </div>
          </div>
        </div>
        <div
          css={css`
            width: 30%;
            height: 100%;
            background: #f0f0f0;
            border-left: 2px solid black;
          `}
        >
          <ElementPane />
        </div>
      </div>
    </>
  );
}

export default App;