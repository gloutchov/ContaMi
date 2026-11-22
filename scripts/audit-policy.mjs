const levels = ["info", "low", "moderate", "high", "critical"];
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const requireValue = (condition, message) => {
  if (!condition) throw new Error(`Audit policy: ${message}`);
};

export const auditArguments = Object.freeze([
  "audit", "--include=dev", "--audit-level=info", "--fetch-timeout=120000", "--fetch-retries=0", "--json",
]);

export function evaluateAuditReport({ report, lockfile, policy, exitCode }) {
  requireValue(isObject(policy) && Object.keys(policy).length === 1 && policy.schemaVersion === 1,
    "policy must contain only schemaVersion 1 and no temporary exception");
  requireValue(isObject(report) && report.auditReportVersion === 2 && !Object.hasOwn(report, "error")
    && isObject(report.vulnerabilities) && isObject(report.metadata?.vulnerabilities),
  "missing, malformed or failed npm audit report");
  requireValue(isObject(lockfile?.packages) && lockfile.lockfileVersion === 3, "missing or unsupported lockfile");

  const records = new Map(Object.entries(report.vulnerabilities));
  const counts = Object.fromEntries(levels.map(level => [level, 0]));
  for (const [name, finding] of records) {
    requireValue(isObject(finding) && finding.name === name && levels.includes(finding.severity), `invalid finding for ${name}`);
    counts[finding.severity]++;
  }
  const metadata = report.metadata.vulnerabilities;
  requireValue(levels.every(level => metadata[level] === counts[level]) && metadata.total === records.size,
    "audit totals do not match the reported findings");
  requireValue(exitCode === (records.size === 0 ? 0 : 1), "npm audit exit code does not match a complete report");
  requireValue(records.size === 0, "full audit is not clean; no temporary exception is authorized");
  return { exceptionUsed: false, acceptedPackages: [] };
}
