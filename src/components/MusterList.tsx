import styles from '@/app/page.module.css';
import { calculateEntryPoints, type RosterEntry, type UnitGroup } from '@/lib/units';

// Helper to gather all selected upgrades, weapons, mounts, and magic items for display
function getEntryOptionSummary(entry: RosterEntry): string[] {
  const summary: string[] = [];

  // 1. Chosen options from option groups (weapons, mounts, command, etc.)
  if (entry.unit.optionGroups && entry.selectedOptionIds) {
    for (const group of entry.unit.optionGroups) {
      for (const choice of group.choices) {
        if (entry.selectedOptionIds.includes(choice.id) && !choice.isDefault) {
          summary.push(choice.name);
        }
        if (choice.subChoices) {
          for (const sub of choice.subChoices) {
            if (entry.selectedOptionIds.includes(sub.id) && !sub.isDefault) {
              summary.push(sub.name);
            }
          }
        }
      }
    }
  }

  // 2. Chosen magic items and virtues
  if (entry.selectedMagicItems) {
    for (const item of entry.selectedMagicItems) {
      summary.push(item.name);
    }
  }

  return summary;
}

export default function MusterList({
  roster,
  groups,
  focusedEntryId,
  onFocusEntry,
  onRemoveUnit,
}: {
  roster: RosterEntry[];
  groups: UnitGroup[];
  focusedEntryId: number | null;
  onFocusEntry: (entry: RosterEntry) => void;
  onRemoveUnit: (entryId: number) => void;
}) {
  return (
    <>
      <h2>Muster List</h2>
      <hr />

      {/* If roster is empty, show a helpful message */}
      {roster.length === 0 ? (
        <p>Your list is empty. Add a unit from the left.</p>
      ) : (
        // Loop through each army category (e.g. Characters, Core, Battleline)
        groups.map((group) => {
          // Find the units in the roster that belong to this category
          const groupEntries = roster.filter((entry) =>
            group.units.some((u) => u.id === entry.unit.id)
          );

          // If the user hasn't added any units in this category, don't show the category heading
          if (groupEntries.length === 0) {
            return null;
          }

          // Calculate the subtotal points for this specific category (including options & models)
          const categoryPoints = groupEntries.reduce(
            (sum, entry) => sum + calculateEntryPoints(entry),
            0
          );

          return (
            <div key={group.title} style={{ marginBottom: '16px' }}>
              {/* Category subheader with its points total */}
              <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', margin: '8px 0 6px 0' }}>
                {group.title} ({categoryPoints} pts)
              </h3>

              {/* The units added under this category */}
              {groupEntries.map((entry) => {
                const isSelected = focusedEntryId === entry.entryId;
                const points = calculateEntryPoints(entry);
                const count = entry.modelCount || entry.unit.modelCount || 1;
                const optionsSummary = getEntryOptionSummary(entry);

                return (
                  <div
                    key={entry.entryId}
                    className={`${styles.rosterItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => onFocusEntry(entry)}
                  >
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {entry.unit.name}
                        {count > 1 && ` (x${count})`}
                        <span style={{ color: '#38bdf8', fontWeight: 500, marginLeft: '6px' }}>
                          - {points} pts
                        </span>
                      </div>

                      {/* Display chosen loadout & magic items below unit name */}
                      {optionsSummary.length > 0 && (
                        <div className={styles.rosterItemOptions}>
                          {optionsSummary.join(' • ')}
                        </div>
                      )}
                    </div>

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
              })}
            </div>
          );
        })
      )}
    </>
  );
}

