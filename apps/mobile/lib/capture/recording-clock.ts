/**
 * Maps the device's monotonic clock to the recording's timeline.
 *
 * The recorder's `recordedDuration` only advances as samples are written, so
 * it moves in steps and can briefly read lower than a previous value. Using it
 * directly made the on-screen stopwatch stutter (and tick backwards).
 *
 * Instead, time advances with the monotonic clock (`performance.now()`), and
 * `recordedDuration` is only used to learn the offset between the two:
 *   videoTime ≈ wallElapsed + offset
 * `recordedDuration` can only lag the true position (write latency, step
 * updates), never lead it, so the best offset estimate is the *largest*
 * `recordedDuration - wallElapsed` seen so far. The result never goes
 * backwards and stays smooth between recorder updates.
 */
export class RecordingClock {
  private wallStartMs: number | null = null;
  private offset = -Infinity;

  /** Call when the recording starts (`nowMs` = performance.now()). */
  start(nowMs: number): void {
    this.wallStartMs = nowMs;
    this.offset = -Infinity;
  }

  stop(): void {
    this.wallStartMs = null;
    this.offset = -Infinity;
  }

  get isRunning(): boolean {
    return this.wallStartMs !== null;
  }

  /** Feed a `recordedDuration` reading (seconds) taken at `nowMs`. */
  sample(recordedDuration: number, nowMs: number): void {
    if (this.wallStartMs === null || !Number.isFinite(recordedDuration)) return;
    const wall = (nowMs - this.wallStartMs) / 1000;
    const offset = recordedDuration - wall;
    if (offset > this.offset) this.offset = offset;
  }

  /** Position in the recording (seconds) at `nowMs`, or null when not running / no sample yet. */
  videoTimeAt(nowMs: number): number | null {
    if (this.wallStartMs === null || !Number.isFinite(this.offset)) return null;
    const wall = (nowMs - this.wallStartMs) / 1000;
    return Math.max(0, wall + this.offset);
  }
}
