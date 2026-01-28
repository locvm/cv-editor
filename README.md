# PDF Privacy Redaction Server (PDR)

A Node.js/Express microservice that automatically identifies and redacts phone numbers and email addresses from PDF documents.

## Features

- **True Redaction**: Removes text data from PDF content streams
- **Visual Overlay**: Places gray rectangles over redacted areas
- **Pattern Detection**: Identifies international phone numbers and email addresses
- **Zero-Retention**: Stateless in-memory processing with no disk storage
- **Security-First**: Built with helmet, CORS

## Quick Start

### Requirements

- Node.js v14 or higher
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment (optional):
   ```bash
   cp .env.example .env
   ```

### Start Server

```bash
npm start
```

The server runs on port 3000 by default.

## API Endpoints

### `GET /health`

Health check endpoint.

### `POST /redact`

Redact PII from PDF.

- **Input**: Form-data with `pdf` file field
- **Output**: Redacted PDF file
- **Headers**:
  - `X-Redaction-Stats`: JSON with statistics
  - `X-Processing-Time`: Processing time in ms

### `POST /analyze`

Analyze PDF for PII without redacting.

- **Input**: Form-data with `pdf` file field
- **Output**: JSON with detected items and coordinates

## Supported Patterns

- **Emails**: Standard format with subdomains, hyphens, underscores
- **Phone Numbers**: International, parentheses, separated, and compact formats

## Security

- **Deployment**: Use HTTPS/SSL certificate in production
- **Privacy**: All processing in-memory, no disk storage
- **Configuration**: Set `NODE_ENV=production` and appropriate `ALLOWED_ORIGINS`

## Future Goals

- Add file preview before upload
- Implement retry mechanism with exponential backoff
- Add detailed error messages for better UX
- Consider streaming PDF instead of base64 encoding
- Add monitoring/logging service integration
- Add progress indicators explaining what "scrubbing" does
- Optimize PDF encryption check (currently reads file twice)

## License

ISC
