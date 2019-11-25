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

import * as fs from 'fs';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AttributeMap } from 'aws-sdk/clients/dynamodb';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import { factory } from '../logger';
import { Metrics } from '../metrics';
import { CommonUtil } from '../common/util';
import { ErrorReturn } from '../common/interfaces';

// Logger
const LOGGER = factory.getLogger('tasks.Task');

// Common util
const COMMON_UTIL = new CommonUtil();

/**
 * @interface TaskInfo
 */
interface TaskInfo {
    name: string;
    description: string;
    targetTag: string;
    taskParameters: TaskParameter[];
    accounts: string;
    regions: string;
    actionName: string;
    triggerType: TriggerType;
    scheduledType?: ScheduledType;
    scheduledFixedRateInterval?: string;
    scheduledFixedRateType?: ScheduledFixedRateType;
    scheduledCronExpression?: string;
    eventPattern?: string;
    enabled: boolean;
}

/**
 * @interface TaskParameter
 */
interface TaskParameter {
    Name: string;
    Type: string;
    Description: string;
    Value?: string;
    DefaultValue?: string;
}

/**
 * @interface TaskReturn
 */
interface TaskReturn {
    taskId: string;
    name: string;
    description: string;
    targetTag?: string;
    taskParameters?: TaskParameter[];
    accounts?: string[];
    regions?: string[];
    actionName?: string;
    triggerType?: TriggerType;
    scheduledType?: ScheduledType;
    scheduledFixedRateInterval?: number;
    scheduledFixedRateType?: ScheduledFixedRateType;
    scheduledCronExpression?: string;
    eventPattern?: string;
    enabled?: boolean;
    templateUrl?: string;
}

/**
 * @enum TriggerType
 */
enum TriggerType {
    Schedule = 'Schedule',
    Event = 'Event'
}

/**
 * @enum ScheduledType
 */
enum ScheduledType {
    CronExpression = 'CronExpression',
    FixedRate = 'FixedRate'
}

/**
 * @enum ScheduledFixedRateType
 */
enum ScheduledFixedRateType {
    minute = 'minute',
    minutes = 'minutes',
    hour = 'hour',
    hours = 'hours',
    day = 'day',
    days = 'days'
}

/**
 * @enum SortType
 */
enum SortType {
    asc = 'ASC',
    desc = 'DESC'
}

/**
 * Performs task actions for any users
 * @class Task
 */
export class Task {
    // DynamoDB
    documentClient: DocumentClient;
    tasksTable: string;
    taskExecutionsTable: string;
    automationExecutionsTable: string;

    // CloudWatch Events
    cloudWatchEvents: AWS.CloudWatchEvents;
    resourceSelectorLambdaArn: string;

    // Systems Manager
    ssm: AWS.SSM;

    // Lambda
    lambda: AWS.Lambda;

    // S3
    s3: AWS.S3;
    documentAssumeRole: string;
    cloudFormationBucket: string;

    // SNS
    sns: AWS.SNS;

    // KMS
    kms: AWS.KMS;

    // EC2
    ec2: AWS.EC2;

    // Anonymous Metrics Properties
    metrics: Metrics;
    sendAnonymousUsageData: string;
    solutionId: string;
    solutionVersion: string;
    solutionUuid: string;

    // Others
    accountId: string;
    masterSnsArn: string;
    masterKmsArn: string;
    region: string;

    /**
     * @constructor
     */
    constructor() {
        this.documentClient = new DocumentClient({ convertEmptyValues: true });
        this.tasksTable = process.env.TasksTable;
        this.taskExecutionsTable = process.env.TaskExecutionsTable;
        this.automationExecutionsTable = process.env.AutomationExecutionsTable;

        this.cloudWatchEvents = new AWS.CloudWatchEvents();
        this.resourceSelectorLambdaArn = process.env.ResourceSelectorLambdaArn;

        this.ssm = new AWS.SSM();

        this.lambda = new AWS.Lambda();

        this.s3 = new AWS.S3();
        this.cloudFormationBucket = process.env.CloudFormationBucket;

        this.sns = new AWS.SNS();
        this.kms = new AWS.KMS();

        this.metrics = new Metrics();
        this.sendAnonymousUsageData = process.env.SendAnonymousUsageData;
        this.solutionId =  process.env.SolutionId;
        this.solutionVersion =  process.env.SolutionVersion;
        this.solutionUuid =  process.env.SolutionUuid;

        this.accountId = process.env.AccountId;
        this.masterSnsArn = process.env.MasterSnsArn;
        this.masterKmsArn = process.env.MasterKmsArn;
        this.region = process.env.Region;
    }

