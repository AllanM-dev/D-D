export interface SpeciesDef {
  id: string;
  name: string;
  size: string;
  speed: number;
  /** Résumé (texte original, pas une citation du SRD). */
  description: string;
  /** Traits principaux : affichés à titre d'information, pas encore appliqués par le moteur. */
  traits: string[];
}

/** Espèces du SRD 5.2 (les traits spécifiques seront ajoutés plus tard). */
export const SPECIES: readonly SpeciesDef[] = [
  { id: "dragonborn", name: "Drakéide", size: "Moyenne", speed: 30, description: "Descendant de dragons, au souffle dévastateur. Fier et robuste.", traits: ["Ascendance draconique", "Arme de souffle", "Résistance aux dégâts", "Vision dans le noir", "Vol draconique (niv. 5)"] },
  { id: "dwarf", name: "Nain", size: "Moyenne", speed: 30, description: "Peuple des montagnes, endurant et têtu, expert de la pierre et du métal.", traits: ["Vision dans le noir (36 m)", "Résilience naine (poison)", "Robustesse naine (+1 PV par niveau)", "Connaissance de la pierre"] },
  { id: "elf", name: "Elfe", size: "Moyenne", speed: 30, description: "Gracieux et longévif, sensible à la magie. Ne dort pas vraiment et reste conscient pendant son repos.", traits: ["Vision dans le noir", "Lignées elfiques (drow, haut-elfe, elfe des bois)", "Ascendance féerique", "Sens aiguisés", "Transe"] },
  { id: "gnome", name: "Gnome", size: "Petite", speed: 30, description: "Petit, curieux et inventif, avec un esprit vif et une résistance naturelle à la magie mentale.", traits: ["Vision dans le noir", "Ruse gnome", "Lignées gnomes (forêt ou roche)"] },
  { id: "goliath", name: "Goliath", size: "Moyenne", speed: 35, description: "Grand et puissant, originaire des hautes montagnes, marqué par un lointain héritage de géants.", traits: ["Ascendance de géant", "Forme de grande taille (niv. 5)", "Constitution imposante"] },
  { id: "halfling", name: "Halfelin", size: "Petite", speed: 30, description: "Petit, discret et chanceux, plein de courage malgré sa taille.", traits: ["Brave", "Agilité halfeline", "Chance", "Naturellement discret"] },
  { id: "human", name: "Humain", size: "Moyenne ou Petite", speed: 30, description: "Polyvalent et adaptable, le plus répandu. Reçoit un don d'origine supplémentaire et une compétence au choix.", traits: ["Ingénieux", "Doué", "Polyvalent"] },
  { id: "orc", name: "Orc", size: "Moyenne", speed: 30, description: "Endurant et déterminé, capable de se battre jusqu'au bout et de se ruer sur l'ennemi.", traits: ["Poussée d'adrénaline", "Vision dans le noir (36 m)", "Endurance implacable"] },
  { id: "tiefling", name: "Tieffelin", size: "Moyenne ou Petite", speed: 30, description: "Marqué par un héritage d'un autre plan (infernal, abyssal ou chtonien), avec une présence troublante.", traits: ["Héritage fiélon", "Présence d'un autre monde", "Vision dans le noir"] },
];
