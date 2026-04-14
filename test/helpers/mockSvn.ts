import * as fs from 'fs';
import * as path from 'path';

export interface MockSvnState {
  status: string;
  conflicts: Array<{
    path: string;
    type: 'text' | 'property' | 'tree' | 'binary';
    description?: string;
  }>;
  hasUncommittedChanges: boolean;
  mergeResults: Map<string, { success: boolean; error?: string }>;
  resolveResults: Map<string, { success: boolean; error?: string }>;
  updateCalled: boolean;
  commitCalled: boolean;
  commitMessage?: string;
}

export class MockSvnController {
  private state: MockSvnState;
  private stateFile: string;

  constructor(stateFile: string) {
    this.stateFile = stateFile;
    this.state = {
      status: '',
      conflicts: [],
      hasUncommittedChanges: false,
      mergeResults: new Map(),
      resolveResults: new Map(),
      updateCalled: false,
      commitCalled: false
    };
    this.saveState();
  }

  private saveState(): void {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      this.stateFile,
      JSON.stringify({
        ...this.state,
        mergeResults: Array.from(this.state.mergeResults.entries()),
        resolveResults: Array.from(this.state.resolveResults.entries())
      }),
      'utf-8'
    );
  }

  setStatus(status: string): void {
    this.state.status = status;
    this.saveState();
  }

  addConflict(conflict: MockSvnState['conflicts'][0]): void {
    this.state.conflicts.push(conflict);
    this.updateStatusFromConflicts();
    this.saveState();
  }

  setHasUncommittedChanges(value: boolean): void {
    this.state.hasUncommittedChanges = value;
    this.saveState();
  }

  setMergeResult(revision: string, result: { success: boolean; error?: string }): void {
    this.state.mergeResults.set(revision, result);
    this.saveState();
  }

  setResolveResult(filepath: string, result: { success: boolean; error?: string }): void {
    this.state.resolveResults.set(filepath, result);
    this.saveState();
  }

  getState(): MockSvnState {
    return this.state;
  }

  reset(): void {
    this.state = {
      status: '',
      conflicts: [],
      hasUncommittedChanges: false,
      mergeResults: new Map(),
      resolveResults: new Map(),
      updateCalled: false,
      commitCalled: false
    };
    this.saveState();
  }

  private updateStatusFromConflicts(): void {
    const lines: string[] = [];

    for (const conflict of this.state.conflicts) {
      if (conflict.type === 'text') {
        lines.push(`C       ${conflict.path}`);
      } else if (conflict.type === 'property') {
        lines.push(` C      ${conflict.path}`);
      } else if (conflict.type === 'tree') {
        lines.push(`      C ${conflict.path}`);
        if (conflict.description) {
          lines.push(`      >   ${conflict.description}`);
        }
      } else if (conflict.type === 'binary') {
        lines.push(`C       ${conflict.path}`);
      }
    }

    this.state.status = lines.join('\n');
  }
}

export function createMockSvnScript(stateFile: string): string {
  return `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const stateFile = '${stateFile}';

function loadState() {
  if (!fs.existsSync(stateFile)) {
    return {
      status: '',
      conflicts: [],
      hasUncommittedChanges: false,
      mergeResults: [],
      resolveResults: [],
      updateCalled: false,
      commitCalled: false
    };
  }
  const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  return {
    ...data,
    mergeResults: new Map(data.mergeResults || []),
    resolveResults: new Map(data.resolveResults || [])
  };
}

function saveState(state) {
  fs.writeFileSync(
    stateFile,
    JSON.stringify({
      ...state,
      mergeResults: Array.from(state.mergeResults.entries()),
      resolveResults: Array.from(state.resolveResults.entries())
    }),
    'utf-8'
  );
}

const args = process.argv.slice(2);
const command = args[0];

const state = loadState();

if (command === 'status') {
  if (state.hasUncommittedChanges || state.status) {
    console.log(state.status);
  }
  process.exit(0);
} else if (command === 'merge') {
  const revisionIndex = args.indexOf('-c');
  if (revisionIndex !== -1 && revisionIndex + 1 < args.length) {
    const revision = args[revisionIndex + 1];
    const result = state.mergeResults.get(revision);
    if (result && !result.success) {
      console.error(result.error || 'Merge failed');
      process.exit(1);
    }
  }
  console.log('Merge completed');
  process.exit(0);
} else if (command === 'resolve') {
  const acceptIndex = args.indexOf('--accept');
  if (acceptIndex !== -1 && acceptIndex + 2 < args.length) {
    const filepath = args[acceptIndex + 2].replace(/"/g, '');
    const result = state.resolveResults.get(filepath);
    if (result && !result.success) {
      console.error(result.error || 'Resolve failed');
      process.exit(1);
    }
  }
  console.log('Resolved');
  process.exit(0);
} else if (command === 'update') {
  state.updateCalled = true;
  saveState(state);
  console.log('Updated to revision 1234');
  process.exit(0);
} else if (command === 'commit') {
  state.commitCalled = true;
  const messageIndex = args.indexOf('-m');
  if (messageIndex !== -1 && messageIndex + 1 < args.length) {
    state.commitMessage = args[messageIndex + 1].replace(/"/g, '');
  }
  saveState(state);
  console.log('Committed revision 1235');
  process.exit(0);
}

console.error('Unknown command: ' + command);
process.exit(1);
`;
}