    /**
     * Gets tasks
     */
    async getTasks(): Promise<TaskReturn[] | ErrorReturn> {
        const params: DocumentClient.ScanInput = {
            TableName: this.tasksTable
        };

        try {
            let tasks: TaskReturn[] = [];
            let data = await this.documentClient.scan(params).promise();
            for (let task of data.Items) {
                let taskReturn: TaskReturn = {
                    taskId: task.taskId,
                    name: task.name,
                    description: task.description
                };
                tasks.push(taskReturn);
            }

            return Promise.resolve(tasks);
        } catch (error) {
            LOGGER.error(`getTasks Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetTasksFailure', 500, 'Error occurred while getting tasks.', error)
            );
        }
    }

    /**
     * Get a task
     * @param {string} taskId - task ID to get
     */
    async getTask(taskId: string): Promise<AttributeMap | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([taskId])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetTaskFailure', 400, 'Task ID cannot be empty.')
            );
        }

        const params: DocumentClient.GetItemInput = {
            TableName: this.tasksTable,
            Key: {
                taskId
            }
        };

        try {
            let data = await this.documentClient.get(params).promise();
            if (COMMON_UTIL.isObjectEmpty(data)) {
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('GetTaskFailure', 404, 'Task not found.')
                );
            }

            return Promise.resolve(data.Item);
        } catch (error) {
            LOGGER.error(`getTask Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetTaskFailure', 500, 'Error occurred while getting a task.', error)
            );
        }
    }

