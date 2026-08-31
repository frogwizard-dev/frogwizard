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
};

// A named list of units for the sidebar. Each game groups differently:
// AoS by units/terrain/manifestations, Old World by force org category.
export type UnitGroup = {
  title: string;
  units: Unit[];
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
};

// Same unit can be added twice, so each roster row needs its own id.
export type RosterEntry = { entryId: number; unit: Unit };
