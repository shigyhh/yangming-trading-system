# 不二过记录

本文件记录已经发生过的流程问题。后续任务不得重复同类错误；一旦登记，后续命令模板必须吸收。

## 001：后续分支在前置分支未合并时尝试创建

### 问题

在前置分支尚未确认合并到 `main` 时，尝试进入后续分支流程。这样会导致后续分支基线不稳定，容易遗漏前置字段、测试或同步契约。

### 正确处理

有前置分支时，先执行：

```bash
git checkout main
git pull --ff-only
git branch --merged main | grep '<前置分支名>' || true
git log --oneline --decorate --all --grep='<前置提交标题>' || true
```

如果前置分支未合并到 `main`，立即停止并报告：

```text
前置分支 <branch> 尚未合并，不能创建当前分支。
```

### 后续规则

- 后续任务必须先检查前置分支是否合并。
- 前置未合并时，不创建目标分支，不开始实现。
- 不用手动 cherry-pick 或临时绕过代替前置合并。

### 是否已纳入命令模板

已纳入。后续命令模板必须包含前置分支合并检查。

## 002：验收命令包含当前仓库不存在的测试文件

### 问题

验收 gate 包含 `miniprogram/ui-release-r1.test.js`，但该文件在当前仓库分支中不存在，直接运行会得到 `MODULE_NOT_FOUND`，造成误判。

### 正确处理

先确认该测试在 `main` 中是否存在：

```bash
git ls-files | grep 'miniprogram/ui-release-r1.test.js' || true
git ls-tree -r --name-only main -- 'miniprogram/ui-release-r1.test.js'
find miniprogram -maxdepth 2 -name '*ui*release*test*.js' -o -name '*release*test*.js'
```

如果 `main` 中也不存在该测试文件，则标记为：

```text
ui-release-r1.test.js 在当前 main 中不存在，本次 gate 标记为 N/A。
```

不得新增空测试文件来让命令通过。

### 后续规则

- 测试文件缺失时，先检查 `main` 是否存在。
- `main` 中也不存在的测试，标记 `N/A`，不作为阻塞项。
- `main` 中存在但当前分支缺失的测试，停止并报告，先查原因。
- 不为了通过验收新增空测试、跳过真实测试或弱化断言。

### 是否已纳入命令模板

已纳入。后续命令模板必须包含缺失测试 N/A 判定规则。

## 003 — Target branch already exists and current branch is the target branch

### Problem

A docs task was resumed while already on `docs/project-execution-protocol`.
The working tree contained allowed staged documentation changes.
A strict “target branch exists → stop” rule would block legitimate continuation work.

### Correct handling

If the target branch already exists:

1. If the current branch is the target branch and the diff only contains files allowed by the current task, continue in resume mode.
2. If the current branch is not the target branch, stop and report the existing branch.
3. If the diff contains files outside the current task scope, stop and report.
4. Do not overwrite existing work.

### Future rule

All future Codex commands must distinguish:

1. Target branch does not exist → create it from latest main.
2. Target branch exists and current branch is the target branch, with diff inside allowed scope → continue in resume mode.
3. Target branch exists but current branch is different → stop and report.
4. Diff exceeds allowed scope → stop and report.

### Added to task template

Yes.

## 009 — 依赖基座未成为事实主线时，继续在 main 上修补小分支

### Problem

后续工作依赖某个确定的产品基座、视觉基座、接口基座或运行基座，但该基座并没有进入 `origin/main`。执行时却继续从当前 `main` 开小分支审查、修补、合并，再回到 `main` 验收。

结果是：小分支看似合并成功，测试也可能通过，但真正需要继承的基座没有进入主线，用户在 DevTools、真机或浏览器中看到的仍然是旧主线。随后再继续“左补一点、右补一点”，会把正确基座越绕越远。

### Correct handling

一旦用户确认“我要的是某个旧分支/旧提交上的基座”，必须先停止零碎修补，并把该基座升级为事实主线候选。

必须先确认：

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

如果 `baseline ancestor check` 不是 `0`，不能假设 `main` 已包含该基座。

正确流程是：

1. 锁定用户确认的基座分支或提交。
2. 明确当前 DevTools / 浏览器 / 真机正在预览哪个本地分支。
3. 明确该本地分支是否已经推到远端。
4. 明确远端分支是否已经进入 `origin/main`.
5. 如果基座未进入 `origin/main`，停止在 `main` 上继续修补。
6. 从该基座开最终集成分支，保持基座负责的视觉/产品主线不动。
7. 只把后续 P1-P11 等必须保留的业务闭环接回基座。
8. 以新的最终集成分支作为后续验收主线。
9. 通过 DevTools / 真机 / 浏览器确认运行态确实来自最终集成分支。

### Future rule

- 主线不能凭感觉切换；主线必须由分支、提交、远端状态和运行态共同确认。
- 本地分支、远端分支、`origin/main`、DevTools 当前预览目录必须分开说清楚。
- 不能把“某个修补分支已合并 main”当成“用户确认的基座已合并 main”。
- 不能把 docs/audit 分支、局部修复分支、临时预览分支当作产品基座。
- 如果用户确认的基座没有进入 `origin/main`，禁止继续在 `main` 上边看边补。
- 大改之前必须先回答：当前真正基座是谁、它是否在 main、如果不在 main，后续是接回基座还是把基座并入主线。
- 如果旧基座与当前 main 差异很大，禁止整包盲 merge；必须按“基座不动，后续能力接回”的方向做最终集成分支。
- 验收时必须明确：现在预览的是本地哪个分支、该分支是否已经推远端、是否已经合 main。

