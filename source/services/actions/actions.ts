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

import * as AWS from 'aws-sdk';
import { factory } from '../logger';
import { CommonUtil } from '../common/util';
import { ErrorReturn } from '../common/interfaces';

// Logger
const LOGGER = factory.getLogger('actions.Action');

// Common util
const COMMON_UTIL = new CommonUtil();

/**
 * @interface ActionInfo
 */
interface ActionInfo {
    name: string;
    owner: string;
    description: string;
    parameters?: object[];
}

/**
 * Performs actions for any users
 * @class Action
 */
export class Action {
    // System Manager
    ssm: AWS.SSM;

    // Action document filter tag
    filterTagKey: string;
    filterTagValue: string;

    /**
     * @constructor
     */
    constructor() {
        this.ssm = new AWS.SSM();
        this.filterTagKey = process.env.FilterTagKey;
        this.filterTagValue = process.env.FilterTagValue;
    }

    /**
     * Gets actions - this filters AWS Systems Manager documents based on a tag provided during the launch
     */
    async getActions(): Promise<ActionInfo[] | ErrorReturn> {
        let nextToken = 'nextToken';

        try {
            let result = [];
            let params = {
                Filters: [
                    {
                        Key: `tag:${this.filterTagKey}`,
                        Values: [
                            this.filterTagValue
                        ]
                    }
                ]
            };
            while (nextToken) {
                let actions = await this.ssm.listDocuments(params).promise();
                let documentIdentifiers = actions.DocumentIdentifiers;

                for (let documentIdentifier of documentIdentifiers) {
                    let actionId = documentIdentifier.Name;
                    let action: ActionInfo | ErrorReturn = await this.getAction(actionId);
                    result.push({
                        name: actionId,
                        owner: (action as ActionInfo).owner,
                        description: (action as ActionInfo).description
                    });
                }
                nextToken = actions.NextToken;
                params['NextToken'] = nextToken;
            }

            return Promise.resolve(result);
        } catch (error) {
            LOGGER.error(`getActions Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetActionsFailure', 500, 'Error occurred while getting actions.', error)
            );
        }
    }

    /**
     * Gets an action
     * @param {string} actionId - an action ID
     */
    async getAction(actionId: string): Promise<ActionInfo | ErrorReturn> {
        const params = {
            Name: actionId
        };

        try {
            let action = await this.ssm.describeDocument(params).promise();
            let document = action.Document;

            return Promise.resolve({
                name: document.Name,
                owner: document.Owner,
                description: document.Description,
                parameters: document.Parameters
            });
        } catch (error) {
            LOGGER.error(`getAction Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetActionFailure', 500, 'Error occurred while getting an action.', error)
            );
        }
    }
}
