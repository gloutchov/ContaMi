import { describe, expect, it } from "vitest";
import {
  IMPORT_TEMPLATE_CONTRACTS,
  IMPORT_TEMPLATE_STATIC_LISTS,
  IMPORT_TEMPLATE_TYPES,
  IMPORT_TEMPLATE_VERSION,
} from "../../src/domain/importTemplates";

describe("import template contracts", () => {
  it("defines eight versioned contracts with stable unique columns", () => {
    expect(IMPORT_TEMPLATE_VERSION).toBe(3);
    expect(IMPORT_TEMPLATE_TYPES).toEqual([
      "residence",
      "rental_properties",
      "transactions",
      "investments",
      "pension",
      "shared_expenses",
      "recurring_items",
      "vehicles",
    ]);
    expect(new Set(IMPORT_TEMPLATE_TYPES).size).toBe(8);

    for (const type of IMPORT_TEMPLATE_TYPES) {
      const contract = IMPORT_TEMPLATE_CONTRACTS[type];
      expect(contract.type).toBe(type);
      expect(contract.fileName).toMatch(/^ContaMi-template-[a-z-]+-v3\.xlsx$/);
      expect(contract.titleIt).not.toBe(contract.titleEn);
      expect(contract.fields.length).toBeGreaterThan(8);
      expect(new Set(contract.fields.map((field) => field.key)).size).toBe(contract.fields.length);
      expect(contract.fields.some((field) => field.required || field.requiredFor?.includes("all"))).toBe(true);
      for (const field of contract.fields) {
        expect(field.key).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(field.labelIt.length).toBeGreaterThan(0);
        expect(field.labelEn.length).toBeGreaterThan(0);
        if (field.kind === "enum") {
          expect(field.list).toBeDefined();
          expect(IMPORT_TEMPLATE_STATIC_LISTS[field.list!]?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("uses user-defined keys for every hierarchical template", () => {
    expect(IMPORT_TEMPLATE_CONTRACTS.residence.fields.map((field) => field.key)).toContain("property_key");
    expect(IMPORT_TEMPLATE_CONTRACTS.rental_properties.fields.map((field) => field.key)).toContain("property_key");
    expect(IMPORT_TEMPLATE_CONTRACTS.investments.fields.map((field) => field.key)).toContain("investment_key");
    expect(IMPORT_TEMPLATE_CONTRACTS.pension.fields.map((field) => field.key)).toEqual(expect.arrayContaining(["pension_key", "compartment_key"]));
    expect(IMPORT_TEMPLATE_CONTRACTS.vehicles.fields.map((field) => field.key)).toContain("vehicle_key");
  });

  it("keeps investment choices aligned with domain constraints", () => {
    expect(IMPORT_TEMPLATE_STATIC_LISTS.investment_frequency).toEqual(["monthly | mensile", "yearly | annuale"]);
    for (const type of ["investments", "pension"] as const) {
      const fields = IMPORT_TEMPLATE_CONTRACTS[type].fields;
      expect(fields.find((field) => field.key === "periodic_frequency")?.list).toBe("investment_frequency");
      expect(fields.find((field) => field.key === "category")?.list).toBe("categories");
    }
  });
});
