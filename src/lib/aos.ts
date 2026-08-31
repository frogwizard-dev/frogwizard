// src/lib/aos.ts
// Takes the raw JSON out of aos-data and turns it into the simpler shape
// that my components use (the one in units.ts).
//
// The file looks like this:
//   { faction: "Ironjawz", alliance: "Destruction", warscrolls: [ ... ] }
// and each warscroll has about 45 fields on it. I only use some of them.

import type { Faction, Stat, Unit } from './units';

// the raw json has loads of fields I don't use, so I'm not typing it all out
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAosFaction(slug: string, data: any): Faction {
  const units: Unit[] = [];
  const terrain: Unit[] = [];
  const manifestations: Unit[] = [];

  for (const warscroll of data.warscrolls) {
    // Spearhead units are the ones out of the boxed game. They have no points
    // AND they're duplicates of the normal warscroll with the same name, so if
    // you leave them in you get everything listed twice.
    if (warscroll.isSpearhead) {
      continue;
    }

    // the data has its own flag for stuff you're not allowed to put in a list
    if (warscroll.hiddenFromBattleProfiles) {
      continue;
    }

    // referenceKeywords is one long string, like "Unique, Infantry, Ward (6+)"
    let keywords: string[] = [];
    if (warscroll.referenceKeywords) {
      keywords = warscroll.referenceKeywords.split(',').map((word: string) => word.trim());
    }


    // The statline. Not every unit has all of these (only some have a Ward)
    // so I only add the ones that actually have a value.
    const stats: Stat[] = [];
    if (warscroll.move) stats.push({ label: 'Move', value: warscroll.move });
    if (warscroll.health) stats.push({ label: 'Health', value: warscroll.health });
    if (warscroll.save) stats.push({ label: 'Save', value: warscroll.save });
    if (warscroll.control) stats.push({ label: 'Control', value: warscroll.control });
    if (warscroll.wardSave) stats.push({ label: 'Ward', value: warscroll.wardSave });

    // The weapons are already in the file so I don't have to go and look
    // them up somewhere else, which is nice.
    const weapons = [];
    for (const weapon of warscroll.weapons) {
      const profile: Stat[] = [];
      // melee weapons have no range, so they just don't get a Rng column
      if (weapon.range) profile.push({ label: 'Rng', value: weapon.range });
      if (weapon.attacks) profile.push({ label: 'Atk', value: weapon.attacks });
      if (weapon.hit) profile.push({ label: 'Hit', value: weapon.hit });
      if (weapon.wound) profile.push({ label: 'Wnd', value: weapon.wound });
      if (weapon.rend) profile.push({ label: 'Rnd', value: weapon.rend });
      if (weapon.damage) profile.push({ label: 'Dmg', value: weapon.damage });

      weapons.push({
        id: weapon.id,
        name: weapon.name,
        type: weapon.type,
        profile: profile,
      });
    }

    // The abilities are in the file too. "declare" is when you can use it and
    // "effect" is what it actually does, so I stick them together.
    const abilities = [];
    for (const ability of warscroll.abilities) {
      let text = '';
      if (ability.declare) {
        text = ability.declare;
      }
      if (ability.effect) {
        if (text !== '') {
          text = text + '\n\n';
        }
        text = text + ability.effect;
      }

      abilities.push({
        id: ability.id,
        name: ability.name,
        timing: ability.phaseDetails,
        text: text,
      });
    }

    const unit = {
      id: warscroll.id,
      name: warscroll.name,
      subname: warscroll.subname,
      points: warscroll.points,
      modelCount: warscroll.modelCount,
      baseSize: warscroll.baseSize,
      keywords: keywords,
      stats: stats,
      weapons: weapons,
      abilities: abilities,
      isLegends: warscroll.isLegends,
      lore: warscroll.lore,
    };

    // Faction terrain and manifestations (endless spells) are warscrolls in the
    // file just like everything else, but they aren't units, so they go in
    // their own lists. Every Endless Spell is also a Manifestation, so I don't
    // need to check for that separately.
    if (keywords.includes('Faction Terrain')) {
      terrain.push(unit);
    } else if (keywords.includes('Manifestation')) {
      manifestations.push(unit);
    } else {
      units.push(unit);
    }
  }

  // alphabetical so the lists aren't in a random order
  units.sort((a, b) => a.name.localeCompare(b.name));
  terrain.sort((a, b) => a.name.localeCompare(b.name));
  manifestations.sort((a, b) => a.name.localeCompare(b.name));

  return {
    slug: slug,
    name: data.faction,
    alliance: data.alliance,
    units: units,
    terrain: terrain,
    manifestations: manifestations,
  };
}
