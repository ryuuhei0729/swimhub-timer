export function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;

  const totalCentiseconds = Math.floor(seconds * 100);
  const cs = totalCentiseconds % 100;
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60);

  const pad2 = (n: number) => n.toString().padStart(2, "0");

  if (m >= 10) return `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
  if (m >= 1) return `${m}:${pad2(s)}.${pad2(cs)}`;
  return `${s}.${pad2(cs)}`;
}
