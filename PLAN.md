# Lab1 Phase 1 完成计划：SVG 编辑器（CLI）

- 依据文档：`phase_cli_1.md`（523 行，已逐节阅读）
- 计划版本：v1.0（**已实施完成**；最终结构与验证结果见 `doc/README.md`）
- 产物根目录：`/Users/ahs/Documents/dsh/高级软件开发/`
- 交付形态：TypeScript 源码 + `doc/README.md` + 架构图 + 测试 + 带 `final` tag 的 git 历史
- 实施状态：2026-10-19 完成 M0–M8；89 个测试通过；`final` tag 指向最终提交并推送到远程

---

## 1. 目标、范围与验收

### 1.1 必须完成

| # | 交付物 | 说明 |
|---|---|---|
| 1 | CLI 程序 | `npm run cli` 启动 `svg>` REPL；支持 3 类命令：文档类、图形编辑类、显示类，以及 `undo` / `redo` |
| 2 | 图形模型 | `rect` / `circle` / `ellipse` / `line` / `text` / `g` 六种类型；容器与叶子统一操作（Composite） |
| 3 | 编辑能力 | `create`（含 `in` 子句）、`delete`、`move`、`scale`、`set`、`group`、`ungroup`、`addto`、`front`、`back` |
| 4 | 文档 IO | `init` / `read` / `save` / `canvas`；读入缺 id 自动补并警告；保存为可在浏览器打开的 SVG |
| 5 | 撤销重做 | 一条编辑命令 = 一个 undo 单元；显示类不入栈；文档类 IO 后 undo/redo 禁止直至下一次编辑 |
| 6 | 显示格式 | `tree`（属性内联）、`show`（属性明细）、`help`（命令与语法） |
| 7 | 错误规范 | 严格使用 `error:` 前缀；失败不改变任何状态（见 §4.2 全部 13 类场景） |
| 8 | 文档 | `doc/README.md`：架构方案（模块划分 + 图 + 设计模式 + 依赖方向 + 变化点）、过程记录、一致性自查、质量保证手段 |
| 9 | 工程过程 | git 分步提交（禁止 one-shot）、远程推送、最终提交打 tag `final` |

### 1.2 本阶段明确不做（阶段边界）

- `box` 复合图形插件（4.4 明示本阶段不实现；`create box` 只报 `unknown shape type`）；
- 插件加载机制、ShapeProvider 动态注册（属下一阶段）；
- 结构路径寻址（`/canvas/g1/rect[2]`）、GUI/鼠标通道、多文档、协作编辑；
- `path` / `polygon` / 渐变 / CSS 样式 / 动画等 SVG 全量特性；
- 浏览器内运行；本阶段只做 Node CLI。

> 注意：`box` 虽然不实现，但容器抽象与 ShapeFactory 必须为它留下清晰的插件接缝，并在架构方案中说明。

### 1.3 完成定义（DoD）

- [ ] `npm ci && npm run typecheck && npm test` 全部通过；
- [ ] 规格 §6、§6.1 的会话可复现（逐命令结果一致，排版差异按 §5.5 约定记录）；
- [ ] §4.2 的 13 类错误全部有测试覆盖，且失败命令不产生状态变化；
- [ ] `save` 产物是合法 SVG，可在浏览器打开，并支持 `read` 回读；
- [ ] 模块划分、依赖方向与 `doc/README.md` 一致，偏差记入「修订记录」；
- [ ] git 历史 ≥ 25 个语义化提交，最后打 `final` tag（并在截止前推送）；
- [ ] 所有生成文件都位于 `高级软件开发/` 内。

---

## 2. 环境清单（全部）

### 2.1 运行时与工具链

| 类别 | 环境项 | 要求 / 实测版本 | 现状 | 处理方式 |
|---|---|---|---|---|
| OS | macOS | 26.6.2（25G83），x86_64 | ✅ | 无需处理 |
| 终端 | zsh / bash | `/bin/zsh` | ✅ | 无需处理 |
| 运行时 | Node.js | ≥ 20；实测 **v26.8.2** | ✅ | 无需安装 |
| 包管理 | npm | **11.19.1** | ✅ | 作为唯一包管理器（规格要求 `npm run cli`） |
| 包管理 | pnpm | 12.4.1（全局） | ➖ | 不使用，避免锁文件二义性 |
| 语言 | TypeScript | **5.9.3**（探测安装通过） | ⏳ | 写入 devDependencies |
| 直跑 TS | tsx | **4.23.15**（探测通过） | ⏳ | `npm run cli` 使用；规避 Node 原生 strip-types 的限制 |
| 测试 | vitest | **5.0.5**（探测通过） | ⏳ | 单元 + 集成测试 |
| 类型 | @types/node | 与 Node 主版本匹配（探测安装成功） | ⏳ | 提供 `node:fs` / `node:readline` 类型 |
| XML 解析 | fast-xml-parser | 当前稳定版（唯一运行期依赖） | ⏳ | 用 Adapter 隔离，便于替换 |
| 编译检查 | `tsc --noEmit` | 5.9.3 | ⏳ | `npm run typecheck` |
| 磁盘 | 可用空间 | 实测约 146 GiB 可用 | ✅ | `node_modules` 约数百 MB，足够 |

