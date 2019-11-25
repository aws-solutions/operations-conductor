/************************************************************************************
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.          *
 *                                                                                  *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of  *
 * this software and associated documentation files (the "Software"), to deal in    *
 * the Software without restriction, including without limitation the rights to     *
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of *
 * the Software, and to permit persons to whom the Software is furnished to do so.  *
 *                                                                                  *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR       *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS *
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR   *
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER   *
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN          *
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.       *
 ***********************************************************************************/

import { Context, Callback } from 'aws-lambda';
import * as url from 'url';
import * as requestPromise from 'request-promise';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';
import * as moment from 'moment';
import { factory } from '../logger';
import { Metrics } from '../metrics';
import { SSM } from './ssm';

// Web configuration
const webConfig = `'use strict';
const aws_exports = {
    "aws_project_region": "REGION",
    "aws_user_pools_id": "USER_POOLS_ID",
    "aws_user_pools_web_client_id": "USER_POOLS_WEB_CLIENT_ID",
    "oauth": {},
    "aws_cloud_logic_custom": [
        {
            "name": "operations-conductor-api",
            "endpoint": "API_ENDPOINT",
            "region": "REGION"
        }
    ]
};`;

// Logger
const LOGGER = factory.getLogger('custom-resource');

// SSM Sleep second
const SSM_SLEEP_SECOND = 3;

