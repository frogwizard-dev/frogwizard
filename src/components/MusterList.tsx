import styles from '@/app/page.module.css';

export default function MusterList({ roster, onFocusUnit, onRemoveUnit }: { roster: any[], onFocusUnit: any, onRemoveUnit: any }) {
  return (
    <>
      <h2>Muster List</h2>
      <hr />
      {roster.length === 0 ? (
        <p>Your list is empty. Add a unit from the left.</p>
      ) : (
        roster.map((unit, index) => (
          <div 
            key={index} 
            className={styles.rosterItem}
            onClick={() => onFocusUnit(unit)}
          >
            <span>{unit.name}</span>
            <button 
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation(); // Stops the click from selecting the unit
                onRemoveUnit(index);
              }}
            >
              X
            </button>
          </div>
        ))
      )}
    </>
  );
}