import { Command } from 'commander';
import { getToken } from '../utils/config.js';
import { GiteeClient, resolveRepo, handleError } from '../api/client.js';
import { PrAPI, PRComment } from '../api/pr.js';
import { resolveDiffPosition } from '../utils/diff-position.js';

function parsePositiveInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error(`Error: --${name} must be a positive integer.`);
    process.exit(1);
  }
  return parsed;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function buildReplyBody(
  parentBody: string,
  parentUser: string | undefined,
  body: string,
  options: { quote: boolean; mention: boolean }
): string {
  const parts: string[] = [];

  if (options.quote) {
    const allLines = parentBody.split('\n');
    let quoted = allLines
      .slice(0, 5)
      .map((line) => `> ${line}`)
      .join('\n');
    if (quoted.length > 800) quoted = `${quoted.slice(0, 800)}…`;
    if (allLines.length > 5) quoted += '\n> …';
    parts.push(quoted);
  }

  if (options.mention && parentUser) {
    parts.push(`@${parentUser}`);
  }

  parts.push(body);
  return parts.join('\n\n');
}

async function resolveParentPosition(
  api: PrAPI,
  owner: string,
  repo: string,
  number: string,
  parent: PRComment
): Promise<number | undefined> {
  const parentPosition = Number(parent.position);
  if (Number.isInteger(parentPosition) && parentPosition > 0) {
    return parentPosition;
  }

  const newLine = Number(parent.new_line);
  if (!parent.path || !Number.isInteger(newLine) || newLine <= 0) {
    return undefined;
  }

  const files = await api.listFiles(owner, repo, number);
  const file = files.find((candidate) => candidate.filename === parent.path);
  if (!file?.patch?.diff) {
    return undefined;
  }

  return resolveDiffPosition(file.patch.diff, newLine);
}

