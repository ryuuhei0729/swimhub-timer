import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(__dirname, "icon-source.png");

// Resize targets (square, from PNG source)
const targets = [
  // Mobile app icon (iOS + Android)
  { path: "apps/mobile/assets/icon.png", size: 1024 },
  // Android adaptive icon foreground (with padding for safe zone)
  { path: "apps/mobile/assets/adaptive-icon.png", size: 1024, adaptive: true },
  // Mobile favicon (for Expo web)
  { path: "apps/mobile/assets/favicon.png", size: 48 },
  // Mobile splash icon
  { path: "apps/mobile/assets/splash-icon.png", size: 512 },
  // Web apple-touch-icon
  { path: "apps/web/public/apple-touch-icon.png", size: 180 },
  // Web PWA icons
  { path: "apps/web/public/icons/icon-192.png", size: 192 },
  { path: "apps/web/public/icons/icon-512.png", size: 512 },
  // Web icon.png (referenced in layout metadata)
  { path: "apps/web/public/icon.png", size: 512 },
];

for (const target of targets) {
  const outPath = join(root, target.path);
  mkdirSync(dirname(outPath), { recursive: true });

  if (target.adaptive) {
    // Android adaptive icon: place icon in center with padding (safe zone is ~66%)
    const iconSize = Math.round(target.size * 0.66);
    const resized = await sharp(source)
      .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: target.size,
        height: target.size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: "centre" }])
      .png()
      .toFile(outPath);
  } else {
    await sharp(source)
      .resize(target.size, target.size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outPath);
  }

  console.log(`Generated: ${target.path} (${target.size}x${target.size})`);
}

// Generate favicon.ico (32x32)
const favicon32 = await sharp(source)
  .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toBuffer();

const ico = await pngToIco(favicon32);
const faviconPath = join(root, "apps/web/src/app/favicon.ico");
mkdirSync(dirname(faviconPath), { recursive: true });
writeFileSync(faviconPath, ico);
console.log("Generated: apps/web/src/app/favicon.ico (32x32)");

// Generate OG image (1200x630) - icon centered on white background
const ogWidth = 1200;
const ogHeight = 630;
const ogIconSize = 400;

const ogIcon = await sharp(source)
  .resize(ogIconSize, ogIconSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .toBuffer();

const ogPath = join(root, "apps/web/public/og-image.png");
await sharp({
  create: {
    width: ogWidth,
    height: ogHeight,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 255 },
  },
})
  .composite([{ input: ogIcon, gravity: "centre" }])
  .png()
  .toFile(ogPath);

console.log(`Generated: apps/web/public/og-image.png (${ogWidth}x${ogHeight})`);

console.log("\nDone!");
