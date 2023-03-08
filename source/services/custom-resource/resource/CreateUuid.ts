/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as uuid from "uuid";
import {CustomResourceRequestType, noActionRequiredResponse} from "../CustomResourceRequests";

export default function handleRequest(requestType: CustomResourceRequestType, resourceProps: any) {
    switch (requestType) {
        case CustomResourceRequestType.CREATE: return createUUID()
        case CustomResourceRequestType.UPDATE: return noActionRequiredResponse
        case CustomResourceRequestType.DELETE: return noActionRequiredResponse
    }
}

function createUUID() {
    return {
        UUID: uuid.v4()
    };
}