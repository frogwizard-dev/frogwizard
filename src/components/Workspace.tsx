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
import { calculateEntryPoints } from '@/lib/units';
import type { FactionSummary } from '@/lib/data';
import type { GameId } from '@/lib/games';

// The list of supported tabletop games
const GAMES: { id: GameId; name: string }[] = [
  { id: 'tow', name: 'The Old World' },
  { id: 'aos', name: 'Age of Sigmar' },
  { id: '40k', name: 'Warhammer 40,000' },
];

export default function Workspace({
  currentGame,
  faction,
  factions,
}: {
  currentGame: GameId;
  faction: Faction;
  factions: FactionSummary[];
}) {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [focusedEntryId, setFocusedEntryId] = useState<number | null>(null);
  const [nextEntryId, setNextEntryId] = useState(1);

  // THE MATH: sums the roster with all models & options accounted for!
  const totalPoints = roster.reduce((sum, entry) => sum + calculateEntryPoints(entry), 0);

  const handleAddUnit = (unit: Unit) => {
    const entryId = nextEntryId;

    // Pick default options (e.g. default weapon loadout)
    const defaultOptionIds: string[] = [];
    if (unit.optionGroups) {
      for (const group of unit.optionGroups) {
        for (const choice of group.choices) {
          if (choice.isDefault) {
            defaultOptionIds.push(choice.id);
          }
        }
      }
    }

    const newEntry: RosterEntry = {
      entryId,
      unit,
      modelCount: unit.unitSizeConfig ? unit.unitSizeConfig.min : (unit.modelCount ?? 1),
      selectedOptionIds: defaultOptionIds,
    };

    setRoster([...roster, newEntry]);
    setNextEntryId(nextEntryId + 1);
    setFocusedEntryId(entryId);
  };

  // Update a customized entry in the roster (model count, options, etc.)
  const handleUpdateEntry = (entryId: number, updates: Partial<RosterEntry>) => {
    setRoster(
      roster.map((entry) =>
        entry.entryId === entryId ? { ...entry, ...updates } : entry
      )
    );
  };

  const handleRemoveUnit = (entryId: number) => {
    const updated = roster.filter((entry) => entry.entryId !== entryId);
    setRoster(updated);
    if (focusedEntryId === entryId) {
      if (updated.length > 0) {
        setFocusedEntryId(updated[updated.length - 1].entryId);
      } else {
        setFocusedEntryId(null);
      }
    }
  };

  const handleFocusEntry = (entry: RosterEntry) => {
    setFocusedEntryId(entry.entryId);
  };

  // Switching game: reset army list and navigate to the new game
  const handleChangeGame = (gameId: string) => {
    setRoster([]);
    setFocusedEntryId(null);
    router.push(`/?game=${gameId}`);
  };

  // Switching faction within the current game
  const handleChangeFaction = (slug: string) => {
    setRoster([]);
    setFocusedEntryId(null);
    router.push(`/?game=${currentGame}&faction=${slug}`);
  };

  // Find the entry currently selected for the datasheet panel
  const focusedEntry = roster.find((entry) => entry.entryId === focusedEntryId) || null;

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

        {/* Dropdowns for switching Game and Army */}
        <div className={styles.headerControls}>
          {/* Game Dropdown */}
          <select
            value={currentGame}
            onChange={(e) => handleChangeGame(e.target.value)}
            aria-label="Choose a game"
            className={styles.factionSelect}
          >
            {GAMES.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>

          {/* Faction / Army Dropdown */}
          <select
            value={faction.slug}
            onChange={(e) => handleChangeFaction(e.target.value)}
            aria-label="Choose a faction"
            className={styles.factionSelect}
          >
            {factions.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

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
              groups={faction.groups}
              focusedEntryId={focusedEntryId}
              onFocusEntry={handleFocusEntry}
              onRemoveUnit={handleRemoveUnit}
            />
          </Panel>

          <Separator className={styles.resizeHandle} />

          <Panel defaultSize={35} minSize={20} className={styles.column}>
            <Datasheet
              entry={focusedEntry}
              availableMagicItems={faction.magicItems || []}
              onUpdateEntry={handleUpdateEntry}
            />
          </Panel>
        </Group>
      </div>
    </main>
  );
}
