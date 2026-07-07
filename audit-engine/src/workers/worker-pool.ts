import { Worker } from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, 'excel-worker.js'); // Use compiled JS file

interface WorkerTask {
  filePath: string;
  mes: string;
  baseline: string;
  filename: string;
  root: string;
}

interface WorkerResult {
  ok: boolean;
  totals?: { liberar: number; alerta: number; corrigir: number };
  carteiras?: number;
  mes?: string;
  error?: string;
}

type TaskCallback = (result: WorkerResult) => void;

interface QueuedTask {
  task: WorkerTask;
  callback: TaskCallback;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: QueuedTask[] = [];
  private maxWorkers: number;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers ?? os.cpus().length;
  }

  private createWorker(): Worker {
    const worker = new Worker(WORKER_PATH, {
      workerData: {},
    });

    worker.on('message', (result: WorkerResult) => {
      // Find the callback for this worker
      const queuedTask = this.queue.shift();
      if (queuedTask) {
        queuedTask.callback(result);
        // Reuse worker for next task
        this.processQueue();
      }
    });

    worker.on('error', (err) => {
      console.error('Worker error:', err);
      // Remove failed worker and create new one
      this.workers = this.workers.filter(w => w !== worker);
      worker.terminate();
      this.addWorker();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        this.workers = this.workers.filter(w => w !== worker);
        this.addWorker();
      }
    });

    return worker;
  }

  private addWorker(): void {
    if (this.workers.length < this.maxWorkers) {
      const worker = this.createWorker();
      this.workers.push(worker);
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(w => !this.isWorkerBusy(w));
    if (availableWorker && this.queue.length > 0) {
      const queuedTask = this.queue[0];
      availableWorker.postMessage(queuedTask.task);
    }
  }

  private isWorkerBusy(worker: Worker): boolean {
    // Simple heuristic: if queue has tasks, workers are busy
    // In production, you'd track this more precisely
    return this.queue.length > this.workers.length;
  }

  public runTask(task: WorkerTask, callback: TaskCallback): void {
    // Ensure we have workers
    while (this.workers.length < this.maxWorkers) {
      this.addWorker();
    }

    this.queue.push({ task, callback });
    this.processQueue();
  }

  public close(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.queue = [];
  }
}
