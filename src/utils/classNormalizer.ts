/**
 * Utility for normalizing and displaying class identifiers across QuizForge.
 * Guarantees that classes are stored as normalized numbers (9, 10, 11, 12)
 * and displayed consistently as "Class 9", "Class 10", etc.
 */

export type SupportedClass = 9 | 10 | 11 | 12;

/**
 * Normalizes any class input (e.g. 9, "9", "Class 9", "कक्षा 9", " 9 ") into a valid number (9, 10, 11, or 12).
 * Defaults to 9 if input cannot be resolved.
 */
export function normalizeClass(val: any): SupportedClass {
  if (typeof val === 'number') {
    if (val >= 9 && val <= 12) return val as SupportedClass;
  }
  const str = String(val || '').trim();
  const digits = str.replace(/\D/g, '');
  const parsed = parseInt(digits, 10);
  if (parsed >= 9 && parsed <= 12) {
    return parsed as SupportedClass;
  }
  return 9;
}

/**
 * Consistently formats a class value for UI display (e.g. "Class 9").
 */
export function formatClassLabel(val: any): string {
  return `Class ${normalizeClass(val)}`;
}
