import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const OUT = "public/images";
const ICONS = "public/icons";

const palettes = [
  ["#f8e8cf", "#c4512c", "#f2a93b", "#5c7a4a", "#f7d98b"],
  ["#f7e5d1", "#8a3f24", "#d98c3f", "#6c8a4e", "#f4c574"],
  ["#eef0d8", "#557a46", "#e9a13b", "#8e4b2f", "#d7df9a"],
  ["#f9e2cd", "#b3402c", "#ee9d35", "#577a54", "#f8c96e"],
  ["#f6e6ce", "#a8472c", "#e5a33a", "#5c7b4c", "#f0c979"],
  ["#f8e8d4", "#9a4727", "#e4a23d", "#69824d", "#f5cb76"],
  ["#f2ecd8", "#83713c", "#d99b3f", "#4e6e44", "#efcf86"],
  ["#fae5db", "#9e274f", "#e76f51", "#6d8a52", "#f5bfae"],
  ["#f7ebd5", "#c98a2e", "#e8b44e", "#5f7c48", "#f1d189"],
  ["#e8eef1", "#477d91", "#a8d4e0", "#6a8c56", "#d8eef4"],
  ["#f9e9d1", "#d58a35", "#efba5a", "#7e8c4a", "#f6d79a"],
  ["#f2e4dc", "#6b3b2d", "#bd7748", "#8b6a4c", "#e1c3ad"],
];

const productFiles = [
  "bowl-yassa.webp",
  "bowl-mafe.webp",
  "bowl-jardin.webp",
  "bowl-poisson.webp",
  "assiette-thieb.webp",
  "assiette-poulet.webp",
  "assiette-plantain.webp",
  "boisson-bissap.webp",
  "boisson-gingembre.webp",
  "boisson-eau.webp",
  "dessert-degue.webp",
  "dessert-fondant.webp",
];

