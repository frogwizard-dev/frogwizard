// src/lib/units.ts
// The shape the components render. Each game's parser converts its own
// JSON into this, so the components never deal with game-specific fields.

export type Stat = { label: string; value: string };

export type Weapon = {
  id: string;
  name: string;
  type: string;
  profile: Stat[];
};

export type Ability = {
  id: string;
  name: string;
  timing: string | null;
  text: string;
};

export type OptionChoice = {
  id: string;
  name: string;
  points: number;
  perModel: boolean;
  isDefault?: boolean;
  description?: string;
  stats?: Stat[];
  weapons?: Weapon[];
  abilities?: Ability[];
  baseSize?: string | null;
  troopType?: string | null;
  subChoices?: OptionChoice[];
};

export type OptionGroup = {
  id: string; // e.g. "mount", "weapons", "armour", "command"
  name: string; // e.g. "Mount", "Weapons", "Armour", "Command"
  maxChoices: number | null; // 1 = single choice (radio), null = multiple (checkboxes)
  choices: OptionChoice[];
};

export type UnitSizeConfig = {
  min: number;
  max: number | null;
  pointsPerModel: number;
};

export type MagicPool = {
  name: string;
  maxPoints: number | null;
  allowedTypes: string[];
};

export type Unit = {
  id: string;
  name: string;
  subname: string | null;
  points: number | null;
  modelCount: number | null;
  baseSize: string | null;
  keywords: string[];
  stats: Stat[];
  weapons: Weapon[];
  abilities: Ability[];
  isLegends: boolean;
  lore: string | null;
  // The game's own category if it has one. Old World uses characters/core/
  // special/rare. AoS and 40k don't have an equivalent, so it's null there.
  category: string | null;
  // Customization configs (The Old World):
  unitSizeConfig?: UnitSizeConfig | null;
  optionGroups?: OptionGroup[];
  magicPools?: MagicPool[];
};

// A named list of units for the sidebar. Each game groups differently:
// AoS by units/terrain/manifestations, Old World by force org category.
export type UnitGroup = {
  title: string;
  units: Unit[];
};

export type MagicItem = {
  id: string;
  name: string;
  type: string; // 'magic-weapons', 'magic-armour', 'talismans', 'enchanted-items', 'arcane-items', 'magic-standards', 'knightly-virtue', etc.
  points: number;
  description: string;
  lore?: string | null;
};

export type Faction = {
  slug: string;
  name: string;
  alliance: string | null;
  units: Unit[];
  // Terrain and manifestations are warscrolls too, they just aren't units,
  // so they get their own lists instead of being mixed in with the units.
  // These are AoS only - they're empty for 40k and Old World.
  terrain: Unit[];
  manifestations: Unit[];
  // The same units again, but grouped the way this game groups them.
  // Use this if you want sidebar sections that work for all 3 games.
  groups: UnitGroup[];
  // Available magic items for this faction (The Old World)
  magicItems?: MagicItem[];
};

// Same unit can be added twice, so each roster row needs its own id.
export type RosterEntry = {
  entryId: number;
  unit: Unit;
  modelCount: number;
  selectedOptionIds: string[];
  selectedMagicItems?: MagicItem[];
  customPoints?: number;
};

// Helper to calculate the total points of a roster entry (models + options + magic items)
export function calculateEntryPoints(entry: RosterEntry): number {
  if (entry.customPoints !== undefined) {
    return entry.customPoints;
  }

  let total = 0;
  const currentCount = entry.modelCount || entry.unit.modelCount || 1;

  // 1. Calculate points from models count
  if (entry.unit.unitSizeConfig && entry.unit.unitSizeConfig.pointsPerModel > 0) {
    total = currentCount * entry.unit.unitSizeConfig.pointsPerModel;
  } else {
    total = entry.unit.points ?? 0;
  }

  // 2. Add points for selected options (e.g. Weapons, Mounts, Command)
  if (entry.unit.optionGroups && entry.selectedOptionIds) {
    for (const group of entry.unit.optionGroups) {
      for (const choice of group.choices) {
        if (entry.selectedOptionIds.includes(choice.id)) {
          total += choice.perModel ? choice.points * currentCount : choice.points;
        }
        if (choice.subChoices) {
          for (const sub of choice.subChoices) {
            if (entry.selectedOptionIds.includes(sub.id)) {
              total += sub.perModel ? sub.points * currentCount : sub.points;
            }
          }
        }
      }
    }
  }

  // 3. Add points for selected magic items & virtues
  if (entry.selectedMagicItems) {
    for (const item of entry.selectedMagicItems) {
      total += item.points ?? 0;
    }
  }

  return total;
}


