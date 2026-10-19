# Lab1 Phase 1 — SVG 编辑器（CLI）

本文件是课程要求的工程文档：架构方案、过程记录、一致性自查与质量保证手段。实现与命令用法见仓库根目录的 `README.md`，原始需求见 `phase_cli_1.md`（未纳入版本库）。

---

## 架构方案

### 1.1 模块划分

```text
src/
├── domain/          纯领域模型：零 IO、零 CLI 依赖
│   ├── Shape.ts            抽象基类（id、父指针、accept、move/scale 契约、公共样式）
│   ├── Container.ts        Composite 基类：children、插入/摘除、递归操作、查找
│   ├── Document.ts         根 <svg>：画布尺寸、递归查找、元素计数
│   ├── Rect.ts / Circle.ts / Ellipse.ts / Line.ts / TextShape.ts / Group.ts
│   ├── ShapeVisitor.ts     访问者接口（tree / show / SVG 写出共用）
│   ├── Transform.ts        仿射矩阵解析与乘法（read 时烘焙坐标）
│   ├── IdAllocator.ts      外部 SVG 缺 id 时按 <tag><n> 分配
│   ├── NumberFormat.ts     数字解析与格式化（去浮点噪声）
│   └── errors/DomainError.ts
├── shape/
│   └── ShapeFactory.ts     类型名/tag → 类（允许的名字分派 #2）
├── command/
│   ├── EditCommand.ts      命令接口：execute / undo
│   ├── History.ts          undo/redo 双栈、io 锁、redo 清空
│   ├── Create/Delete/Move/Scale/Set/Group/Ungroup/AddTo/ReorderCommand.ts
│   ├── GeometrySnapshot.ts 记录受影响图形的绝对几何，供撤销还原
│   └── commandFormat.ts    统一回显文案（容器标签、set 文案）
├── serialization/
│   ├── SvgReader.ts        SVG → Document；补 id、transform 烘焙、警告
│   ├── SvgWriter.ts        Document → SVG（Visitor）
│   ├── XmlTree.ts          XML 端口（与第三方库解耦）
│   ├── XmldomTree.ts       @xmldom/xmldom 适配器
│   └── XmlParseError.ts    解析失败错误
├── view/
│   ├── TreeRenderer.ts     tree 文本（属性内联、层级线、对齐）
│   ├── ShowRenderer.ts     show 属性明细
│   └── HelpText.ts         help 文案
├── io/
│   ├── FileGateway.ts      文件读写端口
│   └── NodeFileGateway.ts  node:fs/promises 适配器
└── cli/
    ├── Tokenizer.ts        引号、转义、行首 # 注释
    ├── CommandParser.ts    命令名 + 参数
    ├── CommandRegistry.ts  命令名 → handler（允许的名字分派 #1）
    ├── CommandDispatcher.ts 统一错误捕获与输出
    ├── EditorSession.ts    当前文档、路径、History、依赖注入
    ├── Repl.ts             逐行读入；TTY 才显示 banner/prompt
    ├── main.ts             组合根
    └── commands/           文档类、编辑类、显示类 handler（按职责拆分）
```

| 模块 | 职责 | 不应该做的事 |
|---|---|---|
| `domain` | 图形树、几何、属性白名单、统一操作语义 | 文件读写、打印、读 stdin、依赖 CLI |
| `shape` | 类型注册与 create 参数 schema；类型名/tag → 类 | 业务规则、IO |
| `command` | 把每个编辑操作封装为对象；维护 undo/redo；失败不落地 | 直接打印、直接读写文件 |
| `serialization` | SVG ↔ 模型；XML 适配；转义与格式 | 依赖 CLI、直接读写磁盘 |
| `view` | tree/show/help 文本呈现 | 修改模型、读写文件 |
| `io` | 路径 → 文本、文本 → 文件；错误归一化 | 理解图形语义 |
| `cli` | 分词、解析、分派、REPL、错误文案、组合根 | 持有领域规则（规则在 domain/command） |

![模块依赖图](architecture.svg)

> 图源：`architecture.puml`，可用 `npm run diagram` 或 `plantuml -tsvg doc/architecture.puml` 重新生成。

### 1.2 设计模式的选择与落地

