#!/usr/bin/env node

import { program } from 'commander';
import { historicOdds } from '../lib/commands/index.js';

program
    .version('0.1.0')
    .description('My CLI description')
    .option('-f, --foo', 'Enable foo')
    .option('-b, --bar <value>', 'Set bar value')
    .action(() => {
        console.log('Hello world');
    });

program
    .command('historic <leagueName> <startYear> <endYear>')
    .description('historic scrape of odds in the give league')
    .action(async (leagueName, startYear, endYear) => {
        const odds = await historicOdds(leagueName, startYear, endYear);
        console.log(odds)
    });


program.parse(process.argv);