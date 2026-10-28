import { exportCanvasToPng, generatePdfReport } from '../js/export.js';
import fs from 'fs';

console.log('Testing Phase 7: Client-Side Export (PNG & PDF)...');

// 1. Verify export functions exist
if (typeof exportCanvasToPng !== 'function' || typeof generatePdfReport !== 'function') {
  throw new Error('Export functions not properly exported');
}
console.log('Export function signatures validated: exportCanvasToPng and generatePdfReport');

// 2. Verify local jsPDF vendor library
const jspdfPath = './js/vendor/jspdf.umd.min.js';
if (!fs.existsSync(jspdfPath)) {
  throw new Error('Local jsPDF library missing at ' + jspdfPath);
}
const fileSize = fs.statSync(jspdfPath).size;
console.log(`Local jsPDF vendor library verified: ${fileSize} bytes`);

// 3. Test jsPDF generation using node vm / require if possible
const jspdfContent = fs.readFileSync(jspdfPath, 'utf8');
const fakeWindow = {
  atob: (b) => Buffer.from(b, 'base64').toString('binary'),
  btoa: (b) => Buffer.from(b, 'binary').toString('base64'),
  navigator: { userAgent: 'Node' },
  document: { createElement: () => ({}) }
};
fakeWindow.window = fakeWindow;
fakeWindow.self = fakeWindow;
fakeWindow.global = fakeWindow;

const fn = new Function('window', 'self', 'global', jspdfContent);
fn(fakeWindow, fakeWindow, fakeWindow);

if (!fakeWindow.jspdf || !fakeWindow.jspdf.jsPDF) {
  throw new Error('Failed to instantiate jsPDF from local bundle');
}

const { jsPDF } = fakeWindow.jspdf;
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
doc.text('VastuGrid Test', 10, 10);
doc.addPage();
doc.text('Page 2 Test', 10, 10);

const pdfOutput = doc.output('arraybuffer');
console.log(`Successfully generated test PDF in memory: ${pdfOutput.byteLength} bytes, 2 pages`);

if (pdfOutput.byteLength < 1000) {
  throw new Error('Generated PDF suspiciously small');
}

console.log('All Phase 7 unit tests PASSED successfully!');
