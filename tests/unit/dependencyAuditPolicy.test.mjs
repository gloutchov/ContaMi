// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateAuditReport } from "../../scripts/audit-policy.mjs";

const policy = JSON.parse(readFileSync(new URL("../../scripts/dependency-audit-policy.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-19T12:00:00.000Z");
const url = "https://github.com/advisories/GHSA-fc5q-39xc-vjpf";

function fixture() {
  const report = { auditReportVersion: 2, vulnerabilities: {
    picomatch: { name: "picomatch", severity: "high", nodes: ["node_modules/picomatch"], via: [
      { name: "picomatch", dependency: "picomatch", url, severity: "high" },
    ] },
    vite: { name: "vite", severity: "high", nodes: ["node_modules/vite"], via: ["picomatch", "vitest"] },
    vitest: { name: "vitest", severity: "high", nodes: ["node_modules/vitest"], via: ["vite"] },
  }, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 3, critical: 0, total: 3 } } };
  const lockfile = { lockfileVersion: 3, packages: {
    "node_modules/picomatch": { dev: true, version: "4.0.7", resolved: policy.temporaryException.resolved, integrity: policy.temporaryException.integrity },
    "node_modules/vite": { dev: true, version: "8.3.5" },
    "node_modules/vitest": { dev: true, version: "5.1.0" },
  } };
  return { report, lockfile, policy: structuredClone(policy), exitCode: 1, now };
}

describe("temporary picomatch audit exception", () => {
  it("accepts only the known development advisory through a cyclic metavulnerability graph", () => {
    expect(evaluateAuditReport(fixture())).toMatchObject({ exceptionUsed: true, acceptedPackages: ["picomatch", "vite", "vitest"] });
  });

  it("accepts a clean full audit after expiry and marks the exception unused", () => {
    const input = fixture();
    input.report.vulnerabilities = {};
    input.report.metadata.vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
    input.exitCode = 0;
    input.now = Date.parse("2026-12-03T00:00:00.000Z");
    expect(evaluateAuditReport(input).exceptionUsed).toBe(false);
  });

  it.each(["2026-11-17T23:59:59.999Z", "2026-12-02T00:00:00.000Z", "2026-12-03T00:00:00.000Z"])("blocks outside its approved period: %s", date => {
    expect(() => evaluateAuditReport({ ...fixture(), now: Date.parse(date) })).toThrow(/not active/);
  });

  it("blocks an additional advisory with the same package and finding count", () => {
    const input = fixture();
    input.report.vulnerabilities.picomatch.via.push({ name: "picomatch", dependency: "picomatch", url: "https://example.invalid/new-advisory", severity: "low" });
    expect(() => evaluateAuditReport(input)).toThrow(/unapproved advisory/);
  });

  it.each(["picomatch", "vite"])("blocks runtime exposure of %s", name => {
    const input = fixture();
    delete input.lockfile.packages[`node_modules/${name}`].dev;
    expect(() => evaluateAuditReport(input)).toThrow(/not exclusively/);
  });

  it.each(["version", "resolved", "integrity"])("blocks a changed picomatch %s", key => {
    const input = fixture();
    input.lockfile.packages["node_modules/picomatch"][key] = "changed";
    expect(() => evaluateAuditReport(input)).toThrow(/origin, version/);
  });

  it("blocks symlinked local copies that npm could omit from the audit", () => {
    const input = fixture();
    input.lockfile.packages["node_modules/picomatch"].link = true;
    expect(() => evaluateAuditReport(input)).toThrow(/not exclusively/);
  });

  it("blocks critical reclassification of the same advisory", () => {
    const input = fixture();
    input.report.vulnerabilities.picomatch.severity = "critical";
    input.report.metadata.vulnerabilities.high--;
    input.report.metadata.vulnerabilities.critical++;
    expect(() => evaluateAuditReport(input)).toThrow(/severity/);
  });

  it("blocks disconnected cycles that do not reach the accepted advisory", () => {
    const input = fixture();
    for (const [name, other] of [["fdir", "tinyglobby"], ["tinyglobby", "fdir"]]) {
      input.report.vulnerabilities[name] = { name, severity: "high", nodes: [`node_modules/${name}`], via: [other] };
      input.lockfile.packages[`node_modules/${name}`] = { dev: true, version: "1.0.0" };
    }
    input.report.metadata.vulnerabilities.high += 2;
    input.report.metadata.vulnerabilities.total += 2;
    expect(() => evaluateAuditReport(input)).toThrow(/not entirely attributable/);
  });

  it.each([
    ["missing report", input => { input.report = {}; }],
    ["registry error", input => { input.report.error = { code: "E503" }; }],
    ["inconsistent totals", input => { input.report.metadata.vulnerabilities.total++; }],
    ["unexpected exit", input => { input.exitCode = 2; }],
    ["raised threshold", input => { input.exitCode = 0; }],
    ["unknown dependency", input => { input.report.vulnerabilities.vite.via.push("unknown"); }],
    ["missing node", input => { input.report.vulnerabilities.vite.nodes = []; }],
    ["unsupported schema", input => { input.report.auditReportVersion = 3; }],
    ["unbounded exception", input => { input.policy.temporaryException.expiresAt = "2027-01-01T00:00:00.000Z"; }],
  ])("fails closed for %s", (_name, mutate) => {
    const input = fixture();
    mutate(input);
    expect(() => evaluateAuditReport(input)).toThrow();
  });
});
