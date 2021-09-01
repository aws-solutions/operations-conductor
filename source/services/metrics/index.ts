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

import * as requestPromise from 'request-promise';
import { factory } from '../logger';

/**
 * Performs to send metrics
 * @class Metrics
 */
export class Metrics {
    // Logger
    logger: any;

    // Metric endpoint
    endpoint: string;

    /**
     * @constructor
     */
    constructor() {
        this.logger = factory.getLogger('resources.Metrics');
        this.endpoint = 'https://metrics.awssolutionsbuilder.com';
    }

    /**
     * Sends anonymous metric
     * @param {object} metric - metric JSON data
     */
    async sendAnonymousMetric(metric: object): Promise<any> {
        const options = {
            uri: `${this.endpoint}/generic`,
            port: 443,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': JSON.stringify(metric).length
            },
            body: JSON.stringify(metric)
        };

        try {
            await requestPromise(options);
            return Promise.resolve(`Metric sent: ${JSON.stringify(metric)}`);
        } catch (error) {
            this.logger.error(`Error occurred while sending metric: ${JSON.stringify(metric)}`, error);
            return Promise.reject(`Error occurred while sending metric: ${JSON.stringify(metric)}`);
        }
    }
}