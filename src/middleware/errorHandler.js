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

/**
 * Handle Multer and CORS errors
 */
function multerErrorHandler(MAX_FILE_SIZE) {
  return (error, req, res, next) => {
    // Handle CORS errors
    if (error.message && error.message.includes("CORS")) {
      console.error("CORS error:", error.message);
      return res.status(403).json({
        error: "CORS Error",
        message: "Cross-Origin Request Blocked: The origin is not allowed",
      });
    }

    const multer = require("multer");
    // Handle Multer errors
    if (error instanceof multer.MulterError) {
      console.error("Multer error:", error.code, error.message);
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: "File too large",
          message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }
      return res.status(400).json({
        error: "File upload error",
        message: error.message,
      });
    }

    // Handle file type errors
    if (error.message === "Only PDF files are allowed") {
      console.error("File type error:", error.message);
      return res.status(400).json({
        error: "Invalid file type",
        message: "Only PDF files are allowed",
      });
    }

    next(error);
  };
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Endpoint not found",
  });
}

/**
 * Global error handler
 */
function globalErrorHandler(error, req, res, next) {
  console.error("Server error:", error);

  // In production, don't expose error details
  const isProduction = process.env.NODE_ENV === "production";

  res.status(500).json({
    error: "Internal server error",
    message: isProduction
      ? "An error occurred while processing your request"
      : error.message,
  });
}

module.exports = {
  getUserFriendlyError,
  multerErrorHandler,
  notFoundHandler,
  globalErrorHandler,
};
