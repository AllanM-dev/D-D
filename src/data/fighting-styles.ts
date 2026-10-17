export const FIGHTING_STYLES = [
  { id: "defense", name: "Défense", text: "+1 à la CA tant que vous portez une armure." },
  { id: "archery", name: "Archerie", text: "+2 aux jets d'attaque avec des armes à distance." },
  { id: "great-weapon", name: "Armes à deux mains", text: "Avec une arme de mêlée tenue à deux mains (à deux mains, ou polyvalente sans bouclier), un 1 ou un 2 sur un dé de dégâts compte comme un 3." },
  { id: "two-weapon", name: "Deux armes", text: "Avec la seconde arme légère (action bonus), vous ajoutez votre modificateur de caractéristique à ses dégâts." },
] as const;

export type FightingStyleId = (typeof FIGHTING_STYLES)[number]["id"];

export const isFightingStyle = (v: unknown): v is FightingStyleId => FIGHTING_STYLES.some((s) => s.id === v);
