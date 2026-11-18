const levels = ["info", "low", "moderate", "high", "critical"];
const advisory = "GHSA-fc5q-39xc-vjpf";
const advisoryUrl = `https://github.com/advisories/${advisory}`;
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const requireValue = (condition, message) => {
  if (!condition) throw new Error(`Audit policy: ${message}`);
};
const timestamp = value => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  requireValue(Number.isFinite(parsed) && new Date(parsed).toISOString() === value, "invalid UTC policy timestamp");
  return parsed;
};

export const auditArguments = Object.freeze([
  "audit", "--include=dev", "--audit-level=info", "--fetch-timeout=120000", "--fetch-retries=0", "--json",
]);

export function evaluateAuditReport({ report, lockfile, policy, exitCode, now = Date.now() }) {
  requireValue(policy?.schemaVersion === 1, "unsupported policy schema");
  const exception = policy.temporaryException;
  requireValue(isObject(exception) && exception.advisory === advisory && exception.url === advisoryUrl,
    "only the approved picomatch advisory can be excepted");
  requireValue(exception.package === "picomatch" && exception.version === "4.0.7"
    && exception.node === "node_modules/picomatch" && exception.maximumSeverity === "high",
  "exception package, version, path or severity changed");
  requireValue(exception.approvedBy === "gloutchov", "missing owner authorization");
  const approvedAt = timestamp(exception.approvedAt);
  const expiresAt = timestamp(exception.expiresAt);
  requireValue(expiresAt > approvedAt && expiresAt - approvedAt <= 14 * 24 * 60 * 60 * 1000,
    "exception must expire within fourteen days; renewal needs a new owner decision");
  requireValue(Number.isFinite(now), "invalid current time");
  requireValue(Array.isArray(exception.allowedPackages) && exception.allowedPackages.length > 0
    && exception.allowedPackages.length <= 19 && exception.allowedPackages.includes("picomatch")
    && exception.allowedPackages.every(name => typeof name === "string")
    && new Set(exception.allowedPackages).size === exception.allowedPackages.length, "invalid approved package scope");
  requireValue(isObject(report) && report.auditReportVersion === 2 && !Object.hasOwn(report, "error")
    && isObject(report.vulnerabilities) && isObject(report.metadata?.vulnerabilities), "missing, malformed or failed npm audit report");
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
  if (records.size === 0) return { exceptionUsed: false, acceptedPackages: [], expiresAt: exception.expiresAt };
  requireValue(now >= approvedAt && now < expiresAt, `temporary exception is not active; expires ${exception.expiresAt}`);

  const allowed = new Set(exception.allowedPackages);
  const reverse = new Map();
  const roots = new Set();
  for (const [name, finding] of records) {
    requireValue(allowed.has(name) && levels.indexOf(finding.severity) <= levels.indexOf(exception.maximumSeverity),
      `unapproved package or severity: ${name}`);
    requireValue(Array.isArray(finding.nodes) && finding.nodes.length > 0, `missing affected nodes for ${name}`);
    for (const node of finding.nodes) {
      requireValue(typeof node === "string" && !node.includes("\\") && !node.split("/").includes("..")
        && (node === `node_modules/${name}` || node.endsWith(`/node_modules/${name}`))
        && Object.hasOwn(lockfile.packages, node), `unknown affected node for ${name}`);
      const entry = lockfile.packages[node];
      requireValue(entry.dev === true && entry.link !== true, `affected package is not exclusively a packed development dependency: ${name}`);
      if (name === "picomatch") {
        requireValue(node === exception.node && entry.version === exception.version
          && entry.resolved === exception.resolved && entry.integrity === exception.integrity,
        "picomatch origin, version or installation path changed");
      }
    }
    requireValue(Array.isArray(finding.via) && finding.via.length > 0, `missing advisory provenance for ${name}`);
    for (const via of finding.via) {
      if (typeof via === "string") {
        requireValue(records.has(via), `unknown advisory dependency: ${via}`);
        if (!reverse.has(via)) reverse.set(via, []);
        reverse.get(via).push(name);
      } else {
        requireValue(isObject(via) && name === "picomatch" && via.name === "picomatch"
          && via.dependency === "picomatch" && via.url === exception.url
          && levels.includes(via.severity) && levels.indexOf(via.severity) <= levels.indexOf(exception.maximumSeverity),
        `unapproved advisory affecting ${name}`);
        roots.add(name);
      }
    }
  }
  // npm's metavulnerability graph can contain cycles (e.g. Vitest/coverage).
  // Every node must still lead to the one allowed advisory, without other leaves.
  const reachable = new Set(roots);
  const queue = [...roots];
  for (let i = 0; i < queue.length; i++) {
    for (const parent of reverse.get(queue[i]) ?? []) {
      if (!reachable.has(parent)) { reachable.add(parent); queue.push(parent); }
    }
  }
  requireValue(roots.has("picomatch") && reachable.size === records.size, "findings are not entirely attributable to the approved advisory");
  return { exceptionUsed: true, acceptedPackages: [...records.keys()].sort(), expiresAt: exception.expiresAt };
}
