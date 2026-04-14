import { describe, it, expect, beforeEach } from 'vitest';
import { MergeManager } from '../../src/core/manager';
import { Config, ResolveStrategy } from '../../src/types';
import { Logger } from '../../src/utils/logger';

describe('MergeManager Integration', () => {
  let config: Config;
  let logger: Logger;

  beforeEach(() => {
    config = {
      workspace: '.',
      defaultStrategy: ResolveStrategy.THEIRS_FULL,
      dryRun: true
    };

    logger = new Logger({ verbose: false });
  });

  it('should create manager instance', () => {
    const manager = new MergeManager(config, logger);
    expect(manager).toBeDefined();
  });
});
