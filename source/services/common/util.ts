/************************************************************************************
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.          *
 *                                                                                  *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of  *
 * this software and associated documentation files (the "Software"), to deal in    *
 * the Software without restriction, including without limitation the rights to     *
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of *
 * the Software, and to permit persons to whom the Software is furnished to do so.  *
 *                                                                                  *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR       *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS *
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR   *
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER   *
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN          *
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.       *
 ***********************************************************************************/

import * as moment from 'moment';
import { ErrorReturn, MetricInfo } from './interfaces';
import { factory } from '../logger';
import { Metrics } from '../metrics';

// Logger
const LOGGER = factory.getLogger('common.CommonUtil');

/**
 * Util class for common usage
 * @class CommonUtil
 */
export class CommonUtil {
    /**
     * Checks if string values are not empty nor undefined
     * @param {string[]} values - string array
     */
    isStringValuesValid(values: string[]): boolean {
        for (let value of values) {
            if (value === undefined) {
                return false;
            }

            if (typeof(value) !== 'string') {
                return false;
            }

            value = value.trim();
            if (value === null || value === '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Checks if object is empty
     * @param {object} object - object to check emptiness
     */
    isObjectEmpty(object: object): boolean {
        for (let _key in object) {
            return false;
        }
        return true;
    }

    /**
     * Gets an error object
     * @param {string} code - error code
     * @param {number} statusCode - error status code
     * @param {string} message - error message
     * @param {any} error - (Optional) if error is provided, error would be returned
     */
    getErrorObject(code: string, statusCode: number, message: string, error?: any): ErrorReturn {
        if (error !== undefined) {
            return {
                code: code,
                statusCode: error.statusCode !== undefined ? error.statusCode : statusCode,
                message: error.message !== undefined ? error.message : message
            };
        } else {
            return {
                code: code,
                statusCode: statusCode,
                message: message
            };
        }
    }

    /**
     * Sends anonymous metric
     * @param {string} solutionId - unique solution ID
     * @param {string} solutionVersion - solution version
     * @param {string} solutionUuid - uniquely launched solution UUID
     * @param {string} eventType - event type
     * @param {object} eventData - event data
     */
    async sendAnonymousMetric(solutionId: string, solutionVersion: string, solutionUuid: string, eventType: string, eventData?: object) {
        const metrics = new Metrics();
        let metric: MetricInfo = {
            Solution: solutionId,
            Version: solutionVersion,
            UUID: solutionUuid,
            TimeStamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.S'),
            Data: {
                EventType: eventType
            }
        };

        if (eventData) {
            metric.Data.EventData = eventData;
        }

        try {
            LOGGER.info(`Sending anonymous metric: ${JSON.stringify(metric)}`);
            let data = await metrics.sendAnonymousMetric(metric);
            LOGGER.info(`Metric send: ${data}`);
        } catch (error) {
            LOGGER.error(`Sending anonymous metric failed: ${JSON.stringify(metric)}`, error);
        }
    }

    /**
     * Trims strings in array
     * @param {string[]} strings 
     */
    trimStringInArray(strs: string[]): string[] {
        for (let i = 0, length = strs.length; i < length; i++) {
            strs[i] = strs[i].trimLeft().trimRight();
        }
        return strs;
    }
}