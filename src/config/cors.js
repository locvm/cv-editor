/**
 * CORS Configuration
 * Allow all origins for development
 */

const corsOptions = {
  origin: "*", // Allow all origins
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

module.exports = corsOptions;
