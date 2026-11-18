import { RecordingClock } from "../lib/capture/recording-clock";

describe("RecordingClock", () => {
  it("is null before start and before the first sample", () => {
    const clock = new RecordingClock();
    expect(clock.videoTimeAt(0)).toBeNull();
    clock.start(1000);
    expect(clock.videoTimeAt(1500)).toBeNull();
  });

  it("advances smoothly with the wall clock between recorder updates", () => {
    const clock = new RecordingClock();
    clock.start(0);
    clock.sample(0.9, 1000); // recorder lags 0.1s behind the wall clock
    expect(clock.videoTimeAt(1000)).toBeCloseTo(0.9);
    expect(clock.videoTimeAt(1250)).toBeCloseTo(1.15);
    expect(clock.videoTimeAt(1500)).toBeCloseTo(1.4);
  });

  it("never goes backwards when the recorder reports a lower value (stutter)", () => {
    const clock = new RecordingClock();
    clock.start(0);
    clock.sample(2.0, 2000);
    const before = clock.videoTimeAt(2000)!;
    clock.sample(1.0, 2100); // stale / stepped reading
    const after = clock.videoTimeAt(2100)!;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeCloseTo(2.1);
  });

  it("uses the least-lagging reading as the offset", () => {
    const clock = new RecordingClock();
    clock.start(0);
    clock.sample(0.0, 300); // nothing written yet
    clock.sample(0.95, 1000); // normal lag
    expect(clock.videoTimeAt(2000)).toBeCloseTo(1.95);
  });

  it("intervals between presses follow the wall clock exactly", () => {
    const clock = new RecordingClock();
    clock.start(0);
    clock.sample(5, 5100);
    const startPress = clock.videoTimeAt(5100)!;
    clock.sample(34.9, 35000); // a stepped reading in between doesn't matter
    const lapPress = clock.videoTimeAt(35100)!;
    expect(lapPress - startPress).toBeCloseTo(30);
  });

  it("stop resets", () => {
    const clock = new RecordingClock();
    clock.start(0);
    clock.sample(1, 1000);
    clock.stop();
    expect(clock.isRunning).toBe(false);
    expect(clock.videoTimeAt(2000)).toBeNull();
  });
});
