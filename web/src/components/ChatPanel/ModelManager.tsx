/** 多模型配置管理器:添加/编辑/删除/激活已保存的模型配置
 * - 内联展开面板(非弹窗,保证 Tauri 可用)
 * - 内置 provider/model 列表从 /api/v1/config 获取,与后端 buildModel 保持一致
 * - 所有数据走 useSettingsStore,自动 localStorage 持久化
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { SavedModel, useSettingsStore } from '../../store/settingsStore';
import type { ModelOption } from '../../types/api';

type EditState =
  | { mode: 'none' }
  | { mode: 'add' }
  | { mode: 'edit'; id: string };

interface DraftModel {
  name: string;
  provider: string;
  modelId: string;
  apiKey: string;
}

const EMPTY_DRAFT: DraftModel = { name: '', provider: '', modelId: '', apiKey: '' };

/** 从内置 ModelOption[] 中按 provider 分组,返回去重后的 provider 列表 + 对应模型 */
function useBuiltinModels() {
  const [options, setOptions] = useState<ModelOption[]>([]);
  useEffect(() => {
    api.config().then((c) => setOptions(c.models)).catch(() => {});
  }, []);

  const providers = useMemo(() => {
    const map = new Map<string, string>(); // provider -> providerName
    for (const m of options) {
      if (!map.has(m.provider)) map.set(m.provider, m.providerName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [options]);

  const modelsByProvider = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const m of options) {
      const arr = map.get(m.provider) ?? [];
      arr.push({ id: m.modelId, name: m.modelName });
      map.set(m.provider, arr);
    }
    return map;
  }, [options]);

  return { options, providers, modelsByProvider };
}

