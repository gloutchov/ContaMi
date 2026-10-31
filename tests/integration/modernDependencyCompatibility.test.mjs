// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as asar from "@electron/asar";
import { ESLint } from "eslint";

const require = createRequire(import.meta.url);
const consumers = ["@electron/asar", "@electron/universal", "app-builder-lib", "eslint",
  "@eslint/config-array", "@typescript-eslint/typescript-estree"];
const probe = fileURLToPath(new URL("../helpers/modernDependencyProbe.mjs", import.meta.url));
const roots = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "contami-modern-"));
  roots.push(root);
  return root;
}
async function put(root, name, text = "synthetic fixture") {
  const file = path.join(root, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return file;
}
function runProbe(mode, consumer, root = "") {
  return execFileSync(process.execPath, ["--max-old-space-size=128", probe, mode,
    require.resolve(consumer), root], { timeout: 10_000, encoding: "utf8", maxBuffer: 65_536 });
}
afterEach(async () => {
  asar.uncacheAll();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("modern glob/minimatch consumers", () => {
  it.each(consumers)("preserves the named matching API used by %s", consumer => {
    const { minimatch, Minimatch } = createRequire(require.resolve(consumer))("minimatch");
    expect(minimatch("dist/caffè spesa.js", "**/*.{js,ts}")).toBe(true);
    expect(minimatch("dist/.hidden.js", "**/*.js")).toBe(false);
    expect(minimatch("dist/.hidden.js", "**/*.js", { dot: true })).toBe(true);
    expect(minimatch("nested/config.plist", "*.plist", { matchBase: true })).toBe(true);
    expect(minimatch("nested/config.txt", "*.plist", { matchBase: true })).toBe(false);
    expect(minimatch("C:\\app\\caffè spesa.js", "C:/app/*.js", { platform: "win32" })).toBe(true);
    expect(minimatch("\\\\server\\share\\a.js", "//server/share/*.js", { platform: "win32" })).toBe(true);
    const include = new Minimatch("dist/**/*.js", { dot: true });
    expect(include.match("dist", true)).toBe(true); // directory pruning in ESLint/builder
    expect(include.match("other", true)).toBe(false);
    const exclude = new Minimatch("!**/*.map");
    expect(exclude.negate).toBe(true);
    expect(exclude.match("dist/a.map")).toBe(false);
    expect(exclude.match("dist/a.js")).toBe(true);
  });

  it("bounds amplification in every resolved modern matcher", () => {
    // Distinct installations are tested too, even when npm cannot deduplicate them.
    const seen = new Set();
    for (const consumer of consumers) {
      const entry = createRequire(require.resolve(consumer)).resolve("minimatch");
      if (!seen.has(entry)) {
        expect(runProbe("minimatch", consumer)).toContain("regression passed");
        seen.add(entry);
      }
    }
  }, 30_000);

  it("stops promise and stream traversal after cancellation", async () => {
    const root = await fixture();
    for (let i = 0; i < 8; i++) await put(root, `dir-${i}/nested/file.txt`);
    expect(runProbe("glob", "@electron/asar", root)).toContain("regression passed");
  }, 15_000);

  it("preserves builder directory expansion, ordering and private-file exclusions", async () => {
    const root = await fixture();
    const { FileMatcher } = require("app-builder-lib/out/fileMatcher.js");
    const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
    const app = new FileMatcher(root, root, value => value, packageJson.build.files).createFilter();
    const directory = { isDirectory: () => true };
    const file = { isDirectory: () => false };
    expect(app(path.join(root, "dist"), directory)).toBe(true);
    for (const name of ["dist/main.js", "dist/.hidden.js", "dist/caffè spesa.js", "dist-electron/main.cjs", "package.json"]) {
      expect(app(path.join(root, name), file), name).toBe(true);
    }
    for (const name of ["sources/private.xlsx", ".env", "backup.xlsx", "secret.key", "tests/fixture.js"]) {
      expect(app(path.join(root, name), file), name).toBe(false);
    }
    const filter = new FileMatcher(root, root, value => value,
      ["assets", "!**/*.map", "assets/keep.map"]).createFilter();
    expect(filter(path.join(root, "assets/icon.png"), file)).toBe(true);
    expect(filter(path.join(root, "assets/debug.map"), file)).toBe(false);
    expect(filter(path.join(root, "assets/keep.map"), file)).toBe(true);
  });

  it("creates and extracts ASAR with Unicode, dotfiles, ignores and unpack filters", async () => {
    const root = await fixture();
    const src = path.join(root, "app with spaces");
    const unicode = "caffè spesa.txt".normalize("NFD");
    await put(src, `dist/${unicode}`, "unicode payload");
    await put(src, "dist/.visible.txt", "dotfile payload");
    await put(src, "native/addon.node", "synthetic binary");
    await put(src, "loose/data.txt", "unpacked directory");
    await put(src, "sources/private.txt");
    const archive = path.join(root, "synthetic.asar");
    await asar.createPackageWithOptions(src, archive, { dot: true,
      globOptions: { ignore: ["**/sources/**"] }, unpack: "*.node", unpackDir: "loose" });
    const names = asar.listPackage(archive).map(name => name.replaceAll("\\", "/"));
    expect(names).toContain(`/dist/${unicode}`);
    expect(names).toContain("/dist/.visible.txt");
    expect(names.some(name => name.includes("sources"))).toBe(false);
    expect(asar.extractFile(archive, `dist/${unicode}`).toString()).toBe("unicode payload");
    expect(asar.extractFile(archive, "dist/.visible.txt").toString()).toBe("dotfile payload");
    expect(asar.statFile(archive, "native/addon.node").unpacked).toBe(true);
    expect(asar.statFile(archive, "loose/data.txt").unpacked).toBe(true);
    expect(await readFile(`${archive}.unpacked/native/addon.node`, "utf8")).toBe("synthetic binary");
  });

  it("selects lint files and applies flat-config ignores through ESLint's real API", async () => {
    const root = await fixture();
    await put(root, "src/caffè spesa.js", "debugger;");
    await put(root, "src/.hidden.js", "debugger;");
    await put(root, "src/excluded.js", "debugger;");
    const eslint = new ESLint({ cwd: root, overrideConfigFile: true,
      overrideConfig: [{ ignores: ["**/excluded.js"] },
        { files: ["**/*.js"], rules: { "no-debugger": "error" } }] });
    const results = await eslint.lintFiles(["src/**/*.js"]);
    expect(results.map(result => path.basename(result.filePath).normalize("NFC")).sort())
      .toEqual([".hidden.js", "caffè spesa.js"]);
    expect(results.every(result => result.messages[0]?.ruleId === "no-debugger")).toBe(true);
  });

  it("uses typescript-eslint's default-project allowlist including dotfiles", async () => {
    const root = await fixture();
    await put(root, "tsconfig.json", JSON.stringify({ compilerOptions: { strict: true }, include: ["included.ts"] }));
    await put(root, "included.ts", "export const included = 1;");
    const code = "export const synthetic: number = 1;";
    const filename = await put(root, ".config.ts", code);
    const parser = require("@typescript-eslint/typescript-estree");
    try {
      const result = parser.parseAndGenerateServices(code, { filePath: filename, tsconfigRootDir: root,
        projectService: { allowDefaultProject: ["*.ts"], defaultProject: "tsconfig.json" } });
      expect(result.services.program.getSourceFile(filename)).toBeDefined();
      expect(result.ast.body[0].type).toBe("ExportNamedDeclaration");
      const rejected = await put(root, "nested/rejected.ts", code);
      expect(() => parser.parseAndGenerateServices(code, { filePath: rejected, tsconfigRootDir: root,
        projectService: { allowDefaultProject: ["*.ts"], defaultProject: "tsconfig.json" } }))
        .toThrow(/allowDefaultProject|project service/i);
    } finally { parser.clearCaches(); }
  });
});
