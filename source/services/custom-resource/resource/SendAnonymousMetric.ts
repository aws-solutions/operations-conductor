/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as moment from "moment/moment";
import {Metrics} from "../../metrics";
import {factory} from "../../logger";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

const LOGGER = factory.getLogger('custom-resource:anonymous-metric');

export default async function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    if(resourceProps.SendAnonymousUsageData === 'Yes') {
        return await sendAnonymousMetric(requestType, resourceProps)
    } else {
        return noActionRequiredResponse;
    }
}

async function sendAnonymousMetric(requestType: CustomResourceRequestType, resourceProps: any) {
    let metric = {
        Solution: resourceProps.SolutionId,
        Version: resourceProps.SolutionVersion,
        UUID: resourceProps.SolutionUuid,
        Timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.S'),
        Data: {
            EventType: metricEventTypeFromRequestType(requestType)
        }
    };

    const metrics = new Metrics();
    try {
        let data = await metrics.sendAnonymousMetric(metric);
        return {
            Message: data
        };
    } catch (error) {
        LOGGER.error('Sending anonymous metric failed.', error);
        throw Error('Sending anonymous launch metric failed.');
    }
}

function metricEventTypeFromRequestType(requestType: CustomResourceRequestType) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return 'SolutionLaunched'
        case CustomResourceRequestType.UPDATE: return 'SolutionUpdated'
        case CustomResourceRequestType.DELETE: return 'SolutionDeleted'
    }
}