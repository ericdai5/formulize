import { useCallback, useEffect, useMemo, useState } from "react";

import { observer } from "mobx-react-lite";

import { ISetControl } from "../../types/control";
import { useStore } from "../hooks";

interface SetControlProps {
  control: ISetControl;
}

export const SetControl = observer<SetControlProps>(({ control }) => {
  const context = useStore();
  const computationStore = context?.computationStore;

  const { variable, availableElements, color = "#3b82f6" } = control;

  const variableId = variable;
  const variableData = computationStore?.variables.get(variableId || "");

  const currentSelectedElements = useMemo(
    () => (Array.isArray(variableData?.value) ? variableData.value : []),
    [variableData?.value]
  );

  const currentAvailableElements = useMemo(
    () => availableElements || [],
    [availableElements]
  );

  const [searchTerm] = useState("");
  const [filteredElements, setFilteredElements] = useState(
    currentAvailableElements
  );

  useEffect(() => {
    const filtered = currentAvailableElements.filter((element) =>
      element.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredElements(filtered);
  }, [currentAvailableElements, searchTerm]);

  const handleElementToggle = useCallback(
    (element: string) => {
      const newSelection = currentSelectedElements.includes(element)
        ? currentSelectedElements.filter((e) => e !== element)
        : [...currentSelectedElements, element];

      if (variableId && computationStore) {
        computationStore.setSetValue(variableId, newSelection);
      }
    },
    [currentSelectedElements, variableId, computationStore]
  );

  const handleSelectAll = useCallback(() => {
    if (variableId && computationStore) {
      computationStore.setSetValue(variableId, [...currentAvailableElements]);
    }
  }, [currentAvailableElements, variableId, computationStore]);

  const handleSelectNone = useCallback(() => {
    if (variableId && computationStore) {
      computationStore.setSetValue(variableId, []);
    }
  }, [variableId, computationStore]);

  // Guard: computationStore must be available (after all hooks)
  if (!computationStore) {
    return <div className="text-red-500">No computation store available</div>;
  }

  return (
    <div className="set-control border rounded-lg p-4 bg-white w-80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" style={{ color: color }}>
            {variableData?.name || variableId} Set
          </h3>
          {variableData?.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {variableData.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {currentSelectedElements.length} of{" "}
            {currentAvailableElements.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleSelectAll}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded whitespace-nowrap"
            >
              All
            </button>
            <button
              onClick={handleSelectNone}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {filteredElements.map((element) => {
            const isSelected = currentSelectedElements.includes(element);
            return (
              <label
                key={element}
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleElementToggle(element)}
                  className="rounded"
                  style={{ accentColor: color }}
                />
                <span className="text-sm">{element}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default SetControl;
