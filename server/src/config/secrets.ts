const PLACEHOLDER_PREFIXES = ["change_this", "your_", "replace_", "example"];

/**
 * Throws if a signing secret is too weak to deploy with.
 * Rejects short values, the placeholder text shipped in .env.example, and
 * values that look like unfilled templates.
 */
export const assertStrongSecret = (name: string, value: string): void => {
  const lower = value.toLowerCase();
  if (PLACEHOLDER_PREFIXES.some((p) => lower.startsWith(p))) {
    throw new Error(
      `${name} still contains placeholder text. Generate a real value with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
    );
  }
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }
};

/** Access and refresh secrets must be independent so one cannot forge the other. */
export const assertDistinctSecrets = (a: string, b: string): void => {
  if (a === b) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different values");
  }
};
