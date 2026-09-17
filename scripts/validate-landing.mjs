import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { inflateSync } from "node:zlib";

const root = process.cwd();
const landingRoot = path.join(root, "docs");
const assetsRoot = path.join(landingRoot, "assets");
const html = await readFile(path.join(landingRoot, "index.html"), "utf8");
const script = await readFile(path.join(landingRoot, "app.js"), "utf8");
const styles = await readFile(path.join(landingRoot, "styles.css"), "utf8");
const canonicalLandingUrl = "https://contami.glaucosilvestri.it/";
const personalSiteUrl = "https://glaucosilvestri.it/";

const failures = [];
const fail = (message) => failures.push(message);

function decodeRgbaPng(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, signature.length).equals(signature)) throw new Error("invalid PNG signature");

  let width;
  let height;
  const compressed = [];
  for (let offset = signature.length; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("truncated PNG chunk");
    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      const [bitDepth, colorType, compression, filter, interlace] = buffer.subarray(dataStart + 8, dataStart + 13);
      if (bitDepth !== 8 || colorType !== 6 || compression !== 0 || filter !== 0 || interlace !== 0) {
        throw new Error("icon must be a non-interlaced 8-bit RGBA PNG");
      }
    } else if (type === "IDAT") {
      compressed.push(buffer.subarray(dataStart, dataEnd));
    }
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  if (!width || !height || compressed.length === 0) throw new Error("missing PNG image data");

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(compressed));
  if (inflated.length !== height * (stride + 1)) throw new Error("unexpected PNG scanline length");

  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    const previousRowOffset = rowOffset - stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset];
      inputOffset += 1;
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[previousRowOffset + x - bytesPerPixel] : 0;
      let predictor = 0;
      if (filterType === 1) predictor = left;
      else if (filterType === 2) predictor = above;
      else if (filterType === 3) predictor = Math.floor((left + above) / 2);
      else if (filterType === 4) {
        const estimate = left + above - upperLeft;
        const leftDistance = Math.abs(estimate - left);
        const aboveDistance = Math.abs(estimate - above);
        const upperLeftDistance = Math.abs(estimate - upperLeft);
        predictor = leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
          ? left
          : aboveDistance <= upperLeftDistance ? above : upperLeft;
      } else if (filterType !== 0) {
        throw new Error(`unsupported PNG filter ${filterType}`);
      }
      pixels[rowOffset + x] = (raw + predictor) & 0xff;
    }
  }

  const alphaAt = (x, y) => pixels[(y * width + x) * bytesPerPixel + 3];
  return { width, height, alphaAt };
}

for (const required of ["index.html", "styles.css", "app.js", ".nojekyll", "assets/contami-icon.png"]) {
  await access(path.join(landingRoot, required));
}

try {
  const canonicalIcon = await readFile(path.join(root, "assets", "icon.png"));
  const landingIcon = await readFile(path.join(assetsRoot, "contami-icon.png"));
  if (!landingIcon.equals(canonicalIcon)) fail("Landing icon must stay byte-identical to the canonical application icon");
  const { width, height, alphaAt } = decodeRgbaPng(canonicalIcon);
  if (width !== 1_254 || height !== 1_254) fail("Canonical icon must remain 1254 x 1254 pixels");
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  if (corners.some(([x, y]) => alphaAt(x, y) !== 0)) fail("Canonical icon corners must be fully transparent");
  if (alphaAt(Math.floor(width / 2), Math.floor(height / 2)) !== 255) fail("Canonical icon center must remain fully opaque");
} catch (error) {
  fail(`Unable to validate canonical icon transparency: ${error instanceof Error ? error.message : String(error)}`);
}

