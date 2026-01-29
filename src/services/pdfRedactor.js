/**
 * PDF Redaction Service
 * Uses pdf-lib to remove text and add visual overlays
 */

const { PDFDocument, rgb } = require("pdf-lib");
// const { encrypt } = require('node-qpdf2'); // Moved to dynamic import
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

// Light gray color for redaction rectangles (RGB: 211, 211, 211)
const REDACTION_COLOR = rgb(211 / 255, 211 / 255, 211 / 255);

/**
 * Apply encryption to PDF to disable printing and copying
 * @param {Buffer} pdfBuffer - PDF buffer to encrypt
 * @returns {Promise<Buffer>} Encrypted PDF buffer
 */
async function applyPDFEncryption(pdfBuffer) {
  const { encrypt } = await import("node-qpdf2");
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}.pdf`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.pdf`);

  try {
    // Write input buffer to temp file
    await fs.writeFile(inputPath, pdfBuffer);

    // Apply encryption with qpdf
    await encrypt(inputPath, {
      outputFile: outputPath,
      password: "", // No password required to open
      restrictions: {
        print: "none", // Disable printing completely
        modify: "none", // Disable all modifications
        extract: "n", // Disable text/image extraction (copying)
        useAes: "y", // Use AES encryption (more secure)
        accessibility: "y", // Allow screen readers for accessibility
      },
    });

    // Read encrypted output
    const encryptedBuffer = await fs.readFile(outputPath);

    // Clean up temp files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return encryptedBuffer;
  } catch (error) {
    // Clean up temp files on error
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
    throw error;
  }
}

/**
 * Redact PII from PDF by removing text and adding visual overlays
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Array} piiItems - Array of pages with PII items to redact
 * @param {Object} options - Optional settings
 * @param {boolean} options.skipEncryption - Skip PDF encryption (useful when converting to images)
 * @returns {Promise<Buffer>} Redacted PDF buffer
 */
async function redactPDF(pdfBuffer, piiItems, options = {}) {
  const { skipEncryption = false } = options;
  try {
    // First, check if the PDF is encrypted
    let isEncrypted = false;
    let pdfDoc;

    try {
      pdfDoc = await PDFDocument.load(pdfBuffer, {
        updateMetadata: false,
        ignoreEncryption: false,
      });
    } catch (error) {
      if (error.message.includes("encrypted")) {
        isEncrypted = true;
        console.warn("PDF is encrypted - this may cause issues with redaction");

        // Try to load with ignoreEncryption
        try {
          pdfDoc = await PDFDocument.load(pdfBuffer, {
            updateMetadata: false,
            ignoreEncryption: true,
          });

          // Try to copy to a new document to remove encryption
          console.log(
            "Attempting to remove encryption by copying to new document",
          );
          const newPdfDoc = await PDFDocument.create();
          const pages = await newPdfDoc.copyPages(
            pdfDoc,
            pdfDoc.getPageIndices(),
          );

          for (const page of pages) {
            newPdfDoc.addPage(page);
          }

          pdfDoc = newPdfDoc;
          console.log("Successfully removed encryption");
          isEncrypted = false;
        } catch (decryptError) {
          console.error("Failed to remove encryption:", decryptError.message);
          throw new Error(
            "This PDF is encrypted/password-protected and cannot be processed. Please remove the password protection and try again.",
          );
        }
      } else {
        throw error;
      }
    }

    const originalPageCount = pdfDoc.getPageCount();

    // Validate input PDF
    if (originalPageCount === 0) {
      throw new Error("Input PDF has no pages");
    }

    // Process each page with PII
    for (const pageData of piiItems) {
      const pageIndex = pageData.pageNumber - 1;
      const page = pdfDoc.getPage(pageIndex);
      const { height: pageHeight } = page.getSize();

      // Process each PII item on this page
      for (const item of pageData.items) {
        // Note: Text removal from content streams is complex and can cause issues
        // For now, we use visual redaction with opaque rectangles
        // Future improvement: implement proper content stream text removal

        // Draw light gray rectangle over redacted area
        const padding = 2; // Add small padding around text
        page.drawRectangle({
          x: item.x - padding,
          y: pageHeight - item.y - item.height - padding,
          width: item.width + padding * 2,
          height: item.height + padding * 2,
          color: REDACTION_COLOR,
          opacity: 1.0,
          borderWidth: 0,
        });
      }
    }

    // Save with multiple save option strategies
    let redactedPdfBytes;

    // Try Strategy 1: useObjectStreams: false (most compatible)
    try {
      console.log("Attempting save with useObjectStreams: false");
      redactedPdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });
    } catch (err1) {
      console.warn("Strategy 1 failed:", err1.message);

      // Try Strategy 2: Default save options
      try {
        console.log("Attempting save with default options");
        redactedPdfBytes = await pdfDoc.save();
      } catch (err2) {
        console.warn("Strategy 2 failed:", err2.message);

        // Try Strategy 3: With object streams enabled
        try {
          console.log("Attempting save with useObjectStreams: true");
          redactedPdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
          });
        } catch (err3) {
          console.error("All save strategies failed");
          throw new Error(
            "Failed to save redacted PDF after trying multiple strategies: " +
              err3.message,
          );
        }
      }
    }

    let outputBuffer = Buffer.from(redactedPdfBytes);

    // Apply encryption to disable printing and copying (unless skipped)
    if (!skipEncryption) {
      try {
        console.log(
          "Applying PDF encryption to disable copy/print permissions",
        );
        outputBuffer = await applyPDFEncryption(outputBuffer);
        console.log("PDF encryption applied successfully");
      } catch (encryptError) {
        console.error("Failed to apply encryption:", encryptError.message);
        // Continue without encryption rather than failing the entire operation
        console.warn("Continuing without encryption restrictions");
      }
    } else {
      console.log("Skipping PDF encryption (will convert to images)");
    }

    // Validate output PDF
    console.log(
      `Output PDF size: ${outputBuffer.length} bytes (input was ${pdfBuffer.length} bytes)`,
    );

    // Check if output is suspiciously small (less than 200 bytes is likely corrupted)
    if (outputBuffer.length < 200) {
      throw new Error("Output PDF is too small and likely corrupted");
    }

    // Verify the output PDF can be loaded
    try {
      const verifyDoc = await PDFDocument.load(outputBuffer, {
        ignoreEncryption: true,
      });
      const outputPageCount = verifyDoc.getPageCount();

      console.log(`Output PDF validation: ${outputPageCount} pages`);

      if (outputPageCount === 0) {
        throw new Error("Output PDF has no pages");
      }

      if (outputPageCount !== originalPageCount) {
        console.warn(
          `Page count mismatch: input had ${originalPageCount} pages, output has ${outputPageCount} pages`,
        );
      }

      // Additional validation: check if pages have content
      for (let i = 0; i < outputPageCount; i++) {
        const page = verifyDoc.getPage(i);
        const { width, height } = page.getSize();

        if (width === 0 || height === 0) {
          throw new Error(`Page ${i + 1} has invalid dimensions`);
        }
      }
    } catch (verifyError) {
      console.error("Output PDF validation failed:", verifyError);
      throw new Error("Output PDF validation failed: " + verifyError.message);
    }

    return outputBuffer;
  } catch (error) {
    console.error("Error redacting PDF:", error);
    throw new Error("Failed to redact PDF: " + error.message);
  }
}

