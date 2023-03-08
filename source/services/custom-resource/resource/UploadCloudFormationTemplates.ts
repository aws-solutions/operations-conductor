/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {putObject, sleep} from "../utils";
import {factory} from "../../logger";
import * as fs from "fs";
import * as path from "path";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

const LOGGER = factory.getLogger('custom-resource:cloud-formation-templates');

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return await uploadCloudFormationTemplates(resourceProps)
        case CustomResourceRequestType.UPDATE: return await uploadCloudFormationTemplates(resourceProps)
        case CustomResourceRequestType.DELETE: return noActionRequiredResponse
    }
}

async function uploadCloudFormationTemplates(resourceProps: any) {
    const { StackName, MasterAccount, CloudFormationBucket,
        ResourceSelectorExecutionRoleArn, DocumentRoleArns, SolutionVersion } = resourceProps;


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

