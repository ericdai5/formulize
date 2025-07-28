import { default as React } from "react";

import { observer } from "mobx-react-lite";

import Icon from "@mui/material/Icon";

import { consolidateGroups, replaceNodes } from "../../parse/formula-transform";
import {
  Aligned,
  AugmentedFormula,
  Box,
  Brace,
  Color,
  Group,
  MathSymbol,
  Script,
  Strikethrough,
  Text,
} from "../../parse/formula-tree";
import {
  editingStore,
  formulaStore,
  selectionStore,
  undoStore,
} from "../../store";

import AnnotateIcon from "../../Icons/AnnotateIcon.svg";
import BoxIcon from "../../Icons/BoxIcon.svg";
import CurlyBraceListOption from "../../Icons/CurlyBraceListOption.svg";

// import LogoIcon from "./Icons/LogoIcon.svg";

export const Menu = () => {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  return (
    <div
      className="absolute z-50 top-2 left-1/2 -translate-x-1/2 w-fit h-11 p-2 flex flex-row items-center bg-white border rounded-xl shadow-sm border-slate-200 gap-1"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <UndoMenu />
      <RedoMenu />
      <LineDivide />
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
      <LineDivide />
      <AnnotateMenu
        open={openMenu === "annotate"}
        onMenuOpen={() => setOpenMenu("annotate")}
        onMenuClose={() => {
          if (openMenu === "annotate") {
            setOpenMenu(null);
          }
        }}
      />
      <LineDivide />
      <AlignMenu />
      <LineDivide />
      <EnlivenToggle />
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
      className="h-8 min-w-8 flex justify-center items-center rounded-md cursor-pointer hover:bg-slate-100"
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
      className="w-4 h-4 rounded-sm"
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
};

export const ColorPicker = ({
  onSelect,
}: {
  onSelect: (color: string) => void;
}) => (
  <div className="p-2 w-28 flex flex-wrap justify-start">
    {COLORS.map((color) => (
      <div
        key={color}
        className="m-1 cursor-pointer"
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
    <div className="relative flex items-center z-50">
      <MenuItem onClick={open ? onMenuClose : onMenuOpen}>
        {menuButton}
        {open && (
          <div className="absolute cursor-default top-8 left-0 flex flex-col bg-white border border-slate-200 rounded-md translate-y-1 shadow-md">
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
      className={`menu-btn ${undoStore.canUndo ? "text-black" : "text-gray-500 cursor-default"}`}
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
      className={`menu-btn ${undoStore.canRedo ? "text-black" : "text-gray-500 cursor-default"}`}
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
        className="menu-btn"
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
                  return new Color(node.id, color, node.body);
                } else if (
                  selectionStore.siblingSelections.some(
                    (siblingIds) => siblingIds[0] === node.id
                  ) &&
                  (node.ancestors.length === 0 ||
                    node.ancestors[0].type !== "color")
                ) {
                  return new Color(node.id, color, [node]);
                }
                return node;
              }
            )
          );
          onMenuClose();
        }}
      />
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
                  return new Box(node.id, color, "white", node.body);
                } else if (
                  selectionStore.siblingSelections.some(
                    (siblingIds) => siblingIds[0] === node.id
                  ) &&
                  (node.ancestors.length === 0 ||
                    node.ancestors[0].type !== "box")
                ) {
                  return new Box(node.id, color, "white", node);
                }
                return node;
              }
            )
          );
          onMenuClose();
        }}
      />
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
            // console.log("Modifying existing brace node", node);
          } else if (
            selectionStore.siblingSelections.some(
              (siblingIds) => siblingIds[0] === node.id
            ) &&
            (node.ancestors.length === 0 || node.ancestors[0].type !== "brace")
          ) {
            // console.log("Applying new brace node to", node);
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
      <div className="w-8 flex flex-col flex-wrap justify-start">
        <div
          className="flex justify-center items-center p-0.5 w-full cursor-pointer transform rotate-90 hover:bg-slate-100"
          onClick={makeAnnotationCallback(true)}
        >
          <img src={CurlyBraceListOption} height={"17rem"} />
        </div>
        <div
          className="flex justify-center items-center p-0.5 w-full cursor-pointer transform -rotate-90 hover:bg-slate-100"
          onClick={makeAnnotationCallback(false)}
        >
          <img src={CurlyBraceListOption} height={"17rem"} />
        </div>
      </div>
    </SubMenu>
  );
};

const LineDivide = () => {
  return <div className="h-4 border-r border-slate-200" />;
};

const AlignMenu = observer(() => {
  return (
    <div
      className={`menu-btn ${editingStore.showAlignMode ? "bg-gray-200" : "bg-transparent"}`}
      onClick={(e) => {
        if (formulaStore.alignIds === null) {
          const cell = new Group("", formulaStore.augmentedFormula.children);
          formulaStore.updateFormula(
            new AugmentedFormula([new Aligned("", [[cell]])])
          );
        }
        editingStore.setShowAlignMode(!editingStore.showAlignMode);
        e.stopPropagation();
      }}
    >
      <Icon>format_align_justify</Icon>
    </div>
  );
});

const EnlivenToggle = observer(() => {
  return (
    <div
      className="menu-btn"
      onClick={() => {
        editingStore.setShowEnlivenMode(!editingStore.showEnlivenMode);
      }}
    >
      <Icon>flash_on</Icon>
    </div>
  );
});
