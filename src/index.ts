#!/usr/bin/env node
import { Command } from 'commander';
import { decorateProgram } from './program.js';

const program = new Command();

decorateProgram(program);

program.parse(process.argv);
