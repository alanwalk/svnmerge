import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Test directories
export const TEST_ROOT = path.join(__dirname, '.tmp');
export const TEST_WORKSPACE = path.join(TEST_ROOT, 'workspace');
export const TEST_CONFIG_DIR = path.join(TEST_ROOT, 'config');
export const TEST_LOG_DIR = path.join(TEST_ROOT, 'logs');

// Setup before all tests
beforeAll(() => {
  // Set up mock SVN in PATH
  const mockSvnPath = path.join(__dirname, 'bin');
  process.env.PATH = `${mockSvnPath}:${process.env.PATH}`;
});

// Clean up after all tests
afterAll(() => {
  // Clean up test directories
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

// Setup before each test
beforeEach(() => {
  // Create test directories
  [TEST_ROOT, TEST_WORKSPACE, TEST_CONFIG_DIR, TEST_LOG_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
});

// Clean up after each test
afterEach(() => {
  // Clean up test directories
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});
