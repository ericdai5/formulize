import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { computationStore } from '../../store/computation';
import { ISetControl } from '../../types/control';

interface SetControlProps {
  control: ISetControl;
}

export const SetControl = observer<SetControlProps>(({ control }) => {
  const { variable, availableElements, color = '#3b82f6' } = control;
  
  const variableId = variable;
  const variableData = computationStore.variables.get(variableId || '');
  const currentSelectedElements = variableData?.setValue || [];
  const currentAvailableElements = availableElements || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredElements, setFilteredElements] = useState(currentAvailableElements);

  useEffect(() => {
    const filtered = currentAvailableElements.filter(element =>
      element.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredElements(filtered);
  }, [currentAvailableElements, searchTerm]);

  const handleElementToggle = useCallback((element: string) => {
    const newSelection = currentSelectedElements.includes(element)
      ? currentSelectedElements.filter(e => e !== element)
      : [...currentSelectedElements, element];
    
    if (variableId) {
      computationStore.setSetValue(variableId, newSelection);
    }
  }, [currentSelectedElements, variableId]);

  const handleSelectAll = useCallback(() => {
    if (variableId) {
      computationStore.setSetValue(variableId, [...currentAvailableElements]);
    }
  }, [currentAvailableElements, variableId]);

  const handleSelectNone = useCallback(() => {
    if (variableId) {
      computationStore.setSetValue(variableId, []);
    }
  }, [variableId]);

  return (
    <div className="set-control border rounded-lg p-4 bg-white w-80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" style={{ color: color }}>
            {variableData?.name || variableId} Set
          </h3>
          {variableData?.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{variableData.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {currentSelectedElements.length} of {currentAvailableElements.length}
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
      
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search elements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div className="max-h-48 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {filteredElements.map((element) => {
            const isSelected = currentSelectedElements.includes(element);
            return (
              <label
                key={element}
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50' : ''
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

      <div className="mt-3 pt-3 border-t">
        <div className="text-sm text-gray-600 mb-2">
          Selected: {currentSelectedElements.length} of {currentAvailableElements.length} elements
        </div>
        {currentSelectedElements.length > 0 && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2">Current selection:</div>
            <div className="flex flex-wrap gap-1 max-w-full">
              {currentSelectedElements.map((element) => (
                <span
                  key={element}
                  className="px-2 py-1 text-xs rounded inline-block break-words"
                  style={{ 
                    backgroundColor: color + '20',
                    border: `1px solid ${color}`,
                    maxWidth: '100%'
                  }}
                >
                  {element}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default SetControl;
