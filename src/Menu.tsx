import { css } from "@emotion/react";
import { default as React } from "react";

import Icon from "@mui/material/Icon";

import { Color } from "./FormulaTree";
import { replaceNodes } from "./formulaTransformations";
import { formulaStore, selectionStore } from "./store";

import AnnotateIcon from "./Icons/AnnotateIcon.svg";
import BoxIcon from "./Icons/BoxIcon.svg";
import BracketListOption from "./Icons/BracketListOption.svg";
import CurlyBraceListOption from "./Icons/CurlyBraceListOption.svg";
import LineDivideIcon from "./Icons/LineDivideIcon.svg";
import LogoIcon from "./Icons/LogoIcon.svg";

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
  const handleClickOutsideDropdown = () => {
    if (open) {
      setOpen(false);
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
    >
      <img src={LogoIcon} />
    </div>
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
    >
      <Icon>save</Icon>
    </div>
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
    >
      <Icon>undo</Icon>
    </div>
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
    >
      <Icon>redo</Icon>
    </div>
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
    >
      <Icon>zoom_in</Icon>
    </div>
  );
};

const BoldMenu = () => {
  return (
    <MenuItem menuButton={<Icon>format_bold</Icon>}>
      <div
        onClick={(e) => {
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
              formulaStore.updateFormula(
                replaceNodes(formulaStore.augmentedFormula, (node) => {
                  if (selectionStore.selected.includes(node.id)) {
                    // TODO: should not run if parent is color
                    return new Color(node.id, color, [node]);
                  } else if (
                    node.type === "color" &&
                    node.children.some((child) =>
                      selectionStore.selected.includes(child.id)
                    )
                  ) {
                    return new Color(node.id, color, node.children);
                  }
                  return node;
                })
              );
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
    <SubMenu menuButton={<img src={BoxIcon} />}>
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
  const weights = ["Thin", "Normal", "Thick"];

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
  const annotationHeads = [BracketListOption, CurlyBraceListOption];
  return (
    <SubMenu menuButton={<img src={AnnotateIcon} />}>
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
              e.stopPropagation();
            }}
          >
            <img src={head} height={"17rem"} />
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
    >
      <img src={LineDivideIcon} />
    </div>
  );
};

export const ContextMenu = ({
  anchorX,
  anchorY,
}: {
  anchorX: number;
  anchorY: number;
}) => {
  const [menuWidth, setMenuWidth] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      setMenuWidth(ref.current.offsetWidth);
    }
  }, [ref.current]);

  return (
    <div
      ref={ref}
      css={css`
        position: absolute;
        top: calc(${anchorY}px - 3rem);
        left: ${anchorX - menuWidth / 2}px;
        height: 2.3rem;
        z-index: 100;
        visibility: ${menuWidth === 0 ? "hidden" : "visible"};

        &:after {
          content: "";
          position: absolute;
          top: calc(1.5rem - 2px);
          left: calc(50% - 0.5rem);
          width: 1rem;
          height: 1rem;
          background: #f0f0f0;
          border: 2px solid black;
          transform: rotate(45deg);
          z-index: 0;
        }
      `}
    >
      <div
        css={css`
          position: relative;
          display: flex;
          height: 2.3rem;
          background: #f0f0f0;
          border: 2px solid black;
          z-index: 100;
        `}
      >
        <BoldMenu />
        <ItalicsMenu />
        <UnderlineMenu />
        <StrikethroughMenu />
        <ColorMenu />
        <BoxMenu />
        <LineWeightMenu />
        <AnnotateMenu />
      </div>
    </div>
  );
};
