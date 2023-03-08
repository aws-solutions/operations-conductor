/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from "aws-sdk";
import {factory} from "../../logger";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

const LOGGER = factory.getLogger('custom-resource::lambda-edge');

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return await createLambdaEdge(resourceProps);
        case CustomResourceRequestType.UPDATE: return await updateLambdaEdge(resourceProps);
        case CustomResourceRequestType.DELETE: return noActionRequiredResponse
    }
}

async function createLambdaEdge(resourceProps: any) {
    LOGGER.info('Creating new Lambda Edge function in us-east-1')
    // Edge Lambda needs to be created in us-east-1.
    const lambda = new AWS.Lambda({ region: 'us-east-1' });
    const { FunctionName, Role, Code } = resourceProps;
    let functionArn = '';

    // Creates Edge Lambda
    try {
        let params: AWS.Lambda.CreateFunctionRequest = {
            Code,
            FunctionName,
            Role,
            Handler: 'index.handler',
            Runtime: 'nodejs16.x',
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

    return await publishLambdaEdge(lambda, functionArn)
}

async function updateLambdaEdge(resourceProps: any) {
    LOGGER.info('Updating Lambda Edge function in us-east-1')

    const lambda = new AWS.Lambda({ region: 'us-east-1' })
    const { FunctionName, Role, Code } = resourceProps;
    let functionArn = '';

    try {
        //update lambda function runtime from nodejs14 to nodejs16.
        let updateResult = await lambda.updateFunctionConfiguration({
            FunctionName: FunctionName,
            Runtime: 'nodejs16.x'
        }).promise()
        functionArn = updateResult.FunctionArn;

        LOGGER.info("Lambda function " + FunctionName + ", updated runtime successfully, response: "+ JSON.stringify(updateResult))
    } catch (error) {
        LOGGER.error('Lambda Edge update failed.', error);
        throw Error('Lambda Edge update failed.');
    }

    return await publishLambdaEdge(lambda, functionArn)
}

async function publishLambdaEdge(lambda: AWS.Lambda, functionArn: string) {
    try {
        let isFunctionStateActive = false
        let retry = 0
        let delayinMilliseconds = 5000
        while (!isFunctionStateActive) {
            let response = await lambda.getFunctionConfiguration({
                FunctionName: functionArn
            }).promise();
            LOGGER.debug(`Response from get function configuration ${JSON.stringify(response)}`)
            if((response.State === 'Active' && response.LastUpdateStatus === 'Successful') || retry > 10) {
                isFunctionStateActive = true
            } else {
                await waitForTime(delayinMilliseconds)
                retry++
                delayinMilliseconds += 5000;
            }
        }

        let params: AWS.Lambda.PublishVersionRequest = {
            FunctionName: functionArn
        };

        let result = await lambda.publishVersion(params).promise();

        return {
            FunctionArn: `${functionArn}:${result.Version}`
        };
    } catch (error) {
        LOGGER.error('Publishing Edge Lambda version failed.', error);
        throw Error('Publishing Edge Lambda version failed.');
    }
}

/** Function to add delay for waiting on process.
 * @param ms time in milliseconds
 */
const waitForTime = async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

