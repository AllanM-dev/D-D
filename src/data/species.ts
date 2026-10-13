export interface SpeciesDef {
  id: string;
  name: string;
  size: string;
  speed: number;
}

/** Espèces du SRD 5.2 (les traits spécifiques seront ajoutés plus tard). */
export const SPECIES: readonly SpeciesDef[] = [
  { id: "dragonborn", name: "Drakéide", size: "Moyenne", speed: 30 },
  { id: "dwarf", name: "Nain", size: "Moyenne", speed: 30 },
  { id: "elf", name: "Elfe", size: "Moyenne", speed: 30 },
  { id: "gnome", name: "Gnome", size: "Petite", speed: 30 },
  { id: "goliath", name: "Goliath", size: "Moyenne", speed: 35 },
  { id: "halfling", name: "Halfelin", size: "Petite", speed: 30 },
  { id: "human", name: "Humain", size: "Moyenne ou Petite", speed: 30 },
  { id: "orc", name: "Orc", size: "Moyenne", speed: 30 },
  { id: "tiefling", name: "Tieffelin", size: "Moyenne ou Petite", speed: 30 },
];
