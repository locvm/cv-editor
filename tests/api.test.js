/**
 * Integration Tests for API Endpoints
 * Tests the Express server endpoints
 */

const request = require("supertest");
const { app, server } = require("../index");
const fs = require("fs");
const path = require("path");

describe("API Endpoints", () => {
  describe("GET /health", () => {
    test("should return 200 and health status", async () => {
      const response = await request(app)
        .get("/api/health")
        .expect(200)
        .expect("Content-Type", /json/);

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty(
        "service",
        "PDF Privacy Redaction Server",
      );
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("POST /redact", () => {
    test("should return 400 when no file is uploaded", async () => {
      const response = await request(app)
        .post("/api/editor/redact")
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/No PDF file uploaded/i);
    });

    test("should return 400 when non-PDF file is uploaded", async () => {
      const response = await request(app)
        .post("/api/editor/redact")
        .field("name", "test")
        .attach("file", Buffer.from("not a pdf"), "test.txt")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    test("should process PDF with PII and return redacted PDF", async () => {
      // Check if test PDF exists
      const testPdfPath = path.join(__dirname, "../test-cv.pdf");
      if (!fs.existsSync(testPdfPath)) {
        console.warn("Test PDF not found, skipping this test");
        return;
      }

      const response = await request(app)
        .post("/api/editor/redact")
        .attach("file", testPdfPath)
        .expect(200)
        .expect("Content-Type", "application/pdf");

      // Check headers
      expect(response.headers).toHaveProperty("x-redaction-stats");
      expect(response.headers).toHaveProperty("x-processing-time");

      // Parse stats
      const stats = JSON.parse(response.headers["x-redaction-stats"]);
      expect(stats).toHaveProperty("totalRedactions");
      expect(stats).toHaveProperty("emails");
      expect(stats).toHaveProperty("phones");
      expect(stats.totalRedactions).toBeGreaterThan(0);

      // Check response is a PDF buffer
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test("should handle PDF with no PII gracefully", async () => {
      // Create a simple PDF with no PII
      const { PDFDocument, StandardFonts } = require("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText("This is a test document with no personal information.", {
        x: 50,
        y: 350,
        size: 12,
        font: font,
      });

      const pdfBytes = await pdfDoc.save();

      const response = await request(app)
        .post("/api/editor/redact")
        .attach("file", Buffer.from(pdfBytes), "test.pdf")
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/No personal information found/i);
      expect(response.body.redactions.totalRedactions).toBe(0);
    });
  });

  describe("POST /analyze", () => {
    test("should return 400 when no file is uploaded", async () => {
      const response = await request(app)
        .post("/api/editor/analyze")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    test("should analyze PDF and return statistics without redacting", async () => {
      const testPdfPath = path.join(__dirname, "../test-cv.pdf");
      if (!fs.existsSync(testPdfPath)) {
        console.warn("Test PDF not found, skipping this test");
        return;
      }

      const response = await request(app)
        .post("/api/editor/analyze")
        .attach("file", testPdfPath)
        .expect(200)
        .expect("Content-Type", /json/);

      expect(response.body).toHaveProperty("found");
      expect(response.body).toHaveProperty("statistics");
      expect(response.body).toHaveProperty("details");

      if (response.body.found) {
        expect(response.body.statistics).toHaveProperty("totalRedactions");
        expect(response.body.statistics).toHaveProperty("emails");
        expect(response.body.statistics).toHaveProperty("phones");
        expect(response.body.details).toBeInstanceOf(Array);
      }
    });

    test("should return detailed coordinate information in analysis", async () => {
      const testPdfPath = path.join(__dirname, "../test-cv.pdf");
      if (!fs.existsSync(testPdfPath)) {
        console.warn("Test PDF not found, skipping this test");
        return;
      }

      const response = await request(app)
        .post("/api/editor/analyze")
        .attach("file", testPdfPath)
        .expect(200);

      if (response.body.found && response.body.details.length > 0) {
        const firstPageItems = response.body.details[0].items;
        expect(firstPageItems.length).toBeGreaterThan(0);

        const firstItem = firstPageItems[0];
        expect(firstItem).toHaveProperty("type");
        expect(firstItem).toHaveProperty("text");
        expect(firstItem).toHaveProperty("coordinates");
        expect(firstItem.coordinates).toHaveProperty("x");
        expect(firstItem.coordinates).toHaveProperty("y");
        expect(firstItem.coordinates).toHaveProperty("width");
        expect(firstItem.coordinates).toHaveProperty("height");
      }
    });
  });

  describe("Error Handling", () => {
    test("should return 404 for unknown endpoints", async () => {
      const response = await request(app).get("/unknown-endpoint").expect(404);

      expect(response.body).toHaveProperty("error");
    });

    test("should handle file size limit violations", async () => {
      // Create a buffer larger than the limit (if applicable)
      // This test assumes MAX_FILE_SIZE is set to 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post("/api/editor/redact")
        .attach("file", largeBuffer, "large.pdf");

      // Should return 413 or 400 depending on multer config
      expect([400, 413]).toContain(response.status);
    });
  });
});
