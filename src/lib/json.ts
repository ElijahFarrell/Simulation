export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
