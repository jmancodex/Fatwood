/** Field doses. The numbers here are the numbers printed on the Water nodes. */

export type Treatment = "boil" | "chemical" | "filter" | "sodis";

const BOIL_GEAR = ["pot", "stove"];
const CHEMICAL_GEAR = ["bleach", "iodine", "chlorine_dioxide"];
const FILTER_GEAR = ["water_filter"];

/** Boil, then chemical, then a real filter, then sunlight. Empty hands still get SODIS. */
export function selectTreatment(inventory: readonly string[]): Treatment {
  if (inventory.some((item) => BOIL_GEAR.includes(item))) return "boil";
  if (inventory.some((item) => CHEMICAL_GEAR.includes(item))) return "chemical";
  if (inventory.some((item) => FILTER_GEAR.includes(item))) return "filter";
  return "sodis";
}

export interface BleachDose {
  ok: boolean;
  drops: number;
  waitMinutes: number;
  reason?: string;
}

/**
 * Plain unscented 5–9% sodium hypochlorite only.
 * 2 drops per liter, doubled once if the water is cloudy or cold. Wait 30 minutes.
 */
export function bleachDose(input: {
  liters: number;
  percent: number;
  unscented: boolean;
  plain: boolean;
  cloudy: boolean;
  cold: boolean;
}): BleachDose {
  if (!input.plain || !input.unscented) {
    return { ok: false, drops: 0, waitMinutes: 0, reason: "Scented or splashless bleach is not safe to dose." };
  }
  if (input.percent < 5 || input.percent > 9) {
    return { ok: false, drops: 0, waitMinutes: 0, reason: "Use 5–9% sodium hypochlorite. Other strengths are a different dose." };
  }
  const liters = input.liters > 0 ? input.liters : 0;
  const perLiter = input.cloudy || input.cold ? 4 : 2;
  return { ok: true, drops: perLiter * liters, waitMinutes: 30 };
}

export interface IodineDose {
  ok: boolean;
  drops: number;
  waitMinutes: number;
  reason?: string;
}

/**
 * 2% tincture of iodine, by volume.
 * 5 drops per liter when clear and not cold. Double the drops if cloudy or cold.
 * Wait 30 minutes, or 60 minutes when the water is cold.
 */
export function iodineDose(input: {
  liters: number;
  percent: number;
  cloudy: boolean;
  cold: boolean;
}): IodineDose {
  if (input.percent < 1.8 || input.percent > 2.2) {
    return {
      ok: false,
      drops: 0,
      waitMinutes: 0,
      reason: "This drop count is for 2% tincture of iodine, not povidone or tablets.",
    };
  }
  const liters = input.liters > 0 ? input.liters : 0;
  const perLiter = input.cloudy || input.cold ? 10 : 5;
  return { ok: true, drops: perLiter * liters, waitMinutes: input.cold ? 60 : 30 };
}

/** Rolling boil: 1 minute, or 3 minutes above 2,000 m. */
export function boilMinutes(altitudeMeters: number): number {
  return altitudeMeters > 2000 ? 3 : 1;
}
