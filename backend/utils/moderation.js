/**
 * server/utils/moderation.js
 * Content-moderation utilities for display names and user-generated text.
 *
 * Public API
 * ──────────
 *  validateDisplayName(name)  → { status: 'APPROVED'|'REJECTED', reason?: string }
 *  censorText(text)           → { originalText: string, sanitizedText: string }
 */

'use strict';

// ── Character-substitution map (l33t-speak / symbol replacements) ────────────
// Used when normalising text before detection so obfuscated variants are caught.
const LEET = {
  '@': 'a', '4': 'a',
  '3': 'e',
  '1': 'i', '!': 'i',
  '0': 'o',
  '$': 's', '5': 's',
  '7': 't',
  '+': 't',
};

/**
 * Produce a detection-only normalised form of a string:
 *  - lowercase
 *  - collapse leet-speak characters to their base letter
 *  - strip every non-alpha character (spaces, punctuation, digits)
 *    so that "f-u-c-k", "f u c k", "f.u.c.k" all become "fuck"
 */
function normalise(str) {
  return str
    .toLowerCase()
    .replace(/[@4310!$57+]/g, ch => LEET[ch] ?? ch)
    .replace(/[^a-z]/g, '');
}

// ── Per-character regex classes for obfuscation-aware matching ───────────────
// These are used when building patterns that run against the ORIGINAL text,
// so replaced characters are still caught without losing position information.
const CHAR_CLASS = {
  a: '[a@4]',
  e: '[e3]',
  i: '[i1!]',
  o: '[o0]',
  s: '[s$5]',
  t: '[t7+]',
};

/**
 * Build a regex that matches `word` in original (non-normalised) text, allowing:
 *  - case-insensitivity
 *  - single-character leet-speak substitutions per letter
 *  - optional single non-alphanumeric separator between letters
 *    (catches "f-u-c-k", "f.u.c.k", "f_u_c_k", etc.)
 *  - whole-word match via \b … \b (avoids false positives inside longer words)
 */
function buildWordBoundaryRegex(word) {
  const chars = word.toLowerCase().split('').map(ch => CHAR_CLASS[ch] || ch);
  const inner = chars.join('[\\W_]?');
  return new RegExp(`\\b${inner}\\b`, 'gi');
}

/**
 * Build a regex that matches `word` ANYWHERE in a string (no word boundaries).
 * Used for display-name checks where a slur embedded in a handle (e.g. "xXslurXx")
 * should still be caught even without surrounding whitespace.
 */
function buildSubstringRegex(word) {
  const chars = word.toLowerCase().split('').map(ch => CHAR_CLASS[ch] || ch);
  const inner = chars.join('[\\W_]?');
  return new RegExp(inner, 'gi');
}

// ── Offensive word list ──────────────────────────────────────────────────────
// Base forms only; buildWordBoundaryRegex / buildSubstringRegex handle variants.
// Organised by category for maintainability.
const OFFENSIVE_WORDS = [
  // Racial / ethnic slurs
  'nigger', 'nigga', 'chink', 'gook', 'spic', 'spick', 'kike',
  'wetback', 'coon', 'darkie', 'towelhead', 'sandnigger', 'raghead',
  'beaner', 'zipperhead', 'redskin', 'cracker',

  // Homophobic / transphobic slurs
  'faggot', 'fag', 'dyke', 'tranny', 'shemale',

  // Misogynistic / gendered slurs
  'cunt', 'whore', 'slut',

  // Ableist slurs
  'retard', 'spastic',

  // Severe profanity & insults used as slurs in gaming contexts
  'fuck', 'shit', 'bitch', 'asshole', 'motherfucker', 'fucker',
  'dickhead', 'cock', 'pussy', 'prick', 'bastard',
];

// ── Precompile all pattern sets once at module load ──────────────────────────
// Avoids recompiling on every request.
const WORD_BOUNDARY_PATTERNS = OFFENSIVE_WORDS.map(word => ({
  normalBase: normalise(word),           // for fast normalised-text detection
  boundaryRe: buildWordBoundaryRegex(word),  // for in-place replacement in original text
  substringRe: buildSubstringRegex(word),    // for display-name substring detection
}));

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Check whether `text` contains any offensive term.
 * Runs both a fast normalised-string search and the regex patterns
 * against the original text for comprehensive detection.
 *
 * @param {string}  text
 * @param {boolean} substringMode  true → use substring patterns (display names)
 *                                 false → use word-boundary patterns (prose text)
 */
function containsOffensive(text, substringMode) {
  const norm = normalise(text);

  for (const { normalBase, boundaryRe, substringRe } of WORD_BOUNDARY_PATTERNS) {
    // 1. Fast check on fully-normalised text (collapses all substitutions/spaces)
    if (norm.includes(normalBase)) {
      return true;
    }

    // 2. Regex check on original text (handles partial obfuscation with separators)
    const re = substringMode ? substringRe : boundaryRe;
    re.lastIndex = 0;
    if (re.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Replace every offensive match in `text` with asterisks of the same length.
 * Operates on the original text to preserve formatting and structure.
 */
function replaceOffensive(text) {
  let result = text;

  for (const { boundaryRe } of WORD_BOUNDARY_PATTERNS) {
    boundaryRe.lastIndex = 0;
    result = result.replace(boundaryRe, match => '*'.repeat(match.length));
  }

  return result;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a user-supplied display name for offensive content.
 *
 * Uses substring matching (no word boundaries) because a display name like
 * "xXslurXx" should be rejected even though the slur has no surrounding spaces.
 *
 * @param {string} name
 * @returns {{ status: 'APPROVED'|'REJECTED', reason?: string }}
 */
function validateDisplayName(name) {
  if (!name || typeof name !== 'string') {
    return { status: 'REJECTED', reason: 'Display name is required.' };
  }

  if (containsOffensive(name, /* substringMode */ true)) {
    return {
      status: 'REJECTED',
      reason: 'Display name contains inappropriate or offensive language.',
    };
  }

  return { status: 'APPROVED' };
}

/**
 * Censor offensive language in a body of user-generated text.
 * Offensive words are replaced with asterisks; everything else is untouched.
 *
 * @param {string} text
 * @returns {{ originalText: string, sanitizedText: string }}
 */
function censorText(text) {
  const originalText  = typeof text === 'string' ? text : '';
  const sanitizedText = replaceOffensive(originalText);
  return { originalText, sanitizedText };
}

module.exports = { validateDisplayName, censorText };