export const handler = async (event: any, context: Context, callback: Callback) => {
    LOGGER.info(`Received event: ${JSON.stringify(event, null, 2)}`);

    let responseData: any = {
        Data: 'No action is needed.'
    };
    const properties = event.ResourceProperties;

    try {
        if (event.ResourceType === 'Custom::CopyWebsite') {
            if (event.RequestType === 'Create') {
                const { SourceS3Bucket, SourceS3Key, SourceManifest, DestinationS3Bucket } = properties;
                try {
                    responseData = await copyWebsite(SourceS3Bucket, SourceS3Key, SourceManifest, DestinationS3Bucket);
                } catch (error) {
                    LOGGER.error(`Copying website assets from ${SourceS3Bucket} to ${DestinationS3Bucket} failed.`, error);
                    throw Error(`Copying website assets from ${SourceS3Bucket} to ${DestinationS3Bucket} failed.`);
                }
            }
        } else if (event.ResourceType === 'Custom::PutWebsiteConfig') {
            if (event.RequestType === 'Create') {
                const { Region, S3Bucket, S3Key, ConfigItem } = properties;
                try {
                    let configFile = webConfig.replace(/REGION/g, Region)
                        .replace('USER_POOLS_ID', ConfigItem.UserPoolsId)
                        .replace('USER_POOLS_WEB_CLIENT_ID', ConfigItem.UserPoolsWebClientId)
                        .replace('API_ENDPOINT', ConfigItem.Endpoint);

                    responseData = await putObject(S3Bucket, configFile, S3Key);
                } catch (error) {
                    LOGGER.error(`Putting website config to ${S3Bucket} failed.`, error);
                    throw Error(`Putting website config to ${S3Bucket} failed.`);
                }
            }
        } else if (event.ResourceType === 'Custom::CreateDocuments') {
            if (event.RequestType === 'Create') {
                const { StackName, FilterTagKey, FilterTagValue } = properties;
                const ssm = new SSM(StackName, SSM_SLEEP_SECOND, FilterTagKey, FilterTagValue);
                let result = await ssm.createDocuments('custom-resource/ssm/', properties);

                responseData = {
                    Message: result
                };
            } else if (event.RequestType === 'Delete') {
                const { StackName } = properties;
                const ssm = new SSM(StackName, SSM_SLEEP_SECOND);
                let result = await ssm.deleteDocuments('custom-resource/ssm/');

                responseData = {
                    Message: result
                };
            }
        } else if (event.ResourceType === 'Custom::UploadCloudFormationTemplates') {
            if (event.RequestType === 'Create') {
                const { StackName, MasterAccount, CloudFormationBucket,
                    ResourceSelectorExecutionRoleArn, DocumentRoleArns, SolutionVersion } = properties;
                try {
                    // Gets document directories except Automation-Shared
                    let mainDirectory = 'custom-resource/ssm/';
                    let directories: string[] = fs.readdirSync(mainDirectory)
                        .map((file: string) => path.join(mainDirectory, file))
                        .filter((file: string) => fs.lstatSync(file).isDirectory());

                    LOGGER.info(`Uploading ${directories.length} CloudFormation template(s)...`);
                    for (let directory of directories) {
                        LOGGER.info(`Processing directory '${directory}'...`);

                        let template = fs.readFileSync(`${directory}/cloudformation.template`, 'utf8');
                        let actionName = directory.replace(mainDirectory, '');
                        template = template.replace('%%RESOURCE_SELECTOR_EXECUTION_ROLE_ARN%%', ResourceSelectorExecutionRoleArn)
                            .replace('%%MASTER_ACCOUNT%%', MasterAccount)
                            .replace('%%VERSION%%', SolutionVersion);

                        for (let key in DocumentRoleArns) {
                            template = template.replace(`%%${key}%%`, DocumentRoleArns[key]);
                        }

                        // Upload to S3
                        let retryCount = 3;
                        for (let i = 1; i < retryCount; i++) {
                            try {
                                let result = await putObject(CloudFormationBucket, template, `${StackName}-${actionName}/cloudformation.template`, true);
                                LOGGER.info(JSON.stringify(result));
                                break;
                            } catch (error) {
                                // Retries 5 * i seconds later
                                if (i === retryCount) {
                                    LOGGER.error('Error occurred while uploading CloudFormation template.', error);
                                    return Promise.reject(error);
                                } else {
                                    LOGGER.info('Waiting for retry...');
                                    await sleep(i);
                                }
                            }
                        }

                    }
                } catch (error) {
                    LOGGER.error(`Uploading CloudFormation templates to ${CloudFormationBucket} failed.`, error);
                    throw Error(`Uploading CloudFormation templates to ${CloudFormationBucket} failed.`);
                }
            }
        } else if (event.ResourceType === 'Custom::CreateLambdaEdge') {
            if (event.RequestType === 'Create') {
                // Edge Lambda needs to be created in us-east-1.
                const lambda = new AWS.Lambda({ region: 'us-east-1' });
                const { FunctionName, Role, Code } = properties;
                let functionArn = '';

                // Creates Edge Lambda
                try {
                    let params: AWS.Lambda.CreateFunctionRequest = {
                        Code,
                        FunctionName,
                        Role,
                        Handler: 'index.handler',
                        Runtime: 'nodejs10.x',
                        Description: 'Operations Conductor Lambda Edge function',
                        MemorySize: 128,
                        Timeout: 15
                    };
                    let result = await lambda.createFunction(params).promise();
                    functionArn = result.FunctionArn;
                } catch (error) {
                    LOGGER.error('Creating Edge Lambda failed.', error);
                    throw Error('Creating Edge Lambda failed.');
                }

                // Publishes Edge Lambda version
                try {
                    let params: AWS.Lambda.PublishVersionRequest = {
                        FunctionName: functionArn
                    };
                    let result = await lambda.publishVersion(params).promise();
                    responseData = {
                        FunctionArn: `${functionArn}:${result.Version}`
                    };
                } catch (error) {
                    LOGGER.error('Publishing Edge Lambda version failed.', error);
                    throw Error('Publishing Edge Lambda version failed.');
                }
            }
        } else if (event.ResourceType === 'Custom::CreateUserPoolClient') {
            if (event.RequestType === 'Create') {
                let { ClientName, UserPoolId, RefreshTokenValidity, GenerateSecret, PreventUserExistenceErrors } = properties;
                RefreshTokenValidity = parseInt(RefreshTokenValidity);
                GenerateSecret = GenerateSecret === 'true';
                const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
                const params: AWS.CognitoIdentityServiceProvider.CreateUserPoolClientRequest = {
                    ClientName,
                    UserPoolId,
                    RefreshTokenValidity,
                    GenerateSecret,
                    PreventUserExistenceErrors
                };

                let result = await cognitoIdentityServiceProvider.createUserPoolClient(params).promise();
                responseData = {
                    ClientId: result.UserPoolClient.ClientId
                }
            }
        } else if (event.ResourceType === 'Custom::DeletePoolClient') {
            if (event.RequestType === 'Delete') {
                const { ClientId, UserPoolId } = properties;
                const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
                const params: AWS.CognitoIdentityServiceProvider.DeleteUserPoolClientRequest = {
                    ClientId,
                    UserPoolId
                };

                await cognitoIdentityServiceProvider.deleteUserPoolClient(params).promise();
                responseData = {
                    Message: 'UserPool client deleted'
                }
            }
        } else if (event.ResourceType === 'Custom::CreateUuid') {
            if (event.RequestType === 'Create') {
                responseData = {
                    UUID: uuid.v4()
                };
            }
        } else if (event.ResourceType === 'Custom::SendAnonymousMetric') {
            if (properties.SendAnonymousUsageData === 'Yes') {
                let eventType = '';
                if (event.RequestType === 'Create') {
                    eventType = 'SolutionLaunched';
                } else if (event.RequestType === 'Delete') {
                    eventType = 'SolutionDeleted';
                }

                let metric = {
                    Solution: properties.SolutionId,
                    Version: properties.SolutionVersion,
                    UUID: properties.SolutionUuid,
                    Timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.S'),
                    Data: {
                        EventType: eventType
                    }
                };

                const metrics = new Metrics();
                try {
                    let data = await metrics.sendAnonymousMetric(metric);
                    responseData = {
                        Message: data
                    };
                } catch (error) {
                    LOGGER.error('Sending anonymous metric failed.', error);
                    throw Error('Sending anonymous launch metric failed.');
                }
            }
        }
        await sendResponse(event, callback, context.logStreamName, 'SUCCESS', responseData);
    } catch (error) {
        LOGGER.error(`Error occurred while ${event.RequestType}::${event.ResourceType}`, error);
        responseData = {
            Error: error.message
        };
        await sendResponse(event, callback, context.logStreamName, 'FAILED', responseData);
    }
};

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

