/** Office 文件预览区:根据 kind 渲染。
 * - office → iframe 嵌入 officecli watch 预览(modifiedAt 变化时 key 变 → 强制重载)
 * - text → 等宽预览
 * - image → img
 * - pdf → iframe
 * - unsupported/error → 友好提示
 * - 文档加载中:显示 spinner + 文件名 loading 占位
 * 无打开 Tab 时显示空状态引导。 */
import { useEditorStore } from '../../store/editorStore';
import { fileIcon } from '../FileTree/icons';

function basename(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

function Spinner({ className = 'w-10 h-10 text-blue-400' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  );
}

export function OfficePreview() {
  const tabs = useEditorStore((s) => s.tabs);
  const activePath = useEditorStore((s) => s.activePath);
  const loadingPaths = useEditorStore((s) => s.loadingPaths);
  const activeTab = tabs.find((t) => t.path === activePath) ?? null;

  // ⭐️ activePath 正在加载 → 显示 loading 占位
  if (activeTab === null && activePath && loadingPaths.includes(activePath)) {
    const fileName = basename(activePath);
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-neutral-300 bg-neutral-900 gap-3 p-4">
        <Spinner />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium flex items-center gap-2">
            <span>{fileIcon(fileName.split('.').pop()?.toLowerCase() ?? '')}</span>
            <span>{fileName}</span>
          </p>
          <p className="text-xs text-neutral-500">正在加载文档预览…</p>
          <p className="text-[10px] text-neutral-600 max-w-md text-center truncate">
            {activePath}
          </p>
        </div>
      </div>
    );
  }

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 bg-neutral-900 gap-2">
        <span className="text-4xl">📊</span>
        <p className="text-sm">从左侧文件树选择一个文件打开预览</p>
        <p className="text-xs text-neutral-700">支持 xlsx / docx / pptx 及文本/图片/PDF</p>
      </div>
    );
  }

  // AI 修改后 modifiedAt 变化 → iframe key 变 → 强制重载最新预览
  const reloadKey = activeTab.modifiedAt ?? 0;

  if (activeTab.kind === 'office' && activeTab.previewUrl) {
    return (
      <div className="flex-1 min-h-0 bg-neutral-900">
        <iframe
          key={`${activeTab.path}:${reloadKey}`}
          src={activeTab.previewUrl}
          className="w-full h-full border-0"
          title={activeTab.name}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  if (activeTab.kind === 'text' && activeTab.content !== undefined) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-neutral-900 p-4 no-scrollbar">
        <pre className="text-sm text-neutral-300 whitespace-pre-wrap break-words font-mono">
          {activeTab.content}
        </pre>
      </div>
    );
  }

  if (activeTab.kind === 'image' && activeTab.dataUrl) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-neutral-900 p-4 overflow-auto no-scrollbar">
        <img src={activeTab.dataUrl} alt={activeTab.name} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  if (activeTab.kind === 'pdf' && activeTab.url) {
    return (
      <div className="flex-1 min-h-0 bg-neutral-900">
        <iframe
          key={`${activeTab.path}:${reloadKey}`}
          src={activeTab.url}
          className="w-full h-full border-0"
          title={activeTab.name}
        />
      </div>
    );
  }

  // error / unsupported / message
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900 gap-2">
      <span className="text-4xl">{fileIcon(activeTab.ext)}</span>
      <p className="text-sm">{activeTab.message ?? `无法预览此文件类型 (${activeTab.ext || '未知'})`}</p>
      {activeTab.kind === 'error' && (
        <p className="text-xs text-amber-500 max-w-md text-center">
          如需预览 Office 文档,请确保已安装 officecli: <code className="text-blue-400">npm i -g @officecli/officecli</code>
        </p>
      )}
    </div>
  );
}
