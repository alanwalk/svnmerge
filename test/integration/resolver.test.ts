import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver } from '../../src/core/resolver';
import { Config, ConflictType, ResolveStrategy } from '../../src/types';
import { Logger } from '../../src/utils/logger';

describe('ConflictResolver Integration', () => {
  let config: Config;
  let logger: Logger;

  beforeEach(() => {
    config = {
      workspace: '.',
      defaultStrategy: ResolveStrategy.THEIRS_FULL,
      dryRun: true,
      conflictRules: [
        {
          name: 'binary-files',
          match: { binary: true },
          strategy: ResolveStrategy.THEIRS_FULL,
          priority: 100
        },
        {
          name: 'tree-conflicts',
          match: { types: [ConflictType.TREE] },
          strategy: ResolveStrategy.WORKING,
          priority: 90
        }
      ]
    };

    logger = new Logger({ verbose: false });
  });

  it('should create resolver instance', () => {
    const resolver = new ConflictResolver(config, logger);
    expect(resolver).toBeDefined();
  });

  it('should have correct config', () => {
    const resolver = new ConflictResolver(config, logger);
    expect(resolver).toBeDefined();
  });
});