    /**
     * Creates a task
     * @param {TaskInfo} task - task definition to create
     */
    async createTask(task: TaskInfo): Promise<TaskReturn | ErrorReturn> {
        let requiredFields = [
            task.name,
            task.targetTag,
            task.accounts,
            task.regions,
            task.actionName,
            task.triggerType
        ];

        // Checks if the fields are empty
        if (!COMMON_UTIL.isStringValuesValid(requiredFields)) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('CreateTaskFailure', 400, 'Required values cannot be empty.')
            );
        }

        try {
            // Builds a task DynamoDB item and validates parameters
            let item = await this.buildTaskItem(task);

            // Puts a CloudWatch event rule
            // buildTaskItem is going to validate the values, so no more validation is needed.
            await this.putCloudWatchEventRule(item);

            // Generate CloudFormation Template for cross accounts and regions
            let templateUrl = await this.generateCloudFormationTemplate(item);
            item['templateUrl'] = templateUrl;

            const params: DocumentClient.PutItemInput = {
                TableName: this.tasksTable,
                Item: item
            };

            // Inserts item to DynamoDB
            await this.documentClient.put(params).promise();

            // Sends a metric
            if (this.sendAnonymousUsageData === 'Yes') {
                let eventType = true ? 'ScheduledTaskCreated' : 'EventTaskCreated';
                let eventData = {
                    TaskName: task.actionName,
                    AutomationDocumentName: task.actionName,
                    RegionCount: task.regions.split(',').length,
                    AccountCount: task.accounts.split(',').length
                };

                if (task.triggerType === TriggerType.Schedule) {
                    eventData['ScheduleType'] = task.scheduledType;
                    eventData['ScheduleDetails'] = {
                        Interval:
                            task.scheduledType === ScheduledType.CronExpression ?
                                task.scheduledCronExpression :
                                `${task.scheduledFixedRateInterval} ${task.scheduledFixedRateType}`
                    };
                } else if (task.triggerType === TriggerType.Event) {
                    eventData['EventPattern'] = task.eventPattern;
                }

                await COMMON_UTIL.sendAnonymousMetric(this.solutionId, this.solutionVersion, this.solutionUuid, eventType, eventData);
            }

            return Promise.resolve(item);
        } catch (error) {
            LOGGER.error(`createTask Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('CreateTaskFailure', 500, 'Error occurred while creating a task.', error)
            );
        }
    }

    /**
     * Edits a task
     * @param {string} taskId - task ID to edit
     * @param {TaskInfo} updatedTask - task definition to update
     */
    async editTask(taskId: string, updatedTask: TaskInfo): Promise<TaskReturn | ErrorReturn> {
        let requiredFields = [
            taskId,
            updatedTask.targetTag,
            updatedTask.accounts,
            updatedTask.regions,
            updatedTask.actionName,
            updatedTask.triggerType
        ];

        if (!COMMON_UTIL.isStringValuesValid(requiredFields)) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditTaskFailure', 400, 'Required values cannot be empty.')
            );
        }

        if (updatedTask.enabled === undefined || typeof(updatedTask.enabled) !== 'boolean') {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditTaskFailure', 400, 'Enabled parameter cannot be undefined.')
            );
        }

        try {
            // Checks if the task is valid
            await this.getTask(taskId);

            // Builds a task DynamoDB item and validates parameters
            let item = await this.buildTaskItem(updatedTask, taskId);

            // Removes CloudWatch event rule if it exists.
            await this.deleteCloudWatchEventRule(taskId);

            // Puts a CloudWatch event rule
            // buildTaskItem is going to validate the values, so no more validation is needed.
            await this.putCloudWatchEventRule(item);

            // Generate CloudFormation Template for cross accounts and regions
            let templateUrl = await this.generateCloudFormationTemplate(item);
            item['templateUrl'] = templateUrl;

            // Edits a task
            const dynamoDbParams: DocumentClient.PutItemInput = {
                TableName: this.tasksTable,
                Item: item
            };

            // Inserts edited item to DynamoDB
            await this.documentClient.put(dynamoDbParams).promise();

            return Promise.resolve(item);
        } catch (error) {
            LOGGER.error(`editTask Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditTaskFailure', 500, 'Error occurred while editing a task.', error)
            );
        }
    }

    /**
     * Deletes a task
     * @param {string} taskId - task ID to delete
     */
    async deleteTask(taskId: string): Promise<void | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([taskId])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteTaskFailure', 400, 'Task ID cannot be empty.')
            );
        }

        try {
            // Checks if the task is valid
            let task = await this.getTask(taskId);

            // Deletes a task
            const dynamoDbParams: DocumentClient.DeleteItemInput = {
                TableName: this.tasksTable,
                Key: {
                    taskId
                }
            };
            await this.documentClient.delete(dynamoDbParams).promise();

            // Deletes CloudWatch event rule
            await this.deleteCloudWatchEventRule(taskId);

            // Deletes CloudFormation template
            const s3Params: AWS.S3.DeleteObjectRequest = {
                Bucket: this.cloudFormationBucket,
                Key: `${task['actionName']}/${task['taskId']}.template`
            }
            await this.s3.deleteObject(s3Params).promise();

            // Sends a metric
            if (this.sendAnonymousUsageData === 'Yes') {
                let eventType = 'TaskDeleted';
                let eventData = {
                    TaskName: task['actionName']
                };

                await COMMON_UTIL.sendAnonymousMetric(this.solutionId, this.solutionVersion, this.solutionUuid, eventType, eventData);
            }

            return Promise.resolve();
        } catch (error) {
            LOGGER.error(`deleteTask Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteTaskFailure', 500, 'Error occurred while deleting a task.', error)
            );
        }
    }

    /**
     * Executes a task
     * @param {string} taskId - task ID to execute
     */
    async executeTask(taskId: string): Promise<AWS.Lambda._Blob | ErrorReturn> {
        let task = {};
        try {
            task = await this.getTask(taskId);
            if (task['triggerType'] === TriggerType.Event) {
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('ExecuteTaskFailure', 500, 'Event type cannot be executed manually.')
                );
            }
        } catch (error) {
            LOGGER.error(`executeTask Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('ExecuteTaskFailure', 500, 'Error occurred while getting a task.', error)
            );
        }

        task['manualTrigger'] = true;
        const params: AWS.Lambda.InvocationRequest = {
            FunctionName: this.resourceSelectorLambdaArn,
            InvocationType: 'RequestResponse',
            LogType: 'Tail',
            Payload: JSON.stringify(task)
        }
        try {
            let result: AWS.Lambda.InvocationResponse = await this.lambda.invoke(params).promise();
            return Promise.resolve(result.Payload);
        } catch (error) {
            LOGGER.error(`executeTask Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('ExecuteTaskFailure', 500, 'Error occurred while executing a task.', error)
            );
        }
    }

    /**
     * Gets task executions
     * @param {string} taskId - task ID to get task executions
     * @param {string} sortType - sort value: ASC/DESC, default is ASC
     * @param {number} itemsPerPage - items to show in a page, default is 10
     * @param {object} lastKey - DynamoDB last evaludated key to query
     */
    async getTaskExecutions(taskId: string, sortType?: string, itemsPerPage?: number, lastKey?: object): Promise<DocumentClient.QueryOutput | ErrorReturn> {
        /**
         * DynamoDB has a bug to return LastEvaluatedKey even though there is no more data when the limit equals to the number of returned items.
         * For example, if the limit is 3, and the number of returned items is 3 but there is no more actual data to query, DynamoDB returns LastEvaluatedKey.
         * To resolve the bug, it will add 1 to the limit, and return the items after removing the last item. LastEvaluatedKey would be the new last item of the items.
         */
        if (!COMMON_UTIL.isStringValuesValid([taskId])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetTaskExecutionsFailure', 400, 'Task ID cannot be empty.')
            );
        }

        // Default items per page is 10.
        if (!/^[1-9]\d*$/.test(`${itemsPerPage}`)) {
            itemsPerPage = 10;
        }

        let params: DocumentClient.QueryInput = {
            TableName: this.taskExecutionsTable,
            IndexName: 'taskId-startTime-index',
            ScanIndexForward: sortType === SortType.asc,
            KeyConditionExpression: 'taskId = :taskId',
            ExpressionAttributeValues: {
                ':taskId': taskId
            },
            Limit: itemsPerPage + 1 // plus 1 on purpose
        };

        if (lastKey && !COMMON_UTIL.isObjectEmpty(lastKey)) {
            params['ExclusiveStartKey'] = lastKey;
        }

        try {
            let result = await this.documentClient.query(params).promise();
            let items = result.Items;
            let lastEvaluatedKey = result.LastEvaluatedKey;
            if (items.length === itemsPerPage + 1) {
                // This means there should be more items to query with the actual limit (itemsPerPage).
                let item = items[itemsPerPage - 1];
                for (let key in result.LastEvaluatedKey) {
                    lastEvaluatedKey[key] = item[key];
                }

                // To return itemsPerPage, pop the end of the result.
                items.pop();
            }

            return Promise.resolve({
                Items: items,
                LastEvaluatedKey: lastEvaluatedKey
            });
        } catch (error) {
            LOGGER.error(`getTaskExecutions Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetTaskExecutionsFailure', 500, 'Error occurred while getting task executions.', error)
            );
        }
    }

    /**
     * Gets task automation executions
     * @param {string} taskId - task ID to get automation executions
     * @param {string} parentExecutionId - parent execution ID to get automation executions
     * @param {number} itemsPerPage - items to show in a page, default is 10
     * @param {object} lastKey - DynamoDB last evaludated key to query
     */
    async getAutomationExecutions(taskId: string, parentExecutionId: string, itemsPerPage?: number, lastKey?: object): Promise<DocumentClient.QueryOutput | ErrorReturn> {
        /**
         * DynamoDB has a bug to return LastEvaluatedKey even though there is no more data when the limit equals to the number of returned items.
         * For example, if the limit is 3, and the number of returned items is 3 but there is no more actual data to query, DynamoDB returns LastEvaluatedKey.
         * To resolve the bug, it will add 1 to the limit, and return the items after removing the last item. LastEvaluatedKey would be the new last item of the items.
         */
        if (!COMMON_UTIL.isStringValuesValid([taskId, parentExecutionId])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAutomationExecutionsFailure', 400, 'Task ID and parent execution ID cannot be empty.')
            );
        }
        try {
            // Checks if the execution belongs to the task from task executions table.
            const dynamoDbParams: DocumentClient.GetItemInput = {
                TableName: this.taskExecutionsTable,
                Key: {
                    taskId,
                    parentExecutionId
                }
            }

            const taskExecution = await this.documentClient.get(dynamoDbParams).promise();
            if (COMMON_UTIL.isObjectEmpty(taskExecution)) {
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('GetAutomationExecutionsFailure', 404, 'Task execution not found for the task.')
                );
            }
        } catch (error) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAutomationExecutionsFailure', 500, 'Error occurred while getting a task execution.', error)
            );
        }

        // Default items per page is 10.
        if (!/^[1-9]\d*$/.test(`${itemsPerPage}`)) {
            itemsPerPage = 10;
        }

        let params: DocumentClient.QueryInput = {
            TableName: this.automationExecutionsTable,
            KeyConditionExpression: 'parentExecutionId = :parentExecutionId',
            ExpressionAttributeValues: {
                ':parentExecutionId': parentExecutionId
            },
            Limit: itemsPerPage + 1 // plus 1 on purpose
        };

        if (lastKey && !COMMON_UTIL.isObjectEmpty(lastKey)) {
            params['ExclusiveStartKey'] = lastKey;
        }

        try {
            let result = await this.documentClient.query(params).promise();
            let items = result.Items;
            let lastEvaluatedKey = result.LastEvaluatedKey;
            if (items.length === itemsPerPage + 1) {
                // This means there should be more items to query with the actual limit (itemsPerPage).
                let item = items[itemsPerPage - 1];
                for (let key in result.LastEvaluatedKey) {
                    lastEvaluatedKey[key] = item[key];
                }

                // To return itemsPerPage, pop the end of the result.
                items.pop();
            }

            return Promise.resolve({
                Items: items,
                LastEvaluatedKey: lastEvaluatedKey
            });
        } catch (error) {
            LOGGER.error(`getExecutions Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAutomationExecutionsFailure', 500, 'Error occurred while getting automation executions.', error)
            );
        }
    }

    /**
     * Gets an automation execution
     * @param {string} taskId - task ID to get an automation execution
     * @param {string} parentExecutionId - execution ID to get an automation execution
     * @param {string} automationExecutionId - AWS Systems Manager execution ID
     */
    async getAutomationExecution(taskId: string, parentExecutionId: string, automationExecutionId: string): Promise<any> {
        if (!COMMON_UTIL.isStringValuesValid([taskId, parentExecutionId, automationExecutionId])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAutomationExecutionFailure', 400, 'Task ID, parent execution ID and automation execution ID cannot be empty.')
            );
        }

        try {
            // Checks if the execution belongs to the task from task executions table and automation executions table.
            let dynamoDbParams: DocumentClient.GetItemInput = {
                TableName: this.taskExecutionsTable,
                Key: {
                    taskId,
                    parentExecutionId
                }
            }

            const taskExecution = await this.documentClient.get(dynamoDbParams).promise();
            if (COMMON_UTIL.isObjectEmpty(taskExecution)) {
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('GetAutomationExecutionFailure', 404, 'Task execution not found for the task.')
                );
            }

            dynamoDbParams = {
                TableName: this.automationExecutionsTable,
                Key: {
                    parentExecutionId,
                    automationExecutionId
                }
            }

            const automationExecution = await this.documentClient.get(dynamoDbParams).promise();
            if (COMMON_UTIL.isObjectEmpty(automationExecution)) {
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('GetAutomationExecutionFailure', 404, 'Automation execution not found for the task.')
                );
            }
        } catch (error) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAutomationExecutionFailure', 500, 'Error occurred while getting an execution from DynamoDB.', error)
            );
        }

        try {
            // Gets the execution detail.
            const ssmParams: AWS.SSM.GetAutomationExecutionRequest = {
                AutomationExecutionId: automationExecutionId
            };
            let executionDetail = await this.ssm.getAutomationExecution(ssmParams).promise();
            return Promise.resolve(executionDetail.AutomationExecution);
        } catch (error) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAutomationExecutionFailure', 500, 'Error occurred while getting an automation execution.', error)
            );
        }
    }

    /**
     * Builds a task DynamoDB item and validates parameters
     * @param {TaskInfo} task - task defition
     * @param {string} taskId - task ID
     */
    async buildTaskItem(task: TaskInfo, taskId?: string): Promise<TaskReturn | ErrorReturn> {
        try {
            let item = {
                taskId: taskId ? taskId : uuid.v4(),
                name: task.name,
                description: task.description,
                targetTag: task.targetTag,
                accounts: COMMON_UTIL.trimStringInArray(task.accounts.split(',')),
                regions: COMMON_UTIL.trimStringInArray(task.regions.split(',')),
                actionName: task.actionName,
                triggerType: task.triggerType,
                enabled: task.enabled !== undefined ? task.enabled : true
            };

            // Checks regions
            let regions = await this.getAwsRegions() as string[];
            for (let region of item['regions']) {
                if (regions.indexOf(region) < 0) {
                    return Promise.reject(
                        COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Invalid region: ${region}`)
                    );
                }
            }

            // Checks accounts
            for (let account of item['accounts']) {
                if (!/^\d{12}$/.test(account)) {
                    return Promise.reject(
                        COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Invalid account, account should be 12 digit number: ${account}`)
                    );
                }
            }

            // Checks and create trigger type
            if (task.triggerType === TriggerType.Schedule) {
                item['scheduledType'] = task.scheduledType;
                if (task.scheduledType === ScheduledType.CronExpression) {
                    if (task.scheduledCronExpression === undefined) {
                        return Promise.reject(
                            COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, 'Missing key/value: scheduledCronExpression')
                        );
                    }
                    item['scheduledCronExpression'] = task.scheduledCronExpression;
                } else if (task.scheduledType === ScheduledType.FixedRate) {
                    if (task.scheduledFixedRateInterval === undefined) {
                        return Promise.reject(
                            COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, 'Missing key/value: scheduledFixedRateInterval')
                        );
                    } else if (task.scheduledFixedRateType === undefined) {
                        return Promise.reject(
                            COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, 'Missing key/value: scheduledFixedRateType')
                        );
                    }

                    // Checks if the rate interval is valid
                    if (!/^[1-9]\d*$/.test(task.scheduledFixedRateInterval)) {
                        return Promise.reject(
                            COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, 'Invalid interval (1 <= interval, integer).')
                        );
                    }
                    item['scheduledFixedRateInterval'] = +task.scheduledFixedRateInterval;

                    // Checks if the rate type is valid
                    if (!Object.values(ScheduledFixedRateType).includes(task.scheduledFixedRateType)) {
                        return Promise.reject(
                            COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Invalid rate type: ${task.scheduledFixedRateType}.`)
                        );
                    }

                    // If the interval is 1, remove 's' from the rate type if it has at the end
                    item['scheduledFixedRateType'] =
                        +task.scheduledFixedRateInterval === 1 && task.scheduledFixedRateType.endsWith('s') ?
                        task.scheduledFixedRateType.slice(0, -1) :
                        task.scheduledFixedRateType
                } else {
                    // This can happen if a user calls API directly with invalid value.
                    return Promise.reject(
                        COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Invalid schedule type: ${task.scheduledType}`)
                    );
                }
            } else if (task.triggerType === TriggerType.Event) {
                if (task.eventPattern === undefined) {
                    return Promise.reject(
                        COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, 'Missing key/value: eventPattern')
                    )
                }

                // Checks if eventPattern is valid JSON
                try {
                    LOGGER.info(`eventPattern: ${task.eventPattern}`);
                    JSON.parse(task.eventPattern);
                } catch (error) {
                    return Promise.reject(
                        COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Invalid eventPattern: ${error.message}`)
                    )
                }

                item['eventPattern'] = task.eventPattern;
            } else {
                // This can happen if a user calls API directly with invalid value.
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Invalid trigger type: ${task.triggerType}`)
                );
            }
            let taskParameters = await this.checkParameterValue(task.taskParameters);
            item['taskParameters'] = taskParameters;

            return Promise.resolve(item);
        } catch (error) {
            LOGGER.error(`buildTaskItem Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('BuildTaskItemFailure', 400, `Error occurred while building a task item.`, error)
            );
        }
    }

    /**
     * Checks parameters, and remove empty value parameters
     * @param {TaskParameter[]} parameters - parameters to check
     */
    async checkParameterValue(parameters: TaskParameter[]): Promise<TaskParameter[] | ErrorReturn> {
        try {
            for (let parameter of parameters) {
                let description = parameter.Description;
                parameter.Value = parameter.Value === null ? '' : parameter.Value;
                parameter.DefaultValue = parameter.DefaultValue === null ? '' : parameter.DefaultValue;

                // Checks if the parameter is required
                if (description.indexOf('Required') > -1) {
                    if ((parameter.Value === undefined || parameter.Value.trim() === '')
                        && (parameter.DefaultValue === undefined || parameter.DefaultValue.trim() === '')) {
                        return Promise.reject(
                            COMMON_UTIL.getErrorObject('CheckParameterValueFailure', 400, `Required parameter cannot be empty: ${parameter.Name}`)
                        );
                    }
                }

                if ((parameter.Value === undefined || parameter.Value.trim() === '')
                    && (parameter.DefaultValue !== undefined && parameter.DefaultValue.trim() !== '')) {
                    parameter.Value = parameter.DefaultValue;
                }
            }

            return Promise.resolve(parameters);
        } catch (error) {
            LOGGER.error(`checkParameterValue Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('CheckParameterValueFailure', 400, 'Error occurred while checking parameters.', error)
            );
        }
    }

    /**
     * Puts a CloudWatch event rule and a target
     * @param {object} task - task definition to put a CloudWatch event rule
     */
    async putCloudWatchEventRule(task: object): Promise<void | ErrorReturn> {
        // Only if the trigger type is schedule, CloudWatch Events rule is going to be created.
        if (task['triggerType'] === TriggerType.Schedule) {
            // Puts a rule
            let ruleParams: AWS.CloudWatchEvents.PutRuleRequest = {
                Name: task['taskId'],
                Description: task['description'],
                State: task['enabled'] ? 'ENABLED' : 'DISABLED'
            };

            if (task['scheduledType'] === ScheduledType.CronExpression) {
                ruleParams['ScheduleExpression'] = `cron(${task['scheduledCronExpression']})`;
            } else {
                ruleParams['ScheduleExpression'] = `rate(${task['scheduledFixedRateInterval']} ${task['scheduledFixedRateType']})`;
            }

            let ruleArn = '';
            try {
                let result = await this.cloudWatchEvents.putRule(ruleParams).promise();
                ruleArn = result.RuleArn;
            } catch (error) {
                LOGGER.error(`putCloudWatchEventRule Error: ${JSON.stringify(error)}`);
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('PutCloudWatchEventRuleFailure', 500, 'Error occurred while putting a CloudWatchEvents rule.', error)
                );
            }

            // Puts a target
            let targetParams: AWS.CloudWatchEvents.PutTargetsRequest = {
                Rule: ruleParams.Name,
                Targets: []
            };

            task['manualTrigger'] = false;
            targetParams.Targets = [
                {
                    Id: task['taskId'],
                    Arn: this.resourceSelectorLambdaArn,
                    Input: JSON.stringify(task)
                }
            ]

            try {
                await this.cloudWatchEvents.putTargets(targetParams).promise();
                delete task['manualTrigger'];
            } catch (error) {
                LOGGER.error(`putCloudWatchEventRule Error: ${JSON.stringify(error)}`);
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('PutCloudWatchEventRuleFailure', 500, 'Error occurred while putting CloudWatchEvents targets.', error)
                );
            }

            // Adds a permission to Lambda
            let lambdaParams: AWS.Lambda.AddPermissionRequest = {
                Action: 'lambda:InvokeFunction',
                FunctionName: this.resourceSelectorLambdaArn,
                Principal: 'events.amazonaws.com',
                SourceArn: ruleArn,
                StatementId: task['taskId']
            };

            try {
                await this.lambda.addPermission(lambdaParams).promise();
            } catch (error) {
                LOGGER.error(`putCloudWatchEventRule Error: ${JSON.stringify(error)}`);
                return Promise.reject(
                    COMMON_UTIL.getErrorObject('PutCloudWatchEventRuleFailure', 500, 'Error occurred while adding Lambda permission.', error)
                );
            }
        }

        return Promise.resolve();
    }

    /**
     * Deletes a CloudWatch event rule and a target
     * @param {string} taskId - task ID to delete
     */
    async deleteCloudWatchEventRule(taskId: string): Promise<void | ErrorReturn> {
        // Checks if the CloudWatch event rule exists
        let listParams: AWS.CloudWatchEvents.ListRulesRequest = {
            NamePrefix: taskId
        };

        try {
            let rules = await this.cloudWatchEvents.listRules(listParams).promise();
            if (rules.Rules.length === 0) {
                return Promise.resolve();
            }
        } catch (error) {
            LOGGER.error(`deleteCloudWatchEventRule Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteCloudWatchEventRuleFailure', 500, 'Error occurred while listing CloudWatchEvents rules.', error)
            );
        }

        // Deletes a permission from Lambda
        let lambdaParams: AWS.Lambda.RemovePermissionRequest = {
            FunctionName: this.resourceSelectorLambdaArn,
            StatementId: taskId
        };

        try {
            await this.lambda.removePermission(lambdaParams).promise();
        } catch (error) {
            LOGGER.error(`deleteCloudWatchEventRule Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteCloudWatchEventRuleFailure', 500, 'Error occurred while removing Lambda permission.', error)
            );
        }

        // Removes a target
        let targetParams: AWS.CloudWatchEvents.RemoveTargetsRequest = {
            Ids: [ taskId ],
            Rule: taskId
        };

        try {
            await this.cloudWatchEvents.removeTargets(targetParams).promise();
        } catch (error) {
            LOGGER.error(`deleteCloudWatchEventRule Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteCloudWatchEventRuleFailure', 500, 'Error occurred while removing CloudWatchEvents targets.', error)
            );
        }

        // Delete a rule
        let ruleParams: AWS.CloudWatchEvents.DeleteRuleRequest = {
            Name: taskId
        };

        try {
            await this.cloudWatchEvents.deleteRule(ruleParams).promise();
        } catch (error) {
            LOGGER.error(`deleteCloudWatchEventRule Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteCloudWatchEventRuleFailure', 500, 'Error occurred while deleting a CloudWatchEvents rule.', error)
            );
        }

        return Promise.resolve();
    }

    /**
     * Generates CloudFormation template for secondary account and region
     * @param {Object} task - task information
     */
    async generateCloudFormationTemplate(task: object): Promise<string | ErrorReturn> {
        let actionName = task['actionName'];

        try {
            // Gets CloudFormation template from S3
            LOGGER.info('Getting CloudFormation template from S3...');
            const getParams: AWS.S3.GetObjectAclRequest = {
                Bucket: this.cloudFormationBucket,
                Key: `${actionName}/cloudformation.template`
            };
            let data = await this.s3.getObject(getParams).promise();
            let yaml = data.Body.toString().replace('%%TASK_ID%%', task['taskId']);

            // Adds event related resources to the CloudFormation template
            if (task['triggerType'] === TriggerType.Event) {
                // Removes event pattern to prevent JSON parsing problem to make CloudWatch Events event rule
                let eventPattern = task['eventPattern'];
                delete task['eventPattern'];

                task['resources'] = '<resources>';
                let eventTemplate = fs.readFileSync('tasks/event-handler.template').toString()
                    .replace(/%%TASK_ID%%/g, task['taskId'])
                    .replace('%%TASK_DESCRIPTION%%', task['description'])
                    .replace('%%EVENT_PATTERN%%', eventPattern.replace(/\n/g, ''))
                    .replace('%%TASK%%', JSON.stringify(task)
                        .replace(/\\n/g, '')
                        .replace(/\\/g, '')
                        .replace(/"/g, '\\"'))
                    .replace(/%%MASTER_SNS_ARN%%/g, this.masterSnsArn)
                    .replace('%%MASTER_KMS_ARN%%', this.masterKmsArn)
                    .replace('%%MASTER_REGION%%', this.region);
                yaml = yaml.concat(eventTemplate);
                delete task['resources'];

                // Adds event pattern again to the task
                task['eventPattern'] = eventPattern;

                await this.editSnsPolicy(task['taskId'], task['accounts']);
                await this.editKmsPolicy(task['taskId'], task['accounts']);
            }

            LOGGER.info('Putting CloudFormation template from S3...');
            // Uploads the CloudFormation template to S3
            let putParams: AWS.S3.PutObjectRequest = {
                Bucket: this.cloudFormationBucket,
                Body: yaml,
                Key: `${actionName}/${task['taskId']}.template`,
                ContentType: 'binary/octet-stream'
            };
            await this.s3.putObject(putParams).promise();

            LOGGER.info('Modifying S3 bucket policy...');
            // Gets bucket policy
            let bucketPolicy = await this.s3.getBucketPolicy({ Bucket: this.cloudFormationBucket }).promise();
            let policy = JSON.parse(bucketPolicy.Policy);

            // Deletes bucket policy
            await this.s3.deleteBucketPolicy({ Bucket: this.cloudFormationBucket }).promise();

            // Puts new bucket policy
            let statement = (policy['Statement'] as object[]).filter((statement) => statement['Sid'] !== task['taskId']);
            statement.push({
                Sid: task['taskId'],
                Effect: 'Allow',
                Principal: {
                    AWS: [
                        ...
                        (task['accounts'] as string[]).map((account) => {
                            return `arn:aws:iam::${account}:root`
                        })
                    ]
                },
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${this.cloudFormationBucket}/*`
            });
            policy['Statement'] = statement;
            await this.s3.putBucketPolicy({
                Bucket: this.cloudFormationBucket,
                Policy: JSON.stringify(policy)
            }).promise();

            return Promise.resolve(
                `https://${this.cloudFormationBucket}.s3.${this.region}.amazonaws.com/${actionName}/${task['taskId']}.template`
            );
        } catch (error) {
            LOGGER.error(`generateCloudFormationTemplate Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GenerateCloudFormationTemplateFailure', 500, 'Error occurred while generating CloudFormation template.', error)
            );
        }
    }

    /**
     * Edits the master account SNS policy
     * @param {string} taskId - task ID which will be the label of SNS policy
     * @param {string[]} accounts - accounts to add SNS publish permission
     */
    async editSnsPolicy(taskId: string, accounts: string[]): Promise<void | ErrorReturn> {
        // Removes SNS permission for a task
        let removeParams: AWS.SNS.RemovePermissionInput = {
            TopicArn: this.masterSnsArn,
            Label: taskId
        };
        try {
            await this.sns.removePermission(removeParams).promise();
        } catch (error) {
            LOGGER.error(`editSnsPolicy Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditSnsPolicyFailure', 500, 'Error occurred while removing permission from SNS policy.', error)
            );
        }

        // Adds SNS permission for a task
        let addParams: AWS.SNS.AddPermissionInput = {
            TopicArn: this.masterSnsArn,
            Label: taskId,
            AWSAccountId: accounts,
            ActionName: ['Publish']
        };

        try {
            await this.sns.addPermission(addParams).promise();
        } catch (error) {
            LOGGER.error(`editSnsPolicy Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditSnsPolicyFailure', 500, 'Error occurred while adding permission from SNS policy.', error)
            );
        }

        return Promise.resolve();
    }

    async editKmsPolicy(taskId: string, accounts: string[]): Promise<void | ErrorReturn> {
        let policy = {};

        // Gets KMS policy
        try {
            let params: AWS.KMS.GetKeyPolicyRequest = {
                KeyId: this.masterKmsArn,
                PolicyName: 'default'   // The only valid name is default.
            };
            let kmsPollicy = await this.kms.getKeyPolicy(params).promise();
            policy = JSON.parse(kmsPollicy.Policy);
        } catch (error) {
            LOGGER.error(`editKmsPolicy Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditKmsPolicyFailure', 500, 'Error occurred while getting KMS policy.', error)
            );
        }

        // Puts the new KMS policy
        try {
            let statement = (policy['Statement'] as object[]).filter((statement) => statement['Sid'] !== taskId);
            statement.push({
                Sid: taskId,
                Effect: 'Allow',
                Principal: {
                    AWS: [
                        ...
                        accounts.map((account) => {
                            return `arn:aws:iam::${account}:root`
                        })
                    ]
                },
                Action: [
                    "kms:Decrypt",
                    "kms:GenerateDataKey"
                ],
                Resource: [
                    this.masterKmsArn
                ]
            });
            policy['Statement'] = statement;
            await this.kms.putKeyPolicy({
                KeyId: this.masterKmsArn,
                Policy: JSON.stringify(policy),
                PolicyName: 'default'
            }).promise();
        } catch (error) {
            LOGGER.error(`editKmsPolicy Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditKmsPolicyFailure', 500, 'Error occurred while putting KMS policy.', error)
            );
        }
    }

    /**
     * Gets AWS regions
     */
    async getAwsRegions(): Promise<string[] | ErrorReturn> {
        try {
            const ec2 = new AWS.EC2();
            let data = await ec2.describeRegions().promise();
            let regions = [];
            for (let region of data.Regions) {
                regions.push(region.RegionName);
            }

            return Promise.resolve(regions);
        } catch (error) {
            LOGGER.error(`getAwsRegions Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetAwsRegionsFailure', 500, 'Error occurred while desribing regions.', error)
            );
        }
    }
}
