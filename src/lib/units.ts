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
};

export type Faction = {
  slug: string;
  name: string;
  alliance: string | null;
  units: Unit[];
  // Terrain and manifestations are warscrolls too, they just aren't units,
  // so they get their own lists instead of being mixed in with the units.
  terrain: Unit[];
  manifestations: Unit[];
};

// Same unit can be added twice, so each roster row needs its own id.
export type RosterEntry = { entryId: number; unit: Unit };
