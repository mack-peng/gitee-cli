import { Command } from 'commander';
import { getToken, getConfig, saveConfig, clearConfig } from '../utils/config.js';
import { prompt } from '../utils/prompt.js';
import { GiteeClient, handleError, ApiError } from '../api/client.js';
import { AuthAPI } from '../api/auth.js';

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage authentication');

  auth
    .command('login')
    .description('Authenticate with a Gitee Personal Access Token')
    .option('--with-token', 'Read token from stdin (non-interactive)')
    .action(async (opts: { withToken?: boolean }) => {
      let token: string;

      if (opts.withToken) {
        const chunks: string[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        token = chunks.join('').trim();
      } else {
        console.log('Gitee CLI Authentication');
        console.log('Get your token at: https://gitee.com/profile/personal_access_tokens');
        console.log('');
        token = await prompt('Enter your Gitee Personal Access Token: ', true);
      }

      if (!token) {
        console.error('Error: Token cannot be empty.');
        process.exit(1);
      }

      console.log('Verifying token...');
      try {
        const api = new AuthAPI(new GiteeClient(token));
        const user = await api.verify(token);
        saveConfig({ token, username: user.login });
        console.log(`✓ Logged in as ${user.login} (${user.name || user.login})`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          console.error('Error: Invalid token. Please check your Personal Access Token.');
          process.exit(1);
        }
        handleError(err);
      }
    });

  auth
    .command('logout')
    .description('Clear stored authentication credentials')
    .action(() => {
      clearConfig();
      console.log('✓ Logged out. Token cleared.');
    });

  auth
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
      const token = getToken();
      if (!token) {
        console.log('Not logged in.');
        console.log('Run `gitee-cli auth login` to authenticate.');
        return;
      }

      const fromEnv = !!process.env.GITEE_TOKEN;
      const config = getConfig();

      console.log(`Token source: ${fromEnv ? 'GITEE_TOKEN (env)' : 'config file'}`);
      if (config.username) {
        console.log(`Cached username: ${config.username}`);
      }

      console.log('Verifying token...');
      try {
        const api = new AuthAPI(new GiteeClient(token));
        const user = await api.getUser();
        console.log(`✓ Authenticated as ${user.login} (${user.name || user.login})`);
        if (user.email) console.log(`Email: ${user.email}`);
        if (user.public_repos !== undefined) console.log(`Public repos: ${user.public_repos}`);
      } catch {
        console.log('✗ Token is invalid or expired.');
      }
    });
}
