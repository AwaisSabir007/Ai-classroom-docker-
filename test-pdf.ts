import * as pdf from 'pdf-parse';
import fs from 'fs';

async function testPdf() {
  console.log('pdf-parse properties:', Object.keys(pdf));
}

testPdf().catch(console.error);