**重要实测结论：**

1. **Node 26 原生 TS 只支持 strip-only**：`constructor(public readonly id: string)` 这类参数属性会报 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`。因此**不能**把 `node xxx.ts` 作为运行方式，统一用 `tsx`（dev）与 `tsc`（类型检查）。
2. **npm 默认缓存目录在沙箱外**（`/Users/ahs/.npm`），直接执行 `npx tsc` 会 `EPERM`。解决办法：所有 npm 命令设置工作区内缓存：
   ```bash
   export npm_config_cache="$PWD/.npm-cache"   # 在 高级软件开发/ 下执行
   ```
   实测使用工作区缓存后 `npm install typescript tsx vitest @types/node` 成功。
3. `timeout` 命令在 macOS 上不存在（探测时已确认），脚本中不要依赖它；用 Node 自带超时或 `perl` 替代。

### 2.2 版本控制与远程仓库

| 类别 | 环境项 | 要求 / 实测 | 现状 | 处理方式 |
|---|---|---|---|---|
| VCS | git | **2.55.0** | ✅ | 无需安装 |
| 提交身份 | `user.name` / `user.email` | 本仓库需要 | ❌ 全局未配置 | 使用 `git config --local` 设置（**需要你提供姓名/邮箱**） |
| 远程仓库 | GitHub / Gitee 空仓库 | 必须可 push | ❌ 未发现 remote | **需要你创建并提供 URL** |
| 认证 | PAT（HTTPS）或 SSH key | push 权限 | ❌ 无 `gh`、无 `id_*` 私钥、无 credential helper | 推荐 HTTPS + 临时 `GIT_ASKPASS`/环境变量注入 PAT，不落盘 |
| 标签 | `final` | 最终提交处 | ⏳ | 最后一步打 tag 并推送 |
| 分支 | `main` | 建议 | ⏳ | `git init -b main` |
| 编码 | UTF-8、`core.quotepath=false` | 中文文件名/内容 | ⚠️ `LANG` 为空、locale 为 C | 命令前缀 `LANG=en_US.UTF-8`；git 本地配置 quotepath=false |

> 若暂时无法提供远程仓库：我会先完成本地分步提交与 `final` tag，但**提交要求 1.1（推送远程）不会被满足**，需要你后续补 push。

### 2.3 文档、图形与预览

| 类别 | 环境项 | 要求 / 实测 | 现状 | 处理方式 |
|---|---|---|---|---|
| 文档 | Markdown | `doc/README.md` | ✅ | 直接编写 |
| 架构图 | PlantUML（组件图/包图） | 规格要求附一张图 | ⚠️ 无 Java、无 plantuml 命令 | 见下方「渲染路线」 |
| 图形渲染 | PlantUML 公共服务器 | GET 编码后返回 SVG：实测 **HTTP 200 / 2175 B** | ✅ 可用 | 用 `scripts/render-diagram.mjs` 编码并下载 SVG，提交产物 |
| 备用渲染 | Kroki | 实测连接超时 | ❌ | 不用 |
| 备用渲染 | `brew install plantuml` | brew 存在，但会写 `/opt/homebrew`（沙箱外） | ⚠️ 需审批 | 仅在服务器不可用时启用 |
| 浏览器 | Chrome / Edge / Safari | 预览 `save` 产物 | ✅（`open` 命令存在） | 手工验收：`open examples/demo.svg` |
| 编辑器 | VSCode | 建议装 “SVG Preview” 扩展 | ⚠️ `code` CLI 存在，扩展未确认 | 可选，不影响交付 |
| 客户端 | 任意 Markdown 渲染器 | 预览文档中的 SVG | ✅ | SVG 需内联/相对路径引用 |

**渲染路线（推荐）：** 本地只维护 `doc/architecture.puml` 源文件；用 Node 内置 `zlib` + 自写 PlantUML 编码（已实测成功）请求公共服务器，下载为 `doc/architecture.svg` 并提交。这样：不需要 Java、不依赖本机 Java 环境、提交物离线可看。**若你要求完全离线**，则需要审批安装 JDK + plantuml（约 200 MB）。

### 2.4 网络、权限与输入材料

| 类别 | 环境项 | 实测 | 说明 |
|---|---|---|---|
| 网络 | `registry.npmjs.org` | 200 | 依赖安装 |
| 网络 | `github.com` | 200 | 远程仓库 |
| 网络 | `gitee.com` | 200 | 备选远程仓库 |
| 网络 | `plantuml.com` | 200（GET 渲染成功） | 架构图渲染 |
| 沙箱 | 文件策略 | `workspace-write` | 只能写 `/Users/ahs/Documents/dsh` 之下；npm 缓存需改到工作区 |
| 审批 | 策略 | `ask` | 安装 JDK / 写沙箱外路径时会弹审批；本计划尽量不触发 |
| 输入 | 规格中的 `other.svg` | 已在文档内给出 | 作为 `test/fixtures/other.svg` 与 `examples/other.svg` |
| 输入 | 会话脚本 | §6 / §6.1 全文 | 作为 golden transcript 回归测试 |
| 工具 | `curl` / `diff` / `python3` | 可用 | 仅探测/校验用，不进入产品依赖 |

### 2.5 AI 协作环境

| 项 | 说明 |
|---|---|
| 协作工具 | 本会话的 DSH 编码智能体（规格要求使用 AI 智能体协作） |
| 记录要求 | 在 `doc/README.md` 的「过程记录」中如实记录：AI 给过什么建议、发现什么问题、如何验证与纠正 |
| 已验证的真实案例 | ① Node 原生 TS 参数属性报错 → 改用 tsx；② npm 缓存 EPERM → 工作区缓存；③ 规格 `tree` 示例列宽自相矛盾（第 419 行 `text#process-label` 属性列 31，其余为 29）→ 需制定统一规则；④ PlantUML POST 302 超时、Kroki 超时 → 改用带编码的 GET |

