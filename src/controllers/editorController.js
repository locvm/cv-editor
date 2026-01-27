const { extractPIICoordinates } = require("../services/pdfExtractor");
const { redactPDF, getRedactionStats } = require("../services/pdfRedactor");
const { checkPDFEncryption } = require("../middleware/pdfValidator");
const { getUserFriendlyError } = require("../middleware/errorHandler");

/**
 * Get the editor UI page
 */
const getEditorUI = (req, res) => {
  res.sendFile(require("path").join(__dirname, "../../test-client.html"));
};

/**
 * Redact PII from a PDF
 */
const redactPDF_handler = async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded",
        message: 'Please upload a PDF file using the "pdf" field',
      });
    }

    console.log(
      `Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`,
    );

    // Validate PDF
    const encryptionCheck = await checkPDFEncryption(req.file.buffer);
    if (encryptionCheck.isEncrypted) {
      console.log(`PDF is encrypted: ${req.file.originalname}`);
      return res.status(400).json({
        error: "PDF is Password Protected",
        message: encryptionCheck.error,
        technicalDetails:
          "The PDF contains encryption markers that prevent processing",
      });
    }
    if (encryptionCheck.error) {
      console.log(`PDF validation failed: ${encryptionCheck.error}`);
      return res.status(400).json({
        error: "Invalid PDF File",
        message: encryptionCheck.error,
      });
    }

    // Extract PII
    const piiItems = await extractPIICoordinates(req.file.buffer);

    if (piiItems.length === 0) {
      console.log("No PII found in document");
      return res.status(200).json({
        message: "No personal information found in the document",
        redactions: {
          totalRedactions: 0,
          emails: 0,
          phones: 0,
          pagesAffected: 0,
        },
        processingTime: Date.now() - startTime,
      });
    }

    // Get statistics and redact
    const stats = getRedactionStats(piiItems);
    console.log(
      `Found PII: ${stats.totalRedactions} items (${stats.emails} emails, ${stats.phones} phones)`,
    );

    const redactedPdfBuffer = await redactPDF(req.file.buffer, piiItems);

    // Return redacted PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="redacted_${req.file.originalname}"`,
    );
    res.setHeader("Content-Length", redactedPdfBuffer.length);
    res.setHeader("X-Redaction-Stats", JSON.stringify(stats));
    res.setHeader("X-Processing-Time", Date.now() - startTime);

    console.log(`Redaction completed in ${Date.now() - startTime}ms`);
    console.log(`Sending redacted PDF: ${redactedPdfBuffer.length} bytes`);
    res.send(redactedPdfBuffer);
  } catch (error) {
    console.error("Error processing PDF:", error);
    const friendlyError = getUserFriendlyError(error);
    res.status(500).json(friendlyError);
  }
};

/**
 * Analyze PII in a PDF without redacting
 */
const analyzePDF_handler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded",
      });
    }

    // Validate PDF
    const encryptionCheck = await checkPDFEncryption(req.file.buffer);
    if (encryptionCheck.isEncrypted) {
      console.log(`PDF is encrypted: ${req.file.originalname}`);
      return res.status(400).json({
        error: "PDF is Password Protected",
        message: encryptionCheck.error,
        technicalDetails:
          "The PDF contains encryption markers that prevent processing",
      });
    }
    if (encryptionCheck.error) {
      return res.status(400).json({
        error: "Invalid PDF File",
        message: encryptionCheck.error,
      });
    }

    // Extract and analyze
    const piiItems = await extractPIICoordinates(req.file.buffer);
    const stats = getRedactionStats(piiItems);

    res.json({
      found: piiItems.length > 0,
      statistics: stats,
      details: piiItems.map((page) => ({
        page: page.pageNumber,
        items: page.items.map((item) => ({
          type: item.type,
          // SECURITY: Don't return actual PII text - only metadata
          textLength: item.text.length,
          coordinates: {
            x: Math.round(item.x),
            y: Math.round(item.y),
            width: Math.round(item.width),
            height: Math.round(item.height),
          },
        })),
      })),
    });
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    const friendlyError = getUserFriendlyError(error);
    res.status(500).json(friendlyError);
  }
};

module.exports = {
  getEditorUI,
  redactPDF_handler,
  analyzePDF_handler,
};