| 模式 | 落地点 | 具体做法 |
|---|---|---|
| **Command（规格强制）** | `src/command/` | `EditCommand` 定义 `execute` / `undo`；每个编辑操作一个类；`History` 作为 Invoker 维护双栈。一条命令 = 一个 undo 单元，`group`/`ungroup` 的多次结构修改在一次 undo 中整体还原。 |
| **Composite** | `Shape` / `Container` / `Group` / `Document` | 容器与叶子共享 id、样式、`moveBy`/`scaleBy`/`transformBy` 契约；容器的移动/缩放递归到全部子孙；`delete` 删除整棵子树；`in`/`group`/`addto` 都是子树操作。 |
| **Factory + Registry** | `src/shape/ShapeFactory.ts` | 一张 “类型名/tag → 类” 表同时服务 `create` 与 `read`；未知类型给出 `unknown shape type: … (is the plugin loaded?)`。 |
| **Visitor** | `view/`、`serialization/SvgWriter.ts` | 每个具体图形实现 `accept(visitor)`；tree、show、SVG 写出是三个访问者，领域模型不 import 任何渲染器。 |
| **Adapter** | `io/NodeFileGateway.ts`、`serialization/XmldomTree.ts` | 把 `node:fs/promises` 与 `@xmldom/xmldom` 藏在小端口后面；测试可替换，库更换只改适配器。 |
| **Facade（轻量）** | `cli/CommandDispatcher.ts` | 统一“解析 → 执行 → 错误 → 输出”流程；不承载领域规则。 |
| **Template Method（基类复用）** | `Shape.loadCommonAttributes` | 公共样式与未知属性的保留逻辑只写一次；子类只处理自己的几何。 |

**允许的两处“按名字分派”（也是唯一两处）：**

| # | 位置 | 映射 | 状态 |
|---|---|---|---|
| 1 | `src/cli/CommandRegistry.ts` | 命令名 → handler | 文件头已标注 `@todo`：插件化阶段改为命令注册 |
| 2 | `src/shape/ShapeFactory.ts` | 类型名 / element tag → 类 | 文件头已标注 `@todo`：插件化阶段替换为 `ShapeProvider` |

其余类型差异全部通过多态（`accept`、`moveBy`、`scaleBy`、`readGeometry` 等）或访问者处理；代码中没有 `switch (tag)`。属性名在各图形类内部按自身语义处理（例如 `Rect` 只认识 `x/y/width/height`），它属于类的内聚行为，不是跨模块的类型分派。

### 1.3 依赖方向规则

| 模块 | 允许依赖 | 理由 |
|---|---|---|
| `domain` | 仅 `domain` | 模型必须可独立测试；禁止 `node:*`、`process`、`console`、外部库 |
| `shape` | `domain` | 工厂只负责“类型名 → 类”，不反向依赖命令 |
| `command` | `domain`, `shape` | 命令操作模型；不打印、不读写文件，结果以字符串返回 |
| `view` | `domain` | 访问者只读模型 |
| `serialization` | `domain`, `shape`；外部 XML 库只允许出现在 `XmldomTree` 适配器 | 读写逻辑与第三方库隔离 |
| `io` | `io` + `node:fs` | 文件端口不依赖模型 |
| `cli` | 以上全部 + `node:readline` | 组合根与适配层 |

**硬规则：** 不允许反向依赖；不允许循环；`domain` 不得 import 任何 UI/IO/序列化代码。  
**执行手段：** `test/unit/dependency.test.ts` 静态扫描 `src/**` 的 import，按上表断言；`npm test` 每次运行。当前无违规。

### 1.4 变化点假设

| # | 变化点 | 预判与准备 | 或为何不准备 |
|---|---|---|---|
| 1 | 新增图形类型（`box`、`path`、插件） | 工厂注册表 + `ShapeKind` 元数据；容器已支持任意子树；`read` 与 `create` 共用工厂 | 不在本阶段实现动态插件加载；接缝已在，标注 TODO |
| 2 | `set` 属性白名单/传播语义 | 每个类多态实现 `supportsAttribute`/`getAttribute`/`setAttribute`；新增属性只改一个类 | `box` 的 fill/label 传播属于插件阶段 |
| 3 | SVG 方言（样式、命名空间、transform） | 读写器独立；XML 库藏在 `XmlTree` 后；未建模属性进 `extras` 原样保留 | 不提前支持 CSS/gradient/path 等完整 SVG |
| 4 | 寻址方式（id → 结构路径） | `Document.find` 是唯一查找入口，便于替换 | 规格明确要求 id 寻址，不额外造 Locator 抽象 |
| 5 | 撤销策略（逆操作 → 快照/协同） | 命令接口隔离；`History` 可整体替换；几何用绝对快照避免累积误差 | 不引入事件溯源/CRDT |
| 6 | IO 来源/目标（浏览器、远端） | `FileGateway` 端口 | 本阶段只做本地文件 |
| 7 | 显示格式与本地化 | 渲染器在 `view/`，文案集中 | 不引入 i18n 框架 |
| 8 | 坐标语义（烘焙 vs `transform` 属性） | 解析/变换集中在 `Transform`；模型只存绝对坐标 | 保存不生成 `transform`；若未来要保留结构，改写出与读取策略 |
| 9 | 命令语法扩展（子命令、管道） | `Tokenizer` + `CommandParser` 单点演进 | 不引入通用 parser combinator |
| 10 | 插件化阶段的 `box` 读回 | README/文档已约定 `data-kind="box"`；未注册插件的编辑器降级为普通 `g` | 本阶段不实现插件，故不写 half-plugin |