function bowlSvg(palette, index, type) {
  const [bg, deep, warm, green, light] = palette;
  const seed = index * 37.3;
  const dots = Array.from({ length: 26 }, (_, i) => {
    const angle = (i * 137.5 + seed) % 360;
    const radius = 48 + ((i * 19 + seed) % 118);
    const x = 480 + Math.cos((angle * Math.PI) / 180) * radius;
    const y = 380 + Math.sin((angle * Math.PI) / 180) * radius * 0.62;
    const r = 10 + ((i * 7) % 18);
    const colors = [warm, green, deep, light, "#f0b668", "#7b9b5e"];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${colors[i % colors.length]}" opacity=".92"/>`;
  }).join("");

  if (type === "drink") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
      <defs>
        <radialGradient id="bg" cx="50%" cy="35%" r="80%">
          <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${bg}"/>
        </radialGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".7"/>
          <stop offset=".55" stop-color="${warm}" stop-opacity=".88"/>
          <stop offset="1" stop-color="${deep}" stop-opacity=".95"/>
        </linearGradient>
      </defs>
      <rect width="960" height="720" fill="url(#bg)"/>
      <circle cx="160" cy="130" r="95" fill="${light}" opacity=".55"/>
      <circle cx="825" cy="610" r="160" fill="${warm}" opacity=".12"/>
      <ellipse cx="490" cy="618" rx="180" ry="34" fill="${deep}" opacity=".15"/>
      <path d="M350 165 h260 l-34 420 q-4 40 -44 40 h-104 q-40 0 -44 -40 z" fill="url(#glass)" stroke="#fff" stroke-opacity=".65" stroke-width="6"/>
      <rect x="361" y="292" width="238" height="290" rx="22" fill="${deep}" opacity=".42"/>
      <ellipse cx="480" cy="168" rx="130" ry="30" fill="${light}" opacity=".9"/>
      <path d="M582 250 q72 -52 37 -110" fill="none" stroke="${green}" stroke-width="12" stroke-linecap="round"/>
      <path d="M620 142 q47 11 46 56 q-46 4 -62 -35 z" fill="${green}"/>
      <circle cx="426" cy="345" r="18" fill="#fff" opacity=".5"/>
      <circle cx="546" cy="468" r="28" fill="${light}" opacity=".35"/>
      <circle cx="478" cy="525" r="13" fill="#fff" opacity=".4"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const x = 400 + ((i * 47) % 165);
        const y = 220 + ((i * 61) % 190);
        return `<circle cx="${x}" cy="${y}" r="${5 + (i % 5) * 2}" fill="${i % 2 ? light : warm}" opacity=".8"/>`;
      }).join("")}
    </svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
    <defs>
      <radialGradient id="bg" cx="46%" cy="36%" r="82%">
        <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${bg}"/>
      </radialGradient>
      <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff7e8"/><stop offset="1" stop-color="${light}"/>
      </linearGradient>
      <radialGradient id="inside" cx="48%" cy="38%" r="70%">
        <stop offset="0" stop-color="#fdf5e4" stop-opacity=".8"/>
        <stop offset="1" stop-color="${light}" stop-opacity=".25"/>
      </radialGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="${deep}" flood-opacity=".28"/></filter>
    </defs>
    <rect width="960" height="720" fill="url(#bg)"/>
    <path d="M0 550 Q220 470 440 540 T960 510 V720 H0 Z" fill="${green}" opacity=".08"/>
    <circle cx="120" cy="105" r="90" fill="${warm}" opacity=".18"/>
    <circle cx="845" cy="145" r="56" fill="${deep}" opacity=".09"/>
    <g filter="url(#shadow)">
      <ellipse cx="480" cy="390" rx="292" ry="218" fill="url(#rim)" stroke="#fff" stroke-width="7"/>
      <ellipse cx="480" cy="374" rx="245" ry="169" fill="url(#inside)" stroke="${light}" stroke-width="10"/>
      <path d="M250 380 A230 155 0 0 0 710 380" fill="${deep}" opacity=".08"/>
    </g>
    ${dots}
    <g opacity=".7">
      <path d="M345 300 q30 -25 61 0" fill="none" stroke="${green}" stroke-width="9" stroke-linecap="round"/>
      <path d="M530 250 q23 -30 50 -8" fill="none" stroke="${green}" stroke-width="8" stroke-linecap="round"/>
      <path d="M590 385 q32 -22 56 3" fill="none" stroke="${warm}" stroke-width="8" stroke-linecap="round"/>
    </g>
    <ellipse cx="480" cy="625" rx="250" ry="26" fill="${deep}" opacity=".1"/>
  </svg>`;
}

await mkdir(OUT, { recursive: true });
await mkdir(ICONS, { recursive: true });

for (let i = 0; i < productFiles.length; i += 1) {
  const type = i === 7 || i === 8 || i === 9 ? "drink" : "plate";
  const svg = bowlSvg(palettes[i], i, type);
  await sharp(Buffer.from(svg)).webp({ quality: 86 }).toFile(`${OUT}/${productFiles[i]}`);
}

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#C4512C"/>
  <path d="M112 238h288c0 104-58 174-144 174S112 342 112 238Z" fill="#F8E8CF"/>
  <path d="M92 238h328" stroke="#F8E8CF" stroke-width="26" stroke-linecap="round"/>
  <path d="M176 182c0-34 20-51 50-62M256 173c0-34 20-51 50-62M336 182c0-34 20-51 50-62" stroke="#F2A93B" stroke-width="20" stroke-linecap="round" fill="none"/>
  <circle cx="210" cy="286" r="18" fill="#234D3C"/>
  <circle cx="276" cy="310" r="14" fill="#F2A93B"/>
  <circle cx="330" cy="272" r="16" fill="#234D3C"/>
</svg>`;

await sharp(Buffer.from(logoSvg)).resize(512, 512).png().toFile("public/logo.png");
await sharp(Buffer.from(logoSvg)).resize(192, 192).png().toFile(`${ICONS}/icon-192.png`);
await sharp(Buffer.from(logoSvg)).resize(512, 512).png().toFile(`${ICONS}/icon-512.png`);
await sharp(Buffer.from(logoSvg)).resize(180, 180).png().toFile(`${ICONS}/apple-touch-icon.png`);
await sharp(Buffer.from(logoSvg)).resize(32, 32).png().toFile("public/favicon.png");
await sharp(Buffer.from(logoSvg)).resize(1200, 630, { fit: "contain", background: "#F8E8CF" }).png().toFile("public/og.png");
await writeFile("public/logo.svg", logoSvg);

console.log(`Images générées : ${productFiles.length} plats + logo + icônes.`);
