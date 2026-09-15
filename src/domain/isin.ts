import { z } from "zod";

const ISIN_FORMAT = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export type IsinValidationError = "format" | "checksum";

export function normalizeOptionalIsin(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  return normalized || undefined;
}

function expandedIsinDigits(value: string): string {
  return [...value].map((character) => (
    character >= "A" && character <= "Z"
      ? String(character.charCodeAt(0) - 55)
      : character
  )).join("");
}

export function hasValidIsinChecksum(value: string): boolean {
  const digits = expandedIsinDigits(value);
  let sum = 0;
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    let digit = Number(digits[index]);
    if (position % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function validateOptionalIsin(value: string): IsinValidationError | undefined {
  const normalized = normalizeOptionalIsin(value);
  if (!normalized) return undefined;
  if (!ISIN_FORMAT.test(normalized)) return "format";
  return hasValidIsinChecksum(normalized) ? undefined : "checksum";
}

const normalizedIsinSchema = z.string()
  .regex(ISIN_FORMAT, "Expected an ISO 6166 ISIN")
  .refine(hasValidIsinChecksum, "Invalid ISIN check digit");

export const optionalIsinSchema = z.preprocess(
  (value) => typeof value === "string" ? normalizeOptionalIsin(value) : value,
  normalizedIsinSchema.optional(),
);