### 2.6 环境自检命令（实施前跑一遍）

```bash
cd /Users/ahs/Documents/dsh/高级软件开发
node -v && npm -v && git --version
export npm_config_cache="$PWD/.npm-cache"
npm ping                                  # 期望 200/PONG
git config --local user.name  "<你的名字>"
git config --local user.email "<你的邮箱>"
git config --local core.quotepath false
LANG=en_US.UTF-8 node -e "console.log(process.stdout.write('中文 OK\n'))"
curl -m 15 -s -o /dev/null -w '%{http_code}\n' https://www.plantuml.com/plantuml/svg/SoWkIImgAStDuOfEpicCLT3LjLE8JixFpKtCIudb
```

### 2.7 不需要的环境（避免过度准备）

- Java/JDK（采用公共渲染服务器；如改离线方案才需要）；
- Docker / 数据库 / 后端服务；
- Puppeteer / 浏览器自动化 / 截图服务；
- ESLint + Prettier（可选加分项，非必需；用 `tsc --strict` + 代码审阅 + 依赖测试代替）；
- CI（可选；本地 `npm run verify` 足够）；
- `gh` CLI（可用网页创建仓库 + `git remote add`）。

---

## 3. 需要你确认的 4 个决策

> **已确认（用户答复）**：A = **A1**（`高级软件开发/` 作为仓库根）；B = **SSH**（`git@github.com:1731067942cjh-hash/GaoJiRuanJian.git`，新密钥已生成并通过认证）；C = **C2**（本机安装 JDK + PlantUML）；D = 验证远程可用后立即实施。

| # | 决策 | 选项 | 我的建议 |
|---|---|---|---|
| A | 仓库根目录 | **A1**：`高级软件开发/` 本身作为仓库根（`doc/README.md` = `高级软件开发/doc/README.md`）<br>**A2**：`高级软件开发/svg-editor/` 作为仓库根 | **A1**，最贴合“文件都在 `高级软件开发/` 中”的要求；`phase_cli_1.md` 不提交（写入 `.gitignore`） |
| B | 远程仓库与认证 | **B1**：你给 GitHub/Gitee 空仓库 URL + PAT<br>**B2**：你给 SSH 地址，并把公钥配好<br>**B3**：先只做本地仓库，稍后你再 push | **B1**；PAT 只通过环境变量使用，不写入仓库 |
| C | 架构图渲染 | **C1**：公共 PlantUML 服务器（已验证可用）<br>**C2**：本机安装 JDK + PlantUML（需审批，可离线） | **C1** + 提交渲染后的 SVG |
| D | 开工时间 | 你确认计划后立即开始 / 你希望先调整计划 | 确认后按 §6 里程碑推进 |

> B1 需要的信息：仓库 URL、用户名、PAT；以及 git 提交用的姓名/邮箱。B 也是唯一会阻塞“远程推送”的环境项。

---

