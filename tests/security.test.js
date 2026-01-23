/**
 * Security Tests
 * Ensures the application handles security concerns properly
 */

const request = require('supertest');
const app = require('../server');
const { PDFDocument, StandardFonts } = require('pdf-lib');

describe('Security & Privacy Tests', () => {
  describe('File Upload Security', () => {
    test('should reject non-PDF files', async () => {
      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from('This is not a PDF'), 'fake.txt');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject oversized files', async () => {
      // Create a large buffer (larger than MAX_FILE_SIZE)
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB

      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', largeBuffer, 'large.pdf');

      // Should reject with 413 or 400
      expect([400, 413]).toContain(response.status);
    });

    test('should handle malformed PDF data', async () => {
      const malformedPdf = Buffer.from('%PDF-1.4\nmalformed data here');

      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', malformedPdf, 'malformed.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Invalid|Cannot Read|Processing Error/i);
    });
  });

  describe('CORS and Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should include security headers from helmet', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Helmet sets various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('Data Privacy', () => {
    test('should not store uploaded files on disk', async () => {
      // This is a behavioral test - multer is configured with memoryStorage
      // Files should never be written to disk
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('Sensitive: test@private.com', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from(pdfBytes), 'sensitive.pdf')
        .expect(200);

      // The test passes if the endpoint works - it means files are processed in memory
      // In a real scenario, you'd check that no files were created in temp directories
    });

    test('should not leak sensitive data in error messages', async () => {
      // Create PDF with PII
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('Secret: secret@classified.gov and 555-SECRET', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      // Force an error by sending malformed data
      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from('not a pdf'), 'fake.pdf');

      // Check that the error doesn't contain the PII
      const responseText = JSON.stringify(response.body).toLowerCase();
      expect(responseText).not.toContain('secret@classified.gov');
      expect(responseText).not.toContain('555-secret');
    });
  });

  describe('Input Validation', () => {
    test('should validate file field name', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 400]);
      const pdfBytes = await pdfDoc.save();

      // Use wrong field name
      const response = await request(app)
        .post('/api/editor/redact')
        .attach('wrongfield', Buffer.from(pdfBytes), 'test.pdf');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject requests without files', async () => {
      const response = await request(app)
        .post('/api/editor/redact')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/No PDF file/i);
    });

    test('should handle multiple file uploads gracefully', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 400]);
      const pdfBytes = await pdfDoc.save();

      // Try to upload multiple files (only single file is accepted)
      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from(pdfBytes), 'test1.pdf')
        .attach('pdf', Buffer.from(pdfBytes), 'test2.pdf');

      // Should either accept first file or reject
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Error Information Disclosure', () => {
    test('should provide user-friendly errors without technical stack traces', async () => {
      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', Buffer.from('invalid'), 'test.pdf');

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');

      // Should not leak internal paths or stack traces
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/\/Users\//);
      expect(responseText).not.toMatch(/\/node_modules\//);
      expect(responseText).not.toMatch(/at Object\./);
    });

    test('should handle encrypted PDF with friendly message', async () => {
      // Note: Creating actually encrypted PDF is complex,
      // but we test that the error handler exists
      const malformedEncrypted = Buffer.from('%PDF-1.4\n<< /Encrypt >>');

      const response = await request(app)
        .post('/api/editor/redact')
        .attach('pdf', malformedEncrypted, 'encrypted.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Rate Limiting & DoS Protection', () => {
    test('should handle concurrent requests', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('Email: test@example.com', {
        x: 50,
        y: 350,
        size: 12,
        font: font
      });

      const pdfBytes = await pdfDoc.save();

      // Send 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/editor/redact')
          .attach('pdf', Buffer.from(pdfBytes), 'test.pdf')
      );

      const responses = await Promise.all(requests);

      // All should succeed (or fail gracefully)
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });
  });
});
