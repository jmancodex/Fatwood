/** Verbatim safety lines. Tests assert these exact strings. */
export const FIRE_SAFETY = {
  co: "Never build a fire inside an enclosed shelter, tent, or snow cave without ventilation — carbon monoxide is odorless and lethal.",
  rocks:
    "Do not use river rocks or wet stones in a fire ring; trapped water can make them explode.",
  restrictions:
    "Check local fire restrictions and wind; in dry grass or high wind, clear to bare soil and keep water or dirt ready.",
  gasoline: "Never use gasoline to start or revive a fire.",
  extinguish:
    "Fully extinguish: drown, stir, drown again, and touch-test for heat before leaving.",
} as const;

export const FIRE_SAFETY_STRINGS: readonly string[] = Object.values(FIRE_SAFETY);

export const WATER_SAFETY = {
  seawater: "Never drink seawater or urine.",
  snow: "Do not eat snow or ice to hydrate; melt it first — eating it accelerates hypothermia.",
  boil: "Boil at a rolling boil for 1 minute (3 minutes above 2,000 m / 6,500 ft).",
  filter:
    "Improvised sand/charcoal filters clarify water but do not make it safe; disinfect afterward.",
  bleach:
    "Bleach: use only plain unscented 5–9% sodium hypochlorite, 2 drops per liter, wait 30 minutes; double for cloudy or cold water.",
  protein: "If water is scarce, do not eat high-protein food; digestion uses water.",
} as const;

export const WATER_SAFETY_STRINGS: readonly string[] = Object.values(WATER_SAFETY);