## 4. 目录与文件清单（全部在 `高级软件开发/` 下）

```
高级软件开发/
├── phase_cli_1.md                # 原规格（保留；建议 .gitignore，不入库）
├── PLAN.md                       # 本计划
├── README.md                     # 快速开始、命令速查、目录说明
├── package.json                  # scripts: cli / test / typecheck / verify / diagram
├── package-lock.json             # 锁定依赖（提交）
├── tsconfig.json                 # strict, noEmit, moduleResolution=bundler
├── .gitignore                    # node_modules/ dist/ .npm-cache/ coverage/ .DS_Store
├── .gitattributes                # * text=auto eol=lf
├── src/
│   ├── domain/                   # 纯领域模型：不依赖 Node IO / CLI / 序列化
│   │   ├── Shape.ts              # 抽象基类：id、父指针、accept(visitor)、move/scale 契约
│   │   ├── Container.ts          # 抽象容器：children、插入/摘除/遍历/递归操作
│   │   ├── Document.ts           # 根 svg 文档（width/height、id 索引、根容器语义）
│   │   ├── Rect.ts / Circle.ts / Ellipse.ts / Line.ts / TextShape.ts / Group.ts
│   │   ├── ShapeVisitor.ts       # 访问者接口（树/明细/SVG 写出共用）
│   │   ├── IdAllocator.ts        # 外部 SVG 缺 id 时按 `标签名+序号` 分配
│   │   ├── Transform.ts          # read 时把 translate/scale/matrix 烘焙进坐标
│   │   ├── NumberFormat.ts       # 浮点格式统一（最多 6 位小数、去尾零、去 -0）
│   │   └── errors/DomainError.ts # 错误码 + 规格文案
│   ├── shape/
│   │   ├── ShapeFactory.ts       # 【允许的名字分派 #2】type/tag → 类；标注 @todo 插件化
│   │   └── ShapeSpec.ts          # create 参数 schema（arity/类型/可选参数）
│   ├── command/
│   │   ├── EditCommand.ts        # execute/undo + 结果消息
│   │   ├── History.ts            # undo/redo 双栈、io 锁、redo 清空
│   │   ├── CreateCommand.ts / DeleteCommand.ts / MoveCommand.ts / ScaleCommand.ts
│   │   ├── SetCommand.ts / GroupCommand.ts / UngroupCommand.ts / AddToCommand.ts
│   │   └── ReorderCommand.ts     # front / back
│   ├── serialization/
│   │   ├── SvgReader.ts          # XML → Document；缺 id 警告；transform 烘焙
│   │   ├── SvgWriter.ts          # Document → 规范 SVG（Visitor）
│   │   ├── XmlTree.ts            # 端口接口（隔离第三方解析器）
│   │   └── FastXmlTree.ts        # fast-xml-parser 适配器
│   ├── view/
│   │   ├── TreeRenderer.ts       # tree 输出（属性内联 + 层级线）
│   │   ├── ShowRenderer.ts       # show 输出
│   │   └── HelpText.ts           # help 文案
│   ├── io/
│   │   ├── FileGateway.ts        # 端口：读/写/存在性
│   │   └── NodeFileGateway.ts    # node:fs 适配器
│   ├── cli/
│   │   ├── Tokenizer.ts          # 双引号参数、行首 # 注释
│   │   ├── CommandParser.ts      # 命令名 + 参数 + create 的 in 子句
│   │   ├── CommandRegistry.ts    # 【允许的名字分派 #1】命令名 → 处理函数；标注 @todo
│   │   ├── CommandDispatcher.ts  # 统一错误捕获、状态不变式、回显
│   │   ├── Repl.ts               # 提示符 `svg> `、逐行读入、EOF 退出
│   │   └── main.ts               # 组合根：注入 gateway/factory/history
│   └── app/                      # 可选：EditorFacade（把命令执行与文档状态收口）
├── test/
│   ├── unit/                     # 每个领域类/命令/解析器
│   ├── integration/              # REPL 级：golden transcript、错误矩阵、undo/redo、round-trip
│   └── fixtures/
│       ├── other.svg             # 规格 §6 外部文件（含缺 id 元素）
│       ├── transcripts/          # 输入脚本 + 期望输出
│       └── expected/             # 保存产物 golden SVG
├── examples/
│   ├── other.svg                 # 可直接 read 的样例
│   ├── demo.svg                  # §6 保存结果
│   └── flowchart.svg             # §6.1 保存结果
├── doc/
│   ├── README.md                 # 规格要求的四节 + 修订记录
│   ├── architecture.puml         # 组件图源文件
│   └── architecture.svg          # 渲染产物（提交，离线可看）
└── scripts/
    ├── render-diagram.mjs        # PlantUML 编码 + 下载 SVG
    └── replay.mjs                # 手工回放 transcript（可选）
```

