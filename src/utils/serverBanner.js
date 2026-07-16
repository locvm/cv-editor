/**
 * Server Startup Banner
 * Displays server information on startup
 */

function displayBanner(PORT) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   PDF Privacy Redaction Server (PDR)                      ║
║   Version: 1.0.0                                           ║
╟────────────────────────────────────────────────────────────╢
║   Server running on: http://localhost:${PORT}              ║
║   Status: Ready to redact PII from PDF documents          ║
╟────────────────────────────────────────────────────────────╢
║   Routes:                                                  ║
║   - GET  /          (API Info)                            ║
║   - GET  /editor    (PDF Editor UI)                       ║
║   - GET  /test-client.html  (Upload UI in browser)        ║
║   - POST /api/editor/redact   (Redact PDF)                ║
║   - POST /api/editor/analyze  (Analyze PDF)               ║
╟────────────────────────────────────────────────────────────╢
║   Tip: open /test-client.html to upload a PDF             ║
║   /api/editor/redact is POST + file only (not browser GET)║
╚════════════════════════════════════════════════════════════╝
  `);
}

module.exports = displayBanner;
