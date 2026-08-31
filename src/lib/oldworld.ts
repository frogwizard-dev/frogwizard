// src/lib/oldworld.ts
// Takes the JSON out of tow-data and turns it into the shape in units.ts.
//
// This one is the tidiest of the three. Units have a real "category" on them
// (characters / core / special / rare) so I don't have to guess from keywords
// like I do in AoS. The statline is the old Warhammer one - M WS BS S T W I A Ld.
//
// specialRuleIds are readable slugs like "close-order", not UUIDs, so I could
// show them without looking anything up. I do look them up though, because
// special-rules.json has the actual rules text.

import type { Ability, Faction, Stat, Unit, Weapon, UnitGroup } from './units';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSpecialRuleLookup(rulesData: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lookup = new Map<string, any>();
  for (const rule of rulesData.specialRules) {
    lookup.set(rule.id, rule);
  }
  return lookup;
}

// turns "close-order" into "Close Order" for when a rule isn't in the lookup
function nameFromSlug(slug: string) {
  const words = slug.split('-');
  const capitalised = [];
  for (const word of words) {
    capitalised.push(word[0].toUpperCase() + word.slice(1));
  }
  return capitalised.join(' ');
}

// The old stat block, in the order it's printed on the army list.
const PROFILE_ORDER = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld'];

// Categories in force org order rather than alphabetical, because that's how
// army lists are written.
const CATEGORY_ORDER = ['characters', 'core', 'special', 'rare', 'mercenaries'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseOldWorldFaction(slug: string, data: any, specialRules: any): Faction {
  const ruleLookup = buildSpecialRuleLookup(specialRules);
  const units: Unit[] = [];

  for (const rawUnit of data.units) {
    const models = rawUnit.models || [];

    // Statline comes off the first model. A unit with a champion in it has
    // more than one model entry, but the first is the rank and file one.
    const stats: Stat[] = [];
    if (models.length > 0 && models[0].profile) {
      const profile = models[0].profile;
      for (const label of PROFILE_ORDER) {
        if (profile[label]) {
          stats.push({ label: label, value: String(profile[label]) });
        }
      }
    }

    // Points are per model here, so the cost of the unit is the price of each
    // model times how many of them you get.
    let points = null;
    let modelCount = null;
    for (const model of models) {
      if (model.points !== null && model.points !== undefined) {
        const count = model.count || 1;
        if (points === null) {
          points = 0;
          modelCount = 0;
        }
        points = points + model.points * count;
        modelCount = modelCount + count;
      }
    }

    // Equipment is a list of slugs like "hand-weapon". There's no stat line
    // for weapons in this game, they just modify your existing stats, so
    // these come out as names with no profile on them.
    const weapons: Weapon[] = [];
    for (const model of models) {
      for (const item of model.equipment || []) {
        const name = nameFromSlug(item);
        let alreadyGot = false;
        for (const weapon of weapons) {
          if (weapon.name === name) alreadyGot = true;
        }
        if (!alreadyGot) {
          weapons.push({ id: item, name: name, type: 'equipment', profile: [] });
        }
      }
    }

    // Special rules can sit on the unit or on an individual model, so check both.
    const ruleIds: string[] = [];
    for (const ruleId of rawUnit.specialRuleIds || []) {
      if (!ruleIds.includes(ruleId)) ruleIds.push(ruleId);
    }
    for (const model of models) {
      for (const ruleId of model.specialRuleIds || []) {
        if (!ruleIds.includes(ruleId)) ruleIds.push(ruleId);
      }
    }

    // Lots of these rules take a value: Hatred (High Elves), Regeneration (6+),
    // Impact Hits (D6+1). The value is NOT part of the id, it's in ruleParams
    // keyed by the rule id. Miss it and you get a bare "Regeneration" with no
    // save on it, which is useless.
    const ruleParams = rawUnit.ruleParams || {};

    const abilities: Ability[] = [];
    for (const ruleId of ruleIds) {
      const rule = ruleLookup.get(ruleId);

      // fall back to tidying up the slug if the rule isn't in the lookup
      let name = rule ? rule.name : nameFromSlug(ruleId);

      // the values already come with their own brackets, so just add a space
      if (ruleParams[ruleId]) {
        name = name + ' ' + ruleParams[ruleId];
      }

      abilities.push({
        id: ruleId,
        name: name,
        timing: rule && rule.phase && rule.phase.length > 0 ? rule.phase.join(', ') : null,
        text: rule && rule.description ? rule.description : '',
      });
    }

    // troopTypes are things like "regular infantry" - useful as keywords.
    const keywords: string[] = [];
    for (const entry of rawUnit.troopTypes || []) {
      // each entry looks like { troopType: "regular-infantry", isCharacter: true }
      if (entry && entry.troopType) {
        const name = nameFromSlug(entry.troopType);
        if (!keywords.includes(name)) {
          keywords.push(name);
        }
      }
    }

    units.push({
      id: rawUnit.id,
      name: rawUnit.name,
      subname: rawUnit.nameSingular !== rawUnit.name ? rawUnit.nameSingular : null,
      points: points,
      modelCount: modelCount,
      baseSize: models.length > 0 && models[0].baseSize ? models[0].baseSize : null,
      keywords: keywords,
      stats: stats,
      weapons: weapons,
      abilities: abilities,
      isLegends: false,
      lore: null,
      category: rawUnit.category || null,
    });
  }

  units.sort((a, b) => a.name.localeCompare(b.name));

  // Group them by category, in force org order. Anything with a category I
  // don't recognise goes on the end so it can't just disappear.
  const groups: UnitGroup[] = [];
  const used: string[] = [];

  for (const category of CATEGORY_ORDER) {
    const inCategory = units.filter((unit) => unit.category === category);
    if (inCategory.length > 0) {
      groups.push({ title: nameFromSlug(category), units: inCategory });
      used.push(category);
    }
  }

  const leftOver = units.filter((unit) => !unit.category || !used.includes(unit.category));
  if (leftOver.length > 0) {
    groups.push({ title: 'Other', units: leftOver });
  }

  return {
    slug: slug,
    name: data.displayName || slug,
    alliance: null,
    units: units,
    terrain: [],
    manifestations: [],
    groups: groups,
  };
}