### 1.5 关键决策与已知限制

| 决策/限制 | 说明 |
|---|---|
| 坐标烘焙 | `move`/`scale` 直接改写子孙坐标；`read` 把 `translate/scale`（无非旋转项的 `matrix`）烘焙进坐标；保存不输出 `transform`。`rotate/skew` 读取时警告并忽略。 |
| `tree` 样式 | 只内联 `fill`（与规格 §5.1、§6.1 示例一致）；`show` 显示 fill/stroke/stroke-width 全量。 |
| `tree` 对齐 | 属性列 = 渲染子树中 `(缩进 + 名称)` 最大长度 + 2。§5.1、§6 示例精确复现（列 19）；§6.1 示例自身列宽不一致（29 与 31），本实现统一为 32，内容正确，差异记录在修订记录。 |
| 文档 IO 与历史 | `init/read/save/canvas 改尺寸` 成功后清空 undo/redo 并上锁；下一次编辑命令解锁；显示类不触碰历史。失败的 IO 不改变状态、不锁历史。 |
| undo/redo 锁文案 | 按规格字面，两个方向都输出 `error: undo not allowed after io command`。 |
| 数字 | 最多 6 位小数、去尾零、`-0` 归一为 `0`；避免 `0.1+0.2` 噪声。 |
| 未知 SVG 元素 | 警告并跳过（如 `<path>`）；未建模属性保存在 `extras` 并写回。 |
| `read` 重复 id | 视为非法输入：`error: duplicate id: <id>`，当前文档不变。 |
| `save` 无路径 | 若从未 read/save：`error: no file path. use 'save <file.svg>'`（规格外扩展）。 |
| `group` 插入位置 | 新容器放在第一个被收编图形原来的位置；跨父容器时归第一个目标所在父级。 |
| `ungroup` 根级 | 按规格拒绝；只允许解组嵌套容器。 |
| 非 TTY 输出 | 提示符与 banner 只在 TTY 显示；管道/脚本输出纯净，便于 golden 对比。交互式 PTY 已验证显示 `svg>`。 |
| `scale` 文本 | 缩放 x/y（几何）；不缩放 `font-size`（样式）。`read` 的 transform 烘焙会按比例缩放 `font-size` extra。 |
| `box` | 本阶段不实现；`create box` 只报 `unknown shape type`。 |

---

## 过程记录

以下记录开发过程中真实出现的判断、AI 建议、验证与纠正，按发生顺序排列。

### 1. 规格的 `tree` 列宽自相矛盾

- **发现**：对 `phase_cli_1.md` 的实际字符位置测量发现，§5.1 与 §6 的属性列都是 **19**；§6.1 的普通行是 **29**，而 `text#process-label` 行是 **31**，同一棵树内部不一致。
- **尝试的规则**：一开始计划“每层按最长名字 + 2 对齐”，但无法同时匹配样例。
- **最终选择**：全树统一 `max(前缀 + 名字) + 2`，因为它精确复现 §5.1 和 §6 的列 19；§6.1 变成 32，内容与层级正确。
- **验证**：将 §5.1、§6 的期望输出写进 golden transcript 并逐字比对；§6.1 的差异在修订记录中如实说明，而不是伪造样例。

### 2. Node 原生 TypeScript 的参数属性不可用

