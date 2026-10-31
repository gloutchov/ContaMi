// Run potentially expensive advisory regressions in a bounded child, never the test runner.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { setTimeout } from "node:timers/promises";

const [mode, consumerEntry, cwd] = process.argv.slice(2);
const requireFromConsumer = createRequire(consumerEntry);

if (mode === "minimatch") {
  const { Minimatch } = requireFromConsumer("minimatch");
  // GHSA-g3hv-75wg-m249: **/.. splits must respect the expansion budget.
  const matcher = new Minimatch(Array(8).fill("**/../a/b").join("/"), {
    optimizationLevel: 2, braceExpandMax: 64,
  });
  assert.equal(matcher.set.length, 64);
  const small = new Minimatch("**/../a/b/**/../c/d", { optimizationLevel: 2 });
  assert.equal(small.match("../a/b/../c/d"), true);
  assert.equal(small.match("x/a/b/y/c/d"), true);
} else if (mode === "glob") {
  const { glob, globStream } = requireFromConsumer("glob");
  for (const stream of [false, true]) {
    const controller = new AbortController();
    const reason = new Error("synthetic-traversal-budget");
    let reads = 0;
    const countedFs = { ...fs, readdir(...args) {
      if (++reads === 1) controller.abort(reason);
      return fs.readdir(...args);
    } };
    const options = { cwd, signal: controller.signal, fs: countedFs };
    await assert.rejects(async () => {
      if (stream) {
        for await (const entry of globStream("**", options)) void entry;
      } else await glob("**", options);
    }, /synthetic-traversal-budget/);
    const atReject = reads;
    await setTimeout(100);
    assert.equal(atReject, 1);
    assert.equal(reads, atReject, "directory reads continued after cancellation");
  }
} else throw new Error("Unknown dependency probe");
console.log("regression passed");
