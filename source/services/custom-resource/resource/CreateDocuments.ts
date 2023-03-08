/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {SSM} from "../ssm";
import {CustomResourceRequestType} from "../CustomResourceRequests";

const SSM_SLEEP_SECOND = 3;
const SSM_DOCUMENTS_DIR = 'custom-resource/ssm/'

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return await createSsmDocuments(resourceProps);
        case CustomResourceRequestType.UPDATE: return await updateSsmDocuments(resourceProps);
        case CustomResourceRequestType.DELETE: return await deleteSsmDocuments(resourceProps);

    }
}

async function createSsmDocuments(resourceProps: any) {
    const { StackName, FilterTagKey, FilterTagValue } = resourceProps;
    const ssm = new SSM(StackName, SSM_SLEEP_SECOND, FilterTagKey, FilterTagValue);
    let result = await ssm.createDocuments(SSM_DOCUMENTS_DIR, resourceProps);

    return {
        Message: result
    };
}

async function deleteSsmDocuments(resourceProps: any) {
    const { StackName } = resourceProps;
    const ssm = new SSM(StackName, SSM_SLEEP_SECOND);
    let result = await ssm.deleteDocuments(SSM_DOCUMENTS_DIR);

    return {
        Message: result
    };
}

async function updateSsmDocuments(resourceProps:any) {
    const { StackName } = resourceProps;
    const ssm = new SSM(StackName, SSM_SLEEP_SECOND);
    await ssm.deleteDocuments(SSM_DOCUMENTS_DIR);
    const { StackNameNew, FilterTagKey, FilterTagValue } = resourceProps;
    const ssmToCreate = new SSM(StackNameNew, SSM_SLEEP_SECOND, FilterTagKey, FilterTagValue);
    let createAgainResponse = await ssmToCreate.createDocuments(SSM_DOCUMENTS_DIR, resourceProps);

    return {
        Message: createAgainResponse
    };
}
