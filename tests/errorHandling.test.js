/**
 * Unit Tests for error handling middleware and PDF validation
 */

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const {
  getUserFriendlyError,
  multerErrorHandler,
  notFoundHandler,
  globalErrorHandler,
} = require("../src/middleware/errorHandler");
const { checkPDFEncryption } = require("../src/middleware/pdfValidator");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("getUserFriendlyError", () => {
  test.each([
    ["File is encrypted", "PDF is Password Protected"],
    ["Document is password-protected", "PDF is Password Protected"],
    ["Invalid PDF structure", "Invalid PDF File"],
    ["File is corrupted", "Invalid PDF File"],
    ["This is not a PDF", "Not a PDF File"],
    ["Failed to extract text", "Cannot Read PDF"],
    ["Something unexpected", "Processing Error"],
  ])("maps %p to %p", (message, expected) => {
    const result = getUserFriendlyError(new Error(message));
    expect(result.error).toBe(expected);
    expect(result.technicalDetails).toBe(message);
  });
});

describe("multerErrorHandler", () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const handler = multerErrorHandler(MAX_FILE_SIZE);

  test("returns 403 for CORS errors", () => {
    const res = mockRes();
    handler(new Error("Not allowed by CORS"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("returns 413 with size limit for oversized files", () => {
    const res = mockRes();
    handler(new multer.MulterError("LIMIT_FILE_SIZE"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Maximum file size is 10MB" }),
    );
  });

  test("returns 400 for other multer errors", () => {
    const res = mockRes();
    handler(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "File upload error" }),
    );
  });

  test("returns 400 for non-PDF uploads", () => {
    const res = mockRes();
    handler(new Error("Only PDF files are allowed"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid file type" }),
    );
  });

  test("passes unknown errors to the next handler", () => {
    const res = mockRes();
    const next = jest.fn();
    const error = new Error("boom");
    handler(error, {}, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("notFoundHandler", () => {
  test("returns 404", () => {
    const res = mockRes();
    notFoundHandler({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("globalErrorHandler", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("hides error details in production", () => {
    process.env.NODE_ENV = "production";
    const res = mockRes();
    globalErrorHandler(new Error("secret internals"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).not.toContain("secret internals");
  });

  test("shows error details outside production", () => {
    process.env.NODE_ENV = "development";
    const res = mockRes();
    globalErrorHandler(new Error("debug info"), {}, res, jest.fn());
    expect(res.json.mock.calls[0][0].message).toBe("debug info");
  });
});

describe("checkPDFEncryption", () => {
  test("accepts a valid unencrypted PDF", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const result = await checkPDFEncryption(Buffer.from(await doc.save()));
    expect(result).toEqual({ isEncrypted: false, error: null });
  });

  test("rejects files too small to be a PDF", async () => {
    const result = await checkPDFEncryption(Buffer.from("%PD"));
    expect(result.error).toMatch(/too small/);
  });

  test("rejects files without a PDF header", async () => {
    const result = await checkPDFEncryption(Buffer.from("hello world"));
    expect(result.error).toMatch(/missing PDF header/);
  });

  test("flags password-protected PDFs", async () => {
    const buffer = fs.readFileSync(
      path.join(__dirname, "fixtures/encrypted.pdf"),
    );
    const result = await checkPDFEncryption(buffer);
    expect(result.isEncrypted).toBe(true);
  });

  test("flags corrupted PDFs as invalid, not encrypted", async () => {
    const result = await checkPDFEncryption(Buffer.from("%PDF-1.7\n1 0 obj <<"));
    expect(result.isEncrypted).toBe(false);
    expect(result.error).toMatch(/Invalid or corrupted/);
  });
});
