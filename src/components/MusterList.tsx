import styles from '@/app/page.module.css';

export default function MusterList({ roster, onFocusUnit }: { roster: any[], onFocusUnit: any }) {
  return (
    <>
      <h2>Muster List</h2>
      <hr />
      {roster.length === 0 ? (
        <p>Your list is empty. Add a unit from the left.</p>
      ) : (
        roster.map((unit, index) => (
          <button 
            key={index} 
            className={styles.unitButton}
            onClick={() => onFocusUnit(unit)}
          >
            {unit.name}
          </button>
        ))
      )}
    </>
  );
}