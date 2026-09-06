/**
 * Escapes characters with special meaning in regular expressions
 * to prevent ReDoS vulnerabilities and regex syntax errors from user input.
 */
export function escapeRegex(text: string): string {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