**不提交：** `node_modules/`、`.npm-cache/`、`coverage/`、`.DS_Store`、临时输出。  
**提交：** 源码、测试、fixtures、examples、doc、锁文件、架构图 SVG。

---

## 5. 架构方案（初稿）

### 5.1 模块划分与职责

| 模块（目录） | 职责 | 不允许做的事 |
|---|---|---|
| `domain` | 图形树、几何、属性白名单、id 索引、统一操作语义；纯内存、纯 TS | 读写文件、打印、读 stdin、依赖 CLI |
| `shape` | 类型注册表与 create 参数 schema；把“类型名”解析为类 | 业务逻辑、IO |
| `command` | 每个编辑操作封装为对象；undo/redo 栈；失败不落地 | 直接打印、直接读写文件 |
| `serialization` | SVG ↔ 文档模型；XML 解析适配；格式/转义 | 依赖 CLI、读写磁盘 |
| `view` | `tree` / `show` / `help` 文本渲染（Visitor） | 修改模型、读写文件 |
| `io` | 路径 → 字符串、字符串 → 文件；错误归一化 | 理解图形语义 |
| `cli` | 分词、解析、分发、REPL、错误文案、组合根 | 持有业务规则（规则必须落在 domain/command） |

```plantuml
@startuml
skinparam componentStyle rectangle
package "cli" {
  [Repl] [CommandParser] [CommandRegistry] [CommandDispatcher] [main]
}
package "command" {
  [EditCommand*] [History]
}
package "domain" {
  [Shape/Container/Document] [Concrete Shapes]
}
package "shape" {
  [ShapeFactory]
}
package "view" {
  [TreeRenderer] [ShowRenderer] [HelpText]
}
package "serialization" {
  [SvgReader] [SvgWriter] [XmlTree adapter]
}
package "io" {
  [FileGateway adapter]
}
[cli] --> [command]
[cli] --> [view]
[cli] --> [serialization]
[cli] --> [io]
[command] --> [domain]
[command] --> [shape]
[serialization] --> [domain]
[serialization] --> [shape]
[view] --> [domain]
[shape] --> [domain]
@enduml
```

### 5.2 设计模式的选择与落地

| 模式 | 落地位置 | 作用 | 备注 |
|---|---|---|---|
| **Command（规格强制）** | `command/EditCommand.ts` 及各具体命令；`History.ts` 作为 Invoker | 每条编辑命令 = 一个对象 + 一个 undo 单元；`group` 多目标天然原子；支持 redo 与 io 锁 | 撤销采用“记录受影响对象的最小前后状态”，不用整文档快照；`History` 可替换为快照实现 |
| **Composite** | `Shape` / `Container` / 具体叶子；容器 `move/scale/set/delete` 递归 | `<g>` 与叶子一视同仁；`in`、嵌套、`group` 都是子树操作 | `ungroup` 对根级容器拒绝（规格 4.2），复合类型拒绝（`box` 预留） |
| **Factory + Registry** | `shape/ShapeFactory.ts` | create 与 read 共用一张“类型名/tag → 类”表 | **允许的名字分派 #2**，文件头标注 `@todo 插件化阶段替换为 ShapeProvider` |
| **Visitor** | `view/TreeRenderer`、`view/ShowRenderer`、`serialization/SvgWriter` | 让 domain 不含展示/序列化逻辑；增加输出格式不用改模型 | 每个具体图形实现 `accept(visitor)` |
| **Adapter** | `io/NodeFileGateway`、`serialization/FastXmlTree` | 隔离 `node:fs` 与 `fast-xml-parser`，便于单测与替换 | 依赖倒置的落点 |
| **Facade（轻量）** | `cli/CommandDispatcher`（或 `app/EditorFacade`） | 统一“解析 → 执行 → 错误 → 回显”流程 | 不是业务上帝类 |

**允许按名字分派的两处（必须在 `doc/README.md` 标注待重构）：**

1. `cli/CommandRegistry.ts`：命令名 → handler；
2. `shape/ShapeFactory.ts`：类型名/tag → 类。

其余任何 `switch(tag)` / `if (type === 'rect')` 都视为违规，用多态或 Visitor 替代。

### 5.3 依赖方向规则

| 从 ↓ 依赖到 → | domain | shape | command | view | serialization | io | cli |
|---|---|---|---|---|---|---|---|
| domain | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| shape | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| command | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| view | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| serialization | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| io | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| cli | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**硬规则：**

