# 项目执行协议

本协议用于后续 Codex 任务执行。目标是让思考充分、执行顺序稳定、验收可复现。

## 核心原则

- 思考可以慢，执行必须顺。
- 不新增平行系统。
- 不新建第二套入口。
- 每个分支只解决当前任务定义的问题。
- 不把后续阶段功能提前塞进当前分支。
- 不为通过验收而新增空测试、跳过关键校验或弱化断言。

## 五个用户入口分工

- 今日页：总调度，判断用户今天下一步该做什么。
- 复盘页：真实复盘错题卡，沉淀真实记录、第一念、触发场景和下次执行动作。
- 训练页：承接今日针对训练、基础盲练和后续专项训练。
- 活镜页：近 30 天模式统计，展示错题、第一念、触发场景、旧题复现和执行一致性变化。
- 我的页：后续执行计划库、个人资料和长期记录。

任何新能力都必须挂回这五个入口之一。除非产品明确批准，不新增第六入口。

## 网页端互补分工

- 训练包管理。
- K线片段标注。
- 数据看板。
- 报告后台。
- 提醒规则配置。
- 默认执行计划模板。

网页端用于管理、配置、标注、看板和后台承接，不替代小程序主闭环，不另造一套用户主流程。

## Codex 任务标准流程

1. 前置分支检查：读取任务要求，确认是否存在前置分支、前置提交或前置合并要求。
2. 前置合并检查：有前置分支时，必须先确认其已合并到 `main`。
3. 当前分支存在性检查：创建目标分支前，先检查目标分支是否已存在，并判断新建模式、续作模式或停止报告。
4. 当前分支创建：只在工作区干净、`main` 已快进、前置已合并、目标分支不存在时，从 `main` 创建新分支。
5. 当前任务边界：明确本次目标、允许改动文件、验收标准和输出要求。
6. 禁止范围：确认不做用户明确禁止的页面、业务、测试、后续阶段或架构扩展。
7. 测试 gate：运行用户指定或与改动范围匹配的测试、同步契约测试、`git diff --check`。
8. 缺失测试 N/A 规则：测试文件缺失时先查 `main`，`main` 中也不存在才标记 `N/A`。
9. 合并前验收：检查 diff 范围、测试结果、术语、功能边界、是否新增入口或平行系统。
10. 是否可以进入下一步：只有当前任务已完成、测试 gate 通过、验收结论明确时，才可以判断是否进入下一阶段。

## 前置分支合并检查

有前置分支时，必须先确认其已合并到 `main`，常用命令：

```bash
git branch --merged main | grep '<前置分支名>' || true
git log --oneline --decorate --all --grep='<前置分支提交标题>' || true
```

如果前置分支未合并，必须停止并报告：

```text
前置分支 <branch> 尚未合并，不能创建当前分支。
```

不得自行绕过前置条件，不得在未合并前置分支的情况下创建后续分支。

## 当前分支存在性检查

创建目标分支前，必须检查：

```bash
git branch --list <目标分支名>
```

如果目标分支已存在，不得直接覆盖。必须按 Resume mode 判断是否续作或停止报告。

## Resume mode

If the target branch already exists:

1. If the current branch is the target branch and the diff only contains files allowed by the current task, continue the task in resume mode.
2. If the current branch is not the target branch, stop and report the existing branch.
3. If the diff contains files outside the task scope, stop and report.
4. Do not overwrite existing work.

## Overscope branch cleanup

If a target branch already exists but its diff is outside the current task scope:

1. Stop and report.
2. Do not continue on that branch.
3. Create a backup branch from the existing branch.
4. Confirm the backup exists.
5. Optionally push the backup branch.
6. Delete and recreate the target branch from latest `origin/main` only after backup.
7. Do not migrate old changes unless a separate extraction task is explicitly requested.

A target branch with overscope diff must not be treated as a valid resume-mode branch.

## Reuse audit before rebuild

If a later-stage branch already exists, do not rebuild by default.

First classify the branch:

- `merged`
- `clean-empty`
- `reusable-clean`
- `reusable-needs-rebase`
- `reusable-partial`
- `overscope-rebuild`
- `stale`
- `missing`

Then choose the next action:

- `merged` -> no further work for that phase
- `clean-empty` -> can be reused or recreated
- `reusable-clean` -> validate and merge after tests
- `reusable-needs-rebase` -> sync with latest `origin/main`, then validate
- `reusable-partial` -> back up and deliberately extract useful work
- `overscope-rebuild` -> back up and rebuild from latest `origin/main`
- `stale` -> preserve as backup, do not continue
- `missing` -> create from latest `origin/main`

## Cross-end audit gate

Any task that touches or depends on more than one end must start with a read-only audit.

This applies to work involving:

- mini program
- web-next / real-review
- kline-service
- server
- packages/contracts
- data-binding
- docs/product library
- existing branches or PRs

