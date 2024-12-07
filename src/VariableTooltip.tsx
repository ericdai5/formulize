const VariableTooltip = ({
  position,
  onSelect,
  currentType,
}: {
  position: {x: number, y: number},
  onSelect: (type: 'fixed' | 'slidable' | 'dependent') => void,
  currentType: 'fixed' | 'slidable' | 'dependent' | 'none'
}) => {
  console.log('VariableTooltip rendering with:', { position, currentType }); // Debug log

  const options = [
    { type: 'fixed' as const, icon: '📌', label: 'Fixed' },
    { type: 'slidable' as const, icon: '↔️', label: 'Slidable' },
    { type: 'dependent' as const, icon: '🔄', label: 'Dependent' }
  ];

  return (
    <div 
      style={{
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
      }}
    >
      <div style={{
        display: 'flex',
        gap: '8px',
      }}>
        {options.map(({type, icon, label}) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
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
      {/* Arrow pointer */}
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