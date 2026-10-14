export interface Credit {
  title: string;
  /** Texte en français. */
  text: string;
  /** Mention d'attribution dans sa langue d'origine, quand la licence l'exige. */
  notice?: string;
  links: { label: string; url: string }[];
}

/** Attributions exigées par les licences du contenu embarqué. À compléter à chaque nouvelle source. */
export const CREDITS: Credit[] = [
  {
    title: "Règles : System Reference Document 5.2",
    text: "Les règles de D&D 5.5 (2024) utilisées par l'application proviennent du SRD 5.2 de Wizards of the Coast. Ce projet n'est ni approuvé ni affilié à Wizards of the Coast.",
    notice:
      "This work includes material from the System Reference Document 5.2 (\"SRD 5.2\") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.",
    links: [
      { label: "SRD 5.2", url: "https://www.dndbeyond.com/srd" },
      { label: "Licence CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/legalcode" },
    ],
  },
  {
    title: "Monstres : System Reference Document 5.1",
    text: "Les statistiques des monstres du bestiaire de départ proviennent du SRD 5.1 de Wizards of the Coast, également sous licence CC BY 4.0.",
    links: [{ label: "Licence CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/legalcode" }],
  },
  {
    title: "Illustrations : game-icons.net",
    text: "Les illustrations des classes, espèces, historiques et monstres utilisent des icônes de game-icons.net, créées par Lorc, Delapouite et d'autres contributeurs, sous licence Creative Commons Attribution 3.0. Les icônes ont été recolorées et placées sur un badge ; leurs auteurs n'ont ni approuvé ni vérifié cette adaptation.",
    notice: "Icons from game-icons.net by Lorc, Delapouite & contributors, licensed under CC BY 3.0.",
    links: [
      { label: "game-icons.net", url: "https://game-icons.net" },
      { label: "Licence CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
    ],
  },
  {
    title: "Technologies",
    text: "L'application est construite avec Vue, Ionic et Capacitor, trois logiciels libres sous licence MIT.",
    links: [],
  },
];
