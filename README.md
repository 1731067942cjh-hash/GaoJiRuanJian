# svg-editor-cli

Lab1 Phase 1：一个用 TypeScript 实现的 SVG 编辑器（CLI）。支持六种图形、容器/复合操作、SVG 读写、撤销重做，以及 `tree` / `show` / `help` 显示命令。

## 快速开始

要求：Node.js 22.12+（22.x）、24.x 或 26+；推荐本次实测的 **v26.8.2**。这是测试工具 Vitest 5 的运行要求，不能用旧版 Node 20 跑完整验收。

使用 nvm 时可先执行 `nvm install && nvm use`（版本记录在 `.nvmrc`）。

```bash
npm ci
npm run cli
```

交互式会话会显示 `svg>` 提示符：

```text
$ npm run cli
svg-editor 0.1 — type 'help' for commands

svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
```

也可以直接回放命令脚本（非 TTY 时不会输出提示符，便于保存和比对）：

```bash
printf '%s\n' 'init 100 100' 'create circle c1 50 50 20 red' 'tree' | npm run cli
```

## 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run cli` | 启动 REPL |
| `npm run typecheck` | 严格类型检查（`tsc --noEmit`） |
| `npm test` | 运行全部单元/集成测试 |
| `npm run verify` | 类型检查 + 测试 |
| `npm run diagram` | 用本机 PlantUML 重新生成 `doc/architecture.svg` |

## 文档

架构、过程记录、一致性自查、质量保证与修订记录见 **[doc/README.md](doc/README.md)**。

## 目录

```text
src/
  domain/        纯领域模型（Shape / Container / Document / 六种图形 / 变换）
  shape/         ShapeFactory：类型名 → 类（允许的名字分派 #2）
  command/       EditCommand / History / 各编辑命令
  serialization/ SVG 读写与 XML 适配器
  view/          tree / show / help 文本渲染
  io/            文件读写端口与 Node 实现
  cli/           REPL、命令解析/分派、组合根
test/            单元测试、golden transcript、fixtures
doc/             架构图与课程要求的 README
examples/        demo.svg / flowchart.svg / other.svg
scripts/         PlantUML 渲染脚本
```

## 验证与提交

`npm run verify` 执行严格类型检查与全部自动化测试。验收记录、修复过程和规格对应表见 `doc/README.md`。

远程仓库：https://github.com/1731067942cjh-hash/GaoJiRuanJian 。提交版本以 `final` 标签为准；本次修订保留旧提交历史，旧标签另存为 `archive/final-2026-10-19`。

## 阶段边界与已知限制

- `box` 复合图形属于插件化阶段，本阶段 `create box` 返回 `error: unknown shape type: box (is the plugin loaded?)`。
- CLI 以 `id` 定位图形；不支持结构路径寻址。
- 读取时会烘焙 `translate` / `scale`（以及无非旋转项的 `matrix`）；`rotate` / `skew` 会警告并忽略。保存时不生成 `transform` 属性。
- 未支持的 SVG 元素读取时警告并跳过；未建模属性会原样保留并写回。
- `tree` 的属性列对齐规则与规格 §6.1 示例的列宽存在已知差异（详见 `doc/README.md` 的修订记录）。
