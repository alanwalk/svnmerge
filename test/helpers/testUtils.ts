import * as path from 'path';

/**
 * Test helper utilities
 */

export const MOCK_SVN_PATH = path.join(__dirname, '../bin/svn');
export const FIXTURES_DIR = path.join(__dirname, '../fixtures');

/**
 * Create test environment with mock SVN
 */
export function createTestEnv(scenario: string = 'no-conflicts') {
  return {
    ...process.env,
    PATH: `${path.join(__dirname, '../bin')}:${process.env.PATH}`,
    TEST_SCENARIO: scenario
  };
}

/**
 * Reset scenario state
 */
export function resetScenario(scenario: string) {
  const fs = require('fs');
  const stateFile = path.join(FIXTURES_DIR, scenario, 'state.json');

  if (fs.existsSync(stateFile)) {
    const originalFile = path.join(FIXTURES_DIR, scenario, 'state.original.json');
    if (fs.existsSync(originalFile)) {
      fs.copyFileSync(originalFile, stateFile);
    }
  }
}

/**
 * Get scenario state
 */
export function getScenarioState(scenario: string) {
  const fs = require('fs');
  const stateFile = path.join(FIXTURES_DIR, scenario, 'state.json');

  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  }

  return { conflicts: [] };
}

/**
 * Create temporary test directory
 */
export function createTempDir(): string {
  const fs = require('fs');
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svnmerge-test-'));
  return tmpDir;
}

/**
 * Clean up temporary directory
 */
export function cleanupTempDir(dir: string) {
  const fs = require('fs');
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
