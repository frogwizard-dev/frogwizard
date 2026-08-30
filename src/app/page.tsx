'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Group, Panel, Separator } from 'react-resizable-panels';
import styles from './page.module.css';

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
  const [roster, setRoster] = useState<any[]>([]);
  const [focusedUnit, setFocusedUnit] = useState(null);

  // THE MATH: Loops through the roster and sums up the points
  const totalPoints = roster.reduce((sum, unit) => sum + unit.points, 0);

  const handleAddUnit = (unit: any) => {
    setRoster([...roster, unit]);
  };

  return (
    <main className={styles.appContainer}>
      
      {/* THE UPDATED HEADER */}
      <header className={styles.header}>
        {/* Group 1: Logo and Title on the left */}
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
        
        {/* Group 2: Points on the right */}
        <div className={styles.pointsCounter}>
          Total Points: {totalPoints}
        </div>
      </header>

      {/* THE WORKSPACE */}
      <div className={styles.workspace}>
        <Group orientation="horizontal">
          
          <Panel defaultSize={25} minSize={15} className={styles.column}>
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
      </div>

    </main>
  );
}