import styles from '@/app/page.module.css';

export default function AvailableUnits({ units, onAddUnit }: { units: any[], onAddUnit: any }) {
  return (
    <>
      <h2>Available Units</h2>
      <hr />
      {units.map((unit) => (
        <button 
          key={unit.id} 
          className={styles.unitButton}
          onClick={() => onAddUnit(unit)}
        >
          {unit.name} ({unit.points} pts)
        </button>
      ))}
    </>
  );
}