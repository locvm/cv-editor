const { PDFDocument } = require("pdf-lib");

/**
 * Check if a PDF is encrypted/password-protected
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<{isEncrypted: boolean, error: string|null}>}
 */
async function checkPDFEncryption(pdfBuffer) {
  try {
    if (pdfBuffer.length < 5) {
      return { isEncrypted: false, error: "File too small to be a valid PDF" };
    }

    const header = pdfBuffer.subarray(0, 5).toString("ascii");
    if (!header.startsWith("%PDF")) {
      return {
        isEncrypted: false,
        error: "Not a valid PDF file (missing PDF header)",
      };
    }

    try {
      await PDFDocument.load(pdfBuffer, {
        updateMetadata: false,
        ignoreEncryption: false,
      });
      return { isEncrypted: false, error: null };
    } catch (loadError) {
      if (
        loadError.message.includes("encrypted") ||
        loadError.message.includes("password") ||
        loadError.message.includes("Encrypt")
      ) {
        return {
          isEncrypted: true,
          error:
            "This PDF is encrypted or password-protected. Please remove the password protection using your PDF viewer (File > Properties > Security) or use a PDF unlocking tool, then try again.",
        };
      }
      return {
        isEncrypted: false,
        error: "Invalid or corrupted PDF file: " + loadError.message,
      };
    }
  } catch (error) {
    return {
      isEncrypted: false,
      error: "Error checking PDF: " + error.message,
    };
  }
}

module.exports = {
  checkPDFEncryption,
};
