import AWS from 'aws-sdk'
import logger from "./logger.js";
import path from 'path';
import fs from 'fs';

/**
 * Handles exporting data to an AWS S3 bucket.
 *
 * @param {Object[]} data - The data to be exported. Should be an array of objects.
 * @param {string} bucketName - The name of the AWS S3 bucket.
 */
function exportToS3(bucketName) {
    // Initialize the AWS S3 instance.
    const s3 = new AWS.S3();;

    return (data, fileName) => new Promise((resolve, reject) => {
        // Convert data to a JSON string.
        const dataString = JSON.stringify(data);
        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: dataString,
            ContentType: 'application/json', // Set the content type of the file.
        };
        s3.putObject(params, (err, data) => {
            if (err) {
                logger.error('Error uploading data to S3:', err);
                reject(err)
            } else {
                logger.info(`Data successfully exported to S3 bucket: ${bucketName}`);
                resolve()
            }
        });

    })
}

/**
 * Handles exporting data to a local directory.
 *
 * @param {string} directory - The path of the local directory where the JSON file will be saved.
 */
function exportToDir(directory) {
    return (data, fileName) => new Promise((resolve, reject) => {
        // Convert data to a JSON string.
        const dataString = JSON.stringify(data);
        const outputPath = path.join(directory, fileName);

        fs.writeFile(outputPath, dataString, 'utf8', (err) => {
            if (err) {
                console.error(`Failed to write data to ${outputPath}:`, err);
                reject(err);
            } else {
                console.log(`Data successfully exported to ${outputPath}`);
                resolve();
            }
        });
    });
}

export { exportToS3, exportToDir };