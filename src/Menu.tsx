import { css } from "@emotion/react";
import { default as React } from "react";

import { observer } from "mobx-react-lite";

import Icon from "@mui/material/Icon";

import {
  Box,
  Brace,
  Color,
  MathSymbol,
  Script,
  Strikethrough,
  Text,
} from "./FormulaTree";
import { consolidateGroups, replaceNodes } from "./formulaTransformations";
import { formulaStore, selectionStore, undoStore } from "./store";

import AnnotateIcon from "./Icons/AnnotateIcon.svg";
import BoxIcon from "./Icons/BoxIcon.svg";
import CurlyBraceListOption from "./Icons/CurlyBraceListOption.svg";
import LineDivideIcon from "./Icons/LineDivideIcon.svg";

// import LogoIcon from "./Icons/LogoIcon.svg";

export const Menu = () => {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  return (
    <div
      css={css`
        height: 2rem;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        background: #f0f0f0;
      `}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      {/* <LogoMenu /> */}
      {/* <LineDivideMenu /> */}

      <UndoMenu />
      <RedoMenu />
      <LineDivideMenu />

      <StrikethroughMenu />
      <ColorMenu
        open={openMenu === "color"}
        onMenuOpen={() => setOpenMenu("color")}
        onMenuClose={() => {
          if (openMenu === "color") {
            setOpenMenu(null);
          }
        }}
      />
      <BoxMenu
        open={openMenu === "box"}
        onMenuOpen={() => setOpenMenu("box")}
        onMenuClose={() => {
          if (openMenu === "box") {
            setOpenMenu(null);
          }
        }}
      />
      <LineDivideMenu />

      <AnnotateMenu
        open={openMenu === "annotate"}
        onMenuOpen={() => setOpenMenu("annotate")}
        onMenuClose={() => {
          if (openMenu === "annotate") {
            setOpenMenu(null);
          }
        }}
      />
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

const COLORS = [
  "black",
  "grey",
  "darkgrey",
  "purple",
  "red",
  "magenta",
  "violet",
  "orange",
  "green",
  "teal",
  "blue",
  "cyan",
];

type ColorSwatchProps = {
  color: string;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
};

export const ColorSwatch = ({ color, onClick }: ColorSwatchProps) => {
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

export const ColorPicker = ({
  onSelect,
}: {
  onSelect: (color: string) => void;
}) => (
  <div
    css={css`
      padding: 0.5rem;
      width: 7rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
    `}
  >
    {COLORS.map((color) => (
      <div
        key={color}
        css={css`
          margin: 0.25rem;
          cursor: pointer;
        `}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(color);
        }}
      >
        <ColorSwatch key={color} color={color} />
      </div>
    ))}
  </div>
);

type DismissableMenuProps = {
  open: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
};

type SubMenuProps = {
  menuButton: React.ReactNode;
} & DismissableMenuProps;

const SubMenu = ({
  menuButton,
  open,
  onMenuOpen,
  onMenuClose,
  children,
}: React.PropsWithChildren<SubMenuProps>) => {
  React.useEffect(() => {
    window.addEventListener("click", onMenuClose);

    () => {
      window.removeEventListener("click", onMenuClose);
    };
  }, [onMenuClose]);

  return (
    <div
      css={css`
        position: relative;
        height: ${open ? "1.8rem" : "2rem"};
        display: flex;
        align-items: center;
        background: ${open ? "#e0e0e0" : "#f0f0f0"};
        &:hover {
          height: 1.8rem;
        }
        z-index: 500;
      `}
    >
      <MenuItem onClick={open ? onMenuClose : onMenuOpen}>
        {menuButton}
        {open && (
          <div
            css={css`
              position: absolute;
              cursor: default;
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

// const LogoMenu = () => {
//   return (
//     <div
//       css={css`
//         height: 2.25rem;
//         width: 2.25rem;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//       `}
//     >
//       <img src={LogoIcon} />
//     </div>
//   );
// };

const UndoMenu = observer(() => {
  return (
    <div
      css={css`
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: ${undoStore.canUndo ? "pointer" : "default"};
        color: ${undoStore.canUndo ? "black" : "grey"};
      `}
      onClick={() => {
        if (undoStore.canUndo) {
          undoStore.undo();
        }
      }}
    >
      <Icon>undo</Icon>
    </div>
  );
});

const RedoMenu = observer(() => {
  return (
    <div
      css={css`
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: ${undoStore.canRedo ? "pointer" : "default"};
        color: ${undoStore.canRedo ? "black" : "grey"};
      `}
      onClick={() => {
        if (undoStore.canRedo) {
          undoStore.redo();
        }
      }}
    >
      <Icon>redo</Icon>
    </div>
  );
});

const StrikethroughMenu = () => {
  return (
    <MenuItem onClick={() => {}}>
      <div
        onClick={(e) => {
          formulaStore.updateFormula(
            replaceNodes(
              consolidateGroups(
                formulaStore.augmentedFormula,
                selectionStore.siblingSelections
              ),

              (node) => {
                if (
                  selectionStore.siblingSelections.some(
                    (siblingIds) => siblingIds[0] === node.id
                  )
                ) {
                  console.log("Applying strikethrough to", node);
                  return new Strikethrough(node.id, node);
                }
                return node;
              }
            )
          );
          e.stopPropagation();
        }}
      >
        <Icon>format_strikethrough</Icon>
      </div>
    </MenuItem>
  );
};

const ColorMenu = ({ open, onMenuOpen, onMenuClose }: DismissableMenuProps) => {
  return (
    <SubMenu
      menuButton={<Icon>format_color_text</Icon>}
      open={open}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
    >
      <div
        css={css`
          padding: 0.5rem;
          width: 7rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
      >
        <ColorPicker
          onSelect={(color) => {
            formulaStore.updateFormula(
              replaceNodes(
                consolidateGroups(
                  formulaStore.augmentedFormula,
                  selectionStore.siblingSelections
                ),
                (node) => {
                  if (
                    node.type === "color" &&
                    (selectionStore.siblingSelections.some(
                      (siblingIds) => siblingIds[0] === node.id
                    ) ||
                      node.body.some((child) =>
                        selectionStore.siblingSelections.some(
                          (siblingIds) => siblingIds[0] === child.id
                        )
                      ))
                  ) {
                    console.log("Modifying existing color node", node);
                    return new Color(node.id, color, node.body);
                  } else if (
                    selectionStore.siblingSelections.some(
                      (siblingIds) => siblingIds[0] === node.id
                    ) &&
                    (node.ancestors.length === 0 ||
                      node.ancestors[0].type !== "color")
                  ) {
                    console.log("Applying new color node to", node);
                    return new Color(node.id, color, [node]);
                  }
                  return node;
                }
              )
            );
            onMenuClose();
          }}
        />
      </div>
    </SubMenu>
  );
};

const BoxMenu = ({ open, onMenuOpen, onMenuClose }: DismissableMenuProps) => {
  return (
    <SubMenu
      menuButton={<img src={BoxIcon} />}
      open={open}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
    >
      <div
        css={css`
          padding: 0.5rem;
          width: 7rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
      >
        <ColorPicker
          onSelect={(color) => {
            formulaStore.updateFormula(
              replaceNodes(
                consolidateGroups(
                  formulaStore.augmentedFormula,
                  selectionStore.siblingSelections
                ),
                (node) => {
                  if (
                    node.type === "box" &&
                    (selectionStore.siblingSelections.some(
                      (siblingIds) => siblingIds[0] === node.id
                    ) ||
                      selectionStore.siblingSelections.some(
                        (siblingIds) => siblingIds[0] === node.body.id
                      ))
                  ) {
                    console.log("Modifying existing box node", node);
                    return new Box(node.id, color, "white", node.body);
                  } else if (
                    selectionStore.siblingSelections.some(
                      (siblingIds) => siblingIds[0] === node.id
                    ) &&
                    (node.ancestors.length === 0 ||
                      node.ancestors[0].type !== "box")
                  ) {
                    console.log("Applying new box node to", node);
                    return new Box(node.id, color, "white", node);
                  }
                  return node;
                }
              )
            );
            onMenuClose();
          }}
        />
      </div>
    </SubMenu>
  );
};

const AnnotateMenu = ({
  open,
  onMenuOpen,
  onMenuClose,
}: DismissableMenuProps) => {
  const makeAnnotationCallback = (over: boolean) => (e: React.MouseEvent) => {
    formulaStore.updateFormula(
      replaceNodes(
        consolidateGroups(
          formulaStore.augmentedFormula,
          selectionStore.siblingSelections
        ),
        (node) => {
          if (
            node.type === "brace" &&
            selectionStore.siblingSelections.some(
              (siblingIds) => siblingIds[0] === node.id
            )
          ) {
            console.log("Modifying existing brace node", node);
          } else if (
            selectionStore.siblingSelections.some(
              (siblingIds) => siblingIds[0] === node.id
            ) &&
            (node.ancestors.length === 0 || node.ancestors[0].type !== "brace")
          ) {
            console.log("Applying new brace node to", node);
            const caption = new Text(
              "",
              Array.from("caption").map((c) => new MathSymbol("", c))
            );
            return new Script(
              "",
              new Brace("", over, node),
              over ? undefined : caption,
              over ? caption : undefined
            );
          }
          return node;
        }
      )
    );
    e.stopPropagation();
    onMenuClose();
  };
  return (
    <SubMenu
      menuButton={<img src={AnnotateIcon} />}
      open={open}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
    >
      <div
        css={css`
          width: 2rem;
          display: flex;
          flex-direction: column;
          flex-wrap: wrap;
          justify-content: flex-start;
        `}
      >
        <div
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0.25rem;
            transform: rotate(90deg);
            width: 100%;
            cursor: pointer;

            &:hover {
              background: #e0e0e0;
            }
          `}
          onClick={makeAnnotationCallback(true)}
        >
          <img src={CurlyBraceListOption} height={"17rem"} />
        </div>
        <div
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0.25rem;
            transform: rotate(-90deg);
            width: 100%;
            cursor: pointer;

            &:hover {
              background: #e0e0e0;
            }
          `}
          onClick={makeAnnotationCallback(false)}
        >
          <img src={CurlyBraceListOption} height={"17rem"} />
        </div>
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
