/** 消息列表:滚动 + 流式时自动滚到底部,空状态显示引导。 */
import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/chat';
import { MessageItem } from './MessageItem';

export function MessageList({ messages, streaming }: { messages: ChatMessage[]; streaming: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // 流式或新消息追加:自动滚到底部(用户若手滚向上 30px 以上则不强制)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shouldStick = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (shouldStick) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 gap-2 px-4 text-center">
        <span className="text-3xl">🤖</span>
        <p className="text-sm">AI 助手准备就绪</p>
        <p className="text-xs text-neutral-600 leading-relaxed">
          打开一个 Office 文件后,AI 会自动感知。<br />
          可以问「读取一下这个文件的结构」或「把第一列改成蓝色」。
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 overflow-auto px-3 py-3 space-y-3 no-scrollbar">
      {messages.map((m) => (
        <MessageItem key={m.id} msg={m} streaming={streaming && m.id === messages[messages.length - 1].id} />
      ))}
    </div>
  );
}
