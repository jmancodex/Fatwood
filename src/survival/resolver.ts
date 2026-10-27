import type { Context, ResolvedSubstitution, Substitution } from "./types";

/** First alternative that fits the biome, weather, and inventory. Otherwise the no-gear node. */
export function resolveSubstitution(sub: Substitution, ctx: Context): ResolvedSubstitution {
  for (const alt of sub.alternatives) {
    if (alt.biomes && alt.biomes.length > 0 && !alt.biomes.includes(ctx.biome)) continue;
    if (alt.requires && !alt.requires.every((item) => ctx.inventory.includes(item))) continue;
    if (alt.avoid_weather && alt.avoid_weather.includes(ctx.weather)) continue;
    return {
      need: sub.need,
      substitutionId: sub.id,
      status: "alternative",
      item: alt.item,
      how_to: alt.how_to,
      caveats: alt.caveats,
      pictogram: alt.pictogram,
    };
  }
  return {
    need: sub.need,
    substitutionId: sub.id,
    status: "fallback",
    pictogram: sub.pictogram,
    fallback_node: sub.fallback_node,
  };
}
