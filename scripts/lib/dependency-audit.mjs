import { z } from "zod";

const severity = z.enum(["info", "low", "moderate", "high", "critical"]);
const count = z.number().int().min(0).max(10_000);
const policySchema = z.object({
  version: z.literal(1),
  timeoutMs: z.number().int().min(1_000).max(300_000),
  maxOutputBytes: z.number().int().min(1_024).max(16 * 1024 * 1024),
  maxFindings: z.number().int().min(1).max(10_000),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exceptions: z.array(z.object({
    package: z.string().min(1).max(200),
    advisory: z.string().regex(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/),
    reason: z.string().min(20).max(1_000),
  }).strict()).max(8),
}).strict();
const sourceSchema = z.object({ name: z.string(), url: z.string().url(), severity });
const reportSchema = z.object({
  auditReportVersion: z.literal(2),
  vulnerabilities: z.record(z.string(), z.object({ severity, via: z.array(z.union([z.string(), sourceSchema])).max(100) })),
  metadata: z.object({ vulnerabilities: z.object({ info: count, low: count, moderate: count, high: count, critical: count, total: count }) }),
});

export function parseDependencyAuditPolicy(input) {
  const policy = policySchema.parse(input);
  const expiry = new Date(`${policy.expiresOn}T00:00:00Z`);
  if (!Number.isFinite(expiry.getTime()) || expiry.toISOString().slice(0, 10) !== policy.expiresOn) {
    throw new Error("AUDIT_POLICY_INVALID_DATE");
  }
  return policy;
}

/** Accept only explicitly reviewed moderate advisory chains; all other findings fail closed. */
export function assessDependencyAudit(input, policyInput, now = new Date()) {
  if (!input || Object.hasOwn(input, "error")) throw new Error("AUDIT_REPORT_ERROR");
  const report = reportSchema.parse(input);
  const policy = parseDependencyAuditPolicy(policyInput);
  if (!Number.isFinite(now.getTime())) throw new Error("AUDIT_POLICY_INVALID_DATE");
  const entries = Object.entries(report.vulnerabilities);
  const totals = report.metadata.vulnerabilities;
  if (entries.length > policy.maxFindings || entries.length !== totals.total || severity.options.some((level) => entries.filter(([, value]) => value.severity === level).length !== totals[level])) {
    throw new Error("AUDIT_REPORT_INCONSISTENT");
  }
  const rules = new Map();
  for (const rule of policy.exceptions) {
    const key = `${rule.package}|https://github.com/advisories/${rule.advisory}`;
    if (rules.has(key)) throw new Error("AUDIT_POLICY_DUPLICATE");
    rules.set(key, rule);
  }
  const accepted = new Set();
  const roots = new Map(entries.map(([name]) => [name, new Set()]));
  const dependencies = new Map();
  for (const [name, item] of entries) {
    if (item.via.length === 0) throw new Error("AUDIT_REPORT_UNRESOLVED");
    if (item.severity !== "moderate") throw new Error("AUDIT_FINDING_BLOCKED");
    const links = [];
    for (const source of item.via) {
      if (typeof source === "string") {
        if (!roots.has(source)) throw new Error("AUDIT_REPORT_UNRESOLVED");
        links.push(source);
      } else {
        const rule = rules.get(`${source.name}|${source.url}`);
        if (source.severity !== "moderate" || !rule) throw new Error("AUDIT_ADVISORY_BLOCKED");
        accepted.add(rule.advisory);
        roots.get(name).add(rule.advisory);
      }
    }
    dependencies.set(name, links);
  }
  // npm meta-vulnerability graphs may contain cycles. Resolve only cycles that
  // reach reviewed roots; a rootless cycle must never become an exception.
  for (let pass = 0; pass < entries.length; pass++) {
    let changed = false;
    for (const [name, links] of dependencies) {
      for (const dependency of links) for (const root of roots.get(dependency)) {
        if (!roots.get(name).has(root)) { roots.get(name).add(root); changed = true; }
      }
    }
    if (!changed) break;
  }
  if ([...roots.values()].some((value) => value.size === 0)) throw new Error("AUDIT_REPORT_UNRESOLVED");
  if (accepted.size && now.toISOString().slice(0, 10) > policy.expiresOn) throw new Error("AUDIT_POLICY_EXPIRED");
  return { totals, acceptedAdvisories: [...accepted].sort(), expiresOn: policy.expiresOn };
}
