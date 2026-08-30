export default function Datasheet({ unit }: { unit: any }) {
  return (
    <>
      <h2>Datasheet</h2>
      <hr />
      {unit ? (
        <div>
          <h3>{unit.name}</h3>
          <p><strong>Type:</strong> {unit.type}</p>
          <p><strong>Base Cost:</strong> {unit.points} pts</p>
        </div>
      ) : (
        <p>Select a unit from your list to view its warscroll.</p>
      )}
    </>
  );
}