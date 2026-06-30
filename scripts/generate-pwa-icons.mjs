/**
 * Generates PWA icons and manifest screenshots from public/icon.svg.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const svg = readFileSync(join(publicDir, "icon.svg"));

mkdirSync(join(publicDir, "screenshots"), { recursive: true });

const sizes = [
  { name: "favicon-32.png", size: 32 },
  { name: "favicon.png", size: 48 },
  { name: "pwa-icon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "pwa-icon-512.png", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(publicDir, name));
  console.log(`wrote ${name}`);
}

// Maskable: icon at 80% safe zone (512 canvas, ~410 icon)
const maskableSize = Math.round(512 * 0.62);
const maskableBuffer = await sharp(svg)
  .resize(maskableSize, maskableSize)
  .png()
  .toBuffer();
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  },
})
  .composite([{ input: maskableBuffer, gravity: "center" }])
  .png()
  .toFile(join(publicDir, "pwa-icon-maskable-512.png"));
console.log("wrote pwa-icon-maskable-512.png");

// favicon.ico from 32px
await sharp(svg).resize(32, 32).toFile(join(publicDir, "favicon.ico"));
console.log("wrote favicon.ico");

// Manifest screenshots (simple branded placeholders)
async function screenshot(name, w, h, title) {
  const svgShot = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#141414"/>
          <stop offset="100%" stop-color="#0a0a0a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="42%" fill="#c9a84c" font-family="Georgia, serif" font-size="${Math.round(h * 0.08)}" font-weight="700" text-anchor="middle">Shpalljet</text>
      <text x="50%" y="52%" fill="#a8a29e" font-family="system-ui, sans-serif" font-size="${Math.round(h * 0.035)}" text-anchor="middle">${title}</text>
      <rect x="${w * 0.08}" y="${h * 0.58}" width="${w * 0.84}" height="${h * 0.28}" rx="16" fill="#1a1a1a" stroke="#c9a84c" stroke-width="2" opacity="0.9"/>
    </svg>`;
  await sharp(Buffer.from(svgShot)).png().toFile(join(publicDir, "screenshots", name));
  console.log(`wrote screenshots/${name}`);
}

await screenshot("browse-wide.png", 1280, 720, "Browse listings");
await screenshot("browse-narrow.png", 750, 1334, "Marketplace on mobile");
for (const [file, label] of [
  ["discover.png", "Discover"],
  ["browse.png", "Browse"],
  ["search.png", "Search"],
]) {
  await screenshot(file, 750, 1334, label);
}
console.log("done");
