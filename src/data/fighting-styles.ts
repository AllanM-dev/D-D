export const FIGHTING_STYLES = [
  { id: "defense", name: "Défense", text: "+1 à la CA tant que vous portez une armure." },
  { id: "archery", name: "Archerie", text: "+2 aux jets d'attaque avec des armes à distance." },
] as const;

export type FightingStyleId = (typeof FIGHTING_STYLES)[number]["id"];

export const isFightingStyle = (v: unknown): v is FightingStyleId => FIGHTING_STYLES.some((s) => s.id === v);
