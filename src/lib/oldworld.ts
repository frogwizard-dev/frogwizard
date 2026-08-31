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

import type {
  Ability,
  Faction,
  MagicItem,
  MagicPool,
  OptionChoice,
  OptionGroup,
  Stat,
  Unit,
  UnitGroup,
  UnitSizeConfig,
  Weapon,
} from './units';

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

export function parseOldWorldFaction(
  slug: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specialRules: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  magicItemsData?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weaponsData?: any
): Faction {
  const ruleLookup = buildSpecialRuleLookup(specialRules);
  const units: Unit[] = [];

  // Build lookup for weapons and kit-upgrades (like Defensive Stakes, Great Weapons, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weaponLookup = new Map<string, any>();
  const rawWeapons =
    (weaponsData && (weaponsData.weapons || Object.values(weaponsData).find(Array.isArray))) || [];
  for (const w of rawWeapons) {
    if (w && w.id) {
      weaponLookup.set(w.id, w);
    }
  }

  // Helper to build a Weapon with full stat profile (Range, S, AP) and type
  function buildWeapon(wId: string): Weapon {
    const w = weaponLookup.get(wId);
    if (!w) {
      return { id: wId, name: nameFromSlug(wId), type: 'equipment', profile: [] };
    }
    const profile: Stat[] = [];
    if (w.range) profile.push({ label: 'Range', value: String(w.range) });
    if (w.strength) profile.push({ label: 'Strength', value: String(w.strength) });
    if (w.armourPiercing && w.armourPiercing !== '-') {
      profile.push({ label: 'AP', value: String(w.armourPiercing) });
    }
    return {
      id: w.id,
      name: w.name || nameFromSlug(wId),
      type: w.kind || 'weapon',
      profile: profile,
    };
  }

  // Parse available magic items for this faction (Universal + Army Specific)
  const magicItems: MagicItem[] = [];
  const rawMagicItems =
    (magicItemsData && (magicItemsData.magicItems || magicItemsData)) || [];

  for (const rawItem of rawMagicItems) {
    const armyIds: string[] = rawItem.availableToArmyIds || [];
    const isAvailable =
      armyIds.includes('universal') ||
      armyIds.includes(slug) ||
      (data.armyId && armyIds.includes(data.armyId)) ||
      (data.parentArmyId && armyIds.includes(data.parentArmyId));

    if (isAvailable) {
      magicItems.push({
        id: rawItem.id,
        name: rawItem.name,
        type: rawItem.type,
        points: rawItem.points ?? 0,
        description: rawItem.description || '',
        lore: rawItem.lore || null,
      });
    }
  }

  // Sort magic items by points ascending, then name
  magicItems.sort((a, b) => a.points - b.points || a.name.localeCompare(b.name));

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

    // Equipment is a list of slugs like "hand-weapon". Look up real weapon stats!
    const weapons: Weapon[] = [];
    for (const model of models) {
      for (const item of model.equipment || []) {
        if (!weapons.some((w) => w.id === item)) {
          weapons.push(buildWeapon(item));
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

    // Unit size configuration (e.g. min 10 models, points per model)
    let unitSizeConfig: UnitSizeConfig | null = null;
    const baseModelPoints =
      models.length > 0 && models[0].points !== null && models[0].points !== undefined
        ? models[0].points
        : (points ?? 0);

    if (rawUnit.unitSize) {
      unitSizeConfig = {
        min: rawUnit.unitSize.min ?? (modelCount ?? 1),
        max: rawUnit.unitSize.max ?? null,
        pointsPerModel: baseModelPoints,
      };
    }

    // Option groups (e.g. Mount, Weapons, Armour, Command)
    const optionGroups: OptionGroup[] = [];
    if (rawUnit.options && Array.isArray(rawUnit.options)) {
      for (const opt of rawUnit.options) {
        const choices: OptionChoice[] = [];
        for (const choice of opt.choices || []) {
          const subChoices: OptionChoice[] = [];
          if (choice.sub && choice.sub.choices) {
            for (const sub of choice.sub.choices) {
              subChoices.push({
                id: sub.ref || sub.name.toLowerCase().replace(/ /g, '-'),
                name: sub.name,
                points: sub.points ?? 0,
                perModel: sub.perModel === true,
                isDefault: sub.default === true,
              });
            }
          }

          // Parse profile stats (e.g. Mount or Champion statline)
          const choiceStats: Stat[] = [];
          if (choice.profile) {
            for (const label of PROFILE_ORDER) {
              if (choice.profile[label]) {
                choiceStats.push({ label, value: String(choice.profile[label]) });
              }
            }
          }

          // Parse weapons granted by this option
          const choiceWeapons: Weapon[] = [];
          for (const wId of choice.weaponIds || []) {
            choiceWeapons.push(buildWeapon(wId));
          }

          // Parse special rules granted by this option
          const choiceAbilities: Ability[] = [];
          const choiceRuleParams = choice.ruleParams || {};
          for (const ruleId of choice.grantsSpecialRuleIds || []) {
            const rule = ruleLookup.get(ruleId);
            let rName = rule ? rule.name : nameFromSlug(ruleId);
            if (choiceRuleParams[ruleId]) {
              rName = rName + ' ' + choiceRuleParams[ruleId];
            }
            choiceAbilities.push({
              id: ruleId,
              name: rName,
              timing:
                rule && rule.phase && rule.phase.length > 0
                  ? rule.phase.join(', ')
                  : null,
              text: rule && rule.description ? rule.description : '',
            });
          }

          // Check if this option choice itself is a weapon or kit upgrade (e.g. Defensive Stakes)
          const choiceRef = choice.ref || choice.id;
          const kitItem = weaponLookup.get(choiceRef);
          if (kitItem && kitItem.notes) {
            choiceAbilities.push({
              id: kitItem.id,
              name: kitItem.name,
              timing: null,
              text: kitItem.notes,
            });
          }

          choices.push({
            id: choice.ref || choice.name.toLowerCase().replace(/ /g, '-'),
            name: choice.name,
            points: choice.points ?? 0,
            perModel: choice.perModel === true,
            isDefault: choice.default === true,
            description:
              (kitItem && kitItem.notes) ||
              choice.description ||
              choice.notesBefore ||
              choice.notesAfter ||
              (choiceAbilities.length > 0
                ? choiceAbilities.map((a) => a.name).join(', ')
                : undefined),
            stats: choiceStats.length > 0 ? choiceStats : undefined,
            weapons: choiceWeapons.length > 0 ? choiceWeapons : undefined,
            abilities: choiceAbilities.length > 0 ? choiceAbilities : undefined,
            baseSize: choice.baseSize || null,
            troopType: choice.troopType
              ? Array.isArray(choice.troopType)
                ? choice.troopType.map(nameFromSlug).join(', ')
                : nameFromSlug(choice.troopType)
              : null,
            subChoices: subChoices.length > 0 ? subChoices : undefined,
          });
        }

        if (choices.length > 0) {
          optionGroups.push({
            id: opt.ref || opt.name.toLowerCase().replace(/ /g, '-'),
            name: opt.name,
            maxChoices: opt.choose ? opt.choose.max : (opt.ref === 'command' ? null : 1),
            choices: choices,
          });
        }
      }
    }

    // Magic Item Pools (e.g. up to 100 pts of Magic Weapons, Armour, etc.)
    const magicPools: MagicPool[] = [];
    if (rawUnit.magic && rawUnit.magic.pools) {
      for (const pool of rawUnit.magic.pools) {
        magicPools.push({
          name: pool.name,
          maxPoints: pool.maxPoints ?? null,
          allowedTypes: pool.allowedTypes || [],
        });
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
      unitSizeConfig: unitSizeConfig,
      optionGroups: optionGroups,
      magicPools: magicPools,
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
    magicItems: magicItems,
  };
}
