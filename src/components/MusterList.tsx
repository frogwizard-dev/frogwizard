import styles from '@/app/page.module.css';
import type { RosterEntry, Unit } from '@/lib/units';

export default function MusterList({
  roster,
  onFocusUnit,
  onRemoveUnit,
}: {
  roster: RosterEntry[];
  onFocusUnit: (unit: Unit) => void;
  onRemoveUnit: (entryId: number) => void;
}) {
  return (
    <>
      <h2>Muster List</h2>
      <hr />
      {roster.length === 0 ? (
        <p>Your list is empty. Add a unit from the left.</p>
      ) : (
        roster.map((entry) => (
          <div
            key={entry.entryId}
            className={styles.rosterItem}
            onClick={() => onFocusUnit(entry.unit)}
          >
            <span>
              {entry.unit.name}
              {entry.unit.points !== null && ` - ${entry.unit.points} pts`}
            </span>
            <button
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation(); // Stops the click from selecting the unit
                onRemoveUnit(entry.entryId);
              }}
            >
              X
            </button>
          </div>
        ))
      )}
    </>
  );
}
