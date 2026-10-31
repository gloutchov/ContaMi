// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";

const execute = promisify(execFile);
const risk = "contami-synthetic-risk";
// Exercise the actual workflow commands against a local synthetic registry.
// A raised audit threshold or omitted dev dependencies must break these tests.
const commands = [...new Set(await Promise.all(["ci.yml", "release.yml"].map(async file => {
  const workflow = await readFile(new URL(`../../.github/workflows/${file}`, import.meta.url), "utf8");
  const command = workflow.match(/- run: (npm audit[^\r\n]*)/g);
  if (command?.length !== 1) throw new Error(`Missing unambiguous audit gate: ${file}`);
  return command[0].replace("- run: npm ", "");
})))];

async function audit(command, mode) {
  const root = await mkdtemp(path.join(os.tmpdir(), "contami-audit-gate-"));
  let auditedDevDependency = false;
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (mode === "error") {
      response.writeHead(503).end(JSON.stringify({ error: "synthetic-registry-unavailable" }));
      return;
    }
    if (request.url === "/-/npm/v1/security/advisories/bulk") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const body = JSON.parse((request.headers["content-encoding"] === "gzip" ? gunzipSync(bytes) : bytes).toString());
      auditedDevDependency = body[risk]?.includes("1.0.0") === true;
      response.end(JSON.stringify(["info", "moderate"].includes(mode) && auditedDevDependency ? { [risk]: [{
        id: 999999, name: risk, title: "Synthetic finding", severity: mode,
        vulnerable_versions: "<2.0.0", url: "https://example.invalid/synthetic-advisory",
        cwe: [], cvss: { score: 5, vectorString: null },
      }] } : {}));
    } else if (request.url === `/${risk}`) {
      response.end(JSON.stringify({ name: risk, "dist-tags": { latest: "2.0.0" }, versions: Object.fromEntries(
        ["1.0.0", "2.0.0"].map(version => [version, { name: risk, version, dependencies: {} }])) }));
    } else response.writeHead(404).end("{}");
  });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const registry = `http://127.0.0.1:${server.address().port}`;
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "contami-audit-fixture", version: "1.0.0",
      private: true, devDependencies: { [risk]: "1.0.0" } }));
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify({ name: "contami-audit-fixture", version: "1.0.0",
      lockfileVersion: 3, requires: true, packages: {
        "": { name: "contami-audit-fixture", version: "1.0.0", devDependencies: { [risk]: "1.0.0" } },
        [`node_modules/${risk}`]: { version: "1.0.0", dev: true, resolved: `${registry}/${risk}/-/package.tgz` },
      } }));
    await writeFile(path.join(root, "user.npmrc"), "");
    await writeFile(path.join(root, "global.npmrc"), "");
    const env = Object.fromEntries(["PATH", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"].filter(key => process.env[key])
      .map(key => [key, process.env[key]]));
    const args = [process.env.npm_execpath, ...command.split(/\s+/), "--json", `--registry=${registry}`,
      `--cache=${path.join(root, "cache")}`, `--userconfig=${path.join(root, "user.npmrc")}`,
      `--globalconfig=${path.join(root, "global.npmrc")}`, "--fetch-retries=0", "--fetch-timeout=3000", "--update-notifier=false"];
    let result;
    try { result = { ...await execute(process.execPath, args, { cwd: root, env, timeout: 15_000, maxBuffer: 1_048_576 }), code: 0 }; }
    catch (error) {
      if (typeof error.code !== "number") throw error;
      result = { stdout: error.stdout, code: error.code };
    }
    return { code: result.code, report: JSON.parse(result.stdout), auditedDevDependency };
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
}

describe.each(commands)("unconditional workflow gate: npm %s", command => {
  it("accepts a genuinely clean audit including development dependencies", async () => {
    const result = await audit(command, "clean");
    expect(result.code).toBe(0);
    expect(result.auditedDevDependency).toBe(true);
    expect(result.report.metadata.vulnerabilities.total).toBe(0);
  }, 20_000);
  it.each(["info", "moderate"])("blocks an %s finding without exceptions or raised threshold", async level => {
    const result = await audit(command, level);
    expect(result.auditedDevDependency).toBe(true);
    expect(result.code).not.toBe(0);
    expect(result.report.metadata.vulnerabilities[level]).toBe(1);
  }, 20_000);
  it("blocks registry errors instead of treating a failed audit as clean", async () => {
    const result = await audit(command, "error");
    expect(result.code).not.toBe(0);
    expect(result.report.error).toBeDefined();
  }, 20_000);
});
