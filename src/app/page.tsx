// src/app/page.tsx
// Server Component - this never reaches the browser, so it can read the token.

import Workspace from '@/components/Workspace';
import { listFactions, loadFaction } from '@/lib/data';

// Kept separate from the component so no JSX is built inside the try/catch -
// React wouldn't catch render errors there anyway.
async function loadData(slug: string) {
  try {
    const factions = await listFactions('aos');
    const faction = await loadFaction('aos', slug);
    return { factions, faction, error: null };
  } catch (error) {
    return {
      factions: [],
      faction: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ faction?: string }>;
}) {
  // searchParams is a promise in this version of Next.
  const { faction: requested } = await searchParams;
  const { factions, faction, error } = await loadData(requested ?? 'ironjawz');

  if (!faction) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Could not load army data</h1>
        <p style={{ color: '#b00' }}>{error}</p>
      </main>
    );
  }

  return <Workspace faction={faction} factions={factions} />;
}
