# CodexScope 使用文档

这份文档说明如何使用 CodexScope 在当前项目里生成、更新和查看动态架构监管报告。第一版目标是监管单个代码仓库：开发进度、模块状态、接口清单、扫描发现、风险和验证记录都会写入项目本地的 `.codex-architecture/` 目录。

## 从本仓库运行

如果你是在这个插件源码仓库里开发或试用，先安装依赖并构建 CLI：

```bash
npm install
npm run build
node ./bin/codex-scope.js --help
```

下面的示例默认使用 `codex-scope` 命令。若还没有全局安装或 link，可以在目标项目目录中改用插件源码仓库的绝对路径：

```bash
node /path/to/codex-scope/bin/codex-scope.js --help
```

## 初始化一个项目

进入你要监管的目标项目根目录，创建 `answers.json`：

```json
{
  "projectId": "my-project",
  "projectName": "My Project",
  "goal": "Track project architecture and Codex development progress",
  "phase": "build",
  "features": ["Authentication", "Admin console", "Billing"]
}
```

字段含义：

- `projectId`：项目唯一标识，建议使用小写短横线。
- `projectName`：报告里显示的项目名称。
- `goal`：这个项目当前要达成的目标。
- `phase`：项目阶段，例如 `planning`、`build`、`hardening`。
- `features`：第一批需要跟踪的功能点，后续可以通过 `update` 继续更新。

初始化并生成第一版报告：

```bash
codex-scope init --answers answers.json
codex-scope doctor
codex-scope refresh
```

执行后会生成：

- `.codex-architecture/status.json`：当前项目架构和进度状态。
- `.codex-architecture/events.jsonl`：Codex 每次更新写入的追加事件。
- `.codex-architecture/report.html`：可打开的架构监管图报告。

## 查看静态报告

初始化或刷新后，直接打开：

```bash
.codex-architecture/report.html
```

静态模式适合快速查看当前快照。页面上的刷新提示会告诉你需要回到终端执行：

```bash
codex-scope refresh
```

## 启动可点击查看器

如果你希望在浏览器里点击刷新按钮，让页面请求本地服务重新扫描并生成报告，运行：

```bash
codex-scope serve
```

打开终端打印出的本地 URL。这个 viewer 是任务级本地服务；当你不再需要实时刷新按钮时，可以停止它。若你准备继续调试或让 Codex 继续使用它，也可以保留运行。

## Codex 开发后更新状态

每轮 Codex 开发完成后，让 Codex 生成一份脱敏的 `summary.json`，例如：

```json
{
  "summary": "Implemented API key creation",
  "featureUpdates": [{ "id": "api-keys", "status": "in_progress", "percent": 70 }],
  "moduleUpdates": [{ "id": "api", "name": "API", "kind": "backend", "status": "in_progress", "percent": 70 }],
  "interfaceUpdates": [
    {
      "id": "POST:/v1/api-keys",
      "name": "Create API key",
      "method": "POST",
      "path": "/v1/api-keys",
      "purpose": "Create API key"
    }
  ],
  "verification": ["npm test"]
}
```

然后执行：

```bash
codex-scope update --from-codex-summary summary.json
codex-scope doctor
codex-scope refresh
```

推荐节奏：

1. Codex 完成一段开发。
2. Codex 写入脱敏 `summary.json`。
3. 运行 `update` 把进度、模块、接口和验证记录写入状态。
4. 运行 `doctor` 检查状态文件是否有效。
5. 运行 `refresh` 重新扫描仓库并生成最新报告。
6. 打开 `.codex-architecture/report.html` 查看整体开发状态。

## 报告里能看到什么

报告会聚合几类信息：

- 项目总体进度和阶段。
- 功能完成度。
- 模块状态。
- 已记录接口、接口用途和调用关系。
- 仓库扫描发现的接口差异。
- 风险、验证记录和最近事件。
- 点击节点后的详情侧栏。

如果扫描器发现源码里有接口但 `status.json` 还没有记录，报告会显示类似：

```text
Scanned interface is not recorded: GET /v1/example
```

这通常表示需要确认该接口是否属于项目状态，再补充接口用途、调用方、被调用方、所属功能和测试状态。

## 安全边界

不要把以下内容写入 `answers.json`、`summary.json`、`.codex-architecture/` 或 Basic Memory：

- secrets
- raw logs
- environment variable values
- private keys
- raw transcripts
- API tokens、cookies、session values
- 未脱敏的完整工具输出

只写项目级摘要、路径、功能状态、接口说明、验证命令名称和脱敏结论。

## 常见问题

### `codex-scope` 命令找不到

先确认已经构建插件：

```bash
npm run build
```

如果还没有安装或 link 命令，请使用插件仓库里的 bin 路径：

```bash
node /path/to/codex-scope/bin/codex-scope.js --help
```

### 修改代码后报告没有变化

先刷新：

```bash
codex-scope refresh
```

如果是 Codex 完成了新功能，还需要先写入并应用 `summary.json`：

```bash
codex-scope update --from-codex-summary summary.json
codex-scope refresh
```

### `doctor` 报错

`doctor` 用来检查 `.codex-architecture/status.json` 的结构是否有效。出现错误时，优先修正 `summary.json` 或状态文件里的字段类型、枚举值、百分比范围和缺失字段，再重新运行：

```bash
codex-scope doctor
```
