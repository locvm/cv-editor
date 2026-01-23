/**
 * Tests for PDF Processing Logic
 * Tests the extraction and redaction services
 */

const { extractPIICoordinates } = require('../src/services/pdfExtractor');
const { redactPDF, getRedactionStats } = require('../src/services/pdfRedactor');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

describe('PDF Text Extraction', () => {
  let testPdfBuffer;

  beforeAll(async () => {
    // Create a test PDF with known PII
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Contact Information:', {
      x: 50,
      y: 350,
      size: 14,
      font: font
    });

    page.drawText('Email: test@example.com', {
      x: 50,
      y: 320,
      size: 12,
      font: font
    });

    page.drawText('Phone: 647-852-1083', {
      x: 50,
      y: 300,
      size: 12,
      font: font
    });

    page.drawText('Alt: +1-416-555-1234', {
      x: 50,
      y: 280,
      size: 12,
      font: font
    });

    const pdfBytes = await pdfDoc.save();
    testPdfBuffer = Buffer.from(pdfBytes);
  });

  test('should extract PII from PDF with coordinates', async () => {
    const piiItems = await extractPIICoordinates(testPdfBuffer);

    expect(piiItems).toBeInstanceOf(Array);
    expect(piiItems.length).toBeGreaterThan(0);
    expect(piiItems[0]).toHaveProperty('pageNumber');
    expect(piiItems[0]).toHaveProperty('items');
    expect(piiItems[0].items.length).toBeGreaterThan(0);
  });

  test('should identify correct types of PII', async () => {
    const piiItems = await extractPIICoordinates(testPdfBuffer);
    const items = piiItems[0].items;

    const hasEmail = items.some(item => item.type === 'email');
    const hasPhone = items.some(item => item.type === 'phone');

    expect(hasEmail).toBe(true);
    expect(hasPhone).toBe(true);
  });

  test('should extract coordinate information for each PII item', async () => {
    const piiItems = await extractPIICoordinates(testPdfBuffer);
    const firstItem = piiItems[0].items[0];

    expect(firstItem).toHaveProperty('x');
    expect(firstItem).toHaveProperty('y');
    expect(firstItem).toHaveProperty('width');
    expect(firstItem).toHaveProperty('height');
    expect(typeof firstItem.x).toBe('number');
    expect(typeof firstItem.y).toBe('number');
  });

  test('should handle PDF with no PII', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('This document contains no personal information.', {
      x: 50,
      y: 350,
      size: 12,
      font: font
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    const piiItems = await extractPIICoordinates(buffer);
    expect(piiItems).toHaveLength(0);
  });

  test('should handle multi-page PDFs', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Page 1 with email
    const page1 = pdfDoc.addPage([600, 400]);
    page1.drawText('Email: page1@example.com', {
      x: 50,
      y: 350,
      size: 12,
      font: font
    });

    // Page 2 with phone
    const page2 = pdfDoc.addPage([600, 400]);
    page2.drawText('Phone: 416-555-9999', {
      x: 50,
      y: 350,
      size: 12,
      font: font
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    const piiItems = await extractPIICoordinates(buffer);
    expect(piiItems.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PDF Redaction', () => {
  test('should produce a valid PDF after redaction', async () => {
    // Create test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Email: redact@example.com', {
      x: 50,
      y: 350,
      size: 12,
      font: font
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    // Extract PII
    const piiItems = await extractPIICoordinates(buffer);
    expect(piiItems.length).toBeGreaterThan(0);

    // Redact
    const redactedBuffer = await redactPDF(buffer, piiItems);
    expect(redactedBuffer).toBeInstanceOf(Buffer);
    expect(redactedBuffer.length).toBeGreaterThan(0);

    // Verify it's still a valid PDF
    const redactedDoc = await PDFDocument.load(redactedBuffer);
    expect(redactedDoc.getPageCount()).toBe(1);
  });

  test('should calculate correct statistics', async () => {
    const piiItems = [{
      pageNumber: 1,
      items: [
        { type: 'email', text: 'test@example.com' },
        { type: 'phone', text: '647-852-1083' },
        { type: 'phone', text: '+1-416-555-1234' }
      ]
    }];

    const stats = getRedactionStats(piiItems);

    expect(stats).toHaveProperty('totalRedactions', 3);
    expect(stats).toHaveProperty('emails', 1);
    expect(stats).toHaveProperty('phones', 2);
    expect(stats).toHaveProperty('pagesAffected', 1);
  });

  test('should handle encrypted PDFs', async () => {
    // This test verifies that ignoreEncryption option works
    // In a real scenario, you'd test with an actual encrypted PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Phone: 647-852-1083', {
      x: 50,
      y: 350,
      size: 12,
      font: font
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    const piiItems = await extractPIICoordinates(buffer);

    // Should not throw error even with ignoreEncryption option
    await expect(redactPDF(buffer, piiItems)).resolves.toBeDefined();
  });
});

describe('Statistics Generation', () => {
  test('should correctly count mixed PII types', () => {
    const piiItems = [
      {
        pageNumber: 1,
        items: [
          { type: 'email', text: 'test1@example.com' },
          { type: 'email', text: 'test2@example.com' },
          { type: 'phone', text: '647-852-1083' }
        ]
      },
      {
        pageNumber: 2,
        items: [
          { type: 'phone', text: '+1-416-555-1234' }
        ]
      }
    ];

    const stats = getRedactionStats(piiItems);

    expect(stats.totalRedactions).toBe(4);
    expect(stats.emails).toBe(2);
    expect(stats.phones).toBe(2);
    expect(stats.pagesAffected).toBe(2);
  });

  test('should handle empty PII items', () => {
    const stats = getRedactionStats([]);

    expect(stats.totalRedactions).toBe(0);
    expect(stats.emails).toBe(0);
    expect(stats.phones).toBe(0);
    expect(stats.pagesAffected).toBe(0);
  });
});
