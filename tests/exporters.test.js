import { exportToS3, exportToDir } from '../lib/exporters.js';
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import AWS from 'aws-sdk';

describe('exportToS3', () => {
    let mockPutObject;

    beforeEach(() => {
        mockPutObject = jest.fn((params, callback) => callback(null, {}));
        AWS.S3 = jest.fn(() => ({
            putObject: mockPutObject
        }));
    });

    it('should export data to S3 successfully', async () => {
        const bucketName = 'test-bucket';
        const fileName = 'test.json';
        const testData = { key: 'value' };

        const exporter = exportToS3(bucketName);
        await exporter(testData, fileName);

        expect(mockPutObject).toHaveBeenCalledWith({
            Bucket: bucketName,
            Key: fileName,
            Body: JSON.stringify(testData),
            ContentType: 'application/json'
        }, expect.any(Function));
    });

    it('should reject when S3 upload fails', async () => {
        const error = new Error('S3 upload failed');
        mockPutObject = jest.fn((params, callback) => callback(error, null));
        AWS.S3 = jest.fn(() => ({
            putObject: mockPutObject
        }));

        const exporter = exportToS3('test-bucket');
        await expect(exporter({}, 'test.json')).rejects.toThrow(error);
    });
});

describe('exportToDir', () => {
    const testDir = 'test-output';

    beforeEach(() => {
        try {
            fs.mkdirSync(testDir, { recursive: true });
        } catch (err) {
            // Ignore errors if directory already exists
        }
    });

    afterEach(() => {
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore errors if directory doesn't exist
        }
    });

    it('should export data to directory successfully', async () => {
        const fileName = 'test.json';
        const testData = { key: 'value' };
        const expectedPath = path.join(testDir, fileName);

        const exporter = exportToDir(testDir);
        await exporter(testData, fileName);

        const fileContent = fs.readFileSync(expectedPath, 'utf8');
        expect(JSON.parse(fileContent)).toEqual(testData);
    });

    it('should reject when directory write fails', async () => {
        const invalidDir = '/invalid/directory';
        const exporter = exportToDir(invalidDir);

        await expect(exporter({}, 'test.json')).rejects.toThrow();
    });
});
