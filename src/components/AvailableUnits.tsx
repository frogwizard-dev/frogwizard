'use client';

import { useState } from 'react';
import styles from '@/app/page.module.css';
import type { Faction, Unit } from '@/lib/units';

function Section({
  title,
  units,
  onAddUnit,
}: {
  title: string;
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
}) {
  if (units.length === 0) {
    return null;
  }

  return (
    <details open style={{ marginBottom: '16px' }}>
      <summary className={styles.categoryHeader}>
        {title} ({units.length})
      </summary>

      <div style={{ marginTop: '8px' }}>
        {units.map((unit) => (
          <button
            key={unit.id}
            className={styles.unitButton}
            onClick={() => onAddUnit(unit)}
          >
            {unit.name}
            {unit.points !== null && ` (${unit.points} pts)`}
            {unit.isLegends && ' - Legends'}
          </button>
        ))}
      </div>
    </details>
  );
}

export default function AvailableUnits({
  faction,
  onAddUnit,
}: {
  faction: Faction;
  onAddUnit: (unit: Unit) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filterUnits = (unitList: Unit[]) => {
    if (!searchTerm.trim()) {
      return unitList;
    }

    // Convert to lowercase for case-insensitive search
    return unitList.filter((unit) =>
      unit.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredGroups = faction.groups.map((group) => ({
    title: group.title,
    units: filterUnits(group.units),
  }));

  let totalMatches = 0;
  for (const group of filteredGroups) {
    totalMatches += group.units.length;
  }

  return (
    <>
      <h2>{faction.name}</h2>
      <hr />

      {/* Search Input Box */}
      <input
        type="text"
        placeholder="Search units..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />

      {/* If nothing matches the search, show a message */}
      {totalMatches === 0 && searchTerm.trim() !== '' && (
        <p style={{ color: '#888', fontStyle: 'italic' }}>
          No units found matching &quot;{searchTerm}&quot;
        </p>
      )}

      {/* Render each category section (Characters, Core, Special, etc.) */}
      {filteredGroups.map((group) => (
        <Section
          key={group.title}
          title={group.title}
          units={group.units}
          onAddUnit={onAddUnit}
        />
      ))}
    </>
  );
}
