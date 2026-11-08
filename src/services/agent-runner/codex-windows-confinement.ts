/**
 * Process-lifetime memory for Codex on Windows when its unelevated
 * restricted-token sandbox refuses the claude-mem-refresh profile's split
 * filesystem reads (#5163). After the first exact refusal, later agent runs
 * skip that Codex executable+version so a doomed `codex exec` is not paid for
 * every refresh. The refresh profile itself is never loosened.
 */

/** Codex stderr/stdout that means the unelevated sandbox cannot enforce split reads. */
export const CODEX_UNELEVATED_SPLIT_FS_REFUSAL =
  /unelevated restricted-token sandbox cannot enforce split filesystem read restrictions/i;

/** User-facing setup explanation shown once per remembered Codex key. */
export const CODEX_WINDOWS_CONFINEMENT_SETUP_MESSAGE =
  'Codex refused this refresh because its Windows unelevated sandbox cannot enforce the required read restrictions. Use an administrator-provisioned elevated sandbox or a supported MXC sandbox. The existing provider fallback remains available; filesystem restrictions were preserved.';

/** Quiet reason used when a later run skips a remembered Codex without re-showing setup. */
export const CODEX_WINDOWS_CONFINEMENT_SKIP_MESSAGE =
  'Codex cannot confine agent runs on this machine with the current executable and version (Windows unelevated sandbox).';

export function codexWindowsConfinementKey(executable: string, version: string): string {
  return `${executable}\0${version}`;
}

interface RememberedCodex {
  /** Whether the setup explanation has already been shown for this key. */
  setupMessageShown: boolean;
}

/** Worker-process memory: keyed by realpath + version string. */
const rememberedUnableToConfine = new Map<string, RememberedCodex>();

/** Test helper: drop every remembered Codex key. */
export function clearCodexWindowsConfinementMemory(): void {
  rememberedUnableToConfine.clear();
}

export function isCodexRememberedUnableToConfine(key: string): boolean {
  return rememberedUnableToConfine.has(key);
}

/** True when any Codex executable+version is remembered unable to confine. */
export function hasRememberedCodexUnableToConfine(): boolean {
  return rememberedUnableToConfine.size > 0;
}

/**
 * Remember that this Codex cannot confine agent runs. Returns whether the
 * setup explanation should be shown now (true only the first time for `key`).
 */
export function rememberCodexUnableToConfine(key: string): { showSetupMessage: boolean } {
  const existing = rememberedUnableToConfine.get(key);
  if (existing) {
    if (existing.setupMessageShown) return { showSetupMessage: false };
    existing.setupMessageShown = true;
    return { showSetupMessage: true };
  }
  rememberedUnableToConfine.set(key, { setupMessageShown: true });
  return { showSetupMessage: true };
}

/** First line of `codex --version` (stdout or stderr), or `unknown` when empty. */
export function parseCodexVersionOutput(stdout: string, stderr: string): string {
  const line = `${stdout}\n${stderr}`.split(/\r?\n/).map(part => part.trim()).find(Boolean);
  return line || 'unknown';
}
