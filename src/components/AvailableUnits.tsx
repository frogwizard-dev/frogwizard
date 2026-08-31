import styles from '@/app/page.module.css';
import type { Faction, Unit } from '@/lib/units';

// I use this 3 times (units, terrain, manifestations) so it's its own bit.
function Section({
  title,
  units,
  onAddUnit,
}: {
  title: string;
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
}) {
  // don't show an empty heading if the faction hasn't got any
  if (units.length === 0) {
    return null;
  }

  return (
    <>
      <h3>{title}</h3>
      {units.map((unit) => (
        <button key={unit.id} className={styles.unitButton} onClick={() => onAddUnit(unit)}>
          {unit.name}
          {unit.points !== null && ` (${unit.points} pts)`}
          {unit.isLegends && ' - Legends'}
        </button>
      ))}
    </>
  );
}

export default function AvailableUnits({
  faction,
  onAddUnit,
}: {
  faction: Faction;
  onAddUnit: (unit: Unit) => void;
}) {
  return (
    <>
      <h2>{faction.name}</h2>
      <hr />
      <Section title="Units" units={faction.units} onAddUnit={onAddUnit} />
      {/* these two are free in 4th ed, so they have no points on them */}
      <Section title="Faction Terrain" units={faction.terrain} onAddUnit={onAddUnit} />
      <Section title="Manifestations" units={faction.manifestations} onAddUnit={onAddUnit} />
    </>
  );
}
