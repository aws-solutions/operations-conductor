/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AWS from "aws-sdk";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return noActionRequiredResponse
        case CustomResourceRequestType.UPDATE: return noActionRequiredResponse
        case CustomResourceRequestType.DELETE: return await deleteClient(resourceProps)
    }
}

async function deleteClient(resourceProps: any) {
    const { ClientId, UserPoolId } = resourceProps;
    const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
    const params: AWS.CognitoIdentityServiceProvider.DeleteUserPoolClientRequest = {
        ClientId,
        UserPoolId
    };

    await cognitoIdentityServiceProvider.deleteUserPoolClient(params).promise();

    return  {
        Message: 'UserPool client deleted'
    }
}