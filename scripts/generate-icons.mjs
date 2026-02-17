import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0a0f1a"/>
  <rect x="232" y="68" width="48" height="26" rx="9" fill="#06b6d4"/>
  <circle cx="256" cy="284" r="155" stroke="#06b6d4" stroke-width="16" fill="none"/>
  <line x1="256" y1="284" x2="256" y2="156" stroke="#22d3ee" stroke-width="13" stroke-linecap="round"/>
  <path d="M108 284 Q158 244, 208 284 Q258 324, 308 284 Q358 244, 408 284" stroke="#06b6d4" stroke-width="11" fill="none" stroke-linecap="round"/>
  <circle cx="256" cy="284" r="10" fill="#22d3ee"/>
</svg>`;

// Adaptive icon foreground (no background, just the stopwatch centered)
const adaptiveForegroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="232" y="68" width="48" height="26" rx="9" fill="#06b6d4"/>
  <circle cx="256" cy="284" r="155" stroke="#06b6d4" stroke-width="16" fill="none"/>
  <line x1="256" y1="284" x2="256" y2="156" stroke="#22d3ee" stroke-width="13" stroke-linecap="round"/>
  <path d="M108 284 Q158 244, 208 284 Q258 324, 308 284 Q358 244, 408 284" stroke="#06b6d4" stroke-width="11" fill="none" stroke-linecap="round"/>
  <circle cx="256" cy="284" r="10" fill="#22d3ee"/>
</svg>`;

const targets = [
  // Mobile app icon (iOS + Android)
  { path: "apps/mobile/assets/icon.png", size: 1024, svg },
  // Android adaptive icon foreground
  { path: "apps/mobile/assets/adaptive-icon.png", size: 1024, svg: adaptiveForegroundSvg },
  // Mobile favicon (for Expo web)
  { path: "apps/mobile/assets/favicon.png", size: 48, svg },
  // Mobile splash icon
  { path: "apps/mobile/assets/splash-icon.png", size: 512, svg },
  // Web apple-touch-icon
  { path: "apps/web/public/apple-touch-icon.png", size: 180, svg },
];

for (const target of targets) {
  const outPath = join(root, target.path);
  mkdirSync(dirname(outPath), { recursive: true });

  await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png()
    .toFile(outPath);

  console.log(`Generated: ${target.path} (${target.size}x${target.size})`);
}

console.log("\nDone!");
