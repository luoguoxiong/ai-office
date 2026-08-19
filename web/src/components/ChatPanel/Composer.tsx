/** 输入区:textarea(Shift+Enter换行,Enter发送)+ 当前选中文件提示 + 停止按钮。 */
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { fileIcon } from '../FileTree/icons';

export function Composer({
  onSend,
  onStop,
  streaming,
  error,
  activeFilePath,
  activeFileName,
  activeFileExt,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  error: string | null;
  activeFilePath: string | null;
  activeFileName?: string;
  activeFileExt?: string;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      // 自适应高度(最多 6 行)
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.min(ref.current.scrollHeight, 140) + 'px';
    }
  }, [text]);

  const canSend = text.trim().length > 0 && !streaming;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) {
        onSend(text.trim());
        setText('');
      }
    }
  };

  return (
    <div className="shrink-0 border-t border-neutral-700 bg-neutral-800/80 p-2 space-y-2">
      {/* 错误提示条 */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded px-2 py-1">
          ⚠️ {error}
        </div>
      )}

      {/* 上下文提示:当前选中的 office 文件(AI 提问时自动注入 filePath) */}
      {activeFilePath ? (
        <div className="text-[11px] flex items-center gap-1.5 px-1 text-neutral-400">
          <span>📌 上下文:</span>
          <span className="inline-flex items-center gap-1 bg-neutral-700/60 rounded px-1.5 py-0.5 max-w-full">
            <span>{fileIcon(activeFileExt)}</span>
            <span className="truncate max-w-[200px]" title={activeFilePath}>
              {activeFileName ?? activeFilePath}
            </span>
          </span>
        </div>
      ) : (
        <div className="text-[11px] px-1 text-neutral-600">
          💡 打开一个 Office 文件,此助手会自动把它作为上下文
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? 'AI 回复中…(可点击停止)' : '告诉 AI 要做什么…(Enter 发送,Shift+Enter 换行)'}
          disabled={streaming}
          rows={2}
          className="flex-1 resize-none bg-neutral-900 text-neutral-100 border border-neutral-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-neutral-600 min-h-[38px] max-h-[140px] no-scrollbar"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="shrink-0 px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors h-[38px]"
          >
            ■ 停止
          </button>
        ) : (
          <button
            onClick={() => {
              if (canSend) {
                onSend(text.trim());
                setText('');
              }
            }}
            disabled={!canSend}
            className="shrink-0 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm font-medium transition-colors h-[38px]"
          >
            ↑ 发送
          </button>
        )}
      </div>
    </div>
  );
}
