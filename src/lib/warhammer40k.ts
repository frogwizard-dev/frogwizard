// src/lib/warhammer40k.ts
// Takes the JSON out of 40k-data and turns it into the shape in units.ts.
//
// 40k is laid out differently to AoS. The awkward bits:
//  - the name is inside localisations.en, not on the datasheet
//  - points live on "compositions" (a 5 man squad and a 10 man squad are
//    two compositions with different points)
//  - the statline is per model, in "miniatures"
//  - weapons are NOT in the file. You get wargearItemIds and have to look
//    them up in wargear.json.
//  - same for keywords, they're ids that live in keywords.json

import type { Ability, Faction, Stat, Unit, UnitGroup, Weapon } from './units';

// Pulls the english name out of a localisations object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function englishName(thing: any) {
  if (thing && thing.localisations && thing.localisations.en && thing.localisations.en.name) {
    return thing.localisations.en.name;
  }
  return 'Unknown';
}

// wargear.json and keywords.json are big lists. Turn them into lookups so I'm
// not searching the whole array over and over for every single weapon.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWargearLookup(wargearData: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lookup = new Map<string, any>();
  for (const item of wargearData.wargear) {
    lookup.set(item.id, item);
  }
  return lookup;
}

// Combat Patrol datasheets are the boxed game versions. They have no points
// and they duplicate the normal datasheet, same as Spearhead does in AoS.
// There's no flag for them, but they all come from a publication whose name
// starts "Combat Patrol:", which is how aos-data works out isSpearhead too.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCombatPatrolPublicationIds(publicationsData: any) {
  const ids: string[] = [];
  for (const publication of publicationsData.publications) {
    const name = englishName(publication);
    if (name.startsWith('Combat Patrol:')) {
      ids.push(publication.id);
    }
  }
  return ids;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildKeywordLookup(keywordsData: any) {
  const lookup = new Map<string, string>();
  for (const keyword of keywordsData.keywords) {
    lookup.set(keyword.id, englishName(keyword));
  }
  return lookup;
}

// The loadout has weapons scattered across several different lists, so I go
// through all of them and collect every id I can find.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectWargearIds(loadout: any) {
  const ids: string[] = [];

  if (!loadout) {
    return ids;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addItems(items: any) {
    if (!items) return;
    for (const item of items) {
      if (item.wargearItemId && !ids.includes(item.wargearItemId)) {
        ids.push(item.wargearItemId);
      }
    }
  }

  addItems(loadout.base);

  const choiceLists = [loadout.choiceSets, loadout.limitedChoiceSets, loadout.allModelChoiceSets];
  for (const list of choiceLists) {
    if (!list) continue;
    for (const choiceSet of list) {
      for (const choice of choiceSet.choices || []) {
        addItems(choice.items);
      }
    }
  }

  for (const group of loadout.optionGroups || []) {
    for (const option of group.options || []) {
      addItems(option.items);
    }
  }

  return ids;
}

// 40k writes its rules text as HTML, but AoS uses **asterisks** for bold.
// I convert it here so the components only ever have to deal with one format.
// <k> is 40k's tag for keywords like [Lethal Hits], so that gets bolded too.
function htmlToText(html: string) {
  let text = html;

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<li>/gi, '\u2022 ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/?ul>/gi, '\n');
  text = text.replace(/<\/?(b|k)>/gi, '**');
  // anything left over (like <u>) is just styling I don't need
  text = text.replace(/<[^>]+>/g, '');
  // an empty <b></b> would leave **** behind, which renders as literal stars
  text = text.replace(/\*\*\*\*/g, '');
  // tidy up the blank lines the list conversion leaves behind
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// One wargear item can have several profiles on it (a weapon with a
// "standard" and a "supercharge" mode), so each profile becomes its own row.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function weaponsFromItem(item: any): Weapon[] {
  const weapons: Weapon[] = [];

  for (const profile of item.profiles || []) {
    const stats: Stat[] = [];
    if (profile.range) stats.push({ label: 'Range', value: profile.range });
    if (profile.attacks) stats.push({ label: 'A', value: profile.attacks });
    // ranged weapons have a ballistic skill, melee ones have a weapon skill
    if (profile.ballisticSkill) stats.push({ label: 'BS', value: profile.ballisticSkill });
    if (profile.weaponSkill) stats.push({ label: 'WS', value: profile.weaponSkill });
    if (profile.strength) stats.push({ label: 'S', value: profile.strength });
    if (profile.armourPenetration) stats.push({ label: 'AP', value: profile.armourPenetration });
    if (profile.damage) stats.push({ label: 'D', value: profile.damage });

    weapons.push({
      id: profile.id,
      name: englishName(profile),
      type: profile.type || 'weapon',
      profile: stats,
    });
  }

  return weapons;
}

