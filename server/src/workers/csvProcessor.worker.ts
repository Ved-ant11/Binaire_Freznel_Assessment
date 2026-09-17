import { parentPort, workerData } from 'node:worker_threads';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { parse } from 'csv-parse';

const { filePath, taskId } = workerData as { filePath: string; taskId: string };

async function run() {
  if (!parentPort) throw new Error('Must be run as a worker thread');

  const { size: totalBytes } = await stat(filePath);
  let sum = 0, rowCount = 0, colCount = 0;
  let bytesRead = 0, lastProgress = 0;

  const stream = createReadStream(filePath);
  const parser = parse({ relax_column_count: true, skip_empty_lines: true, trim: true });

  return new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk: string | Buffer) => {
      bytesRead += Buffer.byteLength(chunk);
    });

    parser.on('data', (row: string[]) => {
      rowCount++;
      if (row.length > colCount) colCount = row.length;

      // all-reduce: sum every numeric cell
      for (const cell of row) {
        const n = parseFloat(cell);
        if (!isNaN(n) && isFinite(n)) sum += n;
      }

      const pct = Math.round((bytesRead / totalBytes) * 100);
      if (pct - lastProgress >= 2) {
        lastProgress = pct;
        parentPort!.postMessage({ type: 'progress', progress: Math.min(pct, 99) });
      }
    });

    parser.on('end', () => {
      parentPort!.postMessage({ type: 'result', result: sum, rows: rowCount, cols: colCount });
      resolve();
    });

    parser.on('error', (e: Error) => {
      parentPort!.postMessage({ type: 'error', error: e.message });
      reject(e);
    });

    stream.on('error', (e: Error) => {
      parentPort!.postMessage({ type: 'error', error: e.message });
      reject(e);
    });

    stream.pipe(parser);
  });
}

run().catch(e => {
  parentPort?.postMessage({ type: 'error', error: e.message });
  process.exit(1);
});
