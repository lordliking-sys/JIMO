import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
async function main() {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const lines of [
    [
      'JIMO synthetic plan - Upper',
      'Push / Monday',
      'Panca piana: 4 x 8 @ 80kg, RPE 8, rest 3 min',
      'Dip: 3x8-12 +10kg, rest 120 sec',
    ],
    [
      'Pull / Thursday',
      'Pull ups: 5x5 +20kg',
      'Plank: 3x60 seconds, BW',
      'Lat machine: 3x10 assist 20kg',
      'RIR 2; tempo 3-1-1; EMOM / rest-pause are notes',
    ],
  ]) {
    const page = pdf.addPage([595, 842]);
    lines.forEach((text, i) =>
      page.drawText(text, { x: 40, y: 780 - i * 45, size: 14, font }),
    );
  }
  await writeFile(resolve(__dirname, 'multi-day.pdf'), await pdf.save());
}
void main();
