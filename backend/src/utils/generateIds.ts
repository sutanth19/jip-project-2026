/**
 * Formats IDs only.
 * Example:
 * SCH000001
 * TCH000001
 * STU000001
 */

function padNumber(number: number): string {
  return number.toString().padStart(6, "0");
}

export function generateParentId(number: number): string {
  return `PAR${padNumber(number)}`;
}

export function generateAdminId(number: number): string {
  return `ADM${padNumber(number)}`;
}

export function generateClassCode(number: number): string {
  return `CLS${padNumber(number)}`;
}

export function generateBadgeCode(number: number): string {
  return `BDG${padNumber(number)}`;
}

export function generateAnnouncementCode(number: number): string {
  return `ANN${padNumber(number)}`;
}