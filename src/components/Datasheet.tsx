import { useState } from 'react';
import styles from '@/app/page.module.css';
import {
  calculateEntryPoints,
  type Ability,
  type MagicItem,
  type OptionChoice,
  type OptionGroup,
  type RosterEntry,
  type Weapon,
} from '@/lib/units';

// Formats rules text with bold and italics
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

export default function Datasheet({
  entry,
  availableMagicItems = [],
  onUpdateEntry,
}: {
  entry: RosterEntry | null;
  availableMagicItems?: MagicItem[];
  onUpdateEntry?: (entryId: number, updates: Partial<RosterEntry>) => void;
}) {
  const [expandedInfoIds, setExpandedInfoIds] = useState<string[]>([]);

  if (!entry) {
    return (
      <>
        <h2>Datasheet</h2>
        <hr />
        <p>Select a unit from your muster list to view its profile and customize options.</p>
      </>
    );
  }

  const { unit, modelCount, selectedOptionIds } = entry;
  const currentPoints = calculateEntryPoints(entry);

  // Toggle option rules info card on click
  const handleToggleInfo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedInfoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to change model count
  const handleModelCountChange = (delta: number) => {
    if (!onUpdateEntry || !unit.unitSizeConfig) return;
    const newCount = modelCount + delta;
    const min = unit.unitSizeConfig.min || 1;
    const max = unit.unitSizeConfig.max;
    if (newCount < min) return;
    if (max !== null && newCount > max) return;
    onUpdateEntry(entry.entryId, { modelCount: newCount });
  };

  // Helper to toggle an option choice (radio single-choice vs checkbox multi-choice)
  const handleToggleOption = (group: OptionGroup, choice: OptionChoice) => {
    if (!onUpdateEntry) return;

    let newSelected = [...selectedOptionIds];
    const isCurrentlySelected = newSelected.includes(choice.id);

    if (group.maxChoices === 1) {
      // Radio group: remove other choices from this group, then toggle this one
      const groupChoiceIds = group.choices.map((c) => c.id);
      newSelected = newSelected.filter((id) => !groupChoiceIds.includes(id));
      if (!isCurrentlySelected) {
        newSelected.push(choice.id);
      }
    } else {
      // Checkbox: toggle on / off
      if (isCurrentlySelected) {
        newSelected = newSelected.filter((id) => id !== choice.id);
      } else {
        newSelected.push(choice.id);
      }
    }

    onUpdateEntry(entry.entryId, { selectedOptionIds: newSelected });
  };

  // Helper to equip a magic item
  const handleAddMagicItem = (itemId: string) => {
    if (!onUpdateEntry || !itemId) return;
    const itemToAdd = availableMagicItems.find((i) => i.id === itemId);
    if (!itemToAdd) return;

    const currentItems = entry.selectedMagicItems || [];
    onUpdateEntry(entry.entryId, {
      selectedMagicItems: [...currentItems, itemToAdd],
    });
  };

  // Helper to remove an equipped magic item
  const handleRemoveMagicItem = (itemId: string) => {
    if (!onUpdateEntry) return;
    const currentItems = entry.selectedMagicItems || [];
    onUpdateEntry(entry.entryId, {
      selectedMagicItems: currentItems.filter((i) => i.id !== itemId),
    });
  };

  // Collect extra stats, weapons, and rules granted by currently selected options (e.g. Mounts)
  const selectedChoicesWithStats: OptionChoice[] = [];
  const selectedChoicesWithWeapons: Weapon[] = [];
  const selectedChoicesWithAbilities: Ability[] = [];

  if (unit.optionGroups) {
    for (const group of unit.optionGroups) {
      for (const choice of group.choices) {
        if (selectedOptionIds.includes(choice.id)) {
          if (choice.stats && choice.stats.length > 0) {
            selectedChoicesWithStats.push(choice);
          }
          if (choice.weapons) {
            selectedChoicesWithWeapons.push(...choice.weapons);
          }
          if (choice.abilities) {
            selectedChoicesWithAbilities.push(...choice.abilities);
          }
        }
        if (choice.subChoices) {
          for (const sub of choice.subChoices) {
            if (selectedOptionIds.includes(sub.id)) {
              if (sub.stats && sub.stats.length > 0) {
                selectedChoicesWithStats.push(sub);
              }
              if (sub.weapons) {
                selectedChoicesWithWeapons.push(...sub.weapons);
              }
              if (sub.abilities) {
                selectedChoicesWithAbilities.push(...sub.abilities);
              }
            }
          }
        }
      }
    }
  }

  // Combined weapons and abilities (base unit + mounts/upgrades)
  const allWeapons = [...unit.weapons, ...selectedChoicesWithWeapons];
  const allAbilities = [...unit.abilities, ...selectedChoicesWithAbilities];

  // Distinct stat column labels across all weapons (e.g. Range, Strength, AP)
  const weaponStatLabels = Array.from(
    new Set(allWeapons.flatMap((w) => w.profile.map((p) => p.label)))
  );

  return (
    <>
      <h2>{unit.name}</h2>
      {unit.subname && <p>{unit.subname}</p>}
      <hr />

      <p style={{ margin: '8px 0' }}>
        <strong style={{ color: '#38bdf8', fontSize: '1.2em' }}>{currentPoints} pts</strong>
        {modelCount > 1 && ` - ${modelCount} models`}
        {unit.baseSize && ` - ${unit.baseSize}`}
        {unit.isLegends && ' - Legends'}
      </p>

      {/* --- UNIT SIZE CONTROLS (The Old World) --- */}
      {unit.unitSizeConfig && (
        <div style={{ margin: '14px 0' }}>
          <h4>Unit Size</h4>
          <div className={styles.modelCountControls}>
            <button
              type="button"
              className={styles.counterButton}
              onClick={() => handleModelCountChange(-1)}
              disabled={modelCount <= (unit.unitSizeConfig.min || 1)}
            >
              -
            </button>
            <span className={styles.modelCountText}>{modelCount} models</span>
            <button
              type="button"
              className={styles.counterButton}
              onClick={() => handleModelCountChange(1)}
              disabled={
                unit.unitSizeConfig.max !== null && modelCount >= unit.unitSizeConfig.max
              }
            >
              +
            </button>
            <span style={{ fontSize: '0.85em', opacity: 0.7 }}>
              ({unit.unitSizeConfig.pointsPerModel} pts/model)
            </span>
          </div>
        </div>
      )}

      {/* --- CATEGORIZED UNIT OPTIONS (Mount, Weapons, Armour, Command) --- */}
      {unit.optionGroups && unit.optionGroups.length > 0 && (
        <div style={{ margin: '16px 0' }}>
          <h3>Options</h3>
          {unit.optionGroups.map((group) => (
            <div key={group.id} style={{ margin: '12px 0' }}>
              <h4 style={{ margin: '6px 0 4px 0' }}>
                {group.name}
                {group.maxChoices === 1 && (
                  <span
                    style={{
                      fontSize: '0.8em',
                      fontWeight: 400,
                      opacity: 0.6,
                      marginLeft: '6px',
                    }}
                  >
                    (Pick 1)
                  </span>
                )}
              </h4>

              {group.choices.map((choice) => {
                const isSelected = selectedOptionIds.includes(choice.id);

                return (
                  <div key={choice.id}>
                    <label className={styles.optionLabel}>
                      <input
                        type={group.maxChoices === 1 ? 'radio' : 'checkbox'}
                        name={`opt-${entry.entryId}-${group.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleOption(group, choice)}
                      />
                      <span>{choice.name}</span>

                      {/* Simple text info toggle */}
                      {choice.description && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleInfo(choice.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                            padding: '0 4px',
                            textDecoration: 'underline',
                          }}
                        >
                          {expandedInfoIds.includes(choice.id) ? '(hide info)' : '(info)'}
                        </button>
                      )}

                      {choice.points !== 0 && (
                        <span className={styles.optionCost}>
                          {choice.points > 0 ? `+${choice.points}` : choice.points} pts
                          {choice.perModel ? '/model' : ''}
                        </span>
                      )}
                    </label>

                    {/* Simple plain text description */}
                    {expandedInfoIds.includes(choice.id) && choice.description && (
                      <div style={{ margin: '4px 0 8px 24px', fontSize: '0.85em', opacity: 0.8 }}>
                        <RichText text={choice.description} />
                      </div>
                    )}

                    {/* Sub-choices (e.g. Barding on a Warhorse) */}
                    {isSelected &&
                      choice.subChoices &&
                      choice.subChoices.map((sub) => {
                        const isSubSelected = selectedOptionIds.includes(sub.id);
                        return (
                          <div key={sub.id}>
                            <label
                              className={styles.optionLabel}
                              style={{ paddingLeft: '24px' }}
                            >
                              <input
                                type="checkbox"
                                checked={isSubSelected}
                                onChange={() => {
                                  const newSelected = isSubSelected
                                    ? selectedOptionIds.filter((id) => id !== sub.id)
                                    : [...selectedOptionIds, sub.id];
                                  if (onUpdateEntry) {
                                    onUpdateEntry(entry.entryId, {
                                      selectedOptionIds: newSelected,
                                    });
                                  }
                                }}
                              />
                              <span>{sub.name}</span>
                              {sub.description && (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleInfo(sub.id, e)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    fontSize: '0.8em',
                                    padding: '0 4px',
                                    textDecoration: 'underline',
                                  }}
                                >
                                  {expandedInfoIds.includes(sub.id) ? '(hide info)' : '(info)'}
                                </button>
                              )}
                              {sub.points !== 0 && (
                                <span className={styles.optionCost}>
                                  +{sub.points} pts{sub.perModel ? '/model' : ''}
                                </span>
                              )}
                            </label>

                            {/* Simple plain text description for sub-choice */}
                            {expandedInfoIds.includes(sub.id) && sub.description && (
                              <div style={{ margin: '4px 0 8px 48px', fontSize: '0.85em', opacity: 0.8 }}>
                                <RichText text={sub.description} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* --- MAGIC ITEMS & HONOURS / VIRTUES (The Old World) --- */}
      {unit.magicPools && unit.magicPools.length > 0 && (
        <div style={{ margin: '16px 0' }}>
          <h3>Magic Items</h3>
          {unit.magicPools.map((pool) => {
            const equippedInPool = (entry.selectedMagicItems || []).filter((item) =>
              pool.allowedTypes.includes(item.type)
            );
            const spentInPool = equippedInPool.reduce(
              (sum, item) => sum + (item.points ?? 0),
              0
            );
            const maxPoints = pool.maxPoints;

            // Items eligible for this pool that aren't already equipped on this unit
            const selectableItems = availableMagicItems.filter(
              (item) =>
                pool.allowedTypes.includes(item.type) &&
                !equippedInPool.some((eq) => eq.id === item.id)
            );

            return (
              <div key={pool.name} style={{ margin: '12px 0' }}>
                <h4 style={{ margin: '6px 0 4px 0' }}>
                  {pool.name}
                  {maxPoints !== null ? (
                    <span style={{ fontSize: '0.85em', fontWeight: 400, opacity: 0.7, marginLeft: '8px' }}>
                      ({spentInPool} / {maxPoints} pts)
                    </span>
                  ) : (
                    spentInPool > 0 && (
                      <span style={{ fontSize: '0.85em', fontWeight: 400, opacity: 0.7, marginLeft: '8px' }}>
                        (+{spentInPool} pts)
                      </span>
                    )
                  )}
                </h4>

                {/* Currently equipped items in this pool */}
                {equippedInPool.map((item) => (
                  <div key={item.id} style={{ margin: '6px 0', paddingLeft: '8px' }}>
                    <div>
                      <strong>{item.name}</strong>{' '}
                      <span style={{ color: '#38bdf8' }}>({item.points} pts)</span>{' '}
                      <button
                        type="button"
                        onClick={() => handleRemoveMagicItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff6b6b',
                          cursor: 'pointer',
                          fontSize: '0.8em',
                        }}
                      >
                        [remove]
                      </button>
                    </div>
                    {item.description && (
                      <p style={{ fontSize: '0.85em', opacity: 0.75, margin: '2px 0 0 0' }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}

                {/* Dropdown to pick an item */}
                {selectableItems.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => handleAddMagicItem(e.target.value)}
                    className={styles.magicItemSelect}
                  >
                    <option value="" disabled>
                      + Add {pool.name}...
                    </option>
                    {selectableItems.map((item) => {
                      const exceedsBudget =
                        maxPoints !== null &&
                        spentInPool + item.points > maxPoints;
                      return (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={exceedsBudget}
                        >
                          {item.name} ({item.points} pts)
                          {exceedsBudget ? ' - Exceeds Budget' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- STATS PROFILE (MAIN UNIT & MOUNTS) --- */}
      {unit.stats.length > 0 && (
        <div style={{ margin: '16px 0' }}>
          {selectedChoicesWithStats.length > 0 && (
            <p style={{ margin: '4px 0', fontWeight: 600 }}>{unit.name}</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {unit.stats.map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: '0.7em', opacity: 0.6 }}>{stat.label}</div>
                <div style={{ fontSize: '1.2em', fontWeight: 600 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mount Stats (matching the same simple format) */}
      {selectedChoicesWithStats.map((choice) => (
        <div key={choice.id} style={{ margin: '16px 0' }}>
          <p style={{ margin: '4px 0', fontWeight: 600 }}>
            {choice.name} (Mount)
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {choice.stats?.map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: '0.7em', opacity: 0.6 }}>{stat.label}</div>
                <div style={{ fontSize: '1.2em', fontWeight: 600 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* --- WEAPONS GRID TABLE (Rider + Mount) --- */}
      {allWeapons.length > 0 && (
        <div style={{ margin: '16px 0' }}>
          <h3>Weapons</h3>
          {weaponStatLabels.length > 0 ? (
            <table className={styles.weaponTable}>
              <thead>
                <tr>
                  <th>Weapon</th>
                  {weaponStatLabels.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allWeapons.map((weapon) => (
                  <tr key={weapon.id}>
                    <td>
                      <strong>{weapon.name}</strong>
                    </td>
                    {weaponStatLabels.map((label) => {
                      const stat = weapon.profile.find((p) => p.label === label);
                      return <td key={label}>{stat ? stat.value : '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            allWeapons.map((weapon) => (
              <div key={weapon.id} style={{ marginBottom: '8px' }}>
                <strong>{weapon.name}</strong>{' '}
                <span style={{ opacity: 0.6 }}>({weapon.type})</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- ABILITIES / SPECIAL RULES (Unit + Mount + Upgrades) --- */}
      {allAbilities.length > 0 && <h3>Special Rules</h3>}
      {allAbilities.map((ability) => (
        <details key={ability.id} style={{ marginBottom: '6px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            {ability.name}
            {ability.timing && (
              <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.85em' }}>
                {' - '}
                {ability.timing}
              </span>
            )}
          </summary>
          <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
            <RichText text={ability.text} />
          </div>
        </details>
      ))}

      {/* --- KEYWORDS --- */}
      {unit.keywords.length > 0 && (
        <>
          <h3>Keywords</h3>
          <p style={{ fontSize: '0.85em', opacity: 0.8 }}>{unit.keywords.join(' - ')}</p>
        </>
      )}
    </>
  );
}


