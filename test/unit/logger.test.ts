import { describe, it, expect } from 'vitest';
import { Logger, LogLevel } from '../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Logger', () => {
  it('should create logger without log file', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it('should create logger with log file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    const logFile = path.join(tmpDir, 'test.log');

    const logger = new Logger({ logFile });
    logger.info('Test message');

    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).toContain('Test message');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should respect log level', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    const logFile = path.join(tmpDir, 'test.log');

    const logger = new Logger({ logFile, level: LogLevel.WARN });
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');

    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).not.toContain('Debug message');
    expect(content).not.toContain('Info message');
    expect(content).toContain('Warn message');
    expect(content).toContain('Error message');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should create log directory if not exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    const logFile = path.join(tmpDir, 'logs', 'nested', 'test.log');

    const logger = new Logger({ logFile });
    logger.info('Test message');

    expect(fs.existsSync(logFile)).toBe(true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });
});
