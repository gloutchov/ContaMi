// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PassThrough, Readable } from "node:stream";
import { finished } from "node:stream/promises";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import * as asar from "@electron/asar";

const require = createRequire(import.meta.url);
const fromExcel = createRequire(require.resolve("exceljs"));
const fromJake = createRequire(require.resolve("jake"));
const fromInstaller = createRequire(require.resolve("electron-winstaller"));
const roots = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "contami-legacy-")); roots.push(root); return root;
}
async function put(root, name, text = name) {
  const file = path.join(root, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); return file;
}
async function corpus() {
  const root = await fixture();
  for (const name of ["caffè spesa.js".normalize("NFD"), ".hidden.js", "nested/keep.txt", "nested/drop.tmp", "node_modules/skip.js"]) await put(root, name);
  return root;
}
const normalize = name => name.replaceAll("\\", "/").normalize("NFC");
afterEach(async () => {
  asar.uncacheAll();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("legacy consumer migrations", () => {
  it("keeps readdir-glob's callable events, dotfiles, skip and ignore semantics", async () => {
    const root = await corpus(); const readdirGlob = require("readdir-glob");
    const files = await new Promise((resolve, reject) => {
      const found = []; readdirGlob(root, { pattern: "**/*.{js,txt}", dot: true, skip: "node_modules", ignore: "**/*.tmp" })
        .on("match", entry => found.push(normalize(entry.relative))).on("error", reject).on("end", () => resolve(found.sort()));
    });
    expect(files).toEqual([".hidden.js", "caffè spesa.js", "nested/keep.txt"]);
  });

  it("preserves Jake's FileList inclusion/exclusion behavior with the new matcher", async () => {
    const root = await corpus(); const { FileList } = fromJake("filelist");
    const list = new FileList(normalize(path.join(root, "**/*.{js,txt}")));
    list.exclude(normalize(path.join(root, "node_modules/**")));
    expect(list.toArray().map(file => normalize(path.relative(root, file))).sort())
      .toEqual(["caffè spesa.js", "nested/keep.txt"]);
  });

  it("preserves Archiver's callable factory, glob filters and ZIP payloads", async () => {
    const root = await corpus(); const archive = fromExcel("archiver")("zip", { zlib: { level: 1 } });
    const output = new PassThrough(); const chunks = []; output.on("data", chunk => chunks.push(chunk));
    const complete = finished(output); archive.on("error", error => output.destroy(error)); archive.pipe(output);
    archive.glob("**/*.{js,txt}", { cwd: root, dot: true, ignore: ["node_modules/**", "**/*.tmp"] });
    archive.append("literal text", { name: "inline [literal].txt" });
    await archive.finalize(); await complete;
    const zip = await JSZip.loadAsync(Buffer.concat(chunks));
    expect(Object.keys(zip.files).filter(name => !zip.files[name].dir).map(normalize).sort())
      .toEqual([".hidden.js", "caffè spesa.js", "inline [literal].txt", "nested/keep.txt"]);
    expect(await zip.file("inline [literal].txt").async("string")).toBe("literal text");
  });

  it("preserves archiver-utils glob expansion and exclusion through glob 14", async () => {
    const root = await corpus();
    const fromArchiver = createRequire(fromExcel.resolve("archiver"));
    const utils = fromArchiver("archiver-utils");
    expect(utils.file.expand({ cwd: root, dot: true }, ["**/*.{js,txt}", "!node_modules/**"])
      .map(normalize).sort()).toEqual([".hidden.js", "caffè spesa.js", "nested/keep.txt"]);
  });

  it.each([false, true])("round-trips the ExcelJS stream writer through the standard reader (shared strings: %s)", async useSharedStrings => {
    const stream = new PassThrough(); const chunks = []; stream.on("data", chunk => chunks.push(chunk));
    const done = finished(stream);
    const writer = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useSharedStrings, useStyles: true });
    const sheet = writer.addWorksheet("Synthetic");
    sheet.addRow(["Caffè sintetico", "=literal text", 12.34, false]).commit();
    sheet.addRow(["Second row", "Unicode/spaces", 0, true]).commit();
    sheet.commit(); await writer.commit(); await done;
    const bytes = Buffer.concat(chunks); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
    expect(workbook.getWorksheet("Synthetic").getRow(1).values.slice(1)).toEqual(["Caffè sintetico", "=literal text", 12.34, false]);
    expect(workbook.getWorksheet("Synthetic").getRow(2).values.slice(1)).toEqual(["Second row", "Unicode/spaces", 0, true]);
    // ExcelJS 4 has a shared-string ordering race in its optional stream reader,
    // reproduced on C44 too. The app uses the standard reader verified above.
    // Exercise the stream reader using the writer's default inline-string mode.
    if (useSharedStrings) return;
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from([bytes]), { sharedStrings: "cache", worksheets: "emit" });
    const rows = []; for await (const worksheet of reader) for await (const row of worksheet) rows.push(row.values.slice(1));
    expect(rows).toEqual([["Caffè sintetico", "=literal text", 12.34, false], ["Second row", "Unicode/spaces", 0, true]]);
  });

  it("uses ASAR 4 through the builder's real archive checker and installer's CJS import", async () => {
    const root = await fixture(); const source = path.join(root, "app"); await put(source, "main.cjs", "synthetic main");
    await put(source, "package.json", JSON.stringify({ name: "synthetic", version: "1.0.0" }));
    const archive = path.join(root, "app.asar"); await asar.createPackage(source, archive);
    const builder = require("app-builder-lib/out/asar/asarFileChecker.js");
    expect((await builder.checkFileInArchive(archive, "main.cjs", "synthetic")).size).toBe(14);
    expect(fromInstaller("@electron/asar").extractFile(archive, "main.cjs").toString()).toBe("synthetic main");
  });

  it("uses Universal's native matchBase matcher and directory comparisons", async () => {
    const directory = path.dirname(require.resolve("@electron/universal"));
    const { matchGlob, compareDirectories } = await import(pathToFileURL(path.join(directory, "file-utils.js")));
    expect(matchGlob("nested/addon.node", "*.node")).toBe(true);
    expect(matchGlob("nested/addon.txt", "*.node")).toBe(false);
    const a = await fixture(); const b = await fixture();
    await put(a, "nested/caffè.txt".normalize("NFD"), "same"); await put(b, "nested/caffè.txt".normalize("NFD"), "same");
    await put(a, ".hidden", "left"); await put(b, ".hidden", "right"); await put(a, "left-only.txt");
    const differences = await compareDirectories(a, b);
    expect(differences.filter(item => item.state === "distinct").map(item => item.name1)).toContain(".hidden");
    expect(differences.some(item => item.state === "left" && item.name1 === "left-only.txt")).toBe(true);
    expect(differences.some(item => item.state === "equal")).toBe(true);
  });

  // Universal merges macOS bundles using POSIX archive paths (and lipo for binaries).
  // Run this macOS-only operation on its host; ASAR creation/extraction and the
  // builder/Windows installer imports above still run on both CI platforms.
  it.runIf(process.platform === "darwin")("merges Universal ASAR inputs with basename allowlists and rejects uncovered files", async () => {
    const directory = path.dirname(require.resolve("@electron/universal"));
    const { mergeASARs } = await import(pathToFileURL(path.join(directory, "asar-utils.js")));
    const root = await fixture();
    for (const arch of ["x64", "arm64"]) {
      await put(path.join(root, arch), "main.cjs", "shared synthetic main");
      await put(path.join(root, arch), `${arch}-only.txt`, arch);
      await asar.createPackage(path.join(root, arch), path.join(root, `${arch}.asar`));
    }
    const options = { x64AsarPath: path.join(root, "x64.asar"), arm64AsarPath: path.join(root, "arm64.asar"),
      outputAsarPath: path.join(root, "merged.asar") };
    await expect(mergeASARs(options)).rejects.toThrow(/allowList/);
    await mergeASARs({ ...options, singleArchFiles: "*-only.txt" });
    expect(asar.extractFile(options.outputAsarPath, "main.cjs").toString()).toBe("shared synthetic main");
    expect(asar.extractFile(options.outputAsarPath, "x64-only.txt").toString()).toBe("x64");
    expect(asar.extractFile(options.outputAsarPath, "arm64-only.txt").toString()).toBe("arm64");
  });

  it("installs the original temp name/version as an audited copy with the explicit local patch", async () => {
    const directory = path.dirname(path.dirname(fromInstaller.resolve("temp")));
    expect(fs.lstatSync(directory).isSymbolicLink()).toBe(false);
    const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    expect(manifest).toMatchObject({ name: "temp", version: "0.9.4" });
    expect(manifest.dependencies.rimraf).toBeUndefined();
    expect(await readFile(path.join(directory, "lib/temp.js"), "utf8"))
      .toBe(await readFile(new URL("../../vendor/temp/lib/temp.js", import.meta.url), "utf8"));
  });

  it("preserves temp callback, promise and synchronous cleanup on tracked paths", async () => {
    const root = await fixture(); const temp = fromInstaller("temp").track();
    const { createTempDir } = require("electron-winstaller/lib/temp-utils.js");
    const directory = await createTempDir({ dir: root, prefix: "installer-" }); await put(directory, "nested/file.txt");
    const file = temp.openSync({ dir: root, prefix: "file-" }); fs.closeSync(file.fd);
    const result = await new Promise((resolve, reject) => temp.cleanup((error, counts) => error ? reject(error) : resolve(counts)));
    expect(result).toEqual({ files: 1, dirs: 1 }); expect(fs.existsSync(directory)).toBe(false); expect(fs.existsSync(file.path)).toBe(false);
    const sync = temp.mkdirSync({ dir: root, prefix: "sync-" }); expect(temp.cleanupSync()).toEqual({ files: 0, dirs: 1 });
    expect(fs.existsSync(sync)).toBe(false); expect(await temp.cleanup()).toEqual({ files: 0, dirs: 0 });
  });

  it("does not glob-expand a disappeared tracked name or delete an untracked neighbour", async () => {
    const root = await fixture(); const temp = fromInstaller("temp").track();
    const tracked = temp.mkdirSync({ dir: root, prefix: "[ab]" }); const neighbour = tracked.replace("[ab]", "a");
    await put(neighbour, "keep.txt", "untracked"); await rm(tracked, { recursive: true });
    await temp.cleanup(); expect(await readFile(path.join(neighbour, "keep.txt"), "utf8")).toBe("untracked");
  });

  it("removes tracked symlinks without following them into an untracked directory", async () => {
    const root = await fixture(); const temp = fromInstaller("temp").track(); const outside = path.join(root, "outside");
    await put(outside, "keep.txt", "untracked"); const tracked = temp.mkdirSync({ dir: root, prefix: "tracked-" });
    fs.symlinkSync(outside, path.join(tracked, "link"), process.platform === "win32" ? "junction" : "dir");
    await temp.cleanup(); expect(fs.existsSync(tracked)).toBe(false);
    expect(await readFile(path.join(outside, "keep.txt"), "utf8")).toBe("untracked");
  });

  it("preserves automatic exit cleanup in a bounded synthetic child process", async () => {
    const root = await fixture();
    const code = "const t=require(process.argv[1]).track();const p=t.mkdirSync({dir:process.argv[2],prefix:'exit-'});console.log(p)";
    const created = execFileSync(process.execPath, ["--max-old-space-size=128", "-e", code, fromInstaller.resolve("temp"), root],
      { timeout: 5_000, encoding: "utf8", maxBuffer: 65_536 }).trim();
    expect(path.dirname(created)).toBe(root); expect(fs.existsSync(created)).toBe(false);
  });
});
