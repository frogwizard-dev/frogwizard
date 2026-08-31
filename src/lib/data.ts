// src/lib/data.ts
// This is the bit my pages actually call. Server only!

import { fetchRepoJson } from './github';
import { getGame, slugFromPath, titleFromSlug, type GameId } from './games';
import { parseAosFaction } from './aos';
import { parse40kFaction } from './warhammer40k';
import { parseOldWorldFaction } from './oldworld';
import type { Faction } from './units';

export type FactionSummary = {
  slug: string;
  name: string;
  path: string;
};

// Every repo has a manifest.json listing its faction files, so I read that
// instead of typing out all the factions by hand. If they add one it just
// shows up. NOTE: Old World calls the list "armyFiles" and the other two
// call it "factionFiles", so check for both.
export async function listFactions(game: GameId) {
  const settings = getGame(game);
  const manifestPath = settings.extractRoot + '/manifest.json';

  const manifest = await fetchRepoJson(settings.repo, manifestPath, settings.branch, game + ':manifest');
  const fileList = manifest.factionFiles || manifest.armyFiles;

  if (!fileList) {
    throw new Error('The manifest in ' + settings.repo + ' has no factionFiles or armyFiles in it.');
  }

  const factions: FactionSummary[] = [];

  for (const path of fileList) {
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

export async function loadFaction(game: GameId, slug: string): Promise<Faction> {
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

  const filePath = settings.extractRoot + '/' + match.path;
  const data = await fetchRepoJson(settings.repo, filePath, settings.branch, game + ':' + slug);

  if (game === 'aos') {
    // AoS has the weapons and abilities already inside the faction file,
    // so this is the only download it needs.
    return parseAosFaction(slug, data);
  }

  if (game === '40k') {
    // 40k only stores ids for weapons and keywords, so I have to fetch the
    // two lookup files as well. They're shared by every faction and cached
    // for an hour, so it's one download not one per faction.
    // WARNING: wargear.json is about 4.5MB.
    const wargear = await fetchRepoJson(
      settings.repo,
      settings.extractRoot + '/wargear.json',
      settings.branch,
      '40k:wargear',
    );
    const keywords = await fetchRepoJson(
      settings.repo,
      settings.extractRoot + '/keywords.json',
      settings.branch,
      '40k:keywords',
    );
    const publications = await fetchRepoJson(
      settings.repo,
      settings.extractRoot + '/publications.json',
      settings.branch,
      '40k:publications',
    );
    return parse40kFaction(slug, data, wargear, keywords, publications);
  }

  // Old World. Only needs the special rules for the ability text.
  const specialRules = await fetchRepoJson(
    settings.repo,
    settings.extractRoot + '/special-rules.json',
    settings.branch,
    'tow:special-rules',
  );
  return parseOldWorldFaction(slug, data, specialRules);
}
