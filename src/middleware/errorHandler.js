/**
 * Convert technical errors to user-friendly messages
 * @param {Error} error - The error object
 * @returns {Object} User-friendly error response
 */
function getUserFriendlyError(error) {
  const errorMessage = error.message.toLowerCase();

  if (
    errorMessage.includes("encrypted") ||
    errorMessage.includes("password-protected")
  ) {
    return {
      error: "PDF is Password Protected",
      message:
        "This PDF is encrypted or password-protected and cannot be processed. Please remove the password protection using your PDF viewer (File > Properties > Security) or use a PDF unlocking tool, then try again.",
      technicalDetails: error.message,
    };
  }

  if (
    errorMessage.includes("invalid pdf") ||
    errorMessage.includes("corrupted")
  ) {
    return {
      error: "Invalid PDF File",
      message:
        "The uploaded file appears to be corrupted or is not a valid PDF. Please try a different file.",
      technicalDetails: error.message,
    };
  }

  if (errorMessage.includes("not a pdf")) {
    return {
      error: "Not a PDF File",
      message:
        "The uploaded file is not a valid PDF document. Please upload a PDF file.",
      technicalDetails: error.message,
    };
  }

  if (errorMessage.includes("failed to extract")) {
    return {
      error: "Cannot Read PDF",
      message:
        "Unable to extract text from this PDF. It may be image-based (scanned) or use an unsupported format.",
      technicalDetails: error.message,
    };
  }

  return {
    error: "Processing Error",
    message:
      "An error occurred while processing your PDF. Please try again or contact support if the issue persists.",
    technicalDetails: error.message,
  };
}

module.exports = {
  getUserFriendlyError,
};
