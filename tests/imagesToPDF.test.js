/**
 * Unit Tests for images-to-PDF conversion
 */

const { PDFDocument } = require("pdf-lib");
const { imagesToPDF } = require("../src/services/imagesToPDF");

// 1x1 transparent PNG
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("imagesToPDF", () => {
  test("creates one page per image with matching dimensions", async () => {
    const images = [
      { data: PNG_BASE64, width: 612, height: 792 },
      { data: PNG_BASE64, width: 300, height: 400 },
    ];
    const pdf = await PDFDocument.load(await imagesToPDF(images));
    const pages = pdf.getPages();
    expect(pages).toHaveLength(2);
    expect(pages[0].getSize()).toEqual({ width: 612, height: 792 });
    expect(pages[1].getSize()).toEqual({ width: 300, height: 400 });
  });

  test.each([[undefined], [[]]])("throws when given %p", async (images) => {
    await expect(imagesToPDF(images)).rejects.toThrow("No images provided");
  });

});