- `domain` 只允许 import `domain`；禁止 `node:*`、`process`、`console`、`readline`、`fs`；
- `command` 只依赖 `domain` + `shape`，**不打印、不读写文件**；执行结果以 `{ ok, message }` 返回；
- `view` / `serialization` 不依赖 `cli`；
- 允许 `cli` 依赖所有层（组合根职责）；
- 无环；一旦出现反向依赖，视为待处理项并记入文档。

**执行手段：** `test/unit/dependency.test.ts` 静态扫描 `src/**` 的 import 语句，按上表断言；CI/`npm run verify` 中运行。

### 5.4 变化点假设（未来最可能变的地方）

| # | 变化点 | 我的准备 | 或为什么决定不留 |
|---|---|---|---|
| 1 | 新增图形类型（`box`、`path`、插件） | `ShapeFactory` + `ShapeSpec` + 具体类模板；容器接口天然支持复合 | 本阶段不实现动态加载；工厂接口就是接缝，标注 TODO |
| 2 | `set` 的属性白名单与传播语义 | 每个类多态实现 `setAttribute`；基类管公共样式 | 属性表内聚到类，新增属性只改一个类 |
| 3 | SVG 序列化/读回格式（命名空间、样式、transform） | 读写器独立成 `serialization`；XML 解析在 Adapter 后 | 不提前支持 CSS/gradient；未知元素先“警告并跳过” |
| 4 | 寻址方式（id → 结构路径） | `Document` 统一收口 `resolve(id)`，外部不直接遍历查找 | 规格明确要求 id 寻址，不额外造 Locator 接口 |
| 5 | undo 策略（逆操作 → 快照/协同） | `EditCommand` 接口隔离；`History` 可整体替换 | 不引入事件溯源/CRDT |
| 6 | IO 来源/目标（浏览器、远端） | `FileGateway` 端口 | 本阶段只做本地文件 |
| 7 | 显示格式与本地化 | `view` 下 Visitor；文案集中 | 不引入 i18n 框架 |
| 8 | 坐标语义（烘焙坐标 vs `transform` 属性） | 解析/变换集中在 `Transform`；移动/缩放统一走模型 | 当前选择“烘焙”，见 §5.5；如改 transform 只需改写出与变换策略 |
| 9 | 命令语法扩展（子命令、管道） | `Tokenizer` + `CommandParser` 单点演进 | 不引入通用 parser combinator |
| 10 | 插件化阶段（`box` 的 ShapeProvider） | 工厂注册表 + `data-kind` 的读写约定在文档中写明 | 不在本阶段加载插件 |

### 5.5 关键设计决策（先定后写，避免实现期反复）

| 决策 | 选择 | 理由 / 影响 |
|---|---|---|
| 容器 `move` / `scale` | **递归烘焙到子孙坐标**，不生成 `transform` | 与规格“scale 递归到每个子孙”一致；`tree`/`show` 显示真实坐标；代价是丢失 `<g transform>` 表达（记入限制） |
| `read` 的 `transform` | 解析 `translate/scale/matrix` 并烘焙进坐标；`rotate/skew` 给警告 | 移动/缩放语义统一；本阶段样例只需 translate/scale |
| 撤销数据 | 命令记录受影响对象的前后状态（父/索引/旧值） | 比全量快照省内存；`group`/`ungroup` 也能原子还原 |
| IO 后历史 | `init/read/save/canvas 改尺寸` 清空 undo/redo 并上锁；下一次编辑命令解锁 | 严格对应 4.3；显示类不触碰历史 |
| 失败原子性 | 先校验后修改；命令对象要么全成功要么不变 | 满足“失败不改变任何状态”；所有 error 路径单测 |
| id | 全局 `Map<string, Shape>`；大小写敏感；删除后释放 | O(1) 查找；undo 恢复时重新登记 |
| 自动 id | `标签名 + 递增序号`，跳过已占用（`rect1`、`rect2`…），每补一个打印 warning | 与规格示例一致 |
| 数字格式 | 解析浮点；输出最多 6 位小数、去尾零、`-0` 归一为 `0` | 避免 `0.1+0.2` 类噪声 |
| `tree` 对齐 | 同一层级按“最长名字 + 2 空格”对齐 | 规格示例的列宽本身不一致（29 vs 31），无法用统一规则逐一复现；采用确定规则并在过程记录说明 |
| 未支持元素 | `read` 时警告并跳过（如 `<path>`） | 本阶段类型边界；不静默丢弃 |
| `save` 无路径且从未保存/读入 | `error: no file path. use 'save <file.svg>'`（规格外扩展，文档标注） | 行为可预期 |
| `addto` 成环 | `error: cannot add container into its own descendant: <id>`（规格外扩展） | 防止破坏树 |
| 警告输出 | `warning:` 走 stdout，保持与 transcript 顺序一致 | 规格示例中与命令回显混排 |
| 元素计数 | `save/read` 的 N = 全部图形节点（含 `g`，不含 svg 根） | 与 §6 的 5/7/8 一致 |

