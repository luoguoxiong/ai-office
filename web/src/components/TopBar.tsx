/** 顶栏:打开文件夹 + 工作区名(阶段 G 加模型选择/设置) */
import { pickWorkspaceDir, isTauri } from '../api/client';
import { useWorkspaceStore } from '../store/workspaceStore';

export function TopBar() {
  const name = useWorkspaceStore((s) => s.name);
  const loading = useWorkspaceStore((s) => s.loading);
  const openFolder = useWorkspaceStore((s) => s.openFolder);

  const handleOpen = async () => {
    if (isTauri()) {
      const path = await pickWorkspaceDir();
      if (path) await openFolder(path);
    } else {
      // 浏览器模式:手动输入路径
      const path = window.prompt('浏览器模式:请输入文件夹绝对路径', '');
      if (path && path.trim()) await openFolder(path.trim());
    }
  };

  return (
    <div className="h-11 flex items-center px-3 gap-3 bg-neutral-800 border-b border-neutral-700 text-neutral-200 select-none">
      <button
        onClick={handleOpen}
        disabled={loading}
        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
      >
        📁 打开文件夹
      </button>
      <span className="text-sm text-neutral-400 truncate">
        {name ? name : '(未选择工作区)'}
      </span>
      <span className="ml-auto text-xs text-neutral-500">
        AI Office
      </span>
    </div>
  );
}
