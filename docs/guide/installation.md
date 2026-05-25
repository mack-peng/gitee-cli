# Installation Guide for LLM Agents

You are an AI agent (Claude Code, Cursor, Codex, etc.). This guide is written for you. Do not make the human read it.

## Quick Prompt (for humans to copy-paste)

If a human pasted this to you, follow the instructions below:

> Install and configure `@oc-forge/gitee-cli` using the guide at `docs/guide/installation.md`. First check if `GITEE_TOKEN` is set or `~/.gitee-cli/config.json` exists, then ask me for a Gitee Personal Access Token if needed. Verify with `gitee-cli auth status` or `gitee-cli repo list`.

---

## What You're Installing

`@oc-forge/gitee-cli` is a CLI tool that lets you (the agent) manage Gitee (码云) repositories, issues, pull requests, releases, and organizations — all from the command line.

Humans should not type these commands. You should.

---

## Step 1: Install the Package

```bash
npm install -g @oc-forge/gitee-cli
```

Or run without installing (slower but zero setup):

```bash
npx @oc-forge/gitee-cli repo view owner/repo
npx @oc-forge/gitee-cli auth status
```

Verify:

```bash
which gitee-cli && gitee-cli --version
```

If `command not found`, your Node.js global bin isn't on `PATH`:

```bash
export PATH="$(npm root -g)/../bin:$PATH"
```

If you get a permission error on macOS/Linux:

```bash
sudo npm install -g @oc-forge/gitee-cli
```

---

## Step 2: Check Existing Config

Before asking for a new token, check what's already configured:

```bash
# Check environment variable
echo $GITEE_TOKEN

# Check config file
cat ~/.gitee-cli/config.json 2>/dev/null || echo "No config file"

# Verify token status
gitee-cli auth status
```

If a valid token exists, skip to Step 4. If not, proceed.

---

## Step 3: Get the Access Token

gitee-cli uses a **Gitee Personal Access Token** for authentication.

The human needs to:

1. Go to https://gitee.com/profile/personal_access_tokens
2. Create a token with appropriate scopes (e.g. `repos`, `issues`, `pull_requests`, `emails`)
3. Give you the token string

Then configure:

```bash
# Interactive login (recommended — hides token input)
gitee-cli auth login

# Or non-interactive via stdin
echo "the_token_string" | gitee-cli auth login --with-token

# Or skip config entirely and use env var
export GITEE_TOKEN=the_token_string
```

Config is stored at `~/.gitee-cli/config.json`:

```json
{
  "token": "your_token",
  "username": "your_username"
}
```

**Priority** (highest to lowest):
1. Environment variable: `GITEE_TOKEN`
2. Config file: `~/.gitee-cli/config.json`

Override per command by setting `GITEE_TOKEN` inline:

```bash
GITEE_TOKEN=xxx gitee-cli repo list
```

---

## Step 4: Verify

```bash
gitee-cli auth status
```

Should show `✓ Authenticated as <username>`. If it says `✗ Token is invalid or expired`, the token is bad or expired — ask the human for a new one.

```bash
# Quick smoke test — list your repos
gitee-cli repo list

# Or view a specific repo
gitee-cli repo view owner/repo
```

JSON output (with `--json`) = it works. `401` = bad token. `403` = insufficient permissions. `404` = repo not found or no access.

---

## What You Can Do Now

### Repository Management

```bash
gitee-cli repo list                              # List your repos
gitee-cli repo list --owner <user>              # List another user's repos
gitee-cli repo list --type private              # Only private repos
gitee-cli repo list --json                       # JSON output for parsing
gitee-cli repo view owner/repo                   # View repo details
gitee-cli repo create my-project                 # Create repo
gitee-cli repo create my-project --private       # Create private repo
gitee-cli repo create my-project --org my-org    # Create under organization
gitee-cli repo clone owner/repo                  # Clone repo
gitee-cli repo delete owner/repo --yes           # Delete repo (skip confirm)
```

### Issue Management

```bash
gitee-cli issue list                            # List open issues
gitee-cli issue list --state closed             # List closed issues
gitee-cli issue list --state all                # All issues
gitee-cli issue create --title "Bug: login broken"
gitee-cli issue create --title "..." --body "..." --assignee username
gitee-cli issue view 1                          # View issue #1
gitee-cli issue update 1 --title "New title" --labels "bug,urgent"
gitee-cli issue close 1                         # Close issue #1
gitee-cli issue comment 1 --body "Fixed in v2.0"
gitee-cli issue comments 1                      # List comments on issue #1
```

