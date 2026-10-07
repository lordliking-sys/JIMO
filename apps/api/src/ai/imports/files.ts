import { Worker } from 'node:worker_threads';
import { importLimits, importMimeTypes } from '@jimo/schemas';
import { imageSize } from 'image-size';
import { ApiError } from '../../errors';
export type ImportFile = {
  mime: (typeof importMimeTypes)[number];
  bytes: Buffer;
  name: string;
  pages?: number;
};
const extensions: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
};
function pdfPages(bytes: Buffer): Promise<number> {
  // Parse data, never execute PDF scripts. Isolate parser memory/CPU from Fastify.
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `const {parentPort,workerData}=require('node:worker_threads'); const {PDFDocument}=require(workerData.module); PDFDocument.load(workerData.bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false}).then(doc=>parentPort.postMessage(doc.getPageCount())).catch(()=>parentPort.postMessage(null));`,
      {
        eval: true,
        stdout: true,
        stderr: true,
        workerData: { bytes, module: require.resolve('pdf-lib') },
        resourceLimits: {
          maxOldGenerationSizeMb: 96,
          maxYoungGenerationSizeMb: 16,
        },
      },
    );
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new ApiError(400, 'PDF_CORRUPT', 'Unsupported PDF'));
    }, 5000);
    const done = () => {
      clearTimeout(timer);
      void worker.terminate();
    };
    worker.once('message', (pages: unknown) => {
      done();
      if (typeof pages === 'number') resolve(pages);
      else reject(new ApiError(400, 'PDF_CORRUPT', 'Unsupported PDF'));
    });
    worker.once('error', () => {
      done();
      reject(new ApiError(400, 'PDF_CORRUPT', 'Unsupported PDF'));
    });
    worker.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timer);
        reject(new ApiError(400, 'PDF_CORRUPT', 'Unsupported PDF'));
      }
    });
  });
}
export async function validateImportFile(
  mime: string,
  name: string,
  bytes: Buffer,
): Promise<ImportFile> {
  if (
    !importMimeTypes.includes(mime as ImportFile['mime']) ||
    !extensions[mime]?.includes(name.split('.').at(-1)?.toLowerCase() ?? '')
  )
    throw new ApiError(415, 'IMPORT_FORMAT_UNSUPPORTED', 'Unsupported file');
  if (
    !bytes.length ||
    bytes.length >
      (mime === 'application/pdf'
        ? importLimits.pdfBytes
        : importLimits.imageBytes)
  )
    throw new ApiError(413, 'IMPORT_FILE_TOO_LARGE', 'File size limit');
  const valid =
    mime === 'application/pdf'
      ? bytes.subarray(0, 5).toString() === '%PDF-' &&
        bytes
          .subarray(Math.max(0, bytes.length - 1024))
          .includes(Buffer.from('%%EOF'))
      : mime === 'image/png'
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === 'image/jpeg'
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : bytes.subarray(0, 4).toString() === 'RIFF' &&
            bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid)
    throw new ApiError(
      400,
      mime === 'application/pdf' ? 'PDF_CORRUPT' : 'IMPORT_IMAGE_UNREADABLE',
      'Invalid file contents',
    );
  const file: ImportFile = {
    mime: mime as ImportFile['mime'],
    name:
      mime === 'application/pdf'
        ? 'workout-plan.pdf'
        : 'workout-plan.' + extensions[mime]![0],
    bytes,
  };
  if (mime === 'application/pdf') {
    file.pages = await pdfPages(bytes);
    if (file.pages < 1 || file.pages > importLimits.maxPdfPages)
      throw new ApiError(413, 'IMPORT_TOO_MANY_PAGES', 'PDF page limit');
  } else {
    try {
      const d = imageSize(bytes);
      if (
        !d.width ||
        !d.height ||
        d.width * d.height > 30_000_000 ||
        d.width > 10000 ||
        d.height > 10000
      )
        throw new Error();
    } catch {
      throw new ApiError(400, 'IMPORT_IMAGE_UNREADABLE', 'Invalid image');
    }
  }
  return file;
}
export function validateImportFiles(files: ImportFile[]) {
  if (!files.length || files.length > importLimits.maxImages)
    throw new ApiError(400, 'IMPORT_FILE_COUNT', 'File count limit');
  if (files.some((f) => f.mime === 'application/pdf') && files.length !== 1)
    throw new ApiError(400, 'IMPORT_FILE_COUNT', 'Select one PDF or images');
}
