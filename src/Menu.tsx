import {default as React} from "react";
import { css } from "@emotion/react";
import Icon from '@mui/material/Icon';
import BoxIcon from './Icons/BoxIcon.svg';
import AnnotateIcon from './Icons/AnnotateIcon.svg';
import LogoIcon from './Icons/LogoIcon.svg';
import LineDivideIcon from './Icons/LineDivideIcon.svg';
import BracketListOption from './Icons/BracketListOption.svg'
import CurlyBraceListOption from './Icons/CurlyBraceListOption.svg'

import { styleStore } from "./store";

export const Menu = () => {
  return (
      <div
          css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2rem;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        background: #f0f0f0;
      `}
      >

        <LogoMenu />
        <LineDivideMenu />

        <SaveMenu />
        <UndoMenu />
        <RedoMenu />
        <ZoomMenu />
        <LineDivideMenu />

        <BoldMenu />
        <ItalicsMenu />
        <UnderlineMenu />
        <StrikethroughMenu />
        <ColorMenu />
        <BoxMenu />
        <LineWeightMenu />
        <LineDivideMenu />

        <AnnotateMenu />

      </div>
  );
};

type MenuItemProps = {
  onClick: () => void;
};

const MenuItem = ({
                    children,
                    onClick,
                  }: React.PropsWithChildren<MenuItemProps>) => {
  return (
      <div
          css={css`
        height: 2.5rem;
        min-width: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        &:hover {
          background: #e0e0e0;
          height: 2rem;
        }
        font-family: "Source Sans 3", sans-serif;
      `}
          onClick={(e) => {
            onClick();
            e.stopPropagation();
          }}
      >
        {children}
      </div>
  );
};

type ColorSwatchProps = {
  color: string;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
};

const ColorSwatch = ({ color, onClick }: ColorSwatchProps) => {
  return (
      <div
          onClick={onClick}
          css={css`
        width: 1rem;
        height: 1rem;
        background-color: ${color};
        border: 1px solid black;
      `}
      ></div>
  );
};

type SubMenuProps = {
  menuButton: React.ReactNode;
};


const SubMenu = ({
                   menuButton,
                   children,
                 }: React.PropsWithChildren<SubMenuProps>) => {
  const [open, setOpen] = React.useState(false);

  const handleDropDownFocus = (state: boolean) => {
        setOpen(!state);
  };
  const handleClickOutsideDropdown =()=>{
        if(open){
            setOpen(false)

        }
  };
  window.addEventListener("click", handleClickOutsideDropdown);


  return (
      <div
          css={css`
        position: relative;
        height: 2rem;
        display: flex;
        align-items: center;
        &:hover {
            height: 1.8rem;
        }
      `}
      >
        <MenuItem
            onClick={() => {
              setOpen(!open);
            }}
            onClick={() => handleDropDownFocus(open)}
        >
          {menuButton}
          {open && (
              <div
                  css={css`
              position: absolute;
              top: 2rem;
              left: 0;
              display: flex;
              flex-direction: column;
              background: #f0f0f0;
            `}
              >
                {children}
              </div>
          )}
        </MenuItem>
      </div>
  );
};

const LogoMenu = () => {
  return (
      <div
          css={css`
        height: 2.25rem;
        width: 2.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      ><img src={LogoIcon} /></div>

  );
};

