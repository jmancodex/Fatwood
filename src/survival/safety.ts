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
