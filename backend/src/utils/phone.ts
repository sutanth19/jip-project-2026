/** Converts common Malaysian display formats to a single database representation. */
export function normalizeMalaysianPhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");

  if (compact.startsWith("+60")) {
    return `0${compact.slice(3)}`;
  }

  if (compact.startsWith("60")) {
    return `0${compact.slice(2)}`;
  }

  return compact;
}

export function isValidMalaysianPhone(value: string): boolean {
  const normalized = normalizeMalaysianPhone(value);

  // Supports Malaysian mobile and landline numbers without accepting extensions.
  return /^0(?:1\d{7,9}|[2-9]\d{7,9})$/.test(normalized);
}
