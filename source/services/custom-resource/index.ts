/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Callback } from 'aws-lambda';
import * as url from 'url';
import * as requestPromise from 'request-promise';
import { factory } from '../logger';
import CopyWebsite from "./resource/CopyWebsite";
import PutWebsiteConfig from "./resource/PutWebsiteConfig";
import CreateDocuments from "./resource/CreateDocuments";
import UploadCloudFormationTemplates from "./resource/UploadCloudFormationTemplates";
import CreateLambdaEdge from "./resource/CreateLambdaEdge";
import CreateUserPoolClient from "./resource/CreateUserPoolClient";
import DeletePoolClient from "./resource/DeletePoolClient";
import CreateUuid from "./resource/CreateUuid";
import SendAnonymousMetric from "./resource/SendAnonymousMetric";


// Logger
const LOGGER = factory.getLogger('custom-resource');

export const handler = async (event: any, context: Context, callback: Callback) => {
    LOGGER.info(`Received event: ${JSON.stringify(event, null, 2)}`);

    let responseData: any = {
        Data: 'No action is needed.'
    };
    const requestType = event.RequestType;
    const resourceProps = event.ResourceProperties;

    try {
        switch (event.ResourceType) {
            case 'Custom::CopyWebsite': {
                responseData = await CopyWebsite(requestType, resourceProps);
                break;
            }
            case 'Custom::PutWebsiteConfig': {
                responseData = await PutWebsiteConfig(requestType, resourceProps);
                break;
            }
            case 'Custom::CreateDocuments': {
                responseData = await CreateDocuments(requestType, resourceProps);
                break;
            }
            case 'Custom::UploadCloudFormationTemplates': {
                responseData = await UploadCloudFormationTemplates(requestType, resourceProps);
                break;
            }
            case 'Custom::CreateLambdaEdge': {
                responseData = await CreateLambdaEdge(requestType, resourceProps);
                break;
            }
            case 'Custom::CreateUserPoolClient': {
                responseData = await CreateUserPoolClient(requestType, resourceProps);
                break;
            }
            case 'Custom::DeletePoolClient': {
                responseData = await DeletePoolClient(requestType, resourceProps);
                break;
            }
            case 'Custom::CreateUuid': {
                responseData = await CreateUuid(requestType, resourceProps);
                break;
            }
            case 'Custom::SendAnonymousMetric': {
                responseData = await SendAnonymousMetric(requestType, resourceProps);
                break;
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