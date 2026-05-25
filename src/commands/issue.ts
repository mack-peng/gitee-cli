import { Command } from 'commander';
import { getToken } from '../utils/config.js';
import { GiteeClient, resolveRepo, handleError } from '../api/client.js';
import { IssueAPI } from '../api/issue.js';

export function registerIssueCommands(program: Command): void {
  const issue = program
    .command('issue')
    .description('Manage issues');

  issue
    .command('list')
    .description('List issues in a repository')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--state <state>', 'State: open|closed|all (default: open)', 'open')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { repo?: string; state?: string; page?: string; perPage?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new IssueAPI(client);

      try {
        const issues = await api.list(owner, repo, {
          state: opts.state || 'open',
          page: parseInt(opts.page || '1'),
          per_page: parseInt(opts.perPage || '20'),
        });

        if (opts.json) {
          console.log(JSON.stringify(issues, null, 2));
          return;
        }

        if (!issues.length) {
          console.log('No issues found.');
          return;
        }

        console.log(`Issues in ${repoName}:\n`);
        for (const iss of issues) {
          const labels = iss.labels?.map(l => `[${l.name}]`).join(' ') || '';
          const comments = iss.comments ? `💬 ${iss.comments}` : '';
          console.log(`  #${iss.number} ${iss.title} ${labels}`);
          console.log(`     ${iss.state} · by ${iss.user?.login || 'unknown'} · ${GiteeClient.formatDate(iss.created_at)} ${comments}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  issue
    .command('create')
    .description('Create an issue')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .requiredOption('--title <title>', 'Issue title')
    .option('--body <body>', 'Issue body/description')
    .option('--assignee <username>', 'Assign to user')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { repo?: string; title: string; body?: string; assignee?: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new IssueAPI(client);

      try {
        const created = await api.create(owner, {
          repo,
          title: opts.title,
          body: opts.body || '',
          assignee: opts.assignee,
        });

        if (opts.json) {
          console.log(JSON.stringify(created, null, 2));
          return;
        }

        console.log(`✓ Created issue #${created.number}: ${created.title}`);
        console.log(`  URL: ${created.html_url}`);
      } catch (err) {
        handleError(err);
      }
    });

  issue
    .command('view <number>')
    .description('View issue details')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new IssueAPI(client);

      try {
        const iss = await api.get(owner, number);

        if (opts.json) {
          console.log(JSON.stringify(iss, null, 2));
          return;
        }

        console.log(`#${iss.number} ${iss.title}`);
        console.log(`─────────────────────────────`);
        console.log(`State:   ${iss.state}`);
        console.log(`Author:  ${iss.user?.login || 'unknown'}`);
        if (iss.assignee) console.log(`Assignee: ${iss.assignee.login}`);
        if (iss.labels?.length) console.log(`Labels:  ${iss.labels.map(l => l.name).join(', ')}`);
        console.log(`Created: ${GiteeClient.formatDate(iss.created_at)}`);
        console.log(`Updated: ${GiteeClient.formatDate(iss.updated_at)}`);
        console.log(`URL:     ${iss.html_url}`);
        if (iss.body) {
          console.log(`\n${iss.body}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  issue
    .command('update <number>')
    .description('Update an issue (title, body, assignee, state, labels)')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--title <title>', 'New title')
    .option('--body <body>', 'New body/description')
    .option('--assignee <username>', 'Reassign to user')
    .option('--state <state>', 'State: open|closed|progressing|rejected')
    .option('--labels <labels>', 'Comma-separated label names')
    .option('--enterprise <enterprise>', 'Enterprise name (use enterprise API endpoint)')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: {
      repo?: string; title?: string; body?: string; assignee?: string;
      state?: string; labels?: string; enterprise?: string; json?: boolean;
    }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      if (!opts.title && !opts.body && !opts.assignee && !opts.state && !opts.labels) {
        console.error('Error: Provide at least one field to update (--title, --body, --assignee, --state, --labels).');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new IssueAPI(client);

      try {
        const updated = await api.update(owner, number, {
          repo,
          title: opts.title,
          body: opts.body,
          assignee: opts.assignee,
          state: opts.state,
          labels: opts.labels,
          enterprise: opts.enterprise,
        });

        if (opts.json) {
          console.log(JSON.stringify(updated, null, 2));
          return;
        }

        console.log(`✓ Updated issue #${number}: ${updated.title}`);
        if (opts.state) console.log(`  State: ${updated.state}`);
        if (opts.assignee) console.log(`  Assignee: ${updated.assignee?.login || opts.assignee}`);
        console.log(`  URL: ${updated.html_url}`);
      } catch (err) {
        handleError(err);
      }
    });

  issue
    .command('close <number>')
    .description('Close an issue')
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
      const api = new IssueAPI(client);

      try {
        const updated = await api.close(owner, repo, number);

        if (opts.json) {
          console.log(JSON.stringify(updated, null, 2));
          return;
        }

        console.log(`✓ Closed issue #${number}`);
      } catch (err) {
        handleError(err);
      }
    });

  issue
    .command('comment <number>')
    .description('Add a comment to an issue')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .requiredOption('--body <comment>', 'Comment body')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; body: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new IssueAPI(client);

      try {
        const comment = await api.addComment(owner, repo, number, opts.body);

        if (opts.json) {
          console.log(JSON.stringify(comment, null, 2));
          return;
        }

        console.log(`✓ Comment added (id: ${comment.id})`);
      } catch (err) {
        handleError(err);
      }
    });

  issue
    .command('comments <number>')
    .description('List comments on an issue')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--json', 'Output raw JSON')
    .action(async (number: string, opts: { repo?: string; page?: string; perPage?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(opts.repo);
      const [owner, repo] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new IssueAPI(client);

      try {
        const comments = await api.listComments(owner, repo, number, {
          page: parseInt(opts.page || '1'),
          per_page: parseInt(opts.perPage || '20'),
        });

        if (opts.json) {
          console.log(JSON.stringify(comments, null, 2));
          return;
        }

        if (!comments.length) {
          console.log('No comments found.');
          return;
        }

        console.log(`Comments on issue #${number} in ${repoName}:\n`);
        for (const c of comments) {
          console.log(`  ── ${c.user?.login || 'unknown'} · ${GiteeClient.formatDate(c.created_at)} (id: ${c.id})`);
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