/**
 * Sleeps for 5 * retry seconds
 * @param {number} retry - the number of retry
 */
const sleep = (retry: number) => {
    return new Promise(resolve => setTimeout(resolve, 5000 * retry));
}

/**
 * Gets content type based on file extension
 * @param {string} filename - filename
 */
const getContentType = (filename: string): string => {
    let contentType = '';
    if (filename.endsWith('.html')) {
        contentType = 'text/html';
    } else if (filename.endsWith('.css')) {
        contentType = 'text/css';
    } else if (filename.endsWith('.png')) {
        contentType = 'image/png';
    } else if (filename.endsWith('.svg')) {
        contentType = 'image/svg+xml';
    } else if (filename.endsWith('.jpg')) {
        contentType = 'image/jpeg';
    } else if (filename.endsWith('.js')) {
        contentType = 'application/javascript';
    } else {
        contentType = 'binary/octet-stream';
    }
    return contentType;
};

/**
 * Puts an object into S3 bucket
 * @param {string} bucket - bucket name to put an object
 * @param {Buffer|string} fileData - object body
 * @param {string} filename - object name
 * @param {boolean} isEncrypted - choose to encrypt the object
 */
const putObject = async (bucket: string, fileData: Buffer|string, filename: string, isEncrypted?: boolean): Promise<any> => {
    const s3 = new AWS.S3();
    let params: AWS.S3.PutObjectRequest = {
        Bucket: bucket,
        Body: fileData,
        Key: filename,
        ContentType: getContentType(filename)
    };

    if (isEncrypted) {
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
};

/**
 * Sends a response to the pre-signed S3 URL
 * @param {any} event - Custom Resource event
 * @param {Function} callback - callback function
 * @param {string} logStreamName - CloudWatch logs stream
 * @param {string} responseStatus - response status
 * @param {any} responseData - response data
 */
const sendResponse = async (event: any, callback: Function, logStreamName: string, responseStatus: string, responseData: any) => {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: `${JSON.stringify(responseData)}`,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    LOGGER.info(`RESPONSE BODY:\n ${responseBody}`);
    let responseUrl = '';
    if (event.ResponseURL.indexOf('https') > -1) {
        responseUrl = event.ResponseURL;
    } else {
        const parsedUrl = url.parse(event.ResponseURL);
        responseUrl = `https://${parsedUrl.hostname}${parsedUrl.path}`;
    }
    const options = {
        uri: responseUrl,
        port: 443,
        method: 'PUT',
        headers: {
            'Contet-Type' :'',
            'Content-Length': responseBody.length
        },
        body: responseBody
    };

    try {
        await requestPromise(options);
        LOGGER.info('Successfully sent stack response!');
        callback(null, 'Successfully sent stack response!');
    } catch (error) {
        LOGGER.error('Custom resource sendResponse error', error);
        callback(error);
    }
};