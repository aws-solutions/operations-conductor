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

import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { factory } from '../../logger';

// Logger
const LOGGER = factory.getLogger('custom-resource.SSM');

export class SSM {
    // System Manager
    ssm: AWS.SSM;

    // Stack Name
    stackName: string;

    // Filter Tag
    filterTagKey: string;
    filterTagValue: string;

    // Sleep Second
    sleepSecond: number;

    /**
     * @constructor
     * @param {string} stackName - the CloudFormation stack name
     * @param {number} sleepSecond - sleep second between jobs
     * @param {string} filterTagKey - AWS Sysmtes Manager document tag key
     * @param {string} filterTagValue - AWS Sysmtes Manager document tag value
     */
    constructor(stackName: string, sleepSecond: number, filterTagKey?: string, filterTagValue?: string, ) {
        this.ssm = new AWS.SSM();
        this.stackName = stackName;
        this.filterTagKey = filterTagKey;
        this.filterTagValue = filterTagValue;
        this.sleepSecond = sleepSecond;
    }

    /**
     * Creates documents
     * @param {string} mainDirectory - main directory to get SSM documents
     */
    async createDocuments(mainDirectory: string, properties: any = {}): Promise<any> {
        try {
            // Gets document directories
            let directories: string[] = this.getDocumentDirectories(mainDirectory);
            LOGGER.info(`Creating ${directories.length} document(s)...`);

            // Creates documents
            for (let directory of directories) {
                // Sleeps for a while to prevent throttling
                await this.sleep(this.sleepSecond);

                LOGGER.info(`Processing directory '${directory}'...`);

                let document = fs.readFileSync(`${directory}/automation_document.yaml`, 'utf8');
                let documentName = directory.replace(mainDirectory, '');

                if (properties) {
                    // Replace placeholder values in automation document with
                    // values passed to this function as properties
                    Object.keys(properties).forEach(key => {
                        if (Object.prototype.hasOwnProperty.call(properties, key)) {
                            document = document.replace(new RegExp(`%%${key}%%`, 'g'), properties[key]);
                        }
                    });
                }

                let params = {
                    Name: `${this.stackName}-${documentName}`,
                    Content: document,
                    DocumentFormat: 'YAML',
                    DocumentType: 'Automation',
                    Tags: [
                        {
                            Key: this.filterTagKey,
                            Value: this.filterTagValue
                        }
                    ]
                };

                let result = await this.ssm.createDocument(params).promise();
                LOGGER.info(`Creating document: ${result.DocumentDescription.Name} - ${result.DocumentDescription.Status}`);
            }

            return Promise.resolve(`Create ${directories.length} document(s) successful`);
        } catch (error) {
            LOGGER.error(`Error occurred while creating documents.`, error);
            return Promise.reject(error);
        }
    }

    /**
     * Deletes SSM documents created by Operations Conductor
     * @param {string} mainDirectory - main directory to get SSM documents
     */
    async deleteDocuments(mainDirectory: string): Promise<any> {
        try {
            // Gets document directories
            let directories: string[] = this.getDocumentDirectories(mainDirectory);
            LOGGER.info(`Deleting ${directories.length} document(s)...`);

            // Deletes documents
            for (let directory of directories) {
                // Sleeps for a while to prevent throttling
                await this.sleep(this.sleepSecond);

                let documentName = directory.replace(mainDirectory, '');
                LOGGER.info(`Processing document '${documentName}'...`);
                let params = {
                    Name: `${this.stackName}-${documentName}`
                };
                await this.ssm.deleteDocument(params).promise();
            }

            return Promise.resolve(`Delete ${directories.length} document(s) successful`);
        } catch (error) {
            LOGGER.error(`Error occurred while deleting documents.`, error);
            return Promise.reject(error);
        }
    }

    /**
     * Gets SSM documents directories
     * @param {string} mainDirectory - main directory to get SSM documents
     */
    getDocumentDirectories(mainDirectory: string): string[] {
        try {
            return fs.readdirSync(mainDirectory)
                .map((file: string) => path.join(mainDirectory, file))
                .filter((file: string) => fs.lstatSync(file).isDirectory());
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * Sleeps for a while
     * @param {number} second - the second to sleep
     */
    sleep(second: number) {
        return new Promise(resolve => setTimeout(resolve, 1000 * second));
    }
}