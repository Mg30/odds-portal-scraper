import path from 'path';
import fs from 'fs';
import { exec } from 'child_process'
import { promisify } from 'util';
import { expect } from '@jest/globals';


const promisifiedExec = promisify(exec);

describe('next-matches command', () => {
  const leagueName = 'premier-league';
  const oddsFormat = 'EU Oddeu';
  const outputDir = 'test-output';

  // Clean up any existing test output files
  afterEach(() => {
    try {
      fs.unlinkSync(path.join(outputDir, `${leagueName}.json`));
    } catch (err) {
      // Ignore errors if the file doesn't exist
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });

  it('should output an error if s3 and local option are both specified', async () => {
    // Call the command with an invalid odd format
    const command = promisifiedExec(`odds-portal next-matches ${leagueName} --odds-format ${oddsFormat} --local /invalid/directory --s3 bucketName`)
    await expect(command).rejects.toThrow(`Error: Cannot use both --s3 and --local options. Choose one.`);

    // Expect the command to reject with an error
  }, 30000);
});