export function parse40kFaction(
  slug: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wargear: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keywords: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publications: any,
): Faction {
  const wargearLookup = buildWargearLookup(wargear);
  const keywordLookup = buildKeywordLookup(keywords);
  const combatPatrolIds = buildCombatPatrolPublicationIds(publications);

  const units: Unit[] = [];

  for (const datasheet of data.datasheets) {
    if (combatPatrolIds.includes(datasheet.publicationId)) {
      continue;
    }

    const miniatures = datasheet.miniatures || [];

    // The statline is per model. A unit can have more than one kind of model
    // (a sergeant and his squad), so I use the first one that isn't hidden.
    const stats: Stat[] = [];
    let firstModel = null;
    for (const miniature of miniatures) {
      if (!miniature.statlineHidden) {
        firstModel = miniature;
        break;
      }
    }

    if (firstModel) {
      if (firstModel.movement) stats.push({ label: 'M', value: firstModel.movement });
      if (firstModel.toughness) stats.push({ label: 'T', value: String(firstModel.toughness) });
      if (firstModel.save) stats.push({ label: 'SV', value: firstModel.save });
      if (firstModel.wounds) stats.push({ label: 'W', value: String(firstModel.wounds) });
      if (firstModel.leadership) stats.push({ label: 'LD', value: String(firstModel.leadership) });
      if (firstModel.objectiveControl !== null && firstModel.objectiveControl !== undefined) {
        stats.push({ label: 'OC', value: String(firstModel.objectiveControl) });
      }
    }

    // Points are on the compositions. I use the default one if there is one,
    // otherwise the first one that actually has a price on it.
    let points = null;
    let modelCount = null;
    const compositions = datasheet.compositions || [];
    let chosen = null;

    for (const composition of compositions) {
      if (composition.isDefault && composition.points !== null) {
        chosen = composition;
        break;
      }
    }
    if (!chosen) {
      for (const composition of compositions) {
        if (composition.points !== null) {
          chosen = composition;
          break;
        }
      }
    }

    if (chosen) {
      points = chosen.points;
      modelCount = 0;
      for (const entry of chosen.miniatures || []) {
        modelCount = modelCount + entry.min;
      }
    }

    // Keywords are ids, so look each one up. Models carry the keywords,
    // not the datasheet, so I gather them off every model and de-duplicate.
    const keywordNames: string[] = [];
    for (const miniature of miniatures) {
      for (const keywordId of miniature.keywordIds || []) {
        const name = keywordLookup.get(keywordId);
        if (name && !keywordNames.includes(name)) {
          keywordNames.push(name);
        }
      }
    }
    keywordNames.sort();

    // Weapons are ids too.
    const weapons: Weapon[] = [];
    for (const wargearId of collectWargearIds(datasheet.loadout)) {
      const item = wargearLookup.get(wargearId);
      // only weapons have profiles - armour and other gear doesn't
      if (item && item.wargearType === 'weapon') {
        for (const weapon of weaponsFromItem(item)) {
          weapons.push(weapon);
        }
      }
    }

    const abilities: Ability[] = [];
    for (const ability of datasheet.abilities || []) {
      const english = ability.localisations && ability.localisations.en;
      abilities.push({
        id: ability.id,
        name: englishName(ability),
        timing: ability.abilityType || null,
        text: english && english.rules ? htmlToText(english.rules) : '',
      });
    }

    const english = datasheet.localisations && datasheet.localisations.en;

    units.push({
      id: datasheet.id,
      name: englishName(datasheet),
      subname: null,
      points: points,
      modelCount: modelCount,
      baseSize: firstModel && firstModel.baseSize ? firstModel.baseSize : null,
      keywords: keywordNames,
      stats: stats,
      weapons: weapons,
      abilities: abilities,
      isLegends: datasheet.isLegends === true,
      lore: english && english.lore ? english.lore : null,
      category: null,
    });
  }

  units.sort((a, b) => a.name.localeCompare(b.name));

  // Helper to check if a unit has a specific keyword
  const hasKeyword = (unit: Unit, keyword: string) =>
    unit.keywords.some((k) => k.toLowerCase() === keyword.toLowerCase());

  // Group units into standard 40k force organization categories
  const epicHeroes = units.filter((u) => hasKeyword(u, 'epic hero'));
  const characters = units.filter(
    (u) => hasKeyword(u, 'character') && !epicHeroes.includes(u)
  );
  const battleline = units.filter(
    (u) => hasKeyword(u, 'battleline') && !characters.includes(u)
  );
  const transports = units.filter(
    (u) => hasKeyword(u, 'dedicated transport') && !characters.includes(u)
  );
  const fortifications = units.filter((u) => hasKeyword(u, 'fortification'));

  // Put any units that didn't fit into the above into "Other Datasheets"
  const assigned = new Set([
    ...epicHeroes,
    ...characters,
    ...battleline,
    ...transports,
    ...fortifications,
  ]);
  const otherDatasheets = units.filter((u) => !assigned.has(u));

  const groups: UnitGroup[] = [];
  if (epicHeroes.length > 0) groups.push({ title: 'Epic Hero', units: epicHeroes });
  if (characters.length > 0) groups.push({ title: 'Character', units: characters });
  if (battleline.length > 0) groups.push({ title: 'Battleline', units: battleline });
  if (transports.length > 0) groups.push({ title: 'Dedicated Transport', units: transports });
  if (otherDatasheets.length > 0) groups.push({ title: 'Other Datasheets', units: otherDatasheets });
  if (fortifications.length > 0) groups.push({ title: 'Fortifications', units: fortifications });

  return {
    slug: slug,
    name: data.faction,
    alliance: null,
    units: units,
    terrain: [],
    manifestations: [],
    groups: groups,
  };
}
