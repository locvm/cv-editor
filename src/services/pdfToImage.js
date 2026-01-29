/**
 * PDF to Image Conversion Service
 * Converts PDF pages to PNG images using pdftoppm (from poppler)
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Convert PDF buffer to PNG images (one per page)
 * @param {Buffer} pdfBuffer - PDF buffer to convert
 * @param {Object} options - Conversion options
 * @param {number} options.scale - Scale factor for rendering (default: 2.0 for high quality)
 * @returns {Promise<Array>} Array of base64-encoded PNG images
 */
async function convertPDFToImages(pdfBuffer, options = {}) {
  const { scale = 2.0 } = options;
  const dpi = Math.floor(72 * scale); // Convert scale to DPI (72 is base PDF DPI)

  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp-pdf-${Date.now()}.pdf`);
  const outputPrefix = path.join(tempDir, `output-${Date.now()}`);

  try {
    console.log(`Converting PDF to PNG images at ${scale}x scale (${dpi} DPI)`);

    // Write PDF buffer to temp file
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // Use pdftoppm to convert PDF to PNG images
    // -png: output as PNG
    // -r: resolution (DPI)
    execSync(`pdftoppm -png -r ${dpi} "${tempPdfPath}" "${outputPrefix}"`, {
      stdio: 'pipe'
    });

    // Find all generated PNG files
    const files = await fs.readdir(tempDir);
    const outputFiles = files
      .filter(f => f.startsWith(path.basename(outputPrefix)) && f.endsWith('.png'))
      .sort(); // Sort to maintain page order

    const images = [];

    // Read each PNG file and convert to base64
    for (let i = 0; i < outputFiles.length; i++) {
      const filePath = path.join(tempDir, outputFiles[i]);
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');

      // Get image dimensions (basic approach)
      // PNG files store dimensions in IHDR chunk (bytes 16-23)
      const width = imageBuffer.readUInt32BE(16);
      const height = imageBuffer.readUInt32BE(20);

      images.push({
        pageNumber: i + 1,
        width: width,
        height: height,
        data: base64Image,
        mimeType: 'image/png',
        size: imageBuffer.length
      });

      console.log(`Page ${i + 1}/${outputFiles.length} converted - ${imageBuffer.length} bytes`);

      // Clean up individual PNG file
      await fs.unlink(filePath).catch(() => {});
    }

    // Clean up temp PDF file
    await fs.unlink(tempPdfPath).catch(() => {});

    return images;
  } catch (error) {
    // Clean up temp files on error
    await fs.unlink(tempPdfPath).catch(() => {});

    // Clean up any generated PNG files
    try {
      const files = await fs.readdir(tempDir);
      const outputFiles = files.filter(f =>
        f.startsWith(path.basename(outputPrefix)) && f.endsWith('.png')
      );
      for (const file of outputFiles) {
        await fs.unlink(path.join(tempDir, file)).catch(() => {});
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    console.error('Error converting PDF to images:', error);
    throw new Error('Failed to convert PDF to images: ' + error.message);
  }
}

/**
 * Get total size of all images
 * @param {Array} images - Array of image objects
 * @returns {number} Total size in bytes
 */
function getTotalImageSize(images) {
  return images.reduce((total, img) => total + img.size, 0);
}

module.exports = {
  convertPDFToImages,
  getTotalImageSize
};
