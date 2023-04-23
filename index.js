#!/usr/bin/env node

import { program } from 'commander';
import { historicOdds, nextMatches } from './lib/commands/index.js';
import { leaguesUrlsMap, oddsFormatMap } from './lib/constants.js';
import path from 'path';
import fs from 'fs';

program
    .version('1.0.0')
    .description('A CLI tool for scraping soccer odds from the odds portal site.')
    .command('help')
    .description('show available commands')
    .action(() => program.help());;

program
    .command('historic <leagueName> <startYear> <endYear>')
    .description('historic scrape of odds in the given league')
    .requiredOption('--odds-format <format>', 'the desired odds format')
    .requiredOption('--output-dir <directory>', 'Output directory for JSON file')
    .action(async (leagueName, startYear, endYear, options) => {
        if (startYear > endYear) {
            console.error('Error: startYear must be less than endYear');
            return;
        }
        const oddsFormat = options.oddsFormat

        const odds = await historicOdds(leagueName, startYear, endYear, oddsFormat);
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
    .command('next-matches <leagueName>')
    .description('scrape of odds in the given league')
    .requiredOption('--odds-format <format>', 'the desired odds format')
    .requiredOption('--output-dir <directory>', 'Output directory for JSON file')
    .action(async (leagueName, options) => {

        const oddsFormat = options.oddsFormat

        const odds = await nextMatches(leagueName, oddsFormat);
        const outputDir = options.outputDir;
        const outputFileName = `${leagueName}-.json`;
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

program
    .command('odds-format')
    .description('List the available odds format')
    .action(() => {
        console.log('Available format:');
        Object.keys(oddsFormatMap).forEach((format) => {
            console.log(`- ${format}`);
        });
    });
program.parse(process.argv);
