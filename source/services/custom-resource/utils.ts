/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from "aws-sdk";
import {factory} from "../logger";

const LOGGER = factory.getLogger('custom-resource');

/**
 * Puts an object into S3 bucket
 * @param {string} bucket - bucket name to put an object
 * @param {Buffer|string} fileData - object body
 * @param {string} filename - object name
 * @param {boolean} isEncrypted - choose to encrypt the object
 */
export async function putObject(bucket: string, fileData: Buffer|string, filename: string, isEncrypted?: boolean): Promise<any> {
    const s3 = new AWS.S3();
    let params: AWS.S3.PutObjectRequest = {
        Bucket: bucket,
        Body: fileData,
        Key: filename,
        ContentType: getContentType(filename)
    };

    if(isEncrypted) {
        params['ServerSideEncryption'] = 'AES256'
    }

    try {
        await s3.putObject(params).promise();
        return Promise.resolve({
            Message: `File uploaded: ${filename}`
        });
    } catch (error) {
        LOGGER.error(`Error occurred while uploading ${filename}.`, error);
        return Promise.reject({
            Error: `Error occurred while uploading ${filename}.`
        });
    }
}

/**
 * Gets content type based on file extension
 * @param {string} filename - filename
 */
export function getContentType(filename: string): string {
    if (filename.endsWith('.html')) return 'text/html';
    if (filename.endsWith('.css')) return 'text/css';
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.svg')) return 'image/svg+xml';
    if (filename.endsWith('.jpg')) return 'image/jpeg';
    if (filename.endsWith('.js')) return 'application/javascript';
    else return 'binary/octet-stream';
}

/**
 * Sleeps for 5 * retry seconds
 * @param {number} retry - the number of retry
 */
export function sleep(retry: number) {
    return new Promise(resolve => setTimeout(resolve, 5000 * retry));
}