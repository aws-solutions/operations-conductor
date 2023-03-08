/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

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