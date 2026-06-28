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
