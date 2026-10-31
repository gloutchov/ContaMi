// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assessDependencyAudit } from "../../scripts/lib/dependency-audit.mjs";

const policy = { version: 1, timeoutMs: 120_000, maxOutputBytes: 4_194_304, maxFindings: 1_000, expiresOn: "2026-11-14", exceptions: [
  { package: "glob", advisory: "GHSA-3g3m-2fjr-6pw4", reason: "Synthetic reviewed moderate exception." },
] };
const now = new Date("2026-10-31T12:00:00Z");
const source = () => ({ name: "glob", severity: "moderate", url: "https://github.com/advisories/GHSA-3g3m-2fjr-6pw4" });
function report(entries = { glob: { severity: "moderate", via: [source()] }, "synthetic-tool": { severity: "moderate", via: ["glob"] } }) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: Object.keys(entries).length };
  for (const value of Object.values(entries)) counts[value.severity]++;
  return { auditReportVersion: 2, vulnerabilities: entries, metadata: { vulnerabilities: counts } };
}

describe("bounded dependency audit exceptions", () => {
  it("the release policy accepts residual minimatch but blocks a returning glob advisory", () => {
    const releasePolicy = JSON.parse(readFileSync(new URL("../../config/dependency-audit.json", import.meta.url), "utf8"));
    const legacy = report({ minimatch: { severity: "moderate", via: [{
      name: "minimatch", severity: "moderate", url: "https://github.com/advisories/GHSA-g3hv-75wg-m249",
    }] } });
    expect(assessDependencyAudit(legacy, releasePolicy, now).totals.total).toBe(1);
    expect(() => assessDependencyAudit(report(), releasePolicy, now)).toThrow("AUDIT_ADVISORY_BLOCKED");
    expect(() => assessDependencyAudit(legacy, releasePolicy, new Date("2026-11-15T00:00:00Z")))
      .toThrow("AUDIT_POLICY_EXPIRED");
  });
  it("accepts reviewed moderate roots and their transitive consumers without hiding totals", () => {
    expect(assessDependencyAudit(report(), policy, now)).toMatchObject({
      totals: { moderate: 2, total: 2 }, acceptedAdvisories: [policy.exceptions[0].advisory],
    });
  });
  it.each(["low", "high", "critical"])("blocks a new %s finding", (level) => {
    const entries = report().vulnerabilities;
    entries.new = { severity: level, via: [{ ...source(), name: "synthetic-new" }] };
    expect(() => assessDependencyAudit(report(entries), policy, now)).toThrow("AUDIT_FINDING_BLOCKED");
  });
  it("blocks unknown moderate advisories even on an accepted package", () => {
    const entries = report().vulnerabilities;
    entries.glob.via.push({ ...source(), url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" });
    expect(() => assessDependencyAudit(report(entries), policy, now)).toThrow("AUDIT_ADVISORY_BLOCKED");
  });
  it("blocks severity escalation within an otherwise accepted moderate chain", () => {
    const entries = report().vulnerabilities;
    entries.glob.via[0].severity = "high";
    expect(() => assessDependencyAudit(report(entries), policy, now)).toThrow("AUDIT_ADVISORY_BLOCKED");
  });
  it.each([
    [{ severity: "moderate", via: [] }, "AUDIT_REPORT_UNRESOLVED"],
    [{ severity: "moderate", via: ["missing"] }, "AUDIT_REPORT_UNRESOLVED"],
    [{ severity: "moderate", via: ["glob"] }, "AUDIT_REPORT_UNRESOLVED"],
  ])("rejects unresolved or cyclic reports (%j)", (value, error) => {
    expect(() => assessDependencyAudit(report({ glob: value }), policy, now)).toThrow(error);
  });
  it("accepts npm dependency cycles only when they resolve to a reviewed advisory", () => {
    const entries = report().vulnerabilities;
    entries.glob.via.push("synthetic-tool");
    expect(assessDependencyAudit(report(entries), policy, now).totals.total).toBe(2);
  });
  it("accepts the expiry day, then blocks exceptions without blocking a clean audit", () => {
    expect(assessDependencyAudit(report(), policy, new Date("2026-11-14T23:59:59Z")).totals.total).toBe(2);
    expect(() => assessDependencyAudit(report(), policy, new Date("2026-11-15T00:00:00Z"))).toThrow("AUDIT_POLICY_EXPIRED");
    expect(assessDependencyAudit(report({}), policy, new Date("2026-11-15T00:00:00Z")).totals.total).toBe(0);
  });
  it("rejects npm errors, missing data and inconsistent totals", () => {
    expect(() => assessDependencyAudit({ ...report(), error: {} }, policy, now)).toThrow("AUDIT_REPORT_ERROR");
    expect(() => assessDependencyAudit({}, policy, now)).toThrow();
    const invalid = report(); invalid.metadata.vulnerabilities.total = 0;
    expect(() => assessDependencyAudit(invalid, policy, now)).toThrow("AUDIT_REPORT_INCONSISTENT");
  });
  it("rejects invalid policy dates and duplicate rules", () => {
    expect(() => assessDependencyAudit(report(), { ...policy, expiresOn: "2026-02-30" }, now)).toThrow("AUDIT_POLICY_INVALID_DATE");
    expect(() => assessDependencyAudit(report(), { ...policy, exceptions: [...policy.exceptions, ...policy.exceptions] }, now)).toThrow("AUDIT_POLICY_DUPLICATE");
  });
});