- **现象**：探测 `node t.ts` 时，`constructor(public readonly id: string)` 报 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`（strip-only 模式）。
- **判断**：不能把 `node xxx.ts` 作为运行方式；否则所有 OOP 字段封装都要为运行时妥协。
- **处理**：`npm run cli` 使用 **tsx**，类型检查用 `tsc --noEmit`；代码继续使用参数属性与严格类型。
- **验证**：全部 83 个测试通过；`tsx` 与 `tsc` 版本固定并写入锁文件。

### 3. npm 缓存导致的 EPERM

- **现象**：规划阶段在 `workspace-write` 沙箱下执行 `npx tsc` 报 `npm error code EPERM`，默认缓存目录在沙箱外的 `~/.npm`。
- **验证**：将 `npm_config_cache` 指到工作区后，`typescript/tsx/vitest/@types/node` 安装成功。
- **最终**：依赖与锁文件只依赖工作区；文档记录了这一环境差异。后续会话文件策略放开，但仓库本身不依赖该策略。

### 4. 本机 PlantUML/JDK 安装

- **现象**：`brew install plantuml` 报 `Cannot install under Rosetta 2 in ARM default prefix (/opt/homebrew)!`。
- **验证**：`arch -arm64 /opt/homebrew/bin/brew install plantuml` 成功，安装 PlantUML 1.2026.9 与 OpenJDK 27。
- **产物**：`doc/architecture.svg` 由本地 PlantUML 渲染；`npm run diagram` 可复现。另用 PlantUML 生成 PNG 并检查布局，确认模块与箭头可读。

### 5. XML 解析库的选择调整

- **原计划**：`fast-xml-parser`。
- **发现问题**：在需要保留元素顺序、属性顺序、文本内容、未知属性时，`preserveOrder` 结果结构较绕，Reader 代码会混入库细节。
- **处理**：改用 `@xmldom/xmldom`，新增 `XmlTree` 端口与 `XmldomTree` 适配器；领域层和 Reader 不直接依赖 DOM 库。适配器最初用了 `errorHandler` 对象，类型检查报错后改为库 0.9 的 `onError(level, message)` 回调。
- **验证**：`other.svg` 读入 → 写出 → 再读入无警告，7 个元素与结构一致；未知属性 `font-size`/`text-anchor` 原样保留。

### 6. 变换顺序的测试期望错误

- **现象**：为 `translate(10,20) scale(2)` 写的测试期望矩形到 `(22,44)`，实际是 `(12,24)`。
- **验证**：按矩阵 `T × S` 手算并核对 SVG 语义，确认**代码正确、测试期望错误**（先缩放再平移）。
- **处理**：修正测试期望，保留实现；没有为了让测试通过而改实现。

### 7. `tree` 是否显示 `stroke`

- **现象**：第一次运行 §6.1 会话时，`line#arrow1` 的 tree 行带有 `stroke=black`，而规格 §6.1 的示例没有。
- **验证**：对照 §5.1（显示 fill）与 §6.1（未显示 stroke），确定 tree 只内联 fill；`show` 仍输出全部样式。
- **处理**：`TreeRenderer` 改为只显示 fill；更新 golden transcript，§6.1 的 tree 行与示例一致（除全局列宽差异）。

### 8. 管道模式下的提示符

- **现象**：最初 REPL 无论 TTY 与否都输出 `svg> `，管道回放时出现 `svg> rect#bg created`，与“逐行命令结果”比对很别扭。
- **处理**：按输入流 `isTTY` 决定是否输出 banner 与 prompt；管道模式输出纯净结果。用 `script` 分配伪终端验证交互模式仍能看到 banner、`svg>`、命令回显与结果。
- **效果**：golden transcript 可直接保存/比对，交互体验不变。

### 9. 失败的 `save` 不应锁历史

- **问题**：规格要求“命令失败不改变任何状态”。若先 lock 再写文件，写失败会让 undo 被禁用。
- **处理**：只有写入成功后才更新 currentPath 并 `history.lock()`；失败只返回 `error: cannot write file: …`。
- **验证**：新增集成测试：`init → create → save（无路径）→ undo`，确认仍能撤销 create。

### 10. 远程仓库与凭据

- **现象**：初始 `git ls-remote` 报 `Permission denied (publickey)`；本机没有 SSH 私钥。
- **处理**：生成 ed25519 密钥；用户把公钥加入 GitHub 后，`ssh -T git@github.com` 返回 `Hi 1731067942cjh-hash!`，`git ls-remote` 为空仓库、退出码 0。
- **验证**：首个提交推送成功，`main` 跟踪 `origin/main`；最终以 `final` tag 推送。

---

## 一致性自查

### 1. 模块划分：实际目录与方案是否一致？

**结论：总体一致；有 5 处计划期的结构被调整，均已记入修订记录。**

实际模块与关键类型：