### Pull Request Management

```bash
gitee-cli pr list                               # List open PRs
gitee-cli pr list --state merged                # List merged PRs
gitee-cli pr create --title "feat: auth" --head feature-branch
gitee-cli pr create --title "..." --head <branch> --base master --body "..."
gitee-cli pr view 1                             # View PR #1
gitee-cli pr merge 1                            # Merge PR #1
gitee-cli pr merge 1 --method squash            # Squash merge
gitee-cli pr merge 1 --method rebase            # Rebase merge
gitee-cli pr close 1                            # Close PR #1
gitee-cli pr comment 1 --body "LGTM"
gitee-cli pr comments 1                         # List PR comments
gitee-cli pr files 1                            # Changed files with stats
gitee-cli pr diff 1                             # Colorized diff (+green -red)
gitee-cli pr review 1 --action approve          # Approve PR
gitee-cli pr review 1 --action request_changes  # Request changes
gitee-cli pr review 1 --action comment --body "..."  # Review comment
gitee-cli pr review-comments 1                  # List review comments
```

### Release Management

```bash
gitee-cli release list                          # List releases
gitee-cli release create --tag v1.0.0 --name "v1.0.0"
gitee-cli release create --tag v1.0.0 --name "..." --body "Release notes" --draft --prerelease
```

### Organizations

```bash
gitee-cli org list                              # List your organizations
```

### Raw API (for anything not covered)

```bash
gitee-cli api GET /user                         # Current user info
gitee-cli api GET /repos/owner/repo/commits     # List commits
gitee-cli api POST /user/repos --field name=repo --field private=true
gitee-cli api GET /repos/owner/repo/issues --query state=open
gitee-cli api GET /repos/owner/repo/issues --paginate  # Auto-paginate
gitee-cli api GET /emojis --no-auth             # No auth needed
```

---

## Auto-detect Repository

When inside a Gitee repository directory, most commands auto-detect the `owner/repo` from `git remote`, so you can omit `--repo`:

```bash
cd my-gitee-project
gitee-cli issue list              # Auto-detects repo
gitee-cli pr list                 # Auto-detects repo
gitee-cli repo view               # Auto-detects repo
```

Override with `--repo <owner/repo>` when needed:

```bash
gitee-cli issue list --repo other-owner/other-repo
```

---

## Environment Variables (Skip Config Entirely)

```bash
export GITEE_TOKEN=your_token_here
```

then run any command without running `gitee-cli auth login`.

---

## Common Failures Agents Face

**"Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN."**
→ No token configured. Run `gitee-cli auth login` or set `GITEE_TOKEN`.

**"Error: Unauthorized. Please run `gitee-cli auth login` first."**
→ The token is invalid or expired. Get a fresh token from the human.

**"Error: Not found. Check repository name and your access permissions."**
→ The repo doesn't exist or the token lacks access. Double-check `owner/repo` format.

**"Error: Forbidden. You may not have permission."**
→ The token doesn't have the required scope for this operation. Create a new token with broader scopes.

**"Cannot find module"**
→ Global install didn't register. Re-run `npm install -g @oc-forge/gitee-cli`.

**"Could not determine repository"**
→ Not in a Gitee git directory and no `--repo` flag. Either `cd` into the repo or pass `--repo owner/repo`.

---

## JSON Output

All commands support `--json` for structured output. Parse with `jq`:

```bash
gitee-cli repo list --json | jq '.[].full_name'
gitee-cli issue list --json | jq '.[] | {number: .number, title: .title}'
gitee-cli pr list --json | jq '.[] | select(.state == "open") | .title'
```

---

## The One-Liner

For agents that trust copy-paste:

```bash
npm install -g @oc-forge/gitee-cli && echo "your_token" | gitee-cli auth login --with-token && gitee-cli auth status
```

Replace `your_token` with the actual token. Humans can paste this and you handle the rest.

---

## Done

You now have programmatic control over Gitee. Manage repos, issues, PRs, releases — all from a terminal an agent can automate.

If something breaks: check the token first. 90% of issues are bad or missing tokens. The other 10% are wrong repo names or insufficient scopes.
