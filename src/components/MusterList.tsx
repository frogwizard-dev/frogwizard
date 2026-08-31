import styles from '@/app/page.module.css';
import type { RosterEntry, Unit } from '@/lib/units';

export default function MusterList({
  roster,
  focusedUnit,
  onFocusUnit,
  onRemoveUnit,
}: {
  roster: RosterEntry[];
  focusedUnit: Unit | null;
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
        roster.map((entry) => {
          // Check if this unit is currently selected to view its datasheet
          const isSelected = focusedUnit?.id === entry.unit.id;

          return (
            <div
              key={entry.entryId}
              // If selected, apply both .rosterItem and .selected styles
              className={`${styles.rosterItem} ${isSelected ? styles.selected : ''}`}
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
          );
        })
      )}
    </>
  );
}
