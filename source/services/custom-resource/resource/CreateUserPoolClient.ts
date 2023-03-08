/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from "aws-sdk";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return await createClient(resourceProps)
        case CustomResourceRequestType.UPDATE: return noActionRequiredResponse
        case CustomResourceRequestType.DELETE: return noActionRequiredResponse
    }
}

async function createClient(resourceProps: any) {
    let { ClientName, UserPoolId, RefreshTokenValidity, GenerateSecret, PreventUserExistenceErrors } = resourceProps;
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

    return {
        ClientId: result.UserPoolClient.ClientId
    }
}