---

## 6. 实施里程碑与 git 提交计划

> 原则：先测试后/同步实现；每个里程碑结束都可运行；禁止 one-shot 大提交；每个提交只做一件事。

| 里程碑 | 内容 | 预计提交数 | 验收标准 |
|---|---|---|---|
| **M0 工程骨架** | `git init -b main`、`.gitignore`、`package.json`、`tsconfig`、锁文件、根 README、PLAN | 3–4 | `npm ci`、`npm run typecheck` 通过；首次提交可运行 |
| **M1 领域模型** | `Shape`/`Container`/`Document`/五个叶子/`Group`/`IdAllocator`/`Transform`/`NumberFormat` + 单测 | 6–8 | 能构造树、统一 `move/scale/delete`、id 唯一性断言 |
| **M2 命令与历史** | `EditCommand`、`History`、10 个具体命令、结果消息、失败原子性 + 单测 | 6–8 | undo/redo 单测全绿；`group/ungroup` 原子还原 |
| **M3 序列化** | `XmlTree` 端口与适配器、`SvgReader`（补 id/警告/烘焙）、`SvgWriter`（转义/缩进/属性顺序） | 4–6 | `other.svg` 读入 → 保存 → 再读回结构相同；输出可被浏览器解析 |
| **M4 CLI 与显示** | `Tokenizer`、`CommandParser`、`CommandRegistry`、`Repl`、`main`、`TreeRenderer`、`ShowRenderer`、`HelpText`、`CommandDispatcher` | 6–8 | `npm run cli` 可跑通 §6 主流程；错误前缀统一 |
| **M5 边界与错误矩阵** | 4.2 全部场景、io 锁、redo 清空、`in` 校验、成环、根级 `ungroup`、未知属性/类型、文件错误 | 4–6 | 每条错误有测试；失败后文档状态不变 |
| **M6 回归与质量** | golden transcript（§6、§6.1、错误、undo）、round-trip、依赖方向测试、`npm run verify` | 4–5 | 全部测试与类型检查通过；转录可复现 |
| **M7 文档与图** | `architecture.puml`、渲染 `architecture.svg`、`doc/README.md` 四节 + 修订记录、根 README、examples | 4–6 | 文档可独立读懂；图与代码一致 |
| **M8 交付** | 一致性自查、修复偏差、最终全量验证、`git tag final`、推送 | 3–4 | DoD 全部勾选；tag 已推送 |

**提交信息规范：** `feat:` / `fix:` / `test:` / `docs:` / `chore:` / `refactor:`，每个提交说明“做了什么 + 为什么”，便于体现迭代过程。

---

## 7. 测试与质量保证

### 7.1 测试层次

| 层次 | 范围 | 工具 / 方式 |
|---|---|---|
| 单元 | 领域类、命令、Tokenizer/Parser、序列化、渲染器 | vitest |
| 集成 | 启动真实 REPL（`child_process` 或注入流），回放脚本 | vitest + fixtures |
| Golden | §6 / §6.1 / 错误脚本的完整输出逐字对比 | `test/fixtures/transcripts/*.txt` |
| Round-trip | `read → save → read`，结构与属性一致；SVG 可解析 | vitest + XML 适配器 |
| 架构 | import 方向、文件/类名一致、仅两处名字分派 | 静态扫描测试 |
| 手工 | 浏览器打开 `examples/*.svg`、VSCode 预览 | `open` |

### 7.2 规格覆盖矩阵（实施时逐项打勾）

- 命令总表 3 类 × 全部命令 + `undo`/`redo`；
- `create` 六种类型 × 必选/可选参数 × `in` 子句；
- `set` 白名单（公共样式、各类型几何、text 内容）+ 未知属性报错；
- 4.2 错误表 13 条（逐条一个测试）；
- 4.3 undo 粒度（`group` 原子、io 锁、redo 清空、显示类跳过）；
- §5.1 tree、§5.2 show 的格式；
- §6、§6.1 两个完整会话；
- 边界：空文档、根级容器、跨父 `group`、成环、重复 id、浮点、中文与引号、缺 id、未知元素、保存后撤销。

### 7.3 质量依据（写进 `doc/README.md`）

1. `tsc --strict --noEmit` 零错误；
2. 测试数量与覆盖率（报告关键模块覆盖）；
3. golden transcript 逐字比对结果；
4. 依赖方向测试结果；
5. 手工浏览器预览截图/说明；
6. 规格逐条对照表（哪些实现、哪些按阶段边界不做、哪些是规格外扩展）。