| 模块 | 实际内容 |
|---|---|
| `src/domain` | `Shape`、`Container`、`Document`、六个具体图形、`ShapeVisitor`、`Transform`、`IdAllocator`、`NumberFormat`、`DomainError` |
| `src/shape` | `ShapeFactory` |
| `src/command` | `EditCommand`、`History`、9 个命令类、`GeometrySnapshot`、`commandFormat` |
| `src/serialization` | `SvgReader`、`SvgWriter`、`XmlTree` 端口、`XmldomTree` 适配器、`XmlParseError` |
| `src/view` | `TreeRenderer`、`ShowRenderer`、`HelpText` |
| `src/io` | `FileGateway`、`NodeFileGateway` |
| `src/cli` | `Tokenizer`、`CommandParser`、`CommandRegistry`、`CommandDispatcher`、`EditorSession`、`Repl`、`main`、`commands/` |

与计划不一致之处：

| 计划 | 实际 | 原因 |
|---|---|---|
| `src/app/EditorFacade`（可选） | 未创建 | `EditorSession` + `CommandDispatcher` 已足够薄，避免多余 Facade 类 |
| `src/shape/ShapeSpec.ts` | 未创建 | 参数 schema 放进 `ShapeKind` 接口与各图形的静态元数据，减少一层无行为对象 |
| `src/serialization/FastXmlTree.ts` | `XmldomTree.ts` + `XmlParseError.ts` | 改用 `@xmldom/xmldom`；按“一类一文件”把错误类拆出 |
| `scripts/replay.mjs`（可选） | 未创建 | 由 `test/integration/transcripts.test.ts` 直接回放真实 CLI，更接近验收 |
| `src/command` 只有命令类 | 增加 `GeometrySnapshot.ts`、`commandFormat.ts` | 撤销快照与回显文案是横切关注点，抽成无状态辅助模块而非塞进命令基类 |

另外，计划中的 `test/`、`doc/`、`examples/`、`scripts/` 均按计划落地；`doc/README.md` 即本文件。

### 2. 依赖方向：方案里的规则有没有被违反？

**结论：没有。** `test/unit/dependency.test.ts` 静态检查全部 `src/**` 的 import，当前通过。

| 检查 | 结果 |
|---|---|
| `domain` 只依赖 `domain` | 通过（`ShapeVisitor`、`Transform`、`NumberFormat` 等均为同模块） |
| `command` 不依赖 `cli/view/io/serialization` | 通过 |
| `view` 不依赖 `command/io` | 通过 |
| `serialization` 只依赖 `domain/shape` 与自身适配器 | 通过 |
| `io` 只依赖 `node:fs` 与自身 | 通过 |
| `cli` 依赖全部（组合根） | 通过 |
| 无 `switch(tag)`；名字分派只在 Registry 与 Factory | 通过（代码审阅 + 工厂/注册表文件头 TODO） |

抽样证据：

- `src/domain/Shape.ts` 的 import：`./Container`（type）、`./ShapeVisitor`（type）、`./Transform`（type）、`./errors/DomainError`、`./NumberFormat`。
- `src/command/MoveCommand.ts` 只 import `../domain/*` 与 `./GeometrySnapshot` / `./EditCommand`，没有 CLI/IO。
- `src/io/NodeFileGateway.ts` 只 import `node:fs/promises` 与 `./FileGateway`。
- `src/cli/main.ts` 是唯一组装全部适配器的地方。

---

## 质量保证手段

### 1. 自动化检查

- **严格类型**：`npm run typecheck`（`strict`、`noUnusedLocals`、`noUnusedParameters`、`noImplicitOverride`）。
- **测试**：`npm test`，7 个测试文件、**83 个用例**，覆盖领域、命令、序列化、视图、解析、依赖规则与真实 CLI 集成。
- **一键验证**：`npm run verify`（typecheck + test）；最终运行结果：

```text
Test Files  7 passed (7)
Tests       83 passed (83)
```

- **架构测试**：`test/unit/dependency.test.ts` 同时检查依赖方向与“一类一文件、文件名=类名”。

### 2. 规格级回归

