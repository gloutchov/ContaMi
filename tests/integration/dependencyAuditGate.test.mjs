// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";

const execute = promisify(execFile);
const originalPolicy = JSON.parse(await readFile(new URL("../../scripts/dependency-audit-policy.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

describe("workflow audit wiring", () => {
  it.each(["ci.yml", "release.yml"])("keeps the policy gate mandatory and bounded in %s", async file => {
    const text = await readFile(new URL(`../../.github/workflows/${file}`, import.meta.url), "utf8");
    const steps = [...text.matchAll(/^ {6}- run: npm run audit:ci\r?\n(?: {8}[^\r\n]*\r?\n)*/gm)];
    expect(steps).toHaveLength(1);
    expect(steps[0][0]).toContain("timeout-minutes: 3");
    expect(steps[0][0]).not.toMatch(/continue-on-error|\bif:/);
    expect(manifest.scripts["audit:ci"]).toBe("node scripts/audit-dependencies.mjs");
  });
});

async function removeFixture(root) {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("contami-audit-gate-")) {
    throw new Error("Unsafe synthetic fixture cleanup path");
  }
  await rm(resolved, { recursive: true, force: true });
}

async function runGate(mode) {
  const root = await mkdtemp(path.join(os.tmpdir(), "contami-audit-gate-"));
  const known = mode.startsWith("known");
  const risk = known ? "picomatch" : "contami-synthetic-risk";
  const version = known ? "4.0.7" : "1.0.0";
  let auditedDependency = false;
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
      auditedDependency = body[risk]?.includes(version) === true;
      const findings = [];
      if (auditedDependency && mode !== "clean") findings.push({
        id: 999998, name: risk, title: "Synthetic advisory", severity: known ? "high" : mode,
        vulnerable_versions: known ? "<=4.0.7" : "<2.0.0",
        url: known ? originalPolicy.temporaryException.url : "https://example.invalid/synthetic-advisory",
        cwe: [], cvss: { score: 7.5, vectorString: null },
      });
      if (mode === "known-plus-new") findings.push({ ...findings[0], id: 999999, url: "https://example.invalid/new-advisory" });
      response.end(JSON.stringify(findings.length ? { [risk]: findings } : {}));
    } else if (request.url === `/${risk}`) {
      response.end(JSON.stringify({ name: risk, "dist-tags": { latest: version }, versions: {
        [version]: { name: risk, version, dependencies: {} },
      } }));
    } else response.writeHead(404).end("{}");
  });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const registry = `http://127.0.0.1:${server.address().port}`;
    const production = mode === "known-production";
    const dependencyKind = production ? "dependencies" : "devDependencies";
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "contami-audit-fixture", version: "1.0.0",
      private: true, scripts: { "audit:ci": manifest.scripts["audit:ci"] }, [dependencyKind]: { [risk]: version } }));
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify({ name: "contami-audit-fixture", version: "1.0.0",
      lockfileVersion: 3, requires: true, packages: {
        "": { name: "contami-audit-fixture", version: "1.0.0", [dependencyKind]: { [risk]: version } },
        [`node_modules/${risk}`]: { version, ...(!production ? { dev: true } : {}),
          resolved: known ? originalPolicy.temporaryException.resolved : `${registry}/${risk}/-/package.tgz`,
          ...(known ? { integrity: originalPolicy.temporaryException.integrity } : {}) },
      } }));
    await mkdir(path.join(root, "scripts"));
    for (const file of ["audit-dependencies.mjs", "audit-policy.mjs"]) {
      await copyFile(new URL(`../../scripts/${file}`, import.meta.url), path.join(root, "scripts", file));
    }
    // Only synthetic fixtures get relative dates; the real policy has fixed approved dates.
    const policy = structuredClone(originalPolicy);
    policy.temporaryException.approvedAt = new Date(Date.now() - 60000).toISOString();
    policy.temporaryException.expiresAt = new Date(Date.now() + (mode === "known-expired" ? -1 : 3600000)).toISOString();
    await writeFile(path.join(root, "scripts/dependency-audit-policy.json"), JSON.stringify(policy));
    await writeFile(path.join(root, "user.npmrc"), "");
    await writeFile(path.join(root, "global.npmrc"), "");
    const env = Object.fromEntries(["PATH", "SystemRoot", "SYSTEMROOT", "ComSpec", "PATHEXT", "TEMP", "TMP"].filter(key => process.env[key])
      .map(key => [key, process.env[key]]));
    Object.assign(env, { npm_config_registry: registry, npm_config_cache: path.join(root, "cache"),
      npm_config_userconfig: path.join(root, "user.npmrc"), npm_config_globalconfig: path.join(root, "global.npmrc"),
      npm_config_update_notifier: "false" });
    let result;
    try { result = { ...await execute(process.execPath, [process.env.npm_execpath, "run", "audit:ci", "--silent"],
      { cwd: root, env, timeout: 15000, maxBuffer: 1048576, windowsHide: true }), code: 0 }; }
    catch (error) {
      if (typeof error.code !== "number") throw error;
      result = { stdout: error.stdout, stderr: error.stderr, code: error.code };
    }
    return { ...result, auditedDependency };
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await removeFixture(root);
  }
}

describe("actual workflow command against a synthetic npm registry", () => {
  it("accepts a clean full audit including development dependencies", async () => {
    const result = await runGate("clean");
    expect(result.auditedDependency).toBe(true);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("clean full audit");
  }, 20000);

  it("accepts the approved development advisory while keeping the raw report visible", async () => {
    const result = await runGate("known");
    expect(result.auditedDependency).toBe(true);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(originalPolicy.temporaryException.url);
    expect(result.stdout).toContain("accepted 1 development findings");
  }, 20000);

  it.each(["info", "moderate", "known-plus-new", "known-production", "known-expired", "error"])("blocks %s", async mode => {
    const result = await runGate(mode);
    if (mode !== "error") expect(result.auditedDependency).toBe(true);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("AUDIT POLICY BLOCKED");
  }, 20000);
});
