// Pure orchestration; I/O is passed in so it runs under `node --test` without Next.

export type QueueRow = { id: string; video_url: string; caption: string | null };

export type PublishDeps = {
  claimNext(): Promise<QueueRow | null>;
  markPublished(id: string, mediaId: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  createContainer(row: QueueRow): Promise<string>;
  getStatus(containerId: string): Promise<string>;
  publish(containerId: string): Promise<string>;
  sleep(ms: number): Promise<void>;
};

// 8 x 30s = 4 min of polling, inside the route's 300s maxDuration.
export async function publishNext(d: PublishDeps, pollMs = 30_000, maxPolls = 8) {
  const row = await d.claimNext();
  if (!row) return { status: "idle" as const };

  try {
    const containerId = await d.createContainer(row);
    for (let i = 0; i < maxPolls; i++) {
      await d.sleep(pollMs);
      const status = await d.getStatus(containerId);
      if (status === "FINISHED") {
        const mediaId = await d.publish(containerId);
        await d.markPublished(row.id, mediaId);
        return { status: "published" as const, id: row.id, mediaId };
      }
      if (status !== "IN_PROGRESS") throw new Error(`container ${status}`);
    }
    throw new Error("container still IN_PROGRESS after polling");
  } catch (e) {
    await d.markFailed(row.id, e instanceof Error ? e.message : String(e));
    throw e;
  }
}
