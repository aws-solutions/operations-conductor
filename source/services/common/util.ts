/*****************************************************************************
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.        *
 *                                                                           *
 * Licensed under the Apache License, Version 2.0 (the "License").           *
 * You may not use this file except in compliance with the License.          *
 * A copy of the License is located at                                       *
 *                                                                           *
 *     http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                           *
 *  Unless required by applicable law or agreed to in writing, software      *
 *  distributed under the License is distributed on an "AS IS" BASIS,        *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 *  See the License for the specific language governing permissions and      *
 *  limitations under the License.                                           *
 ****************************************************************************/

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