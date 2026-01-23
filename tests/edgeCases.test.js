/**
 * Edge Cases and Real-World Scenario Tests
 * Tests unusual but realistic scenarios
 */

const request = require('supertest');
const app = require('../server');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { findEmails, findPhones } = require('../src/utils/patterns');

describe('Edge Cases', () => {
  describe('Complex Phone Number Formats', () => {
    test('should detect Canadian phone numbers with various formats', () => {
      const formats = [
        '647-852-1083',
        '(647) 852-1083',
        '647.852.1083',
        '6478521083',
        '+1 647-852-1083',
        '+1-647-852-1083',
        '+1 (647) 852-1083'
      ];

      formats.forEach(phone => {
        const phones = findPhones(phone);
        expect(phones.length).toBeGreaterThan(0);
      });
    });

    test('should handle international formats', () => {
      const international = [
        '+44 20 1234 5678',  // UK
        '+61 2 1234 5678',   // Australia
        '+33 1 23 45 67 89', // France
        '00 44 20 1234 5678' // UK with 00 prefix
      ];

      international.forEach(phone => {
        const phones = findPhones(phone);
        expect(phones.length).toBeGreaterThan(0);
      });
    });

    test('should not flag non-phone numbers', () => {
      const notPhones = [
        '123',              // Too short
        '12-34-56',         // Invalid format
        'ABC-DEF-GHIJ',     // Letters
        '2024-01-15'        // Date
      ];

      notPhones.forEach(text => {
        const phones = findPhones(text);
        expect(phones.length).toBe(0);
      });
    });
  });

  describe('Email Edge Cases', () => {
    test('should detect various valid email formats', () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user_name@example.co.uk',
        'first.last@subdomain.example.com',
        'user123@example123.com'
      ];

      validEmails.forEach(email => {
        const emails = findEmails(email);
        expect(emails).toContain(email);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        '@example.com',      // No local part
        'user@',             // No domain
        'user@domain',       // No TLD
        'user domain.com',   // Space instead of @
        'user@@example.com'  // Double @
      ];

      invalidEmails.forEach(text => {
        const emails = findEmails(text);
        expect(emails.length).toBe(0);
      });
    });
  });

  describe('Mixed Content PDFs', () => {
    test('should handle PDF with PII in different locations', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Header
      page.drawText('JOHN DOE', {
        x: 50,
        y: 750,
        size: 20,
        font: font
      });

      // Top right corner
      page.drawText('john@example.com', {
        x: 450,
        y: 750,
        size: 10,
        font: font
      });

      // Middle of page
      page.drawText('Contact: 647-852-1083', {
        x: 50,
        y: 400,
        size: 12,
        font: font
      });

      // Bottom of page
      page.drawText('Alt email: john.doe@company.org', {
        x: 50,
        y: 50,
        size: 10,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/analyze')
        .attach('pdf', Buffer.from(pdfBytes), 'mixed.pdf')
        .expect(200);

      expect(response.body.found).toBe(true);
      expect(response.body.statistics.totalRedactions).toBeGreaterThanOrEqual(3);
    });

    test('should handle PII on single line separated by delimiter', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('647-852-1083 | john@example.com | Toronto, ON', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/analyze')
        .attach('pdf', Buffer.from(pdfBytes), 'oneline.pdf')
        .expect(200);

      expect(response.body.found).toBe(true);
      expect(response.body.statistics.emails).toBeGreaterThan(0);
      expect(response.body.statistics.phones).toBeGreaterThan(0);
    });
  });

  describe('Special Characters and Formatting', () => {
    test('should handle PDFs with special characters', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('Café Owner: café@example.com', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/analyze')
        .attach('pdf', Buffer.from(pdfBytes), 'special.pdf')
        .expect(200);

      // Should detect the email despite special characters nearby
      expect(response.body.found).toBe(true);
    });

    test('should handle PDFs with different font sizes', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('test@example.com', {
        x: 50,
        y: 350,
        size: 8,
        font: font
      });

      page.drawText('647-852-1083', {
        x: 50,
        y: 300,
        size: 24,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from(pdfBytes), 'sizes.pdf')
        .expect(200);

      // Should create redacted PDF successfully
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('Empty and Minimal PDFs', () => {
    test('should handle completely empty PDF', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 400]); // Empty page
      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/analyze')
        .attach('pdf', Buffer.from(pdfBytes), 'empty.pdf')
        .expect(200);

      expect(response.body.found).toBe(false);
      expect(response.body.statistics.totalRedactions).toBe(0);
    });

    test('should handle single character PDF', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('X', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/analyze')
        .attach('pdf', Buffer.from(pdfBytes), 'single.pdf')
        .expect(200);

      expect(response.body.found).toBe(false);
    });
  });

  describe('Real-World CV Scenarios', () => {
    test('should handle CV with multiple contact methods', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Typical CV header
      page.drawText('JANE SMITH', {
        x: 50,
        y: 750,
        size: 24,
        font: boldFont
      });

      page.drawText('Email: jane.smith@email.com | Phone: 647-852-1083', {
        x: 50,
        y: 720,
        size: 10,
        font: font
      });

      page.drawText('LinkedIn: linkedin.com/in/janesmith', {
        x: 50,
        y: 700,
        size: 10,
        font: font
      });

      // Experience section might have company contact
      page.drawText('References available upon request', {
        x: 50,
        y: 400,
        size: 10,
        font: font
      });

      page.drawText('Alt Contact: +1-416-555-9999', {
        x: 50,
        y: 380,
        size: 10,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from(pdfBytes), 'cv.pdf')
        .expect(200);

      // Should successfully redact
      expect(response.headers['x-redaction-stats']).toBeDefined();
      const stats = JSON.parse(response.headers['x-redaction-stats']);
      expect(stats.totalRedactions).toBeGreaterThan(0);
    });

    test('should handle CV with email in signature block', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('Thank you for your consideration.', {
        x: 50,
        y: 150,
        size: 12,
        font: font
      });

      page.drawText('Best regards,', {
        x: 50,
        y: 130,
        size: 12,
        font: font
      });

      page.drawText('John Doe', {
        x: 50,
        y: 110,
        size: 12,
        font: font
      });

      page.drawText('john.doe@email.com', {
        x: 50,
        y: 90,
        size: 10,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post('/api/editor/analyze')
        .attach('pdf', Buffer.from(pdfBytes), 'signature.pdf')
        .expect(200);

      expect(response.body.found).toBe(true);
      expect(response.body.statistics.emails).toBe(1);
    });
  });

  describe('Performance', () => {
    test('should process small PDF quickly', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('Contact: test@example.com', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from(pdfBytes), 'quick.pdf')
        .expect(200);

      const processingTime = parseInt(response.headers['x-processing-time']);

      // Should process in reasonable time (less than 1 second for small PDF)
      expect(processingTime).toBeLessThan(1000);
    });
  });
});
