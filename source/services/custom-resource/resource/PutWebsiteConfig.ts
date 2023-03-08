/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {factory} from "../../logger";
import {putObject} from "../utils";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

const LOGGER = factory.getLogger('custom-resource:put-website-config');

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return await putWebsiteConfig(resourceProps)
        case CustomResourceRequestType.UPDATE: return await putWebsiteConfig(resourceProps)
        case CustomResourceRequestType.DELETE: return noActionRequiredResponse
    }
}

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

async function putWebsiteConfig(resourceProps: any) {
    const { Region, S3Bucket, S3Key, ConfigItem } = resourceProps;
    try {
        let configFile = webConfig.replace(/REGION/g, Region)
            .replace('USER_POOLS_ID', ConfigItem.UserPoolsId)
            .replace('USER_POOLS_WEB_CLIENT_ID', ConfigItem.UserPoolsWebClientId)
            .replace('API_ENDPOINT', ConfigItem.Endpoint);

        return await putObject(S3Bucket, configFile, S3Key);
    } catch (error) {
        LOGGER.error(`Putting website config to ${S3Bucket} failed.`, error);
        throw Error(`Putting website config to ${S3Bucket} failed.`);
    }
}