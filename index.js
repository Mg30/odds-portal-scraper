#!/usr/bin/env node

import { program } from 'commander';
import { historicOdds, nextMatches } from './lib/commands/index.js';
import { leaguesUrlsMap, oddsFormatMap } from './lib/constants.js';
import { exportToS3, exportToDir } from './lib/exporters.js'
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));


program
    .version(packageJson.version)
    .description('A CLI tool for scraping soccer odds from the odds portal site.')
    .command('help')
    .description('show available commands')
    .action(() => program.help());;

program
    .command('historic <leagueName> <startYear> <endYear>')
    .description('historic scrape of odds in the given league')
    .requiredOption('--odds-format <format>', 'the desired odds format')
    .option('--s3 <bucketName>', 'S3 bucket name to store the JSON file')
    .option('--local <directory>', 'Local output directory for JSON file')
    .action(async (leagueName, startYear, endYear, options) => {
        if (startYear > endYear) {
            console.error('Error: startYear must be less than endYear');
            return;
        }
        const oddsFormat = options.oddsFormat;
        if (options.s3 && options.local) {
            console.error('Error: Cannot use both --s3 and --local options. Choose one.');
            return;
        } else if (options.s3) {
            const s3Exporter = exportToS3(options.s3)
            await historicOdds(leagueName, startYear, endYear, oddsFormat, s3Exporter);

        } else if (options.local) {
            const localExport = exportToDir(options.local)
            await historicOdds(leagueName, startYear, endYear, oddsFormat, localExport);

        }
    });

program
    .command('next-matches <leagueName>')
    .description('scrape of odds in the given league')
    .requiredOption('--odds-format <format>', 'the desired odds format')
    .option('--s3 <bucketName>', 'S3 bucket name to store the JSON file')
    .option('--local <directory>', 'Local output directory for JSON file')
    .action(async (leagueName, options) => {


        const oddsFormat = options.oddsFormat;
        if (options.s3 && options.local) {
            logger.error('Error: Cannot use both --s3 and --local options. Choose one.');
            return;
        } else if (options.s3) {
            const s3Exporter = exportToS3(options.s3)
            await nextMatches(leagueName, oddsFormat, s3Exporter);

        } else if (options.local) {
            const localExport = exportToDir(options.local)
            await nextMatches(leagueName, oddsFormat, localExport);

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
