/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from "aws-sdk";
import {factory} from "../../logger";
import {getContentType, sleep} from "../utils";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

const LOGGER = factory.getLogger('custom-resource::copy-website');

export default async function (requestType: CustomResourceRequestType, resourceProps: any) {
    const { SourceS3Bucket, SourceS3Key, SourceManifest, DestinationS3Bucket } = resourceProps;

    try {
        switch (requestType) {
            case CustomResourceRequestType.CREATE: return await copyWebsite(SourceS3Bucket, SourceS3Key, SourceManifest, DestinationS3Bucket);
            case CustomResourceRequestType.UPDATE: return await copyWebsite(SourceS3Bucket, SourceS3Key, SourceManifest, DestinationS3Bucket);
            case CustomResourceRequestType.DELETE: return noActionRequiredResponse;
        }
    } catch (error) {
        LOGGER.error(`Copying website assets from ${SourceS3Bucket} to ${DestinationS3Bucket} failed.`, error);
        throw Error(`Copying website assets from ${SourceS3Bucket} to ${DestinationS3Bucket} failed.`);
    }


}

/**
 * Copies website assets to the destination bucket
 * @param {string} sourceBucket - source bucket name
 * @param {string} sourceKey - source object directory
 * @param {string} sourceManifest - website manifest
 * @param {string} destinationBucket - destination bucket name
 */
const copyWebsite = async (sourceBucket: string, sourceKey: string, sourceManifest: string, destinationBucket: string): Promise<any> => {
    const s3 = new AWS.S3();
    let manifest: { files: string[] } = { files: [] };
    let retryCount = 3;

    // Gets manifest file
    for (let i = 1; i <= retryCount; i++) {
        try {
            LOGGER.info(`Getting manifest file... Try count: ${i}`);

            const params = {
                Bucket: sourceBucket,
                Key: `${sourceKey}/${sourceManifest}`
            };
            let manifestData = await s3.getObject(params).promise();
            manifest = JSON.parse(manifestData.Body.toString());

            LOGGER.info('Getting manifest file completed.');
            break;
        } catch (error) {
            // Retries 5 * i seconds later
            if (i === retryCount) {
                LOGGER.error('Error occurred while getting manifest file.', error);
                return Promise.reject(error);
            } else {
                LOGGER.info('Waiting for retry...');
                await sleep(i);
            }
        }
    }

    // Gets web console assets
    LOGGER.info(`Copying ${manifest.files.length} asset(s) from ${sourceBucket}/${sourceKey}/console to ${destinationBucket}...`);
    for (let filename of manifest.files) {
        for (let i = 1; i <= retryCount; i++) {
            try {
                LOGGER.info(`Copying ${filename}...`);
                let copyParams: AWS.S3.CopyObjectRequest = {
                    Bucket: destinationBucket,
                    CopySource: `${sourceBucket}/${sourceKey}/${filename}`,
                    Key: `${filename}`,
                    ContentType: getContentType(filename)
                };
                let result = await s3.copyObject(copyParams).promise();
                LOGGER.info(JSON.stringify(result.CopyObjectResult));

                break;
            } catch (error) {
                // Retries 5 * i seconds later
                if (i === retryCount) {
                    LOGGER.error('Error occurred while copying website assets.', error);
                    return Promise.reject(error);
                } else {
                    LOGGER.info('Waiting for retry...');
                    await sleep(i);
                }
            }
        }
    }
    LOGGER.info('Copying asset(s) completed.');

    return Promise.resolve({
        Message: 'Copying website assets completed.'
    });
};

