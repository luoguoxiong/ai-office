/** 聊天面板主容器:三栏布局最右侧。
 * - 把 editorStore 的 activePath 作为上下文(filePath)注入到发送请求
 * - 依赖 chatStore 的 send() 走 SSE 流式(已在 store 内部处理 tool→file→editorStore.markModified 链路)
 * - 多模型:下拉从已保存配置切换,「🧰」按钮打开模型配置管理器(添加/编辑/删除)
 * - 多会话:按 activePath 自动切换独立上下文(每个文件独立聊天历史 + LLM 记忆)
 */
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ModelManager } from './ModelManager';
import { useChatStore, fileSessionKey, GLOBAL_SESSION_KEY } from '../../store/chatStore';
import { useEditorStore } from '../../store/editorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useEffect, useState } from 'react';

/** 聊天面板主容器 */
export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const error = useChatStore((s) => s.error);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const clear = useChatStore((s) => s.clear);
  const switchSession = useChatStore((s) => s.switchSession);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionCount = useChatStore((s) => Object.keys(s.sessionBuckets).length);

  const activePath = useEditorStore((s) => s.activePath);
  const activeTab = useEditorStore((s) => s.tabs.find((t) => t.path === activePath));

  // 多模型相关
  const savedModels = useSettingsStore((s) => s.models);
  const activeModelId = useSettingsStore((s) => s.activeModelId);
  const setActiveModelId = useSettingsStore((s) => s.setActiveModel);
  const [showManager, setShowManager] = useState(false);
  const activeModel = savedModels.find((m) => m.id === activeModelId) ?? null;

  // ⭐️ activePath 变化 → 自动切换到对应文件的独立会话上下文
  useEffect(() => {
    const key = fileSessionKey(activePath);
    switchSession(key);
  }, [activePath, switchSession]);

  const handleSend = (text: string) => {
    void send(text, activePath ?? undefined);
  };

  // 会话归属提示文本
  const sessionHint =
    currentSessionKey === GLOBAL_SESSION_KEY
      ? '💬 当前会话: 通用(未绑定文件,所有文件共享)'
      : activeTab
        ? `💬 当前会话:「${activeTab.name}」(${activePath})  — 独立上下文`
        : `💬 当前会话: ${currentSessionKey}  — 独立上下文`;

  return (
    <aside className="w-96 shrink-0 border-l border-neutral-700 bg-neutral-800 flex flex-col min-h-0">
      {/* 头部:标题 + 模型切换 + 管理器按钮 + 清空 */}
      <div className="flex items-center px-3 border-b border-neutral-700/60 gap-2 shrink-0 py-1.5">
        <span className="text-sm font-medium text-neutral-200">🤖 AI 助手</span>
        <div className="flex-1" />

        {/* 模型快速切换下拉(仅显示已保存配置) */}
        <select
          value={activeModelId ?? ''}
          onChange={(e) => setActiveModelId(e.target.value || null)}
          className="text-xs bg-neutral-900 text-neutral-200 border border-neutral-600 rounded px-1.5 py-1 max-w-[160px] focus:outline-none focus:border-blue-500"
          title={activeModel ? `当前:${activeModel.name}` : '选择已保存的模型(点击 🧰 添加)'}
        >
          <option value="">
            {savedModels.length === 0 ? '(先点击 🧰 添加模型)' : '(请选择模型)'}
          </option>
          {savedModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.apiKey ? '' : ' ⚠️缺Key'}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowManager((v) => !v)}
          className={`text-xs px-1.5 py-1 rounded transition-colors ${
            showManager
              ? 'bg-blue-600 text-white'
              : 'hover:bg-neutral-700 text-neutral-400'
          }`}
          title={
            savedModels.length === 0
              ? '还没有模型配置 - 点击打开管理器添加'
              : `已保存 ${savedModels.length} 个模型 - 点击打开管理器`
          }
        >
          🧰
        </button>

        <button
          onClick={clear}
          disabled={streaming}
          className="text-xs px-1.5 py-1 rounded hover:bg-neutral-700 disabled:opacity-40 text-neutral-400"
          title="清空对话"
        >
          🗑️
        </button>
      </div>

      {/* 模型配置管理器(展开式) */}
      {showManager && <ModelManager />}

      {/* 会话归属提示(文件上下文隔离提示) */}
      <div className="shrink-0 px-3 py-1.5 border-b border-neutral-700/60 bg-neutral-900/40 flex items-center justify-between gap-2">
        <span
          className="text-[11px] text-neutral-400 truncate"
          title={sessionHint}
        >
          {currentSessionKey === GLOBAL_SESSION_KEY ? (
            <span className="text-neutral-500">🌐 通用会话</span>
          ) : (
            <>
              <span className="text-blue-400">📄 文件上下文:</span>{' '}
              <span className="text-neutral-300">
                {activeTab?.name ?? activePath ?? currentSessionKey}
              </span>
            </>
          )}
        </span>
        <span
          className="text-[10px] text-neutral-500 shrink-0"
          title={`已保存 ${sessionCount} 个会话上下文`}
        >
          会话:{sessionCount}
        </span>
      </div>

      {/* 消息列表(占满剩余空间,可滚动) */}
      <MessageList messages={messages} streaming={streaming} />

      {/* 输入区 */}
      <Composer
        onSend={handleSend}
        onStop={stop}
        streaming={streaming}
        error={error}
        activeFilePath={activePath}
        activeFileName={activeTab?.name}
        activeFileExt={activeTab?.ext}
      />
    </aside>
  );
}
