/** Générateur aléatoire injectable : renvoie un flottant dans [0, 1). */
export type Rng = () => number;

/** PRNG déterministe (mulberry32) pour tests et parties rejouables. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(sides: number, rng: Rng = Math.random): number {
  if (!Number.isInteger(sides) || sides < 2) throw new RangeError(`Dé invalide : d${sides}`);
  return Math.floor(rng() * sides) + 1;
}

export type AdvantageMode = "normal" | "advantage" | "disadvantage";

export interface D20Roll {
  natural: number;
  rolls: number[];
  total: number;
  critical: boolean;
  fumble: boolean;
}

/** Jet de d20 : avantage = meilleur de 2, désavantage = pire de 2. */
export function rollD20(modifier = 0, mode: AdvantageMode = "normal", rng: Rng = Math.random): D20Roll {
  const rolls = mode === "normal" ? [rollDie(20, rng)] : [rollDie(20, rng), rollDie(20, rng)];
  const natural = mode === "disadvantage" ? Math.min(...rolls) : Math.max(...rolls);
  return { natural, rolls, total: natural + modifier, critical: natural === 20, fumble: natural === 1 };
}
