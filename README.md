# AI Office

桌面端 AI Office 工具:VSCode 风格文件树 + office 文件预览 + AI 修改。

## 特性

- **VSCode 风格打开文件夹**:左侧递归文件树,显示文件夹内的 office 文件(xlsx/docx/pptx 图标区分)
- **打开单个 office 文件**:右侧多 Tab,officecli watch 所见即所得预览
- **AI 修改 office 文件**:聊天面板 SSE 流式,选中文件自动带上下文,修改后预览自动刷新

## 技术栈

- 桌面壳:Tauri 2
- 前端:React 18 + Vite 5 + TypeScript + Tailwind CSS + zustand
- 后端:Node 原生 http(零框架)+ [`@aipack-ai/agent`](https://www.npmjs.com/package/@aipack-ai/agent)
- Office 渲染:[OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) 单二进制(跨平台,无需安装 Office)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 安装 OfficeCLI(所有 Office 操作必需)

```bash
npm i -g @officecli/officecli   # 或 brew install officecli
officecli --version
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env,至少配置一个 LLM API Key(如 DEEPSEEK_API_KEY)
```

### 4. 开发

```bash
pnpm dev          # 同时起后端(3001)+ 前端(5173),浏览器访问 http://localhost:5173
pnpm tauri:dev   # 桌面端(Tauri 窗口)
```

## 目录结构

```
src/          # 后端(Node http + Agent Runtime)
web/          # 前端(React + Vite)
src-tauri/    # Tauri 2 桌面壳(Rust)
```

## License

MIT