const SaveMenu = () => {
  return (
      <div
          css={css`
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      ><Icon>save</Icon></div>

  );
};

const UndoMenu = () => {
  return (
      <div
          css={css`
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      ><Icon>undo</Icon></div>

  );
};

const RedoMenu = () => {
  return (
      <div
          css={css`
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      ><Icon>redo</Icon></div>

  );
};

const ZoomMenu = () => {
  return (
      <div
          css={css`
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      ><Icon>zoom_in</Icon></div>

  );
};

const BoldMenu = () => {
  return (
      <MenuItem menuButton={<Icon>format_bold</Icon>}>
        <div
            onClick={(e) => {
                styleStore.setSelectionBold();
                e.stopPropagation();
            }}
        >
          <Icon>format_bold</Icon>
        </div>
      </MenuItem>

  );
};

const ItalicsMenu = () => {
  return (
      <MenuItem menuButton={<Icon>format_italic</Icon>}>
        <div
            onClick={(e) => {
                styleStore.setSelectionItalic();
                e.stopPropagation();
            }}
        >
          <Icon>format_italic</Icon>
        </div>
      </MenuItem>
  );
};

const UnderlineMenu = () => {
  return (
      <MenuItem menuButton={<Icon>format_underline</Icon>}>
        <div
            onClick={(e) => {
                styleStore.setSelectionUnderline();
                e.stopPropagation();
            }}
        >
          <Icon>format_underline</Icon>
        </div>
      </MenuItem>

  );
};

const StrikethroughMenu = () => {
  return (
      <MenuItem menuButton={<Icon>format_strikethrough</Icon>}>
        <div
            onClick={(e) => {
                styleStore.setSelectionStrikethrough();
                e.stopPropagation();
            }}
        >
          <Icon>format_strikethrough</Icon>
        </div>
      </MenuItem>
  );
};

const ColorMenu = () => {
  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#00FFFF",
    "#FF00FF",
  ];

  return (
      <SubMenu menuButton={<Icon>format_color_text</Icon>}>
        <div
            css={css`
          padding: 0.5rem;
          width: 7rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
        >
          {colors.map((color) => (
              <div
                  key={color}
                  css={css`
              margin: 0.25rem;
            `}
                  onClick={(e) => {
                    styleStore.setSelectionColor(color);
                    e.stopPropagation();
                  }}
              >
                <ColorSwatch key={color} color={color} />
              </div>
          ))}
        </div>
      </SubMenu>
  );
};

const BoxMenu = () => {
  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#00FFFF",
    "#FF00FF",
  ];

  return (
      <SubMenu menuButton={<img src={BoxIcon}/>}>
        <div
            css={css`
          padding: 0.5rem;
          width: 7rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
        >
          {colors.map((color) => (
              <div
                  key={color}
                  css={css`
              margin: 0.25rem;
            `}
                  onClick={(e) => {
                    styleStore.setSelectionColor(color);
                    e.stopPropagation();
                  }}
              >
                <ColorSwatch key={color} color={color} />
              </div>
          ))}
        </div>
      </SubMenu>
  );
};

const LineWeightMenu = () => {
  const weights = [
    "Thin",
    "Normal",
    "Thick",
  ];

  return (
      <SubMenu menuButton={<Icon>line_weight</Icon>}>
        <div
            css={css`
          padding: 0.5rem;
          width: 5rem;
          display: flex;
          flex-direction: column;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
        >
          {weights.map((weight) => (
              <div
                  key={weight}
                  css={css`
              margin: 0.25rem;
            `}
                  onClick={(e) => {
                    styleStore.setSelectionLineWeight(weight);
                    e.stopPropagation();
                  }}
              >
                {weight}
              </div>
          ))}
        </div>
      </SubMenu>
  );
};

const AnnotateMenu = () => {
    const annotationHeads = [
        BracketListOption,
        CurlyBraceListOption,
    ]
  return (
      <SubMenu menuButton={<img src={AnnotateIcon}/>}>
          <div
              css={css`
          padding: 0.5rem;
          width: 2rem;
          display: flex;
          flex-direction: column;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
          >
              {annotationHeads.map((head) => (
                  <div
                      key={head}
                      css={css`
              margin: 0.25rem;
            `}
                      onClick={(e) => {
                          styleStore.setSelectionAnnotationHead(head);
                          e.stopPropagation();
                      }}
                  >
                      <img src={head} height={"17rem"}/>
                  </div>
              ))}
          </div>
      </SubMenu>
  );
};

const LineDivideMenu = () => {
  return (
      <div
          css={css`
        height: 2rem;
        width: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      ><img src={LineDivideIcon}/></div>

  );
};