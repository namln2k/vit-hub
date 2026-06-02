const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedEmailList {
  emails: string[];
  invalidEmails: string[];
  duplicateEmails: string[];
}

export function parseEmailList(value: string): ParsedEmailList {
  const seenEmails = new Set<string>();
  const duplicateEmails = new Set<string>();
  const invalidEmails = new Set<string>();
  const emails: string[] = [];

  value
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => {
      if (!EMAIL_PATTERN.test(email)) {
        invalidEmails.add(email);
        return;
      }

      if (seenEmails.has(email)) {
        duplicateEmails.add(email);
        return;
      }

      seenEmails.add(email);
      emails.push(email);
    });

  return {
    emails,
    invalidEmails: Array.from(invalidEmails),
    duplicateEmails: Array.from(duplicateEmails),
  };
}

export function formatEmailList(emails: string[], limit = 5) {
  if (emails.length <= limit) {
    return emails.join(', ');
  }

  return `${emails.slice(0, limit).join(', ')} và ${emails.length - limit} email khác`;
}
