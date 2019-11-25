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