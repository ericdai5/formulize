import React, { useState, useEffect } from 'react';
import { computationStore } from './computation';

const VariableTooltip = ({
  position,
  onSelect,
  currentType,
  id  // id of the currently selected variable
}: {
  position: {x: number, y: number},
  onSelect: (type: 'fixed' | 'slidable' | 'dependent') => void,
  currentType: 'fixed' | 'slidable' | 'dependent' | 'none',
  id: string
}) => {
  const [value, setValue] = useState('0');
  const variable = computationStore.variables.get(id);

  // Initialize value from variable state
  useEffect(() => {
    if (variable) {
      setValue(variable.value.toString());
    }
  }, [variable?.value]);

  const handleTypeSelect = (type: 'fixed' | 'slidable' | 'dependent') => {
    if (type === 'fixed') {
      setShowValueInput(true);
    } else {
      // For non-fixed types, just update the type
      computationStore.setVariableType(id, type);
      onSelect(type);
    }
  };

  const handleValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔵 Set button clicked in VariableTooltip for variable:", id);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      console.log(`🔵 Setting value for variable ${id}: ${numValue}`);
      computationStore.setValue(id, numValue);
      onSelect('fixed');
    } else {
      console.log(`🔴 Invalid numeric value entered for variable ${id}: ${value}`);
    }
  };

  const [showValueInput, setShowValueInput] = useState(currentType === 'fixed');

  useEffect(() => {
    setShowValueInput(currentType === 'fixed');
  }, [currentType]);

  const options = [
    { type: 'fixed' as const, icon: '📌', label: 'Fixed' },
    { type: 'slidable' as const, icon: '↔️', label: 'Slidable' },
    { type: 'dependent' as const, icon: '🔄', label: 'Dependent' }
  ];

  return (
    <div style={{
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: 'translate(-50%, -120%)',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      border: '1px solid #ddd',
      padding: '8px',
      zIndex: 9999,
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {showValueInput && (
        <form 
          onSubmit={handleValueSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
          }}
        >
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{
              width: '80px',
              padding: '4px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            step="0.1"
            autoFocus
          />
          <button
            type="submit"
            style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Set
          </button>
        </form>
      )}

      <div style={{
        display: 'flex',
        gap: '8px',
      }}>
        {options.map(({type, icon, label}) => (
          <button
            key={type}
            onClick={() => handleTypeSelect(type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px',
              border: `1px solid ${currentType === type ? '#3b82f6' : '#ddd'}`,
              borderRadius: '6px',
              background: currentType === type ? '#e5efff' : 'white',
              minWidth: '64px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ fontSize: '12px', marginTop: '4px' }}>{label}</span>
          </button>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: '-5px',
        width: '10px',
        height: '10px',
        background: 'white',
        border: '1px solid #ddd',
        borderTop: 'none',
        borderLeft: 'none',
        transform: 'translateX(-50%) rotate(45deg)',
      }} />
    </div>
  );
};

export default VariableTooltip;