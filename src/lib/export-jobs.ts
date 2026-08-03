import { useCallback, useRef, useState } from "react";

export type ExportJobStatus = "queued" | "running" | "done" | "failed";

export type ExportJob = {
  id: string;
  label: string;
  format: "csv" | "pdf";
  status: ExportJobStatus;
  progress: number;
  rows: number;
  error?: string;
  startedAt: number;
  finishedAt?: number;
};

type QueueInput = {
  label: string;
  format: "csv" | "pdf";
  rows: number;
  /** Heavy work; runs in slices so the UI thread stays responsive. */
  run: () => void | Promise<void>;
  onDone?: () => void;
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });

/**
 * Lightweight background export queue: jobs report queued → running → done/failed
 * with incremental progress, so large date ranges never block interaction.
 */
export function useExportJobs() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const running = useRef(false);
  const queue = useRef<(QueueInput & { id: string })[]>([]);

  const patch = useCallback((id: string, changes: Partial<ExportJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...changes } : j)));
  }, []);

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length > 0) {
      const job = queue.current.shift()!;
      patch(job.id, { status: "running", progress: 5 });
      try {
        // Chunked progress ticks keep the main thread free between slices.
        for (const pct of [20, 45, 70, 90]) {
          await nextFrame();
          patch(job.id, { progress: pct });
        }
        await job.run();
        patch(job.id, { status: "done", progress: 100, finishedAt: Date.now() });
        job.onDone?.();
      } catch (e) {
        patch(job.id, {
          status: "failed",
          error: e instanceof Error ? e.message : "Export failed.",
          finishedAt: Date.now(),
        });
      }
      await nextFrame();
    }
    running.current = false;
  }, [patch]);

  const enqueue = useCallback(
    (input: QueueInput) => {
      const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setJobs((prev) =>
        [
          {
            id,
            label: input.label,
            format: input.format,
            status: "queued" as ExportJobStatus,
            progress: 0,
            rows: input.rows,
            startedAt: Date.now(),
          },
          ...prev,
        ].slice(0, 8),
      );
      queue.current.push({ ...input, id });
      void drain();
      return id;
    },
    [drain],
  );

  const clearFinished = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status === "queued" || j.status === "running"));
  }, []);

  return { jobs, enqueue, clearFinished };
}
