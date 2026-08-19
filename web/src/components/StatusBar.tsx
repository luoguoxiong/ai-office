/** 底部状态栏:工作区 / 模型 / LLM / officecli 状态
 *  LLM 就绪状态不再依赖后端 llmReady(后端不读 env Key),而是按前端是否已填 Key + 已选模型判断
 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useSettingsStore } from '../store/settingsStore';
import type { ConfigResponse } from '../types/api';

export function StatusBar() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const name = useWorkspaceStore((s) => s.name);
  const activeModel = useSettingsStore((s) => {
    const m = s.models.find((x) => x.id === s.activeModelId);
    return m ?? null;
  });

  useEffect(() => {
    api.config().then(setConfig).catch(() => {});
  }, [name]);

  // 前端侧的 LLM 就绪标志:已选 active 模型 + 该模型已填非空 Key
  const llmReadyLocal = !!activeModel?.provider && !!activeModel?.modelId && !!activeModel?.apiKey?.trim();
  const modelDisplay = activeModel
    ? `${activeModel.name} (${activeModel.provider}/${activeModel.modelId})`
    : '未选择';

  return (
    <div className="h-6 flex items-center px-3 gap-4 bg-neutral-800 border-t border-neutral-700 text-xs text-neutral-400 select-none">
      <span>📁 {name || '-'}</span>
      <span>🤖 {modelDisplay}</span>
      <span className={llmReadyLocal ? 'text-green-400' : 'text-red-400'}>
        LLM: {llmReadyLocal ? '就绪' : '未配 Key/未选模型'}
      </span>
      <span className={config?.officecliReady ? 'text-green-400' : 'text-red-400'}>
        officecli: {config?.officecliReady ? '已装' : '未装'}
      </span>
    </div>
  );
}
