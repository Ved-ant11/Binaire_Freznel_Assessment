import { parentPort, workerData } from 'node:worker_threads';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { parse } from 'csv-parse';

interface WorkerInput {
  filePath: string;
  taskId: string;
}

const { filePath, taskId } = workerData as WorkerInput;

async function processCSV(): Promise<void> {
  if (!parentPort) throw new Error('Must run as worker thread');

  const fileStats = await stat(filePath);
  const totalBytes = fileStats.size;

  let sum = 0;
  let rowCount = 0;
  let colCount = 0;
  let bytesProcessed = 0;
  let lastReportedProgress = 0;

  const readStream = createReadStream(filePath);
  const parser = parse({
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });

  return new Promise<void>((resolve, reject) => {
    readStream.on('data', (chunk: Buffer) => {
      bytesProcessed += chunk.length;
    });

    parser.on('data', (row: string[]) => {
      rowCount++;
      if (row.length > colCount) colCount = row.length;

      for (const cell of row) {
        const num = parseFloat(cell);
        if (!isNaN(num) && isFinite(num)) sum += num;
      }

      const progress = Math.round((bytesProcessed / totalBytes) * 100);
      if (progress - lastReportedProgress >= 2) {
        lastReportedProgress = progress;
        parentPort!.postMessage({
          type: 'progress',
          progress: Math.min(progress, 99),
        });
      }
    });

    parser.on('end', () => {
      parentPort!.postMessage({ type: 'result', result: sum, rows: rowCount, cols: colCount });
      resolve();
    });

    parser.on('error', (err: Error) => {
      parentPort!.postMessage({ type: 'error', error: `CSV parse error: ${err.message}` });
      reject(err);
    });

    readStream.on('error', (err: Error) => {
      parentPort!.postMessage({ type: 'error', error: `File read error: ${err.message}` });
      reject(err);
    });

    readStream.pipe(parser);
  });
}

processCSV().catch((err) => {
  parentPort?.postMessage({ type: 'error', error: `Worker fatal: ${err.message}` });
  process.exit(1);
});
