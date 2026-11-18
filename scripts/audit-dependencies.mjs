import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { auditArguments, evaluateAuditReport } from "./audit-policy.mjs";

const execute = promisify(execFile);

try {
  if (process.argv.length !== 2) throw new Error("Run npm run audit:ci without arguments.");
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error("Run this check through npm run audit:ci.");
  const [policy, lockfile] = await Promise.all([
    readFile(new URL("./dependency-audit-policy.json", import.meta.url), "utf8").then(JSON.parse),
    readFile("package-lock.json", "utf8").then(JSON.parse),
  ]);
  let result;
  try {
    result = { ...await execute(process.execPath, [npm, ...auditArguments], {
      timeout: 165000, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
    }), exitCode: 0 };
  } catch (error) {
    if (typeof error.code !== "number" || error.killed || error.signal) throw error;
    result = { stdout: error.stdout, stderr: error.stderr, exitCode: error.code };
  }
  // Keep the entire unfiltered report visible, including accepted findings.
  process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const decision = evaluateAuditReport({ report: JSON.parse(result.stdout), lockfile, policy, exitCode: result.exitCode });
  if (decision.exceptionUsed) {
    console.log(`AUDIT POLICY: accepted ${decision.acceptedPackages.length} development findings only for GHSA-fc5q-39xc-vjpf until ${decision.expiresAt}.`);
  } else {
    console.log("AUDIT POLICY: clean full audit; remove the unused temporary exception.");
  }
} catch (error) {
  console.error(`AUDIT POLICY BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
