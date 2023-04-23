#!/usr/bin/env node

import { program } from 'commander';
import { historicOdds } from './lib/commands/index.js';
import { leaguesUrlsMap } from './lib/constants.js';

program
    .version('1.0.0')
    .description('A CLI tool for scraping soccer odds from the odds portal site.')
    .command('help')
    .description('show available commands')
    .action(() => program.help());;

program
    .command('historic <leagueName> <startYear> <endYear>')
    .description('historic scrape of odds in the given league')
    .requiredOption('--output-dir <directory>', 'Output directory for JSON file')
    .action(async (leagueName, startYear, endYear, options) => {
        if (startYear > endYear) {
            console.error('Error: startYear must be less than to endYear');
            return;
        }

        const odds = await historicOdds(leagueName, startYear, endYear);
        const outputDir = options.outputDir;
        const outputFileName = `${leagueName}-${startYear}-${endYear}.json`;
        const outputPath = path.join(outputDir, outputFileName);
        const jsonData = JSON.stringify(odds);

        try {
            fs.writeFileSync(outputPath, jsonData);
            console.log(`Odds data saved to ${outputPath}`);
        } catch (err) {
            console.error(`Failed to write odds data to ${outputPath}:`, err);
        }
    });


program
    .command('soccer-leagues')
    .description('List the available leagues')
    .action(() => {
        console.log('Available leagues:');
        Object.keys(leaguesUrlsMap).forEach((league) => {
            console.log(`- ${league}`);
        });
    });
program.parse(process.argv);
