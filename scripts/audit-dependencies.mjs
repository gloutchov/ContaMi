import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { assessDependencyAudit, parseDependencyAuditPolicy } from "./lib/dependency-audit.mjs";

try {
  if (!process.env.npm_execpath) throw new Error("Use npm run audit:release");
  const policy = parseDependencyAuditPolicy(JSON.parse(await readFile(new URL("../config/dependency-audit.json", import.meta.url), "utf8")));
  const result = spawnSync(process.execPath, [process.env.npm_execpath, "audit", "--json"], {
    encoding: "utf8", maxBuffer: policy.maxOutputBytes, timeout: policy.timeoutMs,
  });
  if (result.error || ![0, 1].includes(result.status)) throw new Error("AUDIT_COMMAND_FAILED");
  const report = JSON.parse(result.stdout);
  // Preserve the complete report, including accepted findings, in local/CI output.
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const assessment = assessDependencyAudit(report, policy);
  console.log(`Dependency audit gate passed: ${assessment.totals.total} known moderate findings, ${assessment.acceptedAdvisories.length} reviewed advisories; exception expires ${assessment.expiresOn}.`);
} catch (error) {
  console.error(`Dependency audit gate failed: ${error instanceof Error ? error.message : "AUDIT_FAILED"}`);
  process.exitCode = 1;
}
