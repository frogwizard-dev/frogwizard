// src/lib/data.ts
// This is the bit my pages actually call. Server only!

import { fetchRepoJson } from './github';
import { getGame, slugFromPath, titleFromSlug, type GameId } from './games';
import { parseAosFaction } from './aos';
import type { Faction } from './units';

export type FactionSummary = {
  slug: string;
  name: string;
  path: string;
};

// Every repo has a manifest.json listing its faction files, so I read that
// instead of typing out all 35 factions by hand. If they add one it just shows up.
export async function listFactions(game: GameId) {
  const settings = getGame(game);
  const manifestPath = settings.extractRoot + '/manifest.json';

  const manifest = await fetchRepoJson(settings.repo, manifestPath, settings.branch, game + ':manifest');

  const factions: FactionSummary[] = [];

  for (const path of manifest.factionFiles) {
    const slug = slugFromPath(path);

    // files starting with _ are bookkeeping (like _orphans.json), not real factions
    if (slug.startsWith('_')) {
      continue;
    }

    factions.push({ slug: slug, name: titleFromSlug(slug), path: path });
  }

  // put them in alphabetical order for the dropdown
  factions.sort((a, b) => a.name.localeCompare(b.name));

  return factions;
}

export async function loadFaction(game: GameId, slug: string) {
  const settings = getGame(game);

  // look up which file this faction lives in
  const factions = await listFactions(game);
  let match = null;

  for (const faction of factions) {
    if (faction.slug === slug) {
      match = faction;
    }
  }

  if (!match) {
    throw new Error('There is no faction called "' + slug + '" in ' + settings.repo);
  }

  if (game !== 'aos') {
    throw new Error(settings.label + " isn't done yet - it needs its own parser like src/lib/aos.ts");
  }

  const filePath = settings.extractRoot + '/' + match.path;
  const data = await fetchRepoJson(settings.repo, filePath, settings.branch, game + ':' + slug);

  const faction: Faction = parseAosFaction(slug, data);
  return faction;
}
