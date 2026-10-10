import { listPackage, extractFile } from "@electron/asar";
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { assertStrictProductionCspHtml } from "./validate-renderer-csp.mjs";

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const root = path.resolve(process.argv[2] ?? path.join("release", manifest.version));

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function normalizeArchivePath(file) {
  return file.replaceAll("\\", "/").replace(/^\/+/, "");
}

function containsSensitiveContent(file) {
  const normalized = normalizeArchivePath(file);
  const segments = normalized.toLowerCase().split("/");
  const name = segments.at(-1) ?? "";
  return segments.includes("sources")
    || segments.includes(".contami-backups")
    || /^\.env(?:\.|$)/i.test(name)
    || /\.(?:numbers|xlsx|pem|key|p12|pfx)$/i.test(name);
}

const packagedFiles = await collectFiles(root);
const sensitiveFiles = packagedFiles
  .map((file) => path.relative(root, file))
  .filter(containsSensitiveContent);
if (sensitiveFiles.length) {
  throw new Error(`Sensitive files found in packaged output: ${sensitiveFiles.join(", ")}`);
}

const asarFiles = packagedFiles.filter((file) => path.basename(file) === "app.asar");
if (!asarFiles.length) throw new Error(`No app.asar found under ${root}`);

const allowedRoots = new Set(["dist", "dist-electron", "node_modules", "package.json"]);
for (const asarPath of asarFiles) {
  const archiveEntries = listPackage(asarPath).map(normalizeArchivePath).filter(Boolean);
  const unexpectedRoots = [...new Set(archiveEntries
    .map((entry) => entry.split("/")[0])
    .filter((entry) => !allowedRoots.has(entry)))];
  if (unexpectedRoots.length) {
    throw new Error(`Unexpected app.asar roots in ${asarPath}: ${unexpectedRoots.join(", ")}`);
  }

  const sensitiveEntries = archiveEntries.filter(containsSensitiveContent);
  if (sensitiveEntries.length) {
    throw new Error(`Sensitive app.asar entries in ${asarPath}: ${sensitiveEntries.join(", ")}`);
  }

  for (const required of ["dist/index.html", "dist-electron/main.cjs", "dist-electron/preload.cjs", "package.json"]) {
    if (!archiveEntries.includes(required)) throw new Error(`Missing ${required} in ${asarPath}`);
  }

  const packagedManifest = JSON.parse(extractFile(asarPath, "package.json").toString("utf8"));
  if (packagedManifest.version !== manifest.version) {
    throw new Error(`Package version mismatch in ${asarPath}: ${packagedManifest.version} != ${manifest.version}`);
  }
  if ((await stat(asarPath)).size < 1_024) throw new Error(`Unexpectedly small app.asar: ${asarPath}`);
  assertStrictProductionCspHtml(extractFile(asarPath, "dist/index.html").toString("utf8"), `${asarPath}:dist/index.html`);

  const resources = path.dirname(asarPath);
  if (process.platform === "darwin") {
    const plistPath = path.resolve(resources, "..", "Info.plist");
    const minimumVersion = execFileSync("/usr/bin/plutil", ["-extract", "LSMinimumSystemVersion", "raw", "-o", "-", plistPath], { encoding: "utf8" }).trim();
    if (minimumVersion !== manifest.build.mac.minimumSystemVersion) {
      throw new Error(`macOS minimum version mismatch in ${plistPath}: ${minimumVersion} != ${manifest.build.mac.minimumSystemVersion}`);
    }
  }
  for (const requiredResource of ["scripts/numbers-mirror.applescript", "assets/icon.png"]) {
    const resourcePath = path.join(resources, requiredResource);
    if (!packagedFiles.includes(resourcePath)) throw new Error(`Missing packaged resource: ${resourcePath}`);
  }
}

console.log(`Packaged content inspection passed (${asarFiles.length} app.asar archive(s), no sensitive files).`);
