/**
 * Regex patterns for detecting PII (Personally Identifiable Information)
 * in PDF documents
 */

// Email pattern - matches standard email formats
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// Phone patterns - matches various international and local formats
const PHONE_PATTERNS = [
  // International format with + (e.g., +1-555-123-4567, +44 20 1234 5678)
  /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{0,4}/g,

  // Standard formats with parentheses (e.g., (555) 123-4567, (02) 1234 5678)
  /\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,

  // Simple numeric with separators (e.g., 555-123-4567, 555.123.4567)
  /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g,

  // International without + (e.g., 00 44 20 1234 5678)
  /\b00\s?\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}\b/g,

  // Compact format (e.g., 5551234567, at least 10 digits)
  /\b\d{10,15}\b/g
];

/**
 * Test if a string matches the email pattern
 * @param {string} text - Text to test
 * @returns {boolean} True if email pattern is found
 */
function isEmail(text) {
  const pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  return pattern.test(text);
}

/**
 * Test if a string matches any phone pattern
 * @param {string} text - Text to test
 * @returns {boolean} True if phone pattern is found
 */
function isPhone(text) {
  const patterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{0,4}/,
    /\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/,
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/,
    /\b00\s?\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}\b/,
    /\b\d{10,15}\b/
  ];
  return patterns.some(pattern => pattern.test(text));
}

/**
 * Find all emails in a text
 * @param {string} text - Text to search
 * @returns {Array} Array of email matches
 */
function findEmails(text) {
  const matches = text.match(EMAIL_PATTERN);
  return matches || [];
}

/**
 * Find all phone numbers in a text
 * @param {string} text - Text to search
 * @returns {Array} Array of phone number matches
 */
function findPhones(text) {
  const allMatches = [];
  const seenMatches = new Set();

  PHONE_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Avoid duplicates by tracking seen matches
        if (!seenMatches.has(match)) {
          seenMatches.add(match);
          allMatches.push(match);
        }
      });
    }
  });

  return allMatches;
}

/**
 * Check if text contains any PII (email or phone)
 * @param {string} text - Text to check
 * @returns {boolean} True if PII is found
 */
function containsPII(text) {
  return isEmail(text) || isPhone(text);
}

module.exports = {
  EMAIL_PATTERN,
  PHONE_PATTERNS,
  isEmail,
  isPhone,
  findEmails,
  findPhones,
  containsPII
};
