import { Router, Request, Response } from 'express';
import { TaskManager } from './task-manager';
import {
  runSvnCommand,
  getConflicts,
  resolveConflict,
  merge,
  commit,
  getMergeInfo,
  getRevisionInfo,
  getRevisionsInfo,
  applyRevision
} from '../utils/svn';

/**
 * 创建 API 路由
 */
export function createApiRoutes(taskManager: TaskManager): Router {
  const router = Router();

  /**
   * 获取仓库信息
   */
  router.get('/repo/info', async (req: Request, res: Response) => {
    const taskId = taskManager.createTask('repo-info');

    try {
      taskManager.startTask(taskId);
      const cwd = (req.query.cwd as string) || process.cwd();

      const { stdout } = await runSvnCommand('svn info', cwd);

      // 解析 svn info 输出
      const info: any = {};
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+?):\s*(.+)$/);
        if (match) {
          const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
          info[key] = match[2].trim();
        }
      }

      taskManager.completeTask(taskId, info);
      res.json({ taskId, status: 'completed', result: info });
    } catch (error: any) {
      taskManager.failTask(taskId, error.message);
      res.status(500).json({ taskId, status: 'failed', error: error.message });
    }
  });

  /**
   * 查询 revision 列表
   */
  router.post('/revisions/query', async (req: Request, res: Response) => {
    const { branchPath, limit = 100, offset = 0, filter } = req.body;

    if (!branchPath) {
      return res.status(400).json({ error: 'branchPath is required' });
    }

    const taskId = taskManager.createTask('revisions-query');
    res.json({ taskId, status: 'pending' });

    // 异步执行查询
    (async () => {
      try {
        taskManager.startTask(taskId);
        const cwd = req.body.cwd || process.cwd();

        taskManager.updateProgress(taskId, {
          current: 0,
          total: 1,
          message: 'Querying SVN log...'
        });

        // 构建 svn log 命令
        let command = `svn log --xml -v "${branchPath}"`;

        // 添加限制
        if (limit) {
          command += ` -l ${limit + offset}`;
        }

        // 添加过滤条件
        if (filter?.author) {
          command += ` --search "${filter.author}"`;
        }

        const { stdout } = await runSvnCommand(command, cwd);

        // 解析 XML
        const revisions: any[] = [];
        const logentryMatches = stdout.matchAll(/<logentry[^>]*revision="(\d+)"[^>]*>([\s\S]*?)<\/logentry>/g);

        let index = 0;
        for (const match of logentryMatches) {
          // 跳过 offset
          if (index < offset) {
            index++;
            continue;
          }

          const revision = parseInt(match[1], 10);
          const content = match[2];

          const authorMatch = content.match(/<author>([^<]+)<\/author>/);
          const dateMatch = content.match(/<date>([^<]+)<\/date>/);
          const messageMatch = content.match(/<msg>([^<]*)<\/msg>/);

          // 应用过滤器
          const author = authorMatch ? authorMatch[1] : 'unknown';
          const date = dateMatch ? dateMatch[1] : '';
          const message = messageMatch ? messageMatch[1] : '';

          if (filter?.author && !author.includes(filter.author)) continue;
          if (filter?.message && !message.includes(filter.message)) continue;
          if (filter?.dateFrom && new Date(date) < new Date(filter.dateFrom)) continue;
          if (filter?.dateTo && new Date(date) > new Date(filter.dateTo)) continue;

          revisions.push({
            revision,
            author,
            date,
            message: message.substring(0, 200) // 限制消息长度
          });

          index++;
        }

        taskManager.completeTask(taskId, { revisions, total: revisions.length });
      } catch (error: any) {
        taskManager.failTask(taskId, error.message);
      }
    })();
  });

  /**
   * 获取单个 revision 详情
   */
  router.get('/revisions/:revision/detail', async (req: Request, res: Response) => {
    const revision = parseInt(req.params.revision, 10);
    const branchPath = req.query.branchPath as string;
    const cwd = (req.query.cwd as string) || process.cwd();

    if (!branchPath) {
      return res.status(400).json({ error: 'branchPath is required' });
    }

    try {
      const info = await getRevisionInfo(branchPath, revision, cwd);

      if (!info) {
        return res.status(404).json({ error: 'Revision not found' });
      }

      res.json({
        revision: info.revision,
        author: info.author,
        date: info.date,
        message: info.message,
        paths: info.paths
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 开始合并操作
   */
  router.post('/merge/start', async (req: Request, res: Response) => {
    const { branchPath, revisions, cwd: workingDir } = req.body;

    if (!branchPath || !revisions || !Array.isArray(revisions)) {
      return res.status(400).json({ error: 'branchPath and revisions array are required' });
    }

    const taskId = taskManager.createTask('merge');
    res.json({ taskId, status: 'pending' });

    // 异步执行合并
    (async () => {
      try {
        taskManager.startTask(taskId);
        const cwd = workingDir || process.cwd();
        const total = revisions.length;
        const results: any[] = [];

        for (let i = 0; i < revisions.length; i++) {
          // 检查是否被取消
          if (taskManager.isCancelled(taskId)) {
            taskManager.cancelTask(taskId);
            return;
          }

          const revision = revisions[i];

          taskManager.updateProgress(taskId, {
            current: i,
            total,
            message: `Merging revision ${revision}...`,
            data: { revision, status: 'running' }
          });

          try {
            await merge(branchPath, revision.toString(), cwd);
            results.push({ revision, status: 'success' });

            taskManager.updateProgress(taskId, {
              current: i + 1,
              total,
              message: `Merged revision ${revision}`,
              data: { revision, status: 'success' }
            });
          } catch (error: any) {
            // 检查是否是冲突
            const conflicts = await getConflicts(cwd);
            if (conflicts.length > 0) {
              results.push({ revision, status: 'conflict', conflicts });

              taskManager.updateProgress(taskId, {
                current: i + 1,
                total,
                message: `Conflict in revision ${revision}`,
                data: { revision, status: 'conflict', conflicts }
              });
            } else {
              results.push({ revision, status: 'error', error: error.message });

              taskManager.updateProgress(taskId, {
                current: i + 1,
                total,
                message: `Error merging revision ${revision}`,
                data: { revision, status: 'error', error: error.message }
              });
            }
          }
        }

        taskManager.completeTask(taskId, { results });
      } catch (error: any) {
        taskManager.failTask(taskId, error.message);
      }
    })();
  });

  /**
   * 取消合并操作
   */
  router.post('/merge/cancel', async (req: Request, res: Response) => {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const cancelled = taskManager.cancelTask(taskId);

    if (cancelled) {
      res.json({ success: true, message: 'Task cancelled' });
    } else {
      res.status(404).json({ error: 'Task not found or already completed' });
    }
  });

  /**
   * 获取冲突列表
   */
  router.get('/conflicts', async (req: Request, res: Response) => {
    try {
      const cwd = (req.query.cwd as string) || process.cwd();
      const conflicts = await getConflicts(cwd);
      res.json({ conflicts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 解决冲突
   */
  router.post('/conflicts/resolve', async (req: Request, res: Response) => {
    const { filepath, strategy, revision, cwd: workingDir } = req.body;

    if (!filepath || !strategy) {
      return res.status(400).json({ error: 'filepath and strategy are required' });
    }

    const taskId = taskManager.createTask('resolve-conflict');
    res.json({ taskId, status: 'pending' });

    // 异步执行解决冲突
    (async () => {
      try {
        taskManager.startTask(taskId);
        const cwd = workingDir || process.cwd();

        taskManager.updateProgress(taskId, {
          current: 0,
          total: 1,
          message: `Resolving conflict for ${filepath}...`
        });

        // 如果策略是 newest 且提供了 revision，使用 applyRevision
        if (strategy === 'newest' && revision) {
          await applyRevision(filepath, revision, cwd);
        } else {
          await resolveConflict(filepath, strategy, cwd);
        }

        taskManager.completeTask(taskId, { filepath, strategy });
      } catch (error: any) {
        taskManager.failTask(taskId, error.message);
      }
    })();
  });

  /**
   * 批量解决所有冲突
   */
  router.post('/conflicts/resolve-all', async (req: Request, res: Response) => {
    const { strategy = 'theirs-full', cwd: workingDir } = req.body;

    const taskId = taskManager.createTask('resolve-all-conflicts');
    res.json({ taskId, status: 'pending' });

    // 异步执行批量解决
    (async () => {
      try {
        taskManager.startTask(taskId);
        const cwd = workingDir || process.cwd();

        const conflicts = await getConflicts(cwd);
        const total = conflicts.length;

        if (total === 0) {
          taskManager.completeTask(taskId, { message: 'No conflicts to resolve' });
          return;
        }

        const results: any[] = [];

        for (let i = 0; i < conflicts.length; i++) {
          const conflict = conflicts[i];

          taskManager.updateProgress(taskId, {
            current: i,
            total,
            message: `Resolving ${conflict.path}...`
          });

          try {
            await resolveConflict(conflict.path, strategy, cwd);
            results.push({ path: conflict.path, status: 'success' });
          } catch (error: any) {
            results.push({ path: conflict.path, status: 'error', error: error.message });
          }
        }

        taskManager.completeTask(taskId, { results });
      } catch (error: any) {
        taskManager.failTask(taskId, error.message);
      }
    })();
  });

  /**
   * 获取 mergeinfo
   */
  router.get('/mergeinfo', async (req: Request, res: Response) => {
    try {
      const cwd = (req.query.cwd as string) || process.cwd();
      const mergeInfo = await getMergeInfo(cwd);
      res.json({ mergeInfo });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * 提交更改
   */
  router.post('/commit', async (req: Request, res: Response) => {
    const { message, cwd: workingDir } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'commit message is required' });
    }

    const taskId = taskManager.createTask('commit');
    res.json({ taskId, status: 'pending' });

    // 异步执行提交
    (async () => {
      try {
        taskManager.startTask(taskId);
        const cwd = workingDir || process.cwd();

        taskManager.updateProgress(taskId, {
          current: 0,
          total: 1,
          message: 'Committing changes...'
        });

        await commit(message, cwd);

        taskManager.completeTask(taskId, { message: 'Changes committed successfully' });
      } catch (error: any) {
        taskManager.failTask(taskId, error.message);
      }
    })();
  });

  /**
   * 获取任务状态
   */
  router.get('/tasks/:taskId', (req: Request, res: Response) => {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  });

  /**
   * 获取所有任务
   */
  router.get('/tasks', (req: Request, res: Response) => {
    const tasks = taskManager.getAllTasks();
    res.json({ tasks });
  });

  return router;
}
