import { describe, expect, it } from "vitest";
import { bleachDose, boilMinutes, iodineDose, selectTreatment } from "./dose";

describe("treatment selector", () => {
  it("prefers boil, then chemical, then a filter, then sunlight", () => {
    expect(selectTreatment([])).toBe("sodis");
    expect(selectTreatment(["clear_bottle"])).toBe("sodis");
    expect(selectTreatment(["water_filter"])).toBe("filter");
    expect(selectTreatment(["iodine"])).toBe("chemical");
    expect(selectTreatment(["bleach"])).toBe("chemical");
    expect(selectTreatment(["chlorine_dioxide"])).toBe("chemical");
    expect(selectTreatment(["pot"])).toBe("boil");
    expect(selectTreatment(["stove"])).toBe("boil");
    expect(selectTreatment(["bleach", "pot"])).toBe("boil");
    expect(selectTreatment(["water_filter", "iodine"])).toBe("chemical");
    expect(selectTreatment(["water_filter", "stove"])).toBe("boil");
  });
});

describe("bleach dose", () => {
  it("uses 2 drops per liter and doubles once for cloudy or cold water", () => {
    expect(bleachDose({ liters: 1, percent: 6, unscented: true, plain: true, cloudy: false, cold: false })).toEqual({
      ok: true,
      drops: 2,
      waitMinutes: 30,
    });
    expect(bleachDose({ liters: 2.5, percent: 5, unscented: true, plain: true, cloudy: false, cold: false }).drops).toBe(5);
    expect(bleachDose({ liters: 1, percent: 8.25, unscented: true, plain: true, cloudy: true, cold: false }).drops).toBe(4);
    expect(bleachDose({ liters: 1, percent: 9, unscented: true, plain: true, cloudy: false, cold: true }).drops).toBe(4);
    expect(bleachDose({ liters: 3, percent: 6, unscented: true, plain: true, cloudy: true, cold: true }).drops).toBe(12);
  });

  it("rejects the wrong product and a non-positive volume", () => {
    expect(bleachDose({ liters: 1, percent: 4, unscented: true, plain: true, cloudy: false, cold: false }).ok).toBe(false);
    expect(bleachDose({ liters: 1, percent: 12, unscented: true, plain: true, cloudy: false, cold: false }).ok).toBe(false);
    expect(bleachDose({ liters: 1, percent: 6, unscented: false, plain: true, cloudy: false, cold: false }).ok).toBe(false);
    expect(bleachDose({ liters: 1, percent: 6, unscented: true, plain: false, cloudy: false, cold: false }).ok).toBe(false);
    expect(bleachDose({ liters: 0, percent: 6, unscented: true, plain: true, cloudy: false, cold: false }).drops).toBe(0);
    expect(bleachDose({ liters: -2, percent: 6, unscented: true, plain: true, cloudy: false, cold: false }).drops).toBe(0);
  });
});

describe("iodine dose", () => {
  it("uses 5 drops of 2% tincture per liter and doubles for cloudy or cold water", () => {
    expect(iodineDose({ liters: 1, percent: 2, cloudy: false, cold: false })).toEqual({
      ok: true,
      drops: 5,
      waitMinutes: 30,
    });
    expect(iodineDose({ liters: 2, percent: 2, cloudy: true, cold: false })).toMatchObject({ drops: 20, waitMinutes: 30 });
    expect(iodineDose({ liters: 1, percent: 2, cloudy: false, cold: true })).toMatchObject({ drops: 10, waitMinutes: 60 });
    expect(iodineDose({ liters: 1, percent: 2, cloudy: true, cold: true })).toMatchObject({ drops: 10, waitMinutes: 60 });
  });

  it("rejects other iodine products", () => {
    expect(iodineDose({ liters: 1, percent: 10, cloudy: false, cold: false }).ok).toBe(false);
    expect(iodineDose({ liters: 0, percent: 2, cloudy: false, cold: false }).drops).toBe(0);
  });
});

describe("boil time", () => {
  it("adds time only above 2,000 m", () => {
    expect(boilMinutes(0)).toBe(1);
    expect(boilMinutes(2000)).toBe(1);
    expect(boilMinutes(2000.1)).toBe(3);
    expect(boilMinutes(3500)).toBe(3);
  });
});
