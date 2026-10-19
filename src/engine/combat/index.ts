/**
 * Moteur de combat. Les modules, du plus simple au plus riche :
 * - `types` et `labels` : les données d'un combat et les noms affichés ;
 * - `state` : combattants, jets enregistrés, dégâts, soins, concentration ;
 * - `conditions` : états et jets de sauvegarde ;
 * - `geometry` : positions, portées, déplacement ;
 * - `attack` : résolution d'une attaque et réactions ;
 * - `ai` : tour des ennemis ;
 * - `turns` : initiative et enchaînement des tours ;
 * - `features` : capacités de classe, une fiche par option ;
 * - `actions` : ce que le joueur peut faire pendant son tour.
 */
export * from "./types";
export * from "./labels";
export * from "./state";
export * from "./conditions";
export * from "./geometry";
export * from "./attack";
export * from "./ai";
export * from "./turns";
export * from "./features";
export * from "./actions";
