import fs from 'fs';

async function reproducePdfParser() {
  const filePath = 'uploads/pdfs/1776417616337-815834.pdf';
  const pdfModule: any = await import("pdf-parse");
  const PDFParse = pdfModule.PDFParse;
  const dataBuffer = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(dataBuffer);
  
  const parser = new PDFParse(uint8);
  const pdfData = await parser.load();
  
  let fullText = "";
  // Just test first few pages to verify fix
  for (let i = 1; i <= Math.min(3, pdfData.numPages); i++) {
      const page = await pdfData.getPage(i);
      // Passing {} to avoid "Cannot set properties of undefined (setting 'lineThreshold')"
      const textContent = await parser.getPageText(page, {});
      fullText += textContent + "\n";
  }
  console.log('SUCCESS. Extracted text length:', fullText.length);
}

reproducePdfParser().catch(console.error);
