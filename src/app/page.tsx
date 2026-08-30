'use client';

import { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import styles from './page.module.css';

// Import your new components
import AvailableUnits from '@/components/AvailableUnits';
import MusterList from '@/components/MusterList';
import Datasheet from '@/components/Datasheet';

const availableUnits = [
  { id: 1, name: 'Night Goblin Shaman', points: 85, type: 'Character' },
  { id: 2, name: 'Black Orc Mob', points: 140, type: 'Core' },
  { id: 3, name: 'Wolf Chariot', points: 90, type: 'Special' },
  { id: 4, name: 'Arachnarok Spider', points: 290, type: 'Rare' }
];

export default function Home() {
  const [roster, setRoster] = useState([]);
  const [focusedUnit, setFocusedUnit] = useState(null);

  const handleAddUnit = (unit: any) => {
    setRoster([...roster, unit]);
  };

  return (
    <main className={styles.appContainer}>
      <Group orientation="horizontal">
        
        <Panel defaultSize={25} minSize={15} className={styles.column}>
          {/* Pass data and actions down as props */}
          <AvailableUnits units={availableUnits} onAddUnit={handleAddUnit} />
        </Panel>

        <Separator className={styles.resizeHandle} />

        <Panel defaultSize={40} minSize={20} className={styles.column}>
          <MusterList roster={roster} onFocusUnit={setFocusedUnit} />
        </Panel>

        <Separator className={styles.resizeHandle} />

        <Panel defaultSize={35} minSize={20} className={styles.column}>
          <Datasheet unit={focusedUnit} />
        </Panel>

      </Group>
    </main>
  );
}