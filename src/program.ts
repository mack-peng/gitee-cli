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

export function decorateProgram(program: Command): void {
  program
    .name('gitee-cli')
    .description('Gitee (码云) command-line tool — like gh, but for Gitee')
    .version('0.1.0');

  registerAuthCommands(program);
  registerRepoCommands(program);
  registerIssueCommands(program);
  registerPrCommands(program);
  registerReleaseCommands(program);
  registerOrgCommands(program);
  registerApiCommand(program);
}