export function ModelManager() {
  const { providers, modelsByProvider } = useBuiltinModels();
  const models = useSettingsStore((s) => s.models);
  const activeId = useSettingsStore((s) => s.activeModelId);
  const addModel = useSettingsStore((s) => s.addModel);
  const updateModel = useSettingsStore((s) => s.updateModel);
  const deleteModel = useSettingsStore((s) => s.deleteModel);
  const setActive = useSettingsStore((s) => s.setActiveModel);

  const [edit, setEdit] = useState<EditState>({ mode: 'none' });
  const [draft, setDraft] = useState<DraftModel>(EMPTY_DRAFT);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // 进入编辑态:初始化草稿
  useEffect(() => {
    if (edit.mode === 'add') {
      // 预选第一个 provider,加速填写
      const firstProvider = providers[0]?.id ?? '';
      const firstModels = modelsByProvider.get(firstProvider) ?? [];
      setDraft({
        name: '',
        provider: firstProvider,
        modelId: firstModels[0]?.id ?? '',
        apiKey: '',
      });
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } else if (edit.mode === 'edit') {
      const m = models.find((x) => x.id === edit.id);
      if (m) {
        setDraft({ name: m.name, provider: m.provider, modelId: m.modelId, apiKey: m.apiKey });
        requestAnimationFrame(() => nameInputRef.current?.focus());
      } else {
        setEdit({ mode: 'none' });
      }
    }
  }, [edit, models, providers, modelsByProvider]);

  const draftModelOptions = modelsByProvider.get(draft.provider) ?? [];

  // 切换 provider 时,如果当前 modelId 不在新 provider 的列表中,自动选第一个
  useEffect(() => {
    if (edit.mode === 'none') return;
    if (!draft.provider) return;
    if (!draftModelOptions.find((m) => m.id === draft.modelId)) {
      setDraft((d) => ({ ...d, modelId: draftModelOptions[0]?.id ?? '' }));
    }
  }, [draft.provider, draftModelOptions, draft.modelId, edit.mode]);

  const validate = (): string | null => {
    if (!draft.name.trim()) return '请填写自定义名称(如「公司 DeepSeek」)';
    if (!draft.provider) return '请选择 Provider';
    if (!draft.modelId) return '请选择模型';
    if (!draft.apiKey.trim()) return '请填写 API Key';
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const payload: Omit<SavedModel, 'id'> = {
      name: draft.name.trim(),
      provider: draft.provider,
      modelId: draft.modelId,
      apiKey: draft.apiKey.trim(),
    };
    if (edit.mode === 'add') {
      addModel(payload);
    } else if (edit.mode === 'edit') {
      updateModel(edit.id, payload);
    }
    setEdit({ mode: 'none' });
    setDraft(EMPTY_DRAFT);
  };

  const cancel = () => {
    setEdit({ mode: 'none' });
    setDraft(EMPTY_DRAFT);
  };

  const startAdd = () => setEdit({ mode: 'add' });

  const startEdit = (id: string) => setEdit({ mode: 'edit', id });

  const confirmDelete = (id: string) => {
    const m = models.find((x) => x.id === id);
    if (!m) return;
    if (window.confirm(`确认删除模型「${m.name}」?此操作不可恢复。`)) {
      deleteModel(id);
    }
  };

  return (
    <div className="shrink-0 border-b border-neutral-700/60 bg-neutral-900/60 text-neutral-200 flex flex-col max-h-[60vh] overflow-hidden">
      {/* 顶部:标题 + 添加按钮 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700/60 shrink-0">
        <span className="text-xs font-medium">🧰 模型配置管理器</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500">
            共 {models.length} 个
          </span>
          {edit.mode === 'none' && (
            <button
              onClick={startAdd}
              className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              + 添加模型
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto no-scrollbar">
        {/* 添加/编辑表单 */}
        {edit.mode !== 'none' && (
          <div className="px-3 py-3 border-b border-neutral-700/60 bg-neutral-800/50 space-y-2 shrink-0">
            <div className="text-xs font-medium text-blue-400">
              {edit.mode === 'add' ? '➕ 新增模型配置' : '✏️ 编辑模型配置'}
            </div>

            <label className="block space-y-0.5">
              <span className="text-[11px] text-neutral-400">自定义名称</span>
              <input
                ref={nameInputRef}
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="如: 我的 DeepSeek / 公司 OpenAI"
                className="w-full text-xs bg-neutral-900 text-neutral-100 border border-neutral-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-neutral-600"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-0.5">
                <span className="text-[11px] text-neutral-400">Provider</span>
                <select
                  value={draft.provider}
                  onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
                  className="w-full text-xs bg-neutral-900 text-neutral-100 border border-neutral-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="">— 选择 —</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-0.5">
                <span className="text-[11px] text-neutral-400">模型</span>
                <select
                  value={draft.modelId}
                  onChange={(e) => setDraft({ ...draft, modelId: e.target.value })}
                  disabled={!draft.provider || draftModelOptions.length === 0}
                  className="w-full text-xs bg-neutral-900 text-neutral-100 border border-neutral-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">— 选择 —</option>
                  {draftModelOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-0.5">
              <span className="text-[11px] text-neutral-400">API Key</span>
              <input
                type="password"
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="如 sk-...  仅保存在本机 localStorage"
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                  else if (e.key === 'Escape') cancel();
                }}
                className="w-full text-xs bg-neutral-900 text-neutral-100 border border-neutral-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-neutral-600"
              />
            </label>

            <div className="flex gap-1.5 justify-end pt-1">
              <button
                onClick={cancel}
                className="text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={submit}
                className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* 已保存模型列表 */}
        {models.length === 0 && edit.mode === 'none' && (
          <div className="px-3 py-6 text-center text-xs text-neutral-500 space-y-2">
            <div>📭 尚未配置任何模型</div>
            <div className="text-[10px] text-neutral-600 leading-relaxed">
              点击右上角「+ 添加模型」开始配置。<br />
              所有配置仅保存在本机 localStorage,不会上传服务器。
            </div>
          </div>
        )}

        {models.length > 0 && (
          <ul className="divide-y divide-neutral-700/60">
            {models.map((m) => {
              const isActive = m.id === activeId;
              const pName = providers.find((p) => p.id === m.provider)?.name ?? m.provider;
              return (
                <li
                  key={m.id}
                  className={`px-3 py-2 transition-colors ${
                    isActive ? 'bg-blue-900/15' : 'hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* 激活按钮/状态 */}
                    <button
                      onClick={() => setActive(isActive ? null : m.id)}
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-neutral-500 hover:border-blue-400 bg-transparent'
                      }`}
                      title={isActive ? '点击取消使用此模型' : '点击设为当前使用模型'}
                    >
                      {isActive && (
                        <span className="text-[8px] text-white leading-none">✓</span>
                      )}
                    </button>

                    {/* 信息主体 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-neutral-100 truncate">
                          {m.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-blue-600/80 text-white">
                            使用中
                          </span>
                        )}
                        {m.apiKey ? (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-700/40">
                            Key 已设置
                          </span>
                        ) : (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-700/40">
                            缺少 Key
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                        {pName} · {m.modelId}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(m.id)}
                        disabled={edit.mode !== 'none'}
                        className="text-xs px-1.5 py-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-40"
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => confirmDelete(m.id)}
                        disabled={edit.mode !== 'none'}
                        className="text-xs px-1.5 py-1 rounded hover:bg-red-900/40 text-neutral-400 hover:text-red-400 disabled:opacity-40"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
