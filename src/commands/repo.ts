import { Command } from 'commander';
import { execSync } from 'child_process';
import { getToken } from '../utils/config.js';
import { promptConfirm } from '../utils/prompt.js';
import { GiteeClient, resolveRepo, handleError } from '../api/client.js';
import { RepoAPI, GiteeRepo } from '../api/repo.js';

export function registerRepoCommands(program: Command): void {
  const repo = program
    .command('repo')
    .description('Manage repositories');

  repo
    .command('list')
    .description('List repositories')
    .option('--owner <user>', 'List repos for a specific user (default: authenticated user)')
    .option('--type <type>', 'Type: all|owner|public|private|member', 'all')
    .option('--page <n>', 'Page number', '1')
    .option('--per-page <n>', 'Results per page (max 100)', '20')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { owner?: string; type?: string; page?: string; perPage?: string; json?: boolean }) => {
      const token = getToken();
      const client = new GiteeClient(token);
      const api = new RepoAPI(client);

      try {
        let repos: GiteeRepo[];
        if (opts.owner) {
          repos = await api.listForUser(opts.owner, {
            type: opts.type || 'all',
            page: parseInt(opts.page || '1'),
            per_page: parseInt(opts.perPage || '20'),
          });
        } else {
          if (!token) {
            console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
            process.exit(1);
          }
          repos = await api.listOwn({
            type: opts.type || 'all',
            page: parseInt(opts.page || '1'),
            per_page: parseInt(opts.perPage || '20'),
          });
        }

        if (opts.json) {
          console.log(JSON.stringify(repos, null, 2));
          return;
        }

        if (!repos.length) {
          console.log('No repositories found.');
          return;
        }

        console.log(`Found ${repos.length} repositories:\n`);
        for (const r of repos) {
          const visibility = r.private ? '🔒 private' : '🌐 public';
          const stars = r.stargazers_count !== undefined ? `⭐ ${r.stargazers_count}` : '';
          const forks = r.forks_count !== undefined ? `🍴 ${r.forks_count}` : '';
          console.log(`  ${r.full_name} [${visibility}] ${stars} ${forks}`);
          if (r.description) console.log(`    ${r.description}`);
          console.log(`    ${r.html_url}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  repo
    .command('create <name>')
    .description('Create a new repository')
    .option('--private', 'Make repository private')
    .option('--description <desc>', 'Repository description')
    .option('--org <org>', 'Create under an organization')
    .option('--json', 'Output raw JSON')
    .action(async (name: string, opts: { private?: boolean; description?: string; org?: string; json?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const client = new GiteeClient(token);
      const api = new RepoAPI(client);

      try {
        const created = await api.create({
          name,
          private: opts.private || false,
          description: opts.description || '',
          org: opts.org,
        });

        if (opts.json) {
          console.log(JSON.stringify(created, null, 2));
          return;
        }

        console.log(`✓ Created repository: ${created.full_name}`);
        console.log(`  URL: ${created.html_url}`);
        console.log(`  Clone: ${created.clone_url || created.ssh_url}`);
      } catch (err) {
        handleError(err);
      }
    });

  repo
    .command('view [repo]')
    .description('View repository details (owner/repo or auto-detect)')
    .option('--repo <owner/repo>', 'Repository (owner/repo)')
    .option('--json', 'Output raw JSON')
    .action(async (repoArg: string | undefined, opts: { repo?: string; json?: boolean }) => {
      const token = getToken();
      const repoName = resolveRepo(repoArg || opts.repo);
      const [owner, name] = repoName.split('/');

      const client = new GiteeClient(token);
      const api = new RepoAPI(client);

      try {
        const r = await api.get(owner, name);

        if (opts.json) {
          console.log(JSON.stringify(r, null, 2));
          return;
        }

        const visibility = r.private ? '🔒 private' : '🌐 public';
        console.log(`${r.full_name} (${visibility})`);
        console.log(`─────────────────────────────`);
        if (r.description) console.log(`Description: ${r.description}`);
        console.log(`URL:     ${r.html_url}`);
        console.log(`Clone:   ${r.clone_url || r.ssh_url}`);
        console.log(`Branch:  ${r.default_branch || 'master'}`);
        console.log(`Stars:   ${r.stargazers_count ?? 0}  Forks: ${r.forks_count ?? 0}  Watchers: ${r.watchers_count ?? 0}`);
        console.log(`Issues:  ${r.open_issues_count ?? 0} open`);
        if (r.language) console.log(`Language: ${r.language}`);
        console.log(`Created: ${GiteeClient.formatDate(r.created_at)}`);
        console.log(`Updated: ${GiteeClient.formatDate(r.updated_at)}`);
      } catch (err) {
        handleError(err);
      }
    });

  repo
    .command('clone <repo>')
    .description('Clone a Gitee repository (owner/repo)')
    .action(async (repoArg: string) => {
      const cloneUrl = `https://gitee.com/${repoArg}.git`;
      console.log(`Cloning ${cloneUrl}...`);
      try {
        execSync(`git clone ${cloneUrl}`, { stdio: 'inherit' });
      } catch {
        console.error('Error: Clone failed.');
        process.exit(1);
      }
    });

  repo
    .command('delete <repo>')
    .description('Delete a repository (owner/repo) — requires confirmation')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (repoArg: string, opts: { yes?: boolean }) => {
      const token = getToken();
      if (!token) {
        console.error('Error: Authentication required. Run `gitee-cli auth login` or set GITEE_TOKEN.');
        process.exit(1);
      }

      const [owner, name] = repoArg.split('/');
      if (!owner || !name) {
        console.error('Error: Invalid repo format. Use owner/repo.');
        process.exit(1);
      }

      if (!opts.yes) {
        const confirmed = await promptConfirm(`Are you sure you want to delete ${repoArg}? This is irreversible! (y/N): `);
        if (!confirmed) {
          console.log('Aborted.');
          return;
        }
      }

      const client = new GiteeClient(token);
      const api = new RepoAPI(client);

      try {
        await api.delete(owner, name);
        console.log(`✓ Deleted repository: ${repoArg}`);
      } catch (err) {
        handleError(err);
      }
    });
}
