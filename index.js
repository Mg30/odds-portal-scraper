#!/usr/bin/env node

import { program } from 'commander';
import { historicOdds } from './lib/commands/index.js';


program
    .version('1.0.0')
    .description('A CLI tool for scraping soccer odds from the odds portal site.')
    .command('help')
    .description('show available commands')
    .action(() => program.help());;

program
    .command('historic <leagueName> <startYear> <endYear>')
    .description('historic scrape of odds in the give league')
    .action(async (leagueName, startYear, endYear) => {
        const odds = await historicOdds(leagueName, startYear, endYear);
        console.log(odds)
    });
program.parse(process.argv);