Before implementation, the audit must answer:

1. Which repository owns the task?
2. Which repositories are related?
3. What already exists?
4. Which APIs can be reused?
5. Which contracts already exist?
6. Which pages already exist?
7. Which docs or product concepts already exist?
8. Which old branches contain reusable work?
9. Which data must be shared across mini program and web?
10. What should be implemented now, deferred, or split into another repository?

Default rule:

- Existing API first.
- Existing page first.
- Existing contract first.
- Adapter or field patch second.
- New API only if necessary.
- New page only if no existing page can carry it.

## Baseline source-of-truth gate

任何依赖既有基座的任务，在继续开发、修补、验收或合并前，必须先确认该基座已经成为当前事实主线。

Baseline 可以是：

- 产品/视觉基座
- API contract
- 数据 schema
- 页面路由和 tab 壳
- 运行环境
- 跨仓接口
- 发布候选分支
- 用户明确认可的旧分支或旧提交

必须回答：

1. 用户真正认可的基座是哪一个分支或提交？
2. 当前本地分支是什么？
3. 当前远端分支是什么？
4. 当前 `origin/main` 是什么提交？
5. DevTools / 浏览器 / 真机实际预览的是哪个目录和哪个本地分支？
6. 该基座是否已经进入 `origin/main`？
7. 如果没有进入 main，是否应该停止在 main 上继续修补？
8. 如果基座和 main 差异很大，哪些内容必须保持基座不动？
9. 后续 P1-P11 或其它阶段能力应该如何接回基座？
10. 验收时是否明确说明当前预览来自最终集成分支，而不是 main、docs 分支或临时修补分支？

推荐命令：

```bash
git status -sb
git branch --show-current
git rev-parse --short HEAD
git rev-parse --short origin/main
git merge-base --is-ancestor <baseline-branch-or-commit> origin/main
echo "baseline ancestor check: $?"
git rev-list --left-right --count <baseline-branch-or-commit>...origin/main
git diff --name-status <baseline-branch-or-commit>..origin/main
```

如果 `baseline ancestor check` 不是 `0`：

- 不得继续把 `main` 当作已包含基座的主线。
- 不得继续在 `main` 上开零碎修补分支。
- 不得把局部修补分支合并成功当成基座合并成功。
- 必须先锁定基座，再从基座开最终集成分支，或明确做基座接回方案。

大基座接回原则：

- 基座负责的视觉/产品主线不动。
- 后续业务闭环按文件和测试逐项接回。
- 本地分支、远端分支、`origin/main`、运行态预览必须分别确认。
- 大改前先确认最终主线，不允许边看边补。

## 测试 Gate 规则

每个任务以用户指定 gate 为准。没有指定时，至少运行与改动范围相关的单元测试、同步契约测试或构建检查。

常见 gate：

```bash
node miniprogram/modules/kline-mind/index.test.js
node miniprogram/modules/trade-review/index.test.js
node miniprogram/utils/api.test.js
node miniprogram/utils/data-binding-adapter.test.js
npm run test:data-binding --prefix server
git diff --check main..<当前分支>
```

文档-only 分支无需运行业务测试，但必须确认：

```bash
git diff --name-only main..<当前分支>
```

输出只能包含允许的文档路径。

## 缺失测试 N/A 规则

如果验收命令包含当前仓库不存在的测试文件，必须先确认 `main` 中是否也不存在：

```bash
git ls-files | grep '<测试文件路径>' || true
git ls-tree -r --name-only main -- '<测试文件路径>'
find <目录> -name '*release*test*.js'
```

处理规则：

- 如果 `main` 中存在该测试，但当前分支不存在：停止并报告，先查明原因。
- 如果 `main` 中也不存在该测试：标记为 `N/A`，不作为阻塞项。
- 不得为了通过 gate 新增空测试文件。

## 合并前验收规则

合并前必须重新确认：

- 工作区干净或只有本任务允许改动。
- 前置分支已合并。
- 当前分支 diff 符合任务范围。
- 测试 gate 通过，缺失测试按 N/A 规则处理。
- 没有页面 UI 改动，除非任务明确要求。
- 没有业务代码改动，除非任务明确要求。
- 没有测试代码改动，除非任务明确要求。
- 没有引入 P1/P2/P3/P4/P5 或其它未来功能。
- 没有新建平行系统或第二套入口。

合并后必须在 `main` 上重新跑关键 gate。若发生 merge conflict，停止并报告冲突文件，不自行乱解。

## 不二过原则

同一个流程错误不得重复发生。

每次发生流程问题，必须登记到 `docs/non-repeat-error-register.md`，至少包含：

- 编号。
- 问题。
- 正确处理。
- 后续规则。
- 是否已纳入命令模板。

后续任务模板必须吸收已登记规则。执行前先看规则，执行中按规则停顿检查，执行后在验收输出中说明相关规则是否满足。
