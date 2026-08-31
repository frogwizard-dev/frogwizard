'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Group, Panel, Separator } from 'react-resizable-panels';
import styles from '@/app/page.module.css';

import AvailableUnits from '@/components/AvailableUnits';
import MusterList from '@/components/MusterList';
import Datasheet from '@/components/Datasheet';
import type { Faction, RosterEntry, Unit } from '@/lib/units';
import type { FactionSummary } from '@/lib/data';

export default function Workspace({
  faction,
  factions,
}: {
  faction: Faction;
  factions: FactionSummary[];
}) {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [focusedUnit, setFocusedUnit] = useState<Unit | null>(null);
  const [nextEntryId, setNextEntryId] = useState(1);

  // THE MATH: sums the roster. Units with no battle profile count as 0.
  const totalPoints = roster.reduce((sum, entry) => sum + (entry.unit.points ?? 0), 0);

  const handleAddUnit = (unit: Unit) => {
    setRoster([...roster, { entryId: nextEntryId, unit }]);
    setNextEntryId(nextEntryId + 1);
  };

  const handleRemoveUnit = (entryId: number) => {
    setRoster(roster.filter((entry) => entry.entryId !== entryId));
  };

  // Pushing ?faction=... re-runs the server component, which fetches the new data.
  const handleChangeFaction = (slug: string) => {
    setRoster([]);
    setFocusedUnit(null);
    router.push(`/?faction=${slug}`);
  };

  return (
    <main className={styles.appContainer}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <Image
            src="/frogwizard.png"
            alt="Frogwizard Logo"
            width={64}
            height={64}
            className={styles.logo}
          />
          <h1 className={styles.headerTitle}>Frogwizard</h1>
        </div>

        <select
          value={faction.slug}
          onChange={(e) => handleChangeFaction(e.target.value)}
          aria-label="Choose a faction"
        >
          {factions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>

        <div className={styles.pointsCounter}>Total Points: {totalPoints}</div>
      </header>

      <div className={styles.workspace}>
        <Group orientation="horizontal">
          <Panel defaultSize={25} minSize={15} className={styles.column}>
            <AvailableUnits faction={faction} onAddUnit={handleAddUnit} />
          </Panel>

          <Separator className={styles.resizeHandle} />

          <Panel defaultSize={40} minSize={20} className={styles.column}>
            <MusterList
              roster={roster}
              onFocusUnit={setFocusedUnit}
              onRemoveUnit={handleRemoveUnit}
            />
          </Panel>

          <Separator className={styles.resizeHandle} />

          <Panel defaultSize={35} minSize={20} className={styles.column}>
            <Datasheet unit={focusedUnit} />
          </Panel>
        </Group>
      </div>
    </main>
  );
}