| 手段 | 内容 |
|---|---|
| golden transcript | §6 完整会话、§6.1 流程图会话、错误矩阵、undo/redo 历史，逐行比对真实子进程输出 |
| round-trip | `read other.svg → save → read`，结构一致、无二次警告、XML 可再解析 |
| 错误矩阵 | id 已存在/不存在、容器缺失/非容器、未知类型/属性、scale 非正、根级 ungroup、group 成环、addto 成环、文件读/写失败、无文档、io 后 undo |
| 交互验证 | 用 `script` 分配 PTY，确认 banner、`svg>`、命令回显和结果；管道模式确认输出纯净 |
| 图形验证 | 用 Quick Look 渲染 `examples/demo.svg`、`flowchart.svg`、`other.svg`，确认 SVG 可显示、文本/颜色/线条正确 |

### 3. 规格逐项对照（摘要）

- 命令总表：文档类 4、编辑类 10（`front`/`back` 共用一个命令类）、显示类 3、`undo`/`redo` 全部实现。
- `create` 六种类型、可选 fill/stroke、`in` 子句；`box` 报未知类型。
- `set` 白名单（公共样式、各类型几何、text 内容）与未知属性报错。
- 4.2 的 12 类错误中，除 `cannot ungroup composite`（本阶段无 `box`，留给插件阶段）外均有路径与测试；另覆盖 4.1 的 `unknown attribute` 与 4.3 的 io 锁。
- 4.3：group 原子撤销、显示类不入栈、io 后锁、redo 清空、下一次编辑解锁。
- §5.1 §5.2 显示格式；§6 §6.1 会话；`save` 产物合法。

### 4. 已知限制（如实记录）

1. `tree` 在 §6.1 的列宽与示例不同（本实现 32，示例 29/31），原因是示例内部不一致；结构与属性逐字正确。
2. `read` 会烘焙坐标变换，不保留原始 `transform` 属性；`rotate/skew` 忽略并警告。
3. 非均匀缩放圆会按面积比近似半径；未做椭圆化。
4. 未支持 `path/polygon` 等元素；跳过并警告。未建模属性保留在 `extras`。
5. `scale` 不缩放文本 `font-size`（几何缩放语义）。
6. `box`、结构路径寻址、插件加载按阶段边界不实现。

### 5. 为什么对质量有信心

- 领域操作与命令都有直接单测；结构命令的撤销/重做覆盖了跨父移动、部分兄弟、容器删除、根级拒绝等边界。
- 真实 CLI 子进程回放规格会话，而不是只测孤立函数；golden 输出能发现提示符、警告顺序、计数、空行等集成问题。
- 依赖方向与文件组织由测试守护，架构不会在后续修改中悄悄退化。
- 所有偏离规格的地方都在本文件与修订记录中显式说明，没有“测试通过但语义不明”的项。

---

## 修订记录

| 日期 | 修订 | 原因 |
|---|---|---|
| 2026-10-19 | 初版架构方案与模块划分 | 依据 `PLAN.md` 与规格确定分层 |
| 2026-10-19 | XML 适配器由计划的 `fast-xml-parser` 改为 `@xmldom/xmldom`，新增 `XmlTree` 端口 | 保留顺序/属性/文本更直接；隔离第三方库 |
| 2026-10-19 | 拆分 `XmlParseError.ts` | 满足“一类一文件、文件名=类名”的自检规则 |
| 2026-10-19 | `tree` 只显示 fill，不显示 stroke | 对齐规格 §5.1 / §6.1 的示例 |
| 2026-10-19 | `tree` 属性列统一为“最大前缀+名称+2” | 示例列宽不一致，采用确定规则并在限制中说明 |
| 2026-10-19 | 增加 `cli/commands/` 子模块 | 避免 CommandRegistry 变成上帝类 |
| 2026-10-19 | 失败 `save` 不锁历史 | 满足“命令失败不改变任何状态” |
| 2026-10-19 | 非 TTY 不输出 banner/prompt | 让脚本回放输出稳定、可 diff；TTY 行为不变 |
| 2026-10-19 | 增加 `test/fixtures/transcripts/` 与集成测试 | 把规格会话变成可重复的回归 |
| 2026-10-19 | 未创建 `src/app/EditorFacade`、`src/shape/ShapeSpec.ts`、`scripts/replay.mjs` | 以更小的结构达到同样职责，避免空壳类 |

---

## 运行与复查

```bash
npm ci
npm run typecheck
npm test
npm run cli
npm run diagram   # 需要本机 plantuml（brew install plantuml）
```

- 规格会话脚本：`test/fixtures/transcripts/*.in`，期望输出同名 `.out`。
- 示例 SVG：`examples/demo.svg`、`examples/flowchart.svg`、`examples/other.svg`。
- 架构图源：`doc/architecture.puml`；渲染产物：`doc/architecture.svg`。
