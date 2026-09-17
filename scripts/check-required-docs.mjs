import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const required = [
  "README.md", "ISTRUZIONI.md", "INSTRUCTIONS.md", "SECURITY_MODEL.md", "PLAN.md",
  "MAP.md", "AGENTS.md", "LICENSE", "QUICK-START_Desktop.md",
  "documents/import-guide.md", "documents/import-template-spec.md", "documents/reference-analysis.md",
  "documents/landing-maintenance.md", "docs/index.html", "docs/.nojekyll",
];
const releaseChecks = [
  "scripts/check-node-baseline.mjs",
  "scripts/validate-landing.mjs",
  "scripts/inspect-packaged.mjs",
  "scripts/smoke-packaged.mjs",
  "scripts/smoke-installed.mjs",
];
await Promise.all([...required, ...releaseChecks].map((file) => access(file)));

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));
if (manifest.license !== "Apache-2.0" || manifest.private !== true) throw new Error("package.json license/private policy mismatch");
if (!manifest.engines?.node) throw new Error("Node.js engine requirement is missing");
if (lockfile.version !== manifest.version || lockfile.packages?.[""]?.version !== manifest.version) {
  throw new Error(`Manifest/lockfile version mismatch for ${manifest.version}`);
}
const approvedInstallScripts = Object.entries(manifest.allowScripts ?? {}).filter(([, approved]) => approved).map(([name]) => name).sort();
const expectedInstallScripts = ["electron-winstaller@5.4.0", "esbuild@0.28.1"];
if (JSON.stringify(approvedInstallScripts) !== JSON.stringify(expectedInstallScripts)) {
  throw new Error(`Install-script allowlist mismatch: ${JSON.stringify(approvedInstallScripts)}`);
}
if (manifest.build?.asar !== true) throw new Error("Electron packages must keep asar enabled");
if (!manifest.build?.mac?.target?.includes("dmg") || !manifest.build?.mac?.target?.includes("zip")) {
  throw new Error("macOS packages must include DMG and ZIP targets");
}
if (!manifest.build?.win?.target?.includes("nsis") || !manifest.build?.win?.target?.includes("zip")) {
  throw new Error("Windows packages must include NSIS and ZIP targets");
}
if (manifest.build?.nsis?.oneClick !== false || manifest.build?.nsis?.allowToChangeInstallationDirectory !== true) {
  throw new Error("Windows installer must remain assisted and allow an explicit installation directory");
}
const packagedFiles = manifest.build?.files ?? [];
const allowedPackageRoots = new Set(["dist/**/*", "dist-electron/**/*", "package.json"]);
if (packagedFiles.some((entry) => typeof entry !== "string" || !allowedPackageRoots.has(entry))) {
  throw new Error(`Unexpected Electron package file scope: ${JSON.stringify(packagedFiles)}`);
}
const extraResources = manifest.build?.extraResources ?? [];
if (extraResources.some((entry) => typeof entry?.from !== "string" || entry.from.startsWith("sources/") || /\.(numbers|xlsx|pem|key|p12)$/i.test(entry.from))) {
  throw new Error("Private or sensitive extraResources entry configured");
}

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbidden = tracked.filter((file) => file.startsWith("sources/") || /\.(numbers|xlsx|pem|key|p12)$/i.test(file));
if (forbidden.length) throw new Error(`Private or sensitive artifacts are tracked: ${forbidden.join(", ")}`);
const stalePagesPaths = tracked.filter((file) => file === ".github/workflows/pages.yml" || file.startsWith("landing/"));
if (stalePagesPaths.length) throw new Error(`GitHub Pages must publish only from main/docs: ${stalePagesPaths.join(", ")}`);
const publicDocumentationFiles = tracked.filter((file) => file.endsWith(".md") || ["docs/index.html", "docs/app.js", "docs/styles.css"].includes(file));
const defaultPagesReferences = (await Promise.all(publicDocumentationFiles.map(async (file) => ({
  file,
  text: await readFile(file, "utf8"),
})))).filter(({ text }) => /https?:\/\/[^/\s"')]+\.github\.io(?:\/|[\s"')])/i.test(text)).map(({ file }) => file);
if (defaultPagesReferences.length) {
  throw new Error(`Documentation and landing must use only the custom public domain: ${defaultPagesReferences.join(", ")}`);
}

const [readme, securityModel, ...workflowText] = await Promise.all([
  "README.md", "SECURITY_MODEL.md", ".github/workflows/ci.yml", ".github/workflows/release.yml",
].map((file) => readFile(file, "utf8")));
if (!readme.includes(`**${manifest.version} —`) || !securityModel.includes(`Application: ${manifest.version}`)) {
  throw new Error(`README/SECURITY_MODEL version mismatch for ${manifest.version}`);
}
const releaseWorkflow = workflowText[1];
for (const command of ["npm run test:package:inspect", "npm run test:smoke:packaged", "npm run test:smoke:installed"]) {
  if (!releaseWorkflow.includes(command)) throw new Error(`Release workflow is missing required gate: ${command}`);
}
if (!releaseWorkflow.includes("workflow_dispatch:") || !releaseWorkflow.includes("if: startsWith(github.ref, 'refs/tags/v')")) {
  throw new Error("Release candidates must be manually runnable without publishing; publishing must remain tag-only");
}
if (!workflowText[0].includes("npm run test:landing:e2e")) {
  throw new Error("Cross-platform CI must run the dedicated landing Playwright checks");
}
const mutableActions = workflowText.flatMap((text) => [...text.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)].map((match) => match[1]))
  .filter((reference) => !/^[0-9a-f]{40}$/.test(reference));
if (mutableActions.length) throw new Error(`GitHub Actions must be pinned to commit SHAs: ${mutableActions.join(", ")}`);

console.log(`Documentation and repository hygiene checks passed (${required.length} required documents).`);
