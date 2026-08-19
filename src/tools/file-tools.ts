/**
 * 工作区文件级工具:
 *   - file_tree   查:递归目录树(供 Agent 感知 VSCode 风格目录结构)
 *   - file_delete 删:移入 .trash 回收站(带时间戳,可恢复)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createTextContent, type Tool } from '@aipack-ai/agent';
import type { Workspace } from '../workspace.js';
import { resolveInWorkspace, assertExists } from '../workspace.js';
import { buildFileTree, treeToText } from '../file-tree.js';

// ─── 查:file_tree ─────────────────────────────────────────────────

export function createFileTreeTool(ws: Workspace): Tool {
  return {
    name: 'file_tree',
    description:
      '返回工作区递归目录树(文件夹 + 文件,跳过隐藏/.trash/.bak)。' +
      '当用户说"打开 reports 文件夹""列出所有 Excel"或需要感知目录结构时调用。',
    parameters: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: '可选,只列某子目录(相对工作区,如 "reports")' },
        depth: { type: 'number', description: '可选,递归深度(默认 3,上限 10)' },
      },
    },
    permissions: ['fs:read'],
    async execute(_toolCallId, args) {
      const { dir, depth } = (args ?? {}) as { dir?: string; depth?: number };
      try {
        const targetDepth = Math.min(Math.max(depth ?? 3, 0), 10);
        if (dir) {
          const subAbs = resolveInWorkspace(ws.root, dir);
          const tree = await buildFileTree(subAbs, dir, targetDepth);
          return {
            content: [createTextContent(`目录 ${dir} 树:\n${treeToText(tree)}`)],
            details: { dir, tree },
          };
        }
        const tree = await buildFileTree(ws.root, '', targetDepth);
        return {
          content: [createTextContent(`工作区目录树:\n${treeToText(tree)}`)],
          details: { tree },
        };
      } catch (err) {
        return {
          content: [createTextContent(`[file_tree] ${(err as Error).message}`)],
          details: { error: (err as Error).message },
        };
      }
    },
  };
}

// ─── 删:file_delete(移入回收站)───────────────────────────────────

export function createFileDeleteTool(ws: Workspace): Tool {
  return {
    name: 'file_delete',
    description:
      '删除工作区文件:文件会被移入 .trash 回收站(带时间戳),而不是物理删除。' +
      '删除前请先向用户确认文件路径与意图。',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: '要删除的文件路径(相对工作区)' },
      },
      required: ['filePath'],
    },
    permissions: ['fs:write'],
    async execute(_toolCallId, args) {
      const { filePath } = (args ?? {}) as { filePath?: string };
      try {
        if (!filePath) throw new Error('缺少 filePath 参数');
        const abs = resolveInWorkspace(ws.root, filePath);
        await assertExists(abs);
        if (filePath.startsWith('.trash')) throw new Error('不能删除回收站内的文件');

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const trashPath = path.join(ws.root, '.trash', `${path.basename(abs)}.${stamp}`);
        await fs.rename(abs, trashPath);
        return {
          content: [createTextContent(`已删除 ${filePath}(移入回收站 .trash/)`)],
          details: { filePath, action: 'delete', trashPath: path.relative(ws.root, trashPath) },
        };
      } catch (err) {
        return {
          content: [createTextContent(`[file_delete] ${(err as Error).message}`)],
          details: { error: (err as Error).message },
        };
      }
    },
  };
}

/** 汇总导出文件工具集 */
export function createFileTools(ws: Workspace): Tool[] {
  return [createFileTreeTool(ws), createFileDeleteTool(ws)];
}
