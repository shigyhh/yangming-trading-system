# 阳明心学交易系统：本地运行手册

## 1. 项目根目录

项目根目录：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system
```

主要目录：

| 目录 | 说明 |
| --- | --- |
| `web-next` | Next.js 官网与 Web 测评前端。 |
| `server` | Node.js 后端 API。 |
| `miniprogram` | 微信小程序工程。 |
| `docs` | 项目文档。 |
| `worldview` | 世界观、人格、文案和 AI 观心规则源文件。 |
| `data` | 规则与内容数据。 |

本地开发建议至少准备：

- Node.js 18 或更高版本。
- npm。
- 微信开发者工具。
- Git。

如果终端提示 `npm: command not found`，先确认 Node 是否完整安装。macOS Homebrew 常见路径是：

```bash
/opt/homebrew/bin/npm --version
```

如果该命令可用，但 `npm` 不可用，说明 PATH 没配好。可以先临时用 `/opt/homebrew/bin/npm` 替代下面命令中的 `npm`。

## 2. web-next 安装依赖

进入 Web 工程：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/web-next
```

安装依赖：

```bash
npm install
```

当前 `web-next/package.json` scripts：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Next.js 开发环境。 |
| `npm run build` | 生产构建。 |
| `npm run start` | 启动生产构建后的服务。 |
| `npm run lint` | 运行 ESLint。 |

## 3. web-next 启动开发环境

开发启动：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/web-next
npm run dev
```

默认访问：

```text
http://localhost:3000
```

常用检查：

```bash
npm run lint
npm run build
```

如果在受限沙盒环境中遇到 Turbopack 构建错误，例如 `binding to a port` 或 `Operation not permitted`，可以在本机终端重试正常构建；必要时临时用 webpack 路径验证：

```bash
./node_modules/.bin/next build --webpack
```

本次检查结果：

- `npm install`：通过。
- `npm run lint`：通过。
- `./node_modules/.bin/next build --webpack`：通过。
- `npm run build`：在 Codex 沙盒中触发 Turbopack 端口绑定限制，本机终端通常不受此限制。

## 4. server 安装依赖

进入后端工程：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/server
```

安装依赖：

```bash
npm install
```

当前 `server/package.json` scripts：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地后端服务。 |
| `npm run start` | 启动后端服务。 |
| `npm run generate:questions` | 生成测评题库。 |
| `npm run import:questions` | 导入测评题库。 |
| `npm run generate:kline` | 生成 K 线心性练习库。 |
| `npm run cache:ashare` | 缓存 A 股 K 线离线数据。 |
| `npm run cache:akshare` | 使用 AkShare 同步离线数据。 |
| `npm run update:ashare` | 收盘后增量更新 A 股日 K 缓存。 |
| `npm run test:smoke` | 运行后端冒烟测试，需要后端已启动。 |
| `npm run check` | Node 语法检查。 |

## 5. server 启动

启动后端：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/server
npm run dev
```

默认地址：

```text
http://localhost:8787
```

健康检查：

```bash
curl http://localhost:8787/health
```

接口目录：

```bash
curl http://localhost:8787/api/v1
```

冒烟测试流程：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/server
npm run dev
```

另开一个终端：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/server
npm run test:smoke
```

本次检查结果：

- `npm install`：通过。
- `npm run check`：通过。
- `npm run dev`：在 Codex 沙盒中触发 `listen EPERM 0.0.0.0:8787`，属于端口绑定权限限制；请在台式机普通终端按上方命令启动。

## 6. miniprogram 用微信开发者工具打开

`miniprogram` 是原生微信小程序工程，不包含 `package.json`，因此没有 npm scripts。

打开方式：

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：

```text
/Users/jianlinhe/Desktop/yangming-trading-system/miniprogram
```

4. AppID 可使用当前 `project.config.json` 中的 AppID，或使用微信开发者工具测试号/游客模式。
5. 编译后从 `pages/home/index` 进入。

小程序默认后端地址：

```text
http://127.0.0.1:8787
```

如果是真机预览，需要把小程序“我的”页中的后端地址改为台式机局域网 IP，例如：

```text
http://192.168.1.8:8787
```

同时确保手机和台式机在同一个 Wi-Fi。

## 7. 推荐启动顺序

第一步，启动后端：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/server
npm run dev
```

第二步，启动 Web：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system/web-next
npm run dev
```

第三步，打开小程序：

```text
微信开发者工具 -> 导入项目 -> miniprogram
```

常用访问地址：

| 服务 | 地址 |
| --- | --- |
| Web 官网 | `http://localhost:3000` |
| 后端 API | `http://localhost:8787` |
| 后端健康检查 | `http://localhost:8787/health` |
| 后端接口目录 | `http://localhost:8787/api/v1` |

## 8. 常用 Git 命令

查看状态：

```bash
git status
```

查看改动：

```bash
git diff
```

查看已暂存改动：

```bash
git diff --cached
```

创建新分支：

```bash
git switch -c codex/your-branch-name
```

暂存文档：

```bash
git add docs/RUNBOOK.md docs/PROJECT_MAP.md
```

提交：

```bash
git commit -m "docs: add project runbook and map"
```

查看最近提交：

```bash
git log --oneline -5
```

## 9. 常见问题

### node_modules 不上传

`node_modules` 是依赖安装产物，不要提交到 GitHub。

当前根目录 `.gitignore` 已包含：

```text
node_modules/
**/node_modules/
```

如果误看到大量依赖文件进入 Git 状态，先不要提交，检查是否在正确目录运行了 `git status`。

### .env 不上传

`.env` 和 `.env.*` 可能包含密钥、token、数据库地址、短信配置等敏感信息，不要上传。

当前根目录 `.gitignore` 已包含：

```text
.env
.env.*
!.env.example
```

只允许提交 `.env.example` 这类模板文件。

### .next 不上传

`.next` 是 Next.js 构建缓存和产物，不要提交。

当前根目录和 `web-next/.gitignore` 都已忽略 `.next`。

如果需要重新构建，直接在 `web-next` 目录运行：

```bash
npm run build
```

### 大文件不上传 GitHub

不要上传以下大文件或生成物：

- `node_modules`
- `.next`
- `dist`
- `build`
- `out`
- `coverage`
- 压缩包：`.zip`、`.rar`、`.tar.gz`、`.tgz`
- 安装包：`.dmg`、`.pkg`、`.exe`
- 本地日志：`*.log`
- 临时导出文件、视频渲染文件、大型市场缓存

当前根目录 `.gitignore` 已覆盖常见生成物。后续如果新增大体积数据，应优先放到对象存储或外部数据源，不直接提交 GitHub。

### 端口占用

如果 `3000` 或 `8787` 被占用：

```bash
lsof -i :3000
lsof -i :8787
```

找到确认可关闭的本地进程后再停止。不要随意结束不认识的系统进程。

如果在 Codex 沙盒中看到 `listen EPERM`、`binding to a port` 或 `Operation not permitted`，通常是沙盒不允许监听端口。请回到台式机本机终端运行同样命令。

### 小程序连不上后端

优先检查：

1. `server` 是否已经启动。
2. 开发者工具中后端地址是否是 `http://127.0.0.1:8787`。
3. 真机预览时是否改成台式机局域网 IP。
4. 手机和台式机是否在同一个 Wi-Fi。
5. 微信开发者工具本地设置里是否允许不校验合法域名。
