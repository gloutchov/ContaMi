// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { IPC } from "../../src/shared/ipc.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
let compiled;

beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build-electron.mjs"], {
    cwd: root, timeout: 20_000, maxBuffer: 65_536,
  });
  compiled = readFileSync(new URL("../../dist-electron/preload.cjs", import.meta.url), "utf8");
});

function loadPreload() {
  const invoke = vi.fn().mockResolvedValue({ synthetic: true });
  const expose = vi.fn();
  const requireModule = vi.fn(name => {
    if (name !== "electron") throw new Error(`Unavailable in sandboxed preload: ${name}`);
    return { contextBridge: { exposeInMainWorld: expose }, ipcRenderer: { invoke } };
  });
  // Electron 45 removes the former events/timers/url shims and these globals.
  // Execute the production build with only the remaining Electron capability.
  runInNewContext(compiled, {
    require: requireModule,
    process: Object.freeze({ sandboxed: true, contextIsolated: true }),
    Buffer: undefined, setImmediate: undefined, clearImmediate: undefined,
  }, { timeout: 1_000 });
  return { api: expose.mock.calls[0]?.[1], expose, invoke, requireModule };
}

describe("Electron 45 sandboxed production preload", () => {
  it("boots without removed Node shims and exposes only the frozen bridge", () => {
    const { api, expose, requireModule } = loadPreload();
    expect(expose).toHaveBeenCalledTimes(1);
    expect(expose.mock.calls[0][0]).toBe("contami");
    expect(requireModule.mock.calls).toEqual([["electron"]]);
    expect(Object.isFrozen(api)).toBe(true);
    for (const capability of ["require", "ipcRenderer", "invoke", "send", "fs", "process"]) {
      expect(api[capability]).toBeUndefined();
    }
  });

  it("preserves settings and snapshot IPC with native EventEmitter shims absent", async () => {
    const { api, invoke } = loadPreload();
    const patch = { language: "en", theme: "dark" };
    await expect(api.getSettings()).resolves.toEqual({ synthetic: true });
    await api.updateSettings(patch);
    await api.getSnapshot();
    expect(invoke.mock.calls).toEqual([
      [IPC.settingsGet], [IPC.settingsUpdate, patch], [IPC.financeSnapshot],
    ]);
  });

  it("keeps command and report arguments on their dedicated channels", async () => {
    const { api, invoke } = loadPreload();
    const command = { type: "synthetic-command" };
    const request = { scope: "synthetic-report" };
    await api.execute(command);
    await api.generatePensionReport(request);
    expect(invoke.mock.calls).toEqual([
      [IPC.financeExecute, command], [IPC.pensionReportGenerate, request],
    ]);
  });
});
