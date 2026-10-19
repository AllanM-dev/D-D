/**
 * Copie profonde d'une donnée du jeu (personnage, combat, exploration).
 * Ces données ne contiennent que du JSON (elles sont enregistrées dans le stockage local) ;
 * le passage par JSON accepte aussi les objets réactifs de Vue, que `structuredClone` refuse.
 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
