import { Footprints, ListTree, SquareStack } from "lucide-react";

import IconButton from "../ui/icon-button";

interface ToolbarProps {
  onToggleNodeVisibility: () => void;
  onToggleTreeInspector: () => void;
  onToggleInterpreter: () => void;
  isNodeVisibilityOpen?: boolean;
  isTreeInspectorOpen?: boolean;
  isInterpreterOpen?: boolean;
  showInterpreterButton?: boolean;
}

const Toolbar = ({
  onToggleNodeVisibility,
  onToggleTreeInspector,
  onToggleInterpreter,
  isNodeVisibilityOpen = false,
  isTreeInspectorOpen = false,
  isInterpreterOpen = false,
  showInterpreterButton = false,
}: ToolbarProps) => {
  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
      <IconButton
        size="lg"
        icon={SquareStack}
        alt="Node Visibility"
        onClick={onToggleNodeVisibility}
        title="Node Visibility"
        isActive={isNodeVisibilityOpen}
      />
      <IconButton
        size="lg"
        icon={ListTree}
        alt="Latex Tree"
        onClick={onToggleTreeInspector}
        title="Latex Tree"
        isActive={isTreeInspectorOpen}
      />
      {showInterpreterButton && (
        <IconButton
          size="lg"
          icon={Footprints}
          alt="Interpreter"
          onClick={onToggleInterpreter}
          title="Interpreter"
          isActive={isInterpreterOpen}
        />
      )}
    </div>
  );
};

export default Toolbar;
