# Test Suite for PDF Privacy Redaction Server

This directory contains comprehensive tests for the PDF redaction application.

## Test Files

### 1. `patterns.test.js` - Pattern Matching Tests
Tests the regex patterns used to detect PII:
- Email detection (various formats)
- Phone number detection (Canadian, international, various formats)
- PII detection logic
- Edge cases for pattern matching

**Run:** `npm run test:patterns`

### 2. `api.test.js` - API Integration Tests
Tests the Express server endpoints:
- Health check endpoint
- POST /redact endpoint (with various scenarios)
- POST /analyze endpoint
- Error handling
- File upload validation
- Response headers and statistics

**Run:** `npm run test:api`

### 3. `pdfProcessing.test.js` - PDF Processing Tests
Tests the core PDF extraction and redaction logic:
- Text extraction from PDFs
- PII coordinate detection
- PDF redaction functionality
- Multi-page PDF handling
- Statistics generation
- Encrypted PDF handling

**Run:** `npm run test:pdf`

### 4. `security.test.js` - Security Tests
Tests security and privacy features:
- File upload security (rejecting non-PDFs, oversized files)
- CORS and security headers
- Data privacy (in-memory processing)
- Input validation
- Error information disclosure
- Concurrent request handling

**Run:** `npm run test:security`

### 5. `edgeCases.test.js` - Edge Cases and Real-World Scenarios
Tests unusual but realistic scenarios:
- Complex phone number formats
- Various email formats
- Mixed content PDFs
- Special characters and formatting
- Empty and minimal PDFs
- Real-world CV scenarios
- Performance testing

**Run:** `npm run test:edge`

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test Suite
```bash
npm run test:patterns    # Pattern matching tests
npm run test:api         # API integration tests
npm run test:pdf         # PDF processing tests
npm run test:security    # Security tests
npm run test:edge        # Edge cases tests
```

### Run with Coverage
```bash
npm test
```
Coverage report will be generated in the `coverage/` directory.

## Test Coverage Goals

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

## Prerequisites

Before running tests, ensure:
1. All dependencies are installed: `npm install`
2. The test PDF file exists (created automatically by tests if needed)
3. Port 3000 is available (or configure a different port)

## Common Test Scenarios

### Testing with Real PDFs
Place test PDFs in the project root and reference them in tests:
```javascript
const testPdfPath = path.join(__dirname, '../my-test-cv.pdf');
```

### Testing Encrypted PDFs
The application handles encrypted PDFs with the `ignoreEncryption` option.
Create encrypted PDFs for testing using PDF libraries or tools.

### Testing Performance
Performance tests verify that small PDFs are processed in under 1 second.
Adjust timeout values in `jest.config.js` if needed.

## Troubleshooting

### Tests Failing Due to Port Conflicts
If port 3000 is in use:
1. Stop any running server instances
2. Or configure a different port in `.env`

### PDF Generation Fails
Ensure `pdf-lib` is properly installed:
```bash
npm install pdf-lib
```

### Memory Issues with Large Tests
Increase Node.js memory if needed:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm test
```

## Adding New Tests

When adding new tests:
1. Follow the existing test structure
2. Use descriptive test names
3. Test both success and failure cases
4. Include edge cases
5. Add comments for complex test logic
6. Update this README with new test descriptions

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
```yaml
# Example CI configuration
- name: Install dependencies
  run: npm ci
- name: Run tests
  run: npm test
- name: Upload coverage
  run: codecov
```
