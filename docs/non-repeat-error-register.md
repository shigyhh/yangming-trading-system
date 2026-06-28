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
