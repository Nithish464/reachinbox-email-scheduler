const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Extracts and de-duplicates email addresses from an uploaded CSV/text
 * file's raw content. Deliberately lenient (regex scan) so it works
 * whether the file is a single "email" column, a full CSV with headers,
 * or a plain newline/comma separated list.
 */
export function parseLeadsFromText(content: string): string[] {
  const matches = content.match(EMAIL_REGEX) ?? [];
  const unique = Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
  return unique;
}