> 不在测试里造假：若某条规格无法满足（例如示例排版自相矛盾），在文档中如实说明选择与理由，并列入修订记录。

---

## 8. 文档计划（`doc/README.md`）

| 章节 | 内容 |
|---|---|
| 1. 架构方案 | 模块划分表 + PlantUML 组件图（内嵌 `architecture.svg`）；设计模式与实际落地位置；依赖方向规则与执行方式；变化点假设（含“为什么不留”） |
| 2. 过程记录 | 按时间记录关键讨论/迭代：AI 建议 → 我发现的疑点 → 验证方法 → 采纳/纠正。**必须使用真实发生的事件**（已积累 4 个，见 §2.5） |
| 3. 一致性自查 | ① 实际目录 vs 方案：一致/偏差 + 修订记录；② 依赖方向：规则是否被违反，抽样给出 import 证据与测试结果 |
| 4. 质量保证手段 | 测试策略、命令、覆盖矩阵、手工验证、已知限制 |
| 5. 修订记录 | 每次架构/模块调整：日期、变更、原因、影响 |

图：`doc/architecture.puml` + `doc/architecture.svg`，README 用相对路径嵌入，保证离线/网页均可看。

---

## 9. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 无远程仓库/凭据 | 无法满足 1.1 推送 | 提前确认；先本地分步提交，B1 就绪后立即 push |
| npm 缓存/沙箱限制 | 依赖装不上 | 工作区缓存 + 固定 `npm_config_cache`；必要时申请审批 |
| 规格排版/文案不完全确定 | golden 对比失败 | 建立统一规则；规格内文案逐字实现；规格外扩展在文档标注 |
| `tree` 对齐样例自相矛盾 | 无法同时匹配所有样例 | 采用确定规则 + 过程记录说明；优先保证结构与属性正确 |
| undo 结构命令复杂（group/ungroup/addto） | 状态损坏 | 命令记录父/索引/旧值；大量单测 + 失败原子性测试 |
| PlantUML 服务器不可用 | 无法出图 | SVG 已提交；备用本地安装（需审批） |
| Node 版本差异（评分环境） | 跑不起来 | `engines: node >= 20`；tsx/vitest 兼容；锁文件提交；README 写明命令 |
| 范围蔓延（提前做 box/插件） | 拖慢主线 | 严格按 §1.2；只为插件留接缝，不实现 |
| 中文/宽字符对齐 | tree 不齐 | 显示按字符宽度计算（或明确按码点），文档说明 |
| 截止时间 | tag 超期 | 里程碑推进；M8 留缓冲；tag 在最终提交处创建 |

---

## 10. 工作量估算

- 里程碑 9 个，预计 **28–40 个提交**；
- 代码规模预估：领域 10–14 个类、命令 11 个类、解析/序列化/视图/CLI 约 15 个类；
- 测试约 80–120 个用例；
- 按当前协作节奏，预计 **3–4 个工作轮次**（每轮完成 2–3 个里程碑并验证）。

---

## 11. 完成检查清单（交付前逐项勾选）

**功能**
- [ ] `init/read/save/canvas` 全部符合规格（含 save 无参、canvas 无参/带参）
- [ ] 六种 `create` + `in` 子句 + 全部编辑命令
- [ ] `undo/redo` 粒度、io 锁、redo 清空
- [ ] `tree/show/help` 输出
- [ ] 错误表 13 条 + 未知属性
- [ ] 读入自动补 id 并警告
- [ ] 保存 SVG 可在浏览器打开

**质量**
- [ ] `npm ci`、`npm run typecheck`、`npm test`、`npm run verify` 全绿
- [ ] golden transcript、round-trip、依赖方向测试通过
- [ ] 失败命令不改变状态（专项测试）

**文档**
- [ ] `doc/README.md` 四节完整 + 修订记录
- [ ] 架构图源 + 渲染图
- [ ] 过程记录真实、具体
- [ ] 一致性自查如实回答

**工程**
- [ ] 所有文件位于 `高级软件开发/`
- [ ] git 分步提交、远程已推送
- [ ] `final` tag 位于最终提交
- [ ] 截止前完成

---

## 12. 实施结果

1. §3 决策已确认：A1（仓库根 = `高级软件开发/`）、B（SSH 远程）、C2（本机 PlantUML）、D（验证后立即实施）；
2. M0–M8 已按计划完成，新增模块与计划偏差记入 `doc/README.md` 的修订记录；
3. 全部文件位于 `/Users/ahs/Documents/dsh/高级软件开发/`，`npm run verify` 通过；
4. 最终提交已打 `final` tag 并推送到 `git@github.com:1731067942cjh-hash/GaoJiRuanJian.git`。
