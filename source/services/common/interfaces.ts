/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The interface of error return
 * @interface ErrorReturn
 */
export interface ErrorReturn {
    code: string;
    statusCode: number;
    message: string;
}

/**
 * @interface MetricInfo
 */
export interface MetricInfo {
    Solution: string;
    Version: string;
    UUID: string;
    TimeStamp: string;
    Data: {
        EventType: string;
        EventData?: object;
    }
}