export function registerPrCommands(program: Command): void {
  const pr = program
    .command('pr')
    .description('Manage pull requests');

  pr
    .command('list')
    .description('List pull requests')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--state <state>', 'State: open|closed|merged|all (default: open)', 'open')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { repo?: string; state?: string; page?: string; perPage?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const prs = await api.list(owner, repo, {
          state: opts.state || 'open',
          page: parseInt(opts.page || '1'),
          per_page: parseInt(opts.perPage || '20'),
        });

        if (opts.json) {
          console.log(JSON.stringify(prs, null, 2));
          return;
        }

        if (!prs.length) {
          console.log('No pull requests found.');
          return;
        }

        console.log(`Pull requests in ${repoName}:\n`);
        for (const p of prs) {
          const head = p.head?.label || 'unknown';
          const base = p.base?.label || 'unknown';
          console.log(`  #${p.number} ${p.title}`);
          console.log(`     ${p.state} · ${head} → ${base} · by ${p.user?.login || 'unknown'} · ${GiteeClient.formatDate(p.created_at)}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('create')
    .description('Create a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .requiredOption('--title <title>', 'PR title')
    .requiredOption('--head <branch>', 'Source branch (head)')
    .option('--base <branch>', 'Target branch (base)', 'master')
    .option('--body <desc>', 'PR description')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { repo?: string; title: string; head: string; base?: string; body?: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const created = await api.create(owner, repo, {
          title: opts.title,
          head: opts.head,
          base: opts.base || 'master',
          body: opts.body || '',
        });

        if (opts.json) {
          console.log(JSON.stringify(created, null, 2));
          return;
        }

        console.log(`✓ Created PR #${created.number}: ${created.title}`);
        console.log(`  URL: ${created.html_url}`);
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('view <number>')
    .description('View pull request details')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const p = await api.get(owner, repo, number);

        if (opts.json) {
          console.log(JSON.stringify(p, null, 2));
          return;
        }

        console.log(`#${p.number} ${p.title}`);
        console.log(`─────────────────────────────`);
        console.log(`State:   ${p.state}${p.merged ? ' (merged)' : ''}`);
        console.log(`Author:  ${p.user?.login || 'unknown'}`);
        console.log(`Head:    ${p.head?.label || 'unknown'}`);
        console.log(`Base:    ${p.base?.label || 'unknown'}`);
        if (p.commits !== undefined) console.log(`Commits: ${p.commits}`);
        if (p.changed_files !== undefined) console.log(`Changed: ${p.changed_files} files`);
        console.log(`Created: ${GiteeClient.formatDate(p.created_at)}`);
        console.log(`Updated: ${GiteeClient.formatDate(p.updated_at)}`);
        if (p.merged_at) console.log(`Merged:  ${GiteeClient.formatDate(p.merged_at)}`);
        console.log(`URL:     ${p.html_url}`);
        if (p.body) {
          console.log(`\n${p.body}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('merge <number>')
    .description('Merge a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--method <method>', 'Merge method: merge|squash|rebase', 'merge')
    .option('--message <msg>', 'Merge commit message')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; method?: string; message?: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        await api.merge(owner, repo, number, opts.method || 'merge', opts.message);

        if (opts.json) {
          console.log(JSON.stringify({ merged: true, number: parseInt(number), method: opts.method || 'merge' }));
          return;
        }

        console.log(`✓ Merged PR #${number} (${opts.method || 'merge'})`);
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('close <number>')
    .description('Close a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const updated = await api.close(owner, repo, number);

        if (opts.json) {
          console.log(JSON.stringify(updated, null, 2));
          return;
        }

        console.log(`✓ Closed PR #${number}`);
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('comment <number>')
    .description('Add a comment to a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .requiredOption('--body <comment>', 'Comment body')
    .option('--path <file>', 'File path for an inline comment')
    .option('--line <n>', 'New-file line number for an inline comment')
    .option('--position <n>', 'Diff position for an inline comment')
    .option('--commit-id <sha>', 'Commit SHA for an inline comment')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: {
      repo?: string;
      body: string;
      path?: string;
      line?: string;
      position?: string;
      commitId?: string;
      json?: boolean;
    }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        let position: number | undefined;

        if (opts.path) {
          if (opts.line !== undefined && opts.position !== undefined) {
            console.error('Error: Use either --line or --position, not both.');
            process.exit(1);
          }
          if (opts.line === undefined && opts.position === undefined) {
            console.error('Error: --path requires --line or --position.');
            process.exit(1);
          }

          if (opts.position !== undefined) {
            position = parsePositiveInt(opts.position, 'position');
          } else {
            const line = parsePositiveInt(opts.line as string, 'line');
            const files = await api.listFiles(owner, repo, number);
            const file = files.find((candidate) => candidate.filename === opts.path);
            if (!file?.patch?.diff) {
              console.error(`Error: No diff found for ${opts.path}. Use --position or omit --path for a normal comment.`);
              process.exit(1);
            }
            position = resolveDiffPosition(file.patch.diff, line);
            if (position === undefined) {
              console.error(`Error: Line ${line} was not found on the new side of ${opts.path}'s diff.`);
              process.exit(1);
            }
          }
        } else if (opts.line !== undefined || opts.position !== undefined) {
          console.error('Error: --line and --position require --path.');
          process.exit(1);
        }

        let commitId = opts.commitId;
        if (opts.path && !commitId) {
          const pr = await api.get(owner, repo, number);
          commitId = pr.head?.sha;
        }
        if (opts.path && !commitId) {
          console.error('Error: Could not determine the commit SHA. Pass --commit-id.');
          process.exit(1);
        }

        const comment = await api.addComment(owner, repo, number, {
          body: opts.body,
          path: opts.path,
          position,
          commit_id: commitId,
        });

        if (opts.json) {
          console.log(JSON.stringify(comment, null, 2));
          return;
        }

        if (opts.path) {
          const location = opts.line !== undefined
            ? `${opts.path}:${opts.line}`
            : `${opts.path} (position ${position})`;
          console.log(`✓ Inline comment added on ${location} (id: ${comment.id})`);
        } else {
          console.log(`✓ Comment added (id: ${comment.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('reply <number> <comment-id>')
    .description('Reply to a pull request comment (flat inline reply by default)')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .requiredOption('--body <comment>', 'Reply body')
    .option('--threaded', 'Try an experimental threaded reply (in_reply_to_id)')
    .option('--no-quote', 'Do not quote the parent comment')
    .option('--no-mention', 'Do not mention the parent comment author')
    .option('--json', 'Output raw JSON with reply metadata')
    .action(async (number: string, commentId: string, opts: {
      repo?: string;
      body: string;
      threaded?: boolean;
      quote?: boolean;
      mention?: boolean;
      json?: boolean;
    }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const parent = await api.getComment(owner, repo, commentId);
        const replyBody = buildReplyBody(parent.body, parent.user?.login, opts.body, {
          quote: opts.quote !== false,
          mention: opts.mention !== false,
        });

        let created: PRComment | undefined;
        let mode: 'threaded' | 'inline' | 'pr' = 'pr';
        let position: number | undefined;
        let fallback = false;
        let threadedUnconfirmed = false;

        if (opts.threaded) {
          try {
            const threaded = await api.addComment(owner, repo, number, {
              body: replyBody,
              in_reply_to_id: parent.id,
            });

            const repliedTo = Number(threaded.in_reply_to_id);
            if (Number.isInteger(repliedTo) && repliedTo === parent.id) {
              created = threaded;
              mode = 'threaded';
            } else {
              threadedUnconfirmed = true;
              fallback = true;
              console.error('Warning: Gitee ignored in_reply_to_id; falling back to a flat reply.');
              try {
                await api.deleteComment(owner, repo, String(threaded.id));
              } catch (deleteErr) {
                console.error(`Warning: could not delete the unsupported top-level comment (${getErrorMessage(deleteErr)}).`);
                created = threaded;
                mode = 'pr';
              }
            }
          } catch (err) {
            fallback = true;
            console.error(`Warning: threaded reply failed (${getErrorMessage(err)}); falling back to a flat reply.`);
          }
        }

        if (!created && parent.path) {
          position = await resolveParentPosition(api, owner, repo, number, parent);
          if (position !== undefined) {
            let commitId = parent.commit_id;
            if (!commitId) {
              const pr = await api.get(owner, repo, number);
              commitId = pr.head?.sha;
            }
            if (commitId) {
              created = await api.addComment(owner, repo, number, {
                body: replyBody,
                path: parent.path,
                position,
                commit_id: commitId,
              });
              mode = 'inline';
            } else {
              console.error('Warning: could not determine the parent commit; posting a normal PR comment instead.');
            }
          } else {
            console.error('Warning: could not resolve the parent diff position; posting a normal PR comment instead.');
          }
        }

        if (!created) {
          created = await api.addComment(owner, repo, number, { body: replyBody });
          mode = 'pr';
        }

        if (opts.json) {
          console.log(JSON.stringify({
            comment: created,
            mode,
            fallback,
            position,
            threaded_unconfirmed: threadedUnconfirmed || undefined,
          }, null, 2));
          return;
        }

        const lineLabel = parent.new_line !== undefined && parent.new_line !== null
          ? `:${parent.new_line}`
          : position !== undefined
            ? ` (position ${position})`
            : '';
        const location = mode === 'inline' && parent.path ? ` on ${parent.path}${lineLabel}` : '';
        const modeLabel = mode === 'threaded'
          ? 'threaded reply'
          : mode === 'inline'
            ? `inline reply${location}`
            : 'PR comment';
        console.log(`✓ Posted ${modeLabel} (id: ${created.id})`);
        if (fallback) {
          console.log('  Note: threaded reply failed; a flat reply was posted instead.');
        }
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('comments <number>')
    .description('List comments on a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--type <type>', 'Comment type: all|diff|pr', 'all')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; type?: string; page?: string; perPage?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const typeMap: Record<string, 'diff_comment' | 'pr_comment' | undefined> = {
        all: undefined,
        diff: 'diff_comment',
        diff_comment: 'diff_comment',
        pr: 'pr_comment',
        pr_comment: 'pr_comment',
      };
      const requestedType = (opts.type || 'all').toLowerCase();
      if (!(requestedType in typeMap)) {
        console.error('Error: --type must be one of: all, diff, pr.');
        process.exit(1);
      }

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const comments = await api.listComments(owner, repo, number, {
          page: parseInt(opts.page || '1'),
          per_page: parseInt(opts.perPage || '20'),
          comment_type: typeMap[requestedType],
        });

        if (opts.json) {
          console.log(JSON.stringify(comments, null, 2));
          return;
        }

        if (!comments.length) {
          console.log('No comments found.');
          return;
        }

        console.log(`Comments (${requestedType}) on PR #${number} in ${repoName}:\n`);
        for (const c of comments) {
          const lineRef = c.new_line !== undefined && c.new_line !== null
            ? `:${c.new_line}`
            : c.position !== undefined && c.position !== null
              ? `:${c.position}`
              : '';
          const location = c.path ? ` · ${c.path}${lineRef}` : '';
          const typeLabel = c.comment_type === 'diff_comment' ? ' [diff]' : '';
          const replyLabel = c.in_reply_to_id ? ` (reply to ${c.in_reply_to_id})` : '';
          console.log(`  ── ${c.user?.login || 'unknown'} · ${GiteeClient.formatDate(c.created_at)}${location}${typeLabel}${replyLabel} (id: ${c.id})`);
          const lines = c.body.split('\n');
          for (const line of lines) {
            console.log(`     ${line}`);
          }
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('files <number>')
    .description('List files changed in a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const files = await api.listFiles(owner, repo, number);

        if (opts.json) {
          console.log(JSON.stringify(files, null, 2));
          return;
        }

        if (!files.length) {
          console.log('No files changed.');
          return;
        }

        console.log(`Files changed in PR #${number} (${repoName}):\n`);
        for (const f of files) {
          let changeType = f.status || 'modified';
          if (f.patch?.new_file) changeType = 'added';
          else if (f.patch?.deleted_file) changeType = 'deleted';
          else if (f.patch?.renamed_file) changeType = 'renamed';

          const additions = Number(f.additions) || 0;
          const deletions = Number(f.deletions) || 0;

          const typeLabel = {
            added: '\x1b[32mA\x1b[0m',
            deleted: '\x1b[31mD\x1b[0m',
            renamed: '\x1b[33mR\x1b[0m',
            modified: '\x1b[36mM\x1b[0m',
          }[changeType] ?? '\x1b[36mM\x1b[0m';

          const stats = `\x1b[32m+${additions}\x1b[0m \x1b[31m-${deletions}\x1b[0m`;
          console.log(`  ${typeLabel} ${f.filename}  ${stats}`);
        }
        console.log(`\n  ${files.length} file(s) changed`);
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('diff <number>')
    .description('Show the diff of a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--json', 'Output raw JSON (patch content per file)')
    .action(async (number: string, opts: { repo?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const files = await api.listFiles(owner, repo, number);

        if (opts.json) {
          console.log(JSON.stringify(files, null, 2));
          return;
        }

        if (!files.length) {
          console.log('No diff found.');
          return;
        }

        for (const f of files) {
          console.log(`\x1b[1m\x1b[34mdiff -- ${f.filename}\x1b[0m`);
          if (!f.patch?.diff) {
            console.log('  (no diff available)');
            console.log('');
            continue;
          }
          const lines = f.patch.diff.split('\n');
          for (const line of lines) {
            if (line.startsWith('@@')) {
              console.log(`\x1b[36m${line}\x1b[0m`);
            } else if (line.startsWith('+')) {
              console.log(`\x1b[32m${line}\x1b[0m`);
            } else if (line.startsWith('-')) {
              console.log(`\x1b[31m${line}\x1b[0m`);
            } else {
              console.log(line);
            }
          }
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('review <number>')
    .description('Submit a review for a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .requiredOption('--action <action>', 'Review action: approve | request_changes | comment')
    .option('--body <comment>', 'Review comment body')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; action: string; body?: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const validActions = ['approve', 'request_changes', 'comment'];
      if (!validActions.includes(opts.action)) {
        console.error(`Error: --action must be one of: ${validActions.join(', ')}`);
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const result = await api.submitReview(owner, repo, number, {
          action: opts.action as 'approve' | 'request_changes' | 'comment',
          body: opts.body || '',
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const actionLabel: Record<string, string> = {
          approve: '✓ Approved',
          request_changes: '✗ Requested changes',
          comment: '💬 Review comment submitted',
        };
        console.log(`${actionLabel[opts.action] ?? '✓ Review submitted'} on PR #${number}`);
      } catch (err) {
        handleError(err);
      }
    });

  pr
    .command('review-comments <number>')
    .description('List review comments on a pull request')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; page?: string; perPage?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new PrAPI(client);

      try {
        const comments = await api.listReviewComments(owner, repo, number, {
          page: parseInt(opts.page || '1'),
          per_page: parseInt(opts.perPage || '20'),
        });

        if (opts.json) {
          console.log(JSON.stringify(comments, null, 2));
          return;
        }

        if (!comments.length) {
          console.log('No review comments found.');
          return;
        }

        console.log(`Review comments on PR #${number} (${repoName}):\n`);
        for (const c of comments) {
          const lineRef = c.new_line !== undefined && c.new_line !== null
            ? `:${c.new_line}`
            : c.position !== undefined && c.position !== null
              ? `:${c.position}`
              : '';
          const fileInfo = c.path ? `\x1b[33m${c.path}${lineRef}\x1b[0m · ` : '';
          const replyLabel = c.in_reply_to_id ? ` (reply to ${c.in_reply_to_id})` : '';
          console.log(`  ── ${fileInfo}${c.user?.login || 'unknown'} · ${GiteeClient.formatDate(c.created_at)}${replyLabel} (id: ${c.id})`);
          const lines = c.body.split('\n');
          for (const line of lines) {
            console.log(`     ${line}`);
          }
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });
}
