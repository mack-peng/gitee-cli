import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import {
  registerAuthCommands,
  registerRepoCommands,
  registerIssueCommands,
  registerPrCommands,
  registerReleaseCommands,
  registerOrgCommands,
  registerApiCommand,
} from './commands/index.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };

export function decorateProgram(program: Command): void {
  program
    .name('gitee-cli')
    .description('Gitee (码云) command-line tool — like gh, but for Gitee')
    .version(packageJson.version);

  registerAuthCommands(program);
  registerRepoCommands(program);
  registerIssueCommands(program);
  registerPrCommands(program);
  registerReleaseCommands(program);
  registerOrgCommands(program);
  registerApiCommand(program);
}
