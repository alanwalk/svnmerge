#!/usr/bin/env node

import { Command } from 'commander';
import { DaemonManager } from './daemon/manager';
import chalk from 'chalk';

const program = new Command();
const manager = new DaemonManager();

program
  .name('svnmerge-daemon')
  .description('SVN Merge Tool Daemon Manager')
  .version('2.0.0');

program
  .command('start')
  .description('Start the daemon service')
  .action(async () => {
    try {
      await manager.start();
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop the daemon service')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds', '10000')
  .action(async (options) => {
    try {
      await manager.stop(parseInt(options.timeout));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('restart')
  .description('Restart the daemon service')
  .action(async () => {
    try {
      await manager.restart();
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show daemon status')
  .action(async () => {
    try {
      const status = await manager.status();

      if (status.running) {
        console.log(chalk.green('✓ Daemon is running'));
        console.log(chalk.gray('  PID:'), status.pid);
        console.log(chalk.gray('  Started:'), status.startTime?.toLocaleString());
        console.log(chalk.gray('  Uptime:'), formatUptime(status.uptime!));
        console.log(chalk.gray('  Logs:'), manager.getLogPath());
      } else {
        console.log(chalk.yellow('✗ Daemon is not running'));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('Show daemon logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .action(async (options) => {
    const logPath = manager.getLogPath();
    const { spawn } = require('child_process');

    if (options.follow) {
      // 使用 tail -f 跟踪日志
      const tail = spawn('tail', ['-f', logPath], { stdio: 'inherit' });

      process.on('SIGINT', () => {
        tail.kill();
        process.exit(0);
      });
    } else {
      // 显示最后 N 行
      const tail = spawn('tail', ['-n', options.lines, logPath], { stdio: 'inherit' });

      tail.on('close', (code: number) => {
        process.exit(code);
      });
    }
  });

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

program.parse();
