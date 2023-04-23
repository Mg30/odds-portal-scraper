import path from 'path';
import fs from 'fs';
import { exec } from 'child_process'
import { promisify } from 'util';
import { expect } from '@jest/globals';



const promisifiedExec = promisify(exec);

describe('next-matches command', () => {
  const leagueName = 'premier-league';
  const oddsFormat = 'EU Odds';
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

  it('should output an error if the output directory is invalid', async () => {
    // Call the command with an invalid output directory
    const command = promisifiedExec(`odds-portal next-matches ${leagueName} --odds-format ${oddsFormat} --output-dir /invalid/directory`)
    await expect(command).rejects.toThrow(`format '${oddsFormat}' is not supported`);

    // Expect the command to reject with an error
  }, 30000);
});