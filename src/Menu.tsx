import { default as React, useState, useRef } from "react";
import { css } from "@emotion/react";
import Icon from '@mui/material/Icon';
import BoxIcon from './Icons/BoxIcon.svg';
import AnnotateIcon from './Icons/AnnotateIcon.svg';
import LogoIcon from './Icons/LogoIcon.svg';
import LineDivideIcon from './Icons/LineDivideIcon.svg';

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
        height: 2rem;
        min-width: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        &:hover {
          background: #e0e0e0;
        }
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

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <MenuItem
        onClick={() => {
          setOpen(!open);
        }}
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
      <img src={LogoIcon} />
  );
};

const SaveMenu = () => {
  return (
      <Icon>save</Icon>
  );
};

const UndoMenu = () => {
  return (
      <Icon>undo</Icon>
  );
};

const RedoMenu = () => {
  return (
      <Icon>redo</Icon>
  );
};

const ZoomMenu = () => {
  return (
      <Icon>zoom_in</Icon>
  );
};

const BoldMenu = () => {
  return (
      <Icon>format_bold</Icon>
  );
};

const ItalicsMenu = () => {
  return (
      <Icon>format_italic</Icon>
  );
};

const UnderlineMenu = () => {
  return (
      <Icon>format_underline</Icon>
  );
};

const StrikethroughMenu = () => {
  return (
      <Icon>format_strikethrough</Icon>
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
                    //hide the box
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
  return (
      <Icon>line_weight</Icon>
  );
};

const AnnotateMenu = () => {
  return (
      <img src={AnnotateIcon}/>
  );
};

const LineDivideMenu = () => {
  return (
      <img src={LineDivideIcon}/>
  );
};