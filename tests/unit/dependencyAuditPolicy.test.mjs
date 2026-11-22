// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateAuditReport } from "../../scripts/audit-policy.mjs";

const policy = JSON.parse(readFileSync(new URL("../../scripts/dependency-audit-policy.json", import.meta.url), "utf8"));
const withdrawnUrl = "https://github.com/advisories/GHSA-fc5q-39xc-vjpf";

function cleanInput() {
  return {
    report: {
      auditReportVersion: 2,
      vulnerabilities: {},
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } },
    },
    lockfile: { lockfileVersion: 3, packages: {} },
    policy: structuredClone(policy),
    exitCode: 0,
  };
}

function withFinding(severity, name = "contami-synthetic-risk", url = "https://example.invalid/synthetic-advisory") {
  const input = cleanInput();
  input.exitCode = 1;
  input.report.vulnerabilities[name] = {
    name,
    severity,
    nodes: [`node_modules/${name}`],
    via: [{ name, dependency: name, url, severity }],
  };
  input.report.metadata.vulnerabilities[severity] = 1;
  input.report.metadata.vulnerabilities.total = 1;
  input.lockfile.packages[`node_modules/${name}`] = { dev: true, version: "1.0.0" };
  return input;
}

describe("audit policy without a temporary exception", () => {
  it("ships only schemaVersion 1", () => {
    expect(policy).toEqual({ schemaVersion: 1 });
  });

  it("accepts a clean full audit and marks no exception as used", () => {
    expect(evaluateAuditReport(cleanInput())).toEqual({ exceptionUsed: false, acceptedPackages: [] });
  });

  it.each(["info", "low", "moderate", "high", "critical"])("blocks a %s finding", severity => {
    expect(() => evaluateAuditReport(withFinding(severity))).toThrow(/not clean/);
  });

  it("blocks the withdrawn picomatch advisory", () => {
    expect(() => evaluateAuditReport(withFinding("high", "picomatch", withdrawnUrl))).toThrow(/not clean/);
  });

  it("blocks a policy that still contains the temporary exception", () => {
    const input = cleanInput();
    input.policy.temporaryException = { advisory: "GHSA-fc5q-39xc-vjpf" };
    expect(() => evaluateAuditReport(input)).toThrow(/no temporary exception/);
  });

  it.each([
    ["missing report", input => { input.report = {}; }],
    ["registry error", input => { input.report.error = { code: "E503" }; }],
    ["inconsistent totals", input => { input.report.metadata.vulnerabilities.total++; }],
    ["unexpected exit", input => { input.exitCode = 1; }],
    ["raised threshold", input => { input.exitCode = 0; Object.assign(input, withFinding("high")); input.exitCode = 0; }],
    ["unsupported schema", input => { input.report.auditReportVersion = 3; }],
    ["extra policy field", input => { input.policy.note = "restored"; }],
    ["missing lockfile", input => { input.lockfile = {}; }],
  ])("fails closed for %s", (_name, mutate) => {
    const input = cleanInput();
    mutate(input);
    expect(() => evaluateAuditReport(input)).toThrow();
  });
});
