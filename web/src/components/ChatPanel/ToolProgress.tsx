/** 工具执行进度指示器:SSE tool 事件 → 小标签显示 start(蓝)/end(绿/红)。
 * 通常嵌套在 assistant 消息底部。 */
import type { ToolEvent } from '../../types/chat';

function toolLabel(name: string): string {
  // 把工具名映射成更友好的展示名
  const map: Record<string, string> = {
    office_read: '读取 Office',
    office_help: '查询命令',
    office_exec: '修改 Office',
    file_tree: '浏览目录',
  };
  return map[name] ?? name;
}

export function ToolProgress({ events }: { events: ToolEvent[] }) {
  if (!events || events.length === 0) return null;
  // 仅显示最新的 6 个(避免长历史过多干扰)
  const recent = events.slice(-6);
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {recent.map((ev, i) => {
        const running = ev.state === 'start';
        const bad = ev.state === 'end' && ev.isError;
        const ok = ev.state === 'end' && !ev.isError;
        return (
          <span
            key={i}
            className={`text-[11px] px-1.5 py-0.5 rounded border font-mono ${
              running
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 animate-pulse'
                : bad
                  ? 'bg-red-500/15 text-red-300 border-red-500/40'
                  : ok
                    ? 'bg-green-500/15 text-green-300 border-green-500/40'
                    : 'bg-neutral-700/50 text-neutral-300 border-neutral-600'
            }`}
          >
            {running ? '⏳ ' : bad ? '❌ ' : ok ? '✅ ' : ''}
            {toolLabel(ev.toolName)}
          </span>
        );
      })}
    </div>
  );
}
