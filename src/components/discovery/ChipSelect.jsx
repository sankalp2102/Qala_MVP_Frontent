export default function ChipSelect({ options, selected, onToggle, multi = true, columns }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10,
      ...(columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` } : {}),
    }}>
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const icon  = typeof opt === 'object' ? opt.icon : null;
        const isSelected = selected.includes(val);
        return (
          <button
            key={val}
            onClick={() => onToggle(val)}
            style={{
              padding: icon ? '12px 16px' : '9px 18px',
              border: `1px solid ${isSelected ? '#C46E49' : 'var(--border2)'}`,
              borderRadius: 8,
              background: isSelected ? 'rgba(196,110,73,0.10)' : 'transparent',
              color: isSelected ? '#C46E49' : 'var(--text2)',
              fontSize: 13, fontWeight: isSelected ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
            {label}
            {isSelected && (
              <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
