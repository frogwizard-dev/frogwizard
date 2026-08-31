import type { Unit } from '@/lib/units';

// The rules text uses asterisks for formatting like Markdown does:
// **bold** and ***bold italic***.
// I split on the whole marker instead of just counting '**', because
// ***like this*** was leaving a stray * on the page.
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, i) => (
        <p key={i}>
          {paragraph.split(/(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*)/g).map((piece, j) => {
            if (piece.startsWith('***') && piece.endsWith('***')) {
              return (
                <strong key={j}>
                  <em>{piece.slice(3, -3)}</em>
                </strong>
              );
            }
            if (piece.startsWith('**') && piece.endsWith('**')) {
              return <strong key={j}>{piece.slice(2, -2)}</strong>;
            }
            return piece;
          })}
        </p>
      ))}
    </>
  );
}

export default function Datasheet({ unit }: { unit: Unit | null }) {
  if (!unit) {
    return (
      <>
        <h2>Datasheet</h2>
        <hr />
        <p>Select a unit from your list to view its warscroll.</p>
      </>
    );
  }

  return (
    <>
      <h2>{unit.name}</h2>
      {unit.subname && <p>{unit.subname}</p>}
      <hr />

      <p>
        <strong>{unit.points ?? '-'} pts</strong>
        {unit.modelCount && ` - ${unit.modelCount} models`}
        {unit.baseSize && ` - ${unit.baseSize}`}
        {unit.isLegends && ' - Legends'}
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {unit.stats.map((stat) => (
          <div key={stat.label}>
            <div style={{ fontSize: '0.7em', opacity: 0.6 }}>{stat.label}</div>
            <div style={{ fontSize: '1.2em', fontWeight: 600 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {unit.weapons.length > 0 && <h3>Weapons</h3>}
      {unit.weapons.map((weapon) => (
        <div key={weapon.id}>
          <strong>{weapon.name}</strong> <span style={{ opacity: 0.6 }}>({weapon.type})</span>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85em' }}>
            {weapon.profile.map((stat) => (
              <span key={stat.label}>
                <span style={{ opacity: 0.6 }}>{stat.label}</span> {stat.value}
              </span>
            ))}
          </div>
        </div>
      ))}

      {unit.abilities.length > 0 && <h3>Abilities</h3>}
      {unit.abilities.map((ability) => (
        <details key={ability.id}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            {ability.name}
            {ability.timing && (
              <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.85em' }}>
                {' - '}
                {ability.timing}
              </span>
            )}
          </summary>
          <div style={{ fontSize: '0.9em' }}>
            <RichText text={ability.text} />
          </div>
        </details>
      ))}

      {unit.keywords.length > 0 && (
        <>
          <h3>Keywords</h3>
          <p style={{ fontSize: '0.85em', opacity: 0.8 }}>{unit.keywords.join(' - ')}</p>
        </>
      )}
    </>
  );
}
