// src/app/page.tsx
import Workspace from '@/components/Workspace';
import { listFactions, loadFaction } from '@/lib/data';
import type { GameId } from '@/lib/games';

// Helper to load factions and selected army data for any game
async function loadData(game: GameId, requestedSlug?: string) {
  try {
    const factions = await listFactions(game);
    let targetSlug = requestedSlug;
    if (!targetSlug || !factions.some((f) => f.slug === targetSlug)) {
      targetSlug = factions[0]?.slug ?? 'bretonnia';
    }

    const faction = await loadFaction(game, targetSlug);
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
  searchParams: Promise<{ game?: string; faction?: string }>;
}) {
  const { game: requestedGame, faction: requestedFaction } = await searchParams;

  const currentGame: GameId =
    requestedGame === 'aos' || requestedGame === '40k' || requestedGame === 'tow'
      ? requestedGame
      : 'tow';

  const { factions, faction, error } = await loadData(currentGame, requestedFaction);

  if (!faction) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Could not load army data</h1>
        <p style={{ color: '#ff4a4a' }}>{error}</p>
      </main>
    );
  }

  return (
    <Workspace
      currentGame={currentGame}
      faction={faction}
      factions={factions}
    />
  );
}