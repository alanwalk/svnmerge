import * as fs from 'fs';
import * as path from 'path';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志记录器
 */
export class Logger {
  private logFile?: string;
  private verbose: boolean;
  private level: LogLevel;

  constructor(options: { logFile?: string; verbose?: boolean; level?: LogLevel } = {}) {
    this.logFile = options.logFile;
    this.verbose = options.verbose || false;
    this.level = options.level || LogLevel.INFO;

    if (this.logFile) {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private writeToFile(message: string): void {
    if (this.logFile) {
      fs.appendFileSync(this.logFile, message + '\n', 'utf-8');
    }
  }

  debug(message: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.formatMessage('DEBUG', message);
    if (this.verbose) {
      console.log(formatted);
    }
    this.writeToFile(formatted);
  }

  info(message: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.formatMessage('INFO', message);
    console.log(message);
    this.writeToFile(formatted);
  }

  warn(message: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.formatMessage('WARN', message);
    console.warn(message);
    this.writeToFile(formatted);
  }

  error(message: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.formatMessage('ERROR', message);
    console.error(message);
    this.writeToFile(formatted);
  }

  section(title: string): void {
    const line = '='.repeat(70);
    this.info(line);
    this.info(title);
    this.info(line);
  }

  subsection(title: string): void {
    const line = '-'.repeat(70);
    this.info(line);
    this.info(title);
    this.info(line);
  }
}