### Project case

P11 小程序阶段，用户实际认可的基座是：

```text
fix/p11-true-kline-v2-base-integration @ f704ed88
```

但该基座没有进入 `origin/main`。后续多次从 `main` 开小分支做视觉恢复、K 线恢复、首页入口修补和审查报告，造成：

- 小分支被反复创建、合并、回滚或废弃。
- `main` 仍然不是用户确认的 v2 基座。
- DevTools 在不同本地分支和 main 之间切换，造成“为什么又回到旧视觉”的混乱。
- 正确方式应是：以 `f704ed88` 为基座，视觉不动，只把后续 P1-P11 业务闭环接回该基座。

### Added to task template

Yes. 后续大改、视觉恢复、运行态验收、跨阶段接回任务必须先过基座事实源 gate。

## 005 — Existing target branch had overscope diff and could not be resumed

### Problem

A target branch already existed locally, but the current branch was `main`, not the target branch.
The existing target branch had a large diff outside the current task scope, including files such as `web-next/`, `server/`, `packages/`, docs assets, or unrelated feature files.

Treating that branch as a normal continuation would risk merging unrelated work into the current phase.

### Correct handling

Do not force checkout.
Do not overwrite the branch.
Do not continue implementation on the overscope branch.

The correct process is:

1. Stop and report the overscope branch.
2. Inspect the diff against `origin/main`.
3. Create a backup branch from the old branch.
4. Optionally push the backup branch if the environment allows it.
5. Delete the polluted local target branch only after backup is confirmed.
6. Recreate a clean target branch from latest `origin/main`.
7. Re-run the current task from the clean branch.
8. If the old branch contains useful work, migrate it deliberately with a separate cherry-pick or manual extraction task.

### Future rule

When a target branch already exists:

1. If the current branch is the target branch and diff is inside the allowed scope, continue in resume mode.
2. If the current branch is not the target branch, stop and report.
3. If the existing branch diff is overscope, do not continue on it.
4. Back up the overscope branch before deleting or rebuilding.
5. Rebuild from latest `origin/main` only after backup.
6. Do not silently reuse overscope branches.

### Added to task template

Yes.

## 006 — Existing later-stage branches were treated as if they should be rebuilt by default

### Problem

Later-stage branches such as P3, P4, and P5 already existed from previous work.
A new command sequence assumed a clean sequential rebuild, which created confusion and risked duplicating work that might already be reusable.

Branch existence does not mean the feature is complete, but it also does not mean the branch should be discarded or rebuilt by default.

### Correct handling

When a later-stage branch already exists, first run a reuse audit before deciding what to do.

The audit should classify each branch as one of:

- `merged`: already merged into `origin/main`
- `clean-empty`: exists but has no diff from `origin/main`
- `reusable-clean`: diff is inside the phase scope and can be continued or validated
- `reusable-needs-rebase`: mostly valid but needs syncing with latest `origin/main`
- `reusable-partial`: contains useful work but also overscope changes; extract useful work deliberately
- `overscope-rebuild`: too polluted; back up and rebuild from latest `origin/main`
- `stale`: old attempt, do not continue
- `missing`: branch does not exist

### Future rule

Before implementing a phase whose branch already exists:

1. Do not immediately rebuild.
2. Do not immediately continue.
3. Run a reuse audit against current `origin/main`.
4. Check whether the branch has already entered `origin/main`.
5. Check diff scope against the phase boundary.
6. Reuse clean work when safe.
7. Extract useful partial work deliberately when needed.
8. Rebuild only after the branch is classified as overscope or stale.
9. Keep backup branches for old attempts.

### Added to task template

Yes.

## 008 — Cross-end tasks were planned before auditing existing web/API/repo capabilities

### Problem

A cross-end task was planned in detail before auditing the existing repositories and web content.

The project already had substantial web-side content, API work, contracts, docs, and historical branches. Because the audit did not come first, some later commands risked duplicating existing functionality, misclassifying web/server/packages changes, or treating old cross-end branches as simple pollution.

### Correct handling

For any task involving more than one side, run a read-only cross-end audit before writing implementation commands.

Cross-end sides include:

- mini program
- real-review / web-next
- kline-service
- server
- packages/contracts
- data-binding
- docs / product library
- existing feature or backup branches

The audit must check:

1. current repository identity
2. related repositories
3. existing pages
4. existing APIs
5. existing contracts
6. existing docs / product concepts
7. existing branches and PRs
8. what can be reused
9. what should be extended
10. what should be rebuilt
11. what should be deferred

### Future rule

Before any cross-end phase such as P7, P8, P9, or later:

1. Do not start with implementation.
2. Do not assume the web side is empty.
3. Do not assume existing branches are unusable.
4. First run a read-only capability audit.
5. Reuse existing interfaces and pages whenever safe.
6. Add adapters or missing fields before adding new APIs.
7. Add new APIs only when no suitable existing endpoint exists.
8. Split implementation by repository responsibility.
9. Do not mix mini program UI, web UI, kline-service, and data-binding changes in one branch unless explicitly approved by the audit.

### Added to task template

Yes.
