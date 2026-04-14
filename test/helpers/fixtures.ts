import * as fs from 'fs';
import * as path from 'path';
import { Config, ConflictRule, ConflictType, ResolveStrategy } from '../../src/types';

export function createTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    workspace: '.',
    defaultStrategy: ResolveStrategy.THEIRS_FULL,
    ignore: [],
    conflictRules: [],
    verbose: false,
    dryRun: false,
    autoCommit: false,
    ...overrides
  };
}

export function createTestRule(overrides: Partial<ConflictRule> = {}): ConflictRule {
  return {
    name: 'test-rule',
    match: {},
    strategy: ResolveStrategy.THEIRS_FULL,
    priority: 0,
    ...overrides
  };
}

export function createTestFile(filepath: string, content: string = ''): void {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, content, 'utf-8');
}

export function createBinaryFile(filepath: string): void {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
  fs.writeFileSync(filepath, buffer);
}

export const sampleConflictRules: ConflictRule[] = [
  {
    name: 'binary-files',
    description: 'Binary files use theirs-full',
    match: {
      binary: true
    },
    strategy: ResolveStrategy.THEIRS_FULL,
    priority: 100
  },
  {
    name: 'tree-conflicts',
    description: 'Tree conflicts use working',
    match: {
      types: [ConflictType.TREE]
    },
    strategy: ResolveStrategy.WORKING,
    priority: 90
  },
  {
    name: 'config-files',
    description: 'Config files need manual review',
    match: {
      paths: ['**/config/**', '**/*.config.*']
    },
    strategy: ResolveStrategy.MANUAL,
    priority: 80
  },
  {
    name: 'json-files',
    description: 'JSON files use mine-full',
    match: {
      extensions: ['.json', 'json']
    },
    strategy: ResolveStrategy.MINE_FULL,
    priority: 70
  },
  {
    name: 'text-conflicts',
    description: 'Text conflicts use theirs-full',
    match: {
      types: [ConflictType.TEXT]
    },
    strategy: ResolveStrategy.THEIRS_FULL,
    priority: 50
  }
];

export const sampleConfigYaml = `workspace: .
from: https://svn.example.com/repo/branches/feature
defaultStrategy: theirs-full
ignore:
  - node_modules
  - dist
  - .git
output: logs

conflictRules:
  - name: binary-files
    description: Binary files use theirs-full
    match:
      binary: true
    strategy: theirs-full
    priority: 100

  - name: tree-conflicts
    description: Tree conflicts use working
    match:
      types:
        - tree
    strategy: working
    priority: 90

  - name: config-files
    description: Config files need manual review
    match:
      paths:
        - "**/config/**"
        - "**/*.config.*"
    strategy: manual
    priority: 80
`;
