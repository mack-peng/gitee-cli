# @orangemust/gitee-cli

Gitee (码云) 命令行工具 — like gh, but for Gitee.

[![npm version](https://img.shields.io/npm/v/@orangemust/gitee-cli.svg)](https://www.npmjs.com/package/@orangemust/gitee-cli)

---

## Installation

```bash
npm install -g @orangemust/gitee-cli

# Or run without installing:
# npx @orangemust/gitee-cli repo view
```

### Build from source

```bash
git clone https://github.com/shazhou-ww/gitee-cli.git
cd gitee-cli
npm install
npm run build
npm link
```

---

## Quick Start

### 1. Authentication

前往 https://gitee.com/profile/personal_access_tokens 创建 Token，然后运行：

```bash
gitee-cli auth login
```

支持非交互模式：

```bash
echo "your_token" | gitee-cli auth login --with-token
```

### 2. Try It

```bash
gitee-cli auth status                  # 查看认证状态
gitee-cli repo list                    # 列出你的仓库
gitee-cli repo view owner/repo         # 查看仓库详情
```

---

## Authentication

```bash
gitee-cli auth login           # 交互式登录（隐藏 Token 输入）
gitee-cli auth logout          # 清除认证
gitee-cli auth status          # 查看认证状态
```

Token 优先级：环境变量 `GITEE_TOKEN` > Config file

```bash
export GITEE_TOKEN=your_token_here
```

Config file (`~/.gitee-cli/config.json`)：

```json
{
  "token": "your_token",
  "username": "your_username"
}
```

---

## Commands

### Repository

```bash
gitee-cli repo list                              # 列出我的仓库
gitee-cli repo list --owner <user>              # 列出指定用户的仓库
gitee-cli repo list --type private              # 只列出私有仓库
gitee-cli repo create <name>                    # 创建仓库
gitee-cli repo create <name> --private          # 创建私有仓库
gitee-cli repo create <name> --description "..."
gitee-cli repo create <name> --org <org>        # 在组织下创建
gitee-cli repo view                             # 查看当前仓库（自动检测）
gitee-cli repo view <owner/repo>                # 查看指定仓库
gitee-cli repo clone <owner/repo>               # Clone 仓库
gitee-cli repo delete <owner/repo>              # 删除仓库（需确认）
gitee-cli repo delete <owner/repo> --yes        # 跳过确认
```

### Issue

```bash
gitee-cli issue list                            # 列出 issues（自动检测仓库）
gitee-cli issue list --repo <owner/repo>        # 指定仓库
gitee-cli issue list --state closed             # 已关闭的 issues
gitee-cli issue create --title "Bug fix"        # 创建 issue
gitee-cli issue create --title "..." --body "..."
gitee-cli issue create --title "..." --assignee <username>
gitee-cli issue view <number>                   # 查看 issue 详情
gitee-cli issue update <number> --title "..." --labels "bug,urgent"
gitee-cli issue close <number>                  # 关闭 issue
gitee-cli issue comment <number> --body "..."   # 添加评论
gitee-cli issue comments <number>               # 列出所有评论
```

### Pull Request

```bash
gitee-cli pr list                               # 列出 PRs（自动检测仓库）
gitee-cli pr list --state merged                # 已合并的 PRs
gitee-cli pr create --title "feat: xxx" --head feature-branch
gitee-cli pr create --title "..." --head <branch> --base master
gitee-cli pr view <number>                      # 查看 PR 详情
gitee-cli pr merge <number>                     # 合并 PR
gitee-cli pr merge <number> --method squash     # Squash 合并
gitee-cli pr merge <number> --method rebase     # Rebase 合并
gitee-cli pr close <number>                     # 关闭 PR

# Comments
gitee-cli pr comment <number> --body "LGTM"     # 添加 PR 评论
gitee-cli pr comments <number>                  # 列出 PR 所有评论

# Code Review
gitee-cli pr files <number>                     # 列出变更文件（含增删行数，彩色输出）
gitee-cli pr diff <number>                      # 查看 diff（+ 绿色 / - 红色）
gitee-cli pr review <number> --action approve               # 批准 PR
gitee-cli pr review <number> --action request_changes        # 请求修改
gitee-cli pr review <number> --action comment --body "..."   # 提交 review 评论
gitee-cli pr review-comments <number>           # 列出 review 评论
```

### Release

```bash
gitee-cli release list                          # 列出 releases
gitee-cli release list --repo <owner/repo>
gitee-cli release create --tag v1.0.0 --name "v1.0.0 Release"
gitee-cli release create --tag v1.0.0 --name "..." --body "Release notes"
gitee-cli release create --tag v1.1.0 --name "..." --draft --prerelease
```

### Organization

```bash
gitee-cli org list                              # 列出加入的组织
```

### Raw API

```bash
gitee-cli api GET /user                         # 获取当前用户
gitee-cli api GET /repos/owner/repo             # 裸 API 调用
gitee-cli api POST /user/repos --field name=myrepo
gitee-cli api GET /repos/owner/repo/issues --query state=open
gitee-cli api GET /repos/owner/repo/issues --paginate  # 自动翻页合并结果
gitee-cli api GET /user --no-auth               # 跳过认证
```

---

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | 输出格式化 JSON，便于脚本和 AI 解析 |
| `--repo <owner/repo>` | 指定仓库（省略时自动从 `git remote` 检测） |
| `--page <n>` | 分页页码（默认 1） |
| `--per-page <n>` | 每页条数（默认 20） |

---

## Auto-detect Repository

在 Gitee 仓库目录内运行命令时，`--repo` 可省略，gitee-cli 自动从 `git remote` 检测 `owner/repo`。

支持两种 remote 格式：
- `https://gitee.com/owner/repo.git`
- `git@gitee.com:owner/repo.git`

---

## Development

```bash
npm install
npm run build
npm run dev
npx tsc --noEmit
```

## License

MIT