if (!html.includes("Content-Security-Policy")) fail("Landing page must declare a restrictive CSP");
if (!html.includes(`<link rel="canonical" href="${canonicalLandingUrl}" />`)) fail("Landing page must declare the custom domain as canonical URL");
if (!html.includes(`<meta property="og:url" content="${canonicalLandingUrl}" />`)) fail("Landing page must expose the custom domain through og:url");
if (!html.includes(`href="${personalSiteUrl}"`)) fail("Landing header must link to the main personal site");
if (/https?:\/\/[^/\s"']+\.github\.io(?:\/|[\s"'])/i.test(`${html}\n${styles}\n${script}`)) {
  fail("Landing page must not reference a default github.io address");
}
const applicationScriptTag = '<script defer src="./app.js"></script>';
if (!html.includes(applicationScriptTag)) fail("Landing page must load its local script as a deferred classic script");
if (/<(?:script|style)(?:\s[^>]*)?>\s*(?!<\/)/i.test(html.replace(applicationScriptTag, ""))) {
  fail("Landing page must not contain inline script or style blocks");
}
if (/\sstyle\s*=/i.test(html)) fail("Landing page must not use inline style attributes");
if (html.includes('class="window-bar"')) fail("Landing media must not add platform-specific window chrome");
if (/https?:\/\/(?:fonts\.|cdn\.|unpkg\.|jsdelivr\.)/i.test(`${html}\n${styles}\n${script}`)) {
  fail("Landing page must not depend on remote fonts or CDNs");
}
if (/\.gif\b/i.test(`${html}\n${styles}\n${script}`)) fail("Published landing code must use optimized video rather than GIF sources");
if (/(?:src|poster|href)=["']\/(?!\/)/i.test(html)) fail("Custom-domain landing assets and links must not use root-absolute paths");
for (const manualHref of [
  "https://github.com/gloutchov/Contami/blob/main/ISTRUZIONI.md",
  "https://github.com/gloutchov/Contami/blob/main/INSTRUCTIONS.md",
]) {
  if (!`${html}\n${script}`.includes(manualHref)) fail(`Landing page is missing localized manual link: ${manualHref}`);
}

const normalizedScript = script.replace(/\r\n?/g, "\n");
const translationSource = normalizedScript.match(/const translations = (\{[\s\S]*?\n\});\n\nconst LANGUAGE_STORAGE_KEY/);
if (!translationSource) {
  fail("Unable to parse landing translations");
} else {
  const translations = vm.runInNewContext(`(${translationSource[1]})`);
  const flatten = (value, prefix = "") => Object.entries(value).flatMap(([key, entry]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "object" && entry !== null ? flatten(entry, next) : [next];
  }).sort();
  const englishKeys = flatten(translations.en);
  const italianKeys = flatten(translations.it);
  if (JSON.stringify(englishKeys) !== JSON.stringify(italianKeys)) fail("Italian and English translation keys must match exactly");

  const usedKeys = [...html.matchAll(/data-i18n(?:-aria|-alt)?=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const key of new Set(usedKeys)) {
    if (!englishKeys.includes(key)) fail(`Missing translation key used by HTML: ${key}`);
  }
}

const literalAssetReferences = [...html.matchAll(/(?:src|poster|content)=["']\.\/assets\/([^"']+)["']/g)].map((match) => match[1]);
for (const asset of new Set(literalAssetReferences)) {
  try {
    await access(path.join(assetsRoot, asset));
  } catch {
    fail(`Missing referenced landing asset: ${asset}`);
  }
}

const mediaKeys = ["panoramica", "transazioni", "immobili", "automobili", "investimenti", "pensioneintegrativa", "ricorrenze", "spesecondivise", "impostazioni"];
for (const key of mediaKeys) {
  for (const file of [`${key}.mp4`, `${key}_english.mp4`, `${key}_whi.png`, `${key}_blk.png`, `${key}_whi_english.png`, `${key}_blk_english.png`]) {
    try {
      await access(path.join(assetsRoot, file));
    } catch {
      fail(`Missing localized media variant: ${file}`);
    }
  }
}

for (const entry of await readdir(assetsRoot, { withFileTypes: true })) {
  if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".mp4") continue;
  const metadata = await stat(path.join(assetsRoot, entry.name));
  if (metadata.size > 5 * 1024 * 1024) fail(`Optimized video exceeds 5 MiB: ${entry.name}`);
}

for (const selector of ["prefers-color-scheme: dark", "prefers-reduced-motion: reduce", "max-width: 760px", ":focus-visible"]) {
  if (!styles.includes(selector)) fail(`Landing CSS is missing required responsive/accessibility rule: ${selector}`);
}
if (!styles.includes(".reveal-ready .reveal")) fail("Landing content must remain visible when JavaScript is unavailable");
if (!styles.includes("--app-content-ratio: 1280 / 752")) fail("Landing media must crop the captured desktop chrome consistently");
for (const behavior of ["navigator.language", "localStorage", "aria-pressed", "themeQuery.addEventListener", "MANUAL_HREFS[currentLanguage]"]) {
  if (!script.includes(behavior)) fail(`Landing script is missing required language/theme behavior: ${behavior}`);
}

if (failures.length) throw new Error(`Landing validation failed:\n- ${failures.join("\n- ")}`);
console.log(`Landing validation passed (${mediaKeys.length} bilingual media sets).`);
