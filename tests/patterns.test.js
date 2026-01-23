/**
 * Unit Tests for Pattern Matching
 * Tests email and phone number detection patterns
 */

const {
  isEmail,
  isPhone,
  findEmails,
  findPhones,
  containsPII
} = require('../src/utils/patterns');

describe('Email Pattern Detection', () => {
  test('should detect valid email addresses', () => {
    expect(isEmail('test@example.com')).toBe(true);
    expect(isEmail('user.name@domain.co.uk')).toBe(true);
    expect(isEmail('john+tag@example.com')).toBe(true);
    expect(isEmail('Caitoria131@gmail.com')).toBe(true);
  });

  test('should reject invalid email addresses', () => {
    expect(isEmail('not-an-email')).toBe(false);
    expect(isEmail('@example.com')).toBe(false);
    expect(isEmail('user@')).toBe(false);
    expect(isEmail('user@domain')).toBe(false);
  });

  test('should find all emails in text', () => {
    const text = 'Contact me at john@example.com or jane@test.org';
    const emails = findEmails(text);
    expect(emails).toHaveLength(2);
    expect(emails).toContain('john@example.com');
    expect(emails).toContain('jane@test.org');
  });

  test('should extract email from mixed text', () => {
    const text = '647-852-1083 | Caitoria131@gmail.com';
    const emails = findEmails(text);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toBe('Caitoria131@gmail.com');
  });
});

describe('Phone Pattern Detection', () => {
  test('should detect Canadian phone formats', () => {
    expect(isPhone('647-852-1083')).toBe(true);
    expect(isPhone('(416) 555-1234')).toBe(true);
    expect(isPhone('416.555.1234')).toBe(true);
    expect(isPhone('4165551234')).toBe(true);
  });

  test('should detect international phone formats', () => {
    expect(isPhone('+1-416-555-1234')).toBe(true);
    expect(isPhone('+44 20 1234 5678')).toBe(true);
    expect(isPhone('+61 2 1234 5678')).toBe(true);
    expect(isPhone('00 44 20 1234 5678')).toBe(true);
  });

  test('should reject invalid phone numbers', () => {
    expect(isPhone('123')).toBe(false);
    expect(isPhone('abc-def-ghij')).toBe(false);
    expect(isPhone('not a phone')).toBe(false);
  });

  test('should find all phone numbers in text', () => {
    const text = 'Call me at 647-852-1083 or +1-416-555-1234';
    const phones = findPhones(text);
    expect(phones.length).toBeGreaterThan(0);
    expect(phones.some(p => p.includes('647-852-1083'))).toBe(true);
  });

  test('should handle phone with parentheses', () => {
    const text = 'Mobile: (647) 555-9876';
    const phones = findPhones(text);
    expect(phones.length).toBeGreaterThan(0);
    expect(phones.some(p => p.includes('(647) 555-9876'))).toBe(true);
  });
});

describe('PII Detection', () => {
  test('should detect text containing email', () => {
    expect(containsPII('Contact: john@example.com')).toBe(true);
  });

  test('should detect text containing phone', () => {
    expect(containsPII('Call: 647-852-1083')).toBe(true);
  });

  test('should detect text containing both email and phone', () => {
    expect(containsPII('647-852-1083 | Caitoria131@gmail.com')).toBe(true);
  });

  test('should return false for text without PII', () => {
    expect(containsPII('No personal information here')).toBe(false);
    expect(containsPII('Education: University of Toronto')).toBe(false);
  });
});
