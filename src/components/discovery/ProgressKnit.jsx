// Knitting progress animation — 2 rows added per question (16 rows total for 8 questions)
export default function ProgressKnit({ step, total }) {
  const rows = Math.round((step / total) * 16);
  const cells = 12;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Array.from({ length: 16 }, (_, r) => {
        const filled = r < rows;
        return (
          <div key={r} style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: cells }, (_, c) => {
              const delay = filled ? `${(r * cells + c) * 0.015}s` : '0s';
              const isActive = r === rows - 1;
              return (
                <div
                  key={c}
                  style={{
                    width: 8, height: 5, borderRadius: 2,
                    background: filled
                      ? isActive
                        ? `rgba(255,255,255,${0.5 + Math.sin((c / cells) * Math.PI) * 0.5})`
                        : 'rgba(255,255,255,0.25)'
                      : 'rgba(255,255,255,0.06)',
                    transition: `background 0.3s ease ${delay}`,
                    animation: isActive ? `knit-pulse 1.2s ease-in-out ${delay} infinite` : 'none',
                  }}
                />
              );
            })}
          </div>
        );
      })}
      <style>{`
        @keyframes knit-pulse {
          0%,100%{opacity:0.5} 50%{opacity:1}
        }
      `}</style>
    </div>
  );
}