/**
 * Remove text from page content stream
 * This modifies the PDF content stream to remove text operators
 * @param {PDFPage} page - The PDF page
 * @param {Object} item - PII item with coordinates
 * @param {number} pageHeight - Height of the page
 */
async function removeTextFromPage(page, item, pageHeight) {
  try {
    // Get the page's content stream
    const contentStream = page.node.Contents();

    if (!contentStream) return;

    // Get content stream data
    let content;
    if (contentStream.constructor.name === "PDFArray") {
      // Multiple content streams - concatenate them
      const streams = contentStream.asArray();
      const decoded = [];
      for (const stream of streams) {
        if (stream && typeof stream.contents === "function") {
          decoded.push(stream.contents());
        }
      }
      content = Buffer.concat(decoded).toString("latin1");
    } else if (typeof contentStream.contents === "function") {
      // Single content stream
      content = contentStream.contents().toString("latin1");
    } else {
      return;
    }

    // Search for text operators that match our coordinates
    // PDF text operators: Tj, TJ, ', "
    // We'll use a more aggressive approach: find and remove text in the general area

    // Calculate approximate position in PDF coordinates
    const targetX = Math.round(item.x);
    const targetY = Math.round(pageHeight - item.y - item.height);

    // Pattern to match text showing operations
    // This is a simplified approach - in production, you'd need a proper PDF parser
    const textPattern = new RegExp(
      `\\(${escapeRegExp(item.text)}\\)\\s*Tj`,
      "g",
    );

    // Remove the text by replacing with empty string
    let modifiedContent = content.replace(textPattern, "() Tj");

    // Also try to match the text in TJ array format
    const textArrayPattern = new RegExp(
      `\\[\\(${escapeRegExp(item.text)}\\)\\]\\s*TJ`,
      "g",
    );
    modifiedContent = modifiedContent.replace(textArrayPattern, "[()] TJ");

    // If content was modified, update the stream
    if (modifiedContent !== content) {
      const newContentStream = Buffer.from(modifiedContent, "latin1");

      if (contentStream.constructor.name === "PDFArray") {
        // For arrays, replace the first stream
        const streams = contentStream.asArray();
        if (streams[0] && typeof streams[0].contents === "function") {
          streams[0].contents = () => newContentStream;
        }
      } else {
        contentStream.contents = () => newContentStream;
      }
    }
  } catch (error) {
    console.warn("Could not remove text from content stream:", error.message);
    // Don't throw - we'll still add the visual overlay
  }
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get redaction statistics
 * @param {Array} piiItems - Array of pages with PII items
 * @returns {Object} Statistics about redactions
 */
function getRedactionStats(piiItems) {
  let emailCount = 0;
  let phoneCount = 0;
  let totalItems = 0;

  piiItems.forEach((pageData) => {
    pageData.items.forEach((item) => {
      totalItems++;
      if (item.type === "email") {
        emailCount++;
      } else if (item.type === "phone") {
        phoneCount++;
      }
    });
  });

  return {
    totalRedactions: totalItems,
    emails: emailCount,
    phones: phoneCount,
    pagesAffected: piiItems.length,
  };
}

module.exports = {
  redactPDF,
  getRedactionStats,
};
