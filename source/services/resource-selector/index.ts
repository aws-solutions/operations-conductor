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

import { factory } from '../logger';
import { CommonUtil } from '../common/util';
import * as uuid from 'uuid';
import * as AWS from 'aws-sdk';
import moment = require('moment');

const LOGGER = factory.getLogger('resource-selector');
const COMMON_UTIL = new CommonUtil();

/**
 * Interface to enforce we have all the information necessary to properly add messages
 * to the Resource queue
 */
interface OpsConductorTaskMetadata {
    automationDocumentName: string;
    taskDescription: string;
    taskName: string;
    targetResourceType: string;
    targetTag: string;
    taskId: string;
    taskParameters: [
        {
            name: string;
            value: string;
        }
    ];
    accounts: string[];
    regions: string[];
}

/**
 * Interface to represent the components of an AWS ARN
 * https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html
 */
interface ParsedArn {
    arn: string,
    partition: string,
    service: string,
    region: string,
    accountId: string,
    resourceType: string,
    resourceId: string,
    fullArn: string,
    resourceRegion?: string,
    resourceAccount?: string
}

/**
 * Class to validate function input and hold references to important variables
 */
class FunctionData {
    resourceQueueUrl: string;
    taskMetadata: OpsConductorTaskMetadata;
    isPassthrough: boolean;
    passthroughResource: ParsedArn;
    eventType: string;
    isManualTrigger: boolean;
    isAutomaticTaskExecutionEnabled: boolean;

    /**
     * @constructor
     * @param event - The event payload that was passed when this function was invoked
     */
    constructor(event: any) {
        if (!process.env.ResourceQueueUrl || process.env.ResourceQueueUrl.trim() === '') {
            throw new Error('ResourceQueueUrl was not found in environment variables');
        }
        this.resourceQueueUrl = process.env.ResourceQueueUrl;

        this.isPassthrough = (event.Records && event.Records.length === 1);

        if (this.isPassthrough) {
            // This event came from SNS, which indicates it was the result of
            // a state change event on a resource
            event = JSON.parse(event.Records[0].Sns.Message);
            this.eventType = 'EventTaskExecution';
            this.isManualTrigger = false;
            this.passthroughResource = parseARN(event.resources[0]);
            this.passthroughResource.resourceAccount = event.resourceAccount;
            this.passthroughResource.resourceRegion = event.resourceRegion;
        } else {
            if (Object.prototype.hasOwnProperty.call(event, 'manualTrigger') && event.manualTrigger === true) {
                this.eventType = 'ManualTaskExecution';
                this.isManualTrigger = true;
            } else {
                this.eventType = 'ScheduledTaskExecution';
                this.isManualTrigger = false;
            }
        }

        if (Object.prototype.hasOwnProperty.call(event, 'enabled') && event.enabled === true) {
            this.isAutomaticTaskExecutionEnabled = true;
        } else {
            this.isAutomaticTaskExecutionEnabled = false;
        }

        if (!event.taskId || event.taskId.trim() === '') {
            throw new Error('"taskId" was not present in the event');
        }

        if (!event.name || event.name.trim() === '') {
            throw new Error('"name" was not present in the event');
        }

        if (!event.targetTag || event.targetTag.trim() === '') {
            throw new Error('"targetTag" was not present in the event');
        }

        if (!event.actionName || event.actionName.trim() === '') {
            throw new Error('"actionName" was not present in the event');
        }

        if (!event.accounts || event.accounts.length < 1) {
            throw new Error('"accounts" array not present in the event');
        }

        if (!event.regions || event.regions.length < 1) {
            throw new Error('"regions" array not present in the event');
        }

        if (!event.taskParameters) {
            throw new Error('"taskParameters" array not present in the event')
        }

        const targetResourceTypeParameter = event.taskParameters.find((p: any) => p.Name === 'TargetResourceType');

        if (!targetResourceTypeParameter) {
            throw new Error('"taskParameters" did not contain "TargetResourceType"');
        }

        if (!targetResourceTypeParameter.Value || targetResourceTypeParameter.Value.trim() === '') {
            throw new Error('"TargetResourceType" in "taskParameters" did not contain a "Value"');
        }

        this.taskMetadata = {
            taskId: event.taskId,
            taskName: event.name,
            targetResourceType: targetResourceTypeParameter.Value.trim(),
            targetTag: event.targetTag,
            automationDocumentName: event.actionName,
            taskDescription: event.description || '',
            accounts: [...event.accounts],
            regions: [...event.regions],
            taskParameters: event.taskParameters
                .filter((p: any) => p.Value && p.Value.trim() !== '')
                .map((p: any) => {
                    return { name: p.Name, value: p.Value }
                })
        };
    }
}

/**
 * This function will query the Operations Conductor Task Metadata Table. Using this information
 * the function will use the AWS Tag API to select all the AWS resources that need to be acted on
 * and for each, add a message to the Operations Conductor Resource Queue. Finally, create an item 
 * in the Operations Conductor Task Executions Table to track this execution.
 * This function is invoked by CloudWatch Scheduled events or triggered by the Customer when
 * they execute an Ops Conductor task manually
 * @param event Event payload.
 */
export const handler = async (event: any = {}): Promise<any> => {
    LOGGER.info(`Received event: ${JSON.stringify(event, null, 2)}`);
    let taskName = null;
    let automationDocumentName = null;

    try {
        LOGGER.info('Processing event payload');
        const functionData = new FunctionData(event);
        if (!functionData.isManualTrigger && !functionData.isAutomaticTaskExecutionEnabled) {
            LOGGER.info('Automatic task execution is disabled');
            return 'Automatic task execution is disabled';
        }

        taskName = functionData.taskMetadata.taskName;
        automationDocumentName = functionData.taskMetadata.automationDocumentName;

        if (functionData.isPassthrough) {
            const allResourcesTagged: boolean = await verifyTagExistsOnResources(functionData);

            if (allResourcesTagged) {
                await sendMessagesToResourceQueue(functionData.resourceQueueUrl, [functionData.passthroughResource], functionData.taskMetadata);
                await sendMetric(functionData.eventType, taskName, automationDocumentName, 1);
                return `Successfully added 1 resource to the queue to be processed`;
            } else {
                throw new Error(`At least one of the resources in the list supplied did not contain the tag: ${functionData.taskMetadata.targetTag}`);
            }
        } else {
            LOGGER.info(`Searching for resources with tag "${functionData.taskMetadata.targetTag}"`);
            const resources = await getResourcesForTagName(functionData.taskMetadata);

            if (resources.length === 0) {
                await createTaskExecutionRecord(process.env.TaskExecutionsTableName, functionData.taskMetadata.taskId, uuid.v4(), resources.length, moment.utc().format('YYYY-MM-DD HH:mm:ss'));
                await sendMetric(functionData.eventType, taskName, automationDocumentName, 0);
                return `Did not find any resources that needed to be processed.`;
            }

            await sendMessagesToResourceQueue(functionData.resourceQueueUrl, [...resources], functionData.taskMetadata);
            await sendMetric(functionData.eventType, taskName, automationDocumentName, resources.length);
            return `Successfully added ${resources.length} resource(s) to the queue to be processed`;
        }
    } catch (err) {
        await sendMetric('TaskExecutionFailed', taskName, automationDocumentName);
        throw err;
    }
};

/**
 * Retrieves a list of Resource ARNs tagged with the given targetTag
 * @param taskMetadata The tag name we need to search for. This tag name should be attached to all resources on which the action is to be performed
 */
async function getResourcesForTagName(taskMetadata: OpsConductorTaskMetadata): Promise<ParsedArn[]> {
    const sts = new AWS.STS({ apiVersion: '2011-06-15' });
    const resources: ParsedArn[] = [];
    const accounts: string[] = [...taskMetadata.accounts];
    const regions: string[] = [...taskMetadata.regions];
    const taskId = taskMetadata.taskId;

    for (let account of accounts) {
        for (let region of regions) {
            const roleArn = `arn:aws:iam::${account}:role/${account}-${region}-${taskId}`;
            const stsParams: AWS.STS.AssumeRoleRequest = {
                RoleArn: roleArn,
                RoleSessionName: 'ops_conductor_query_by_tag',
                DurationSeconds: 900
            };

            const assumedRole = await sts.assumeRole(stsParams).promise();

            const taggingAPIParams: AWS.ResourceGroupsTaggingAPI.GetResourcesInput = {
                TagFilters: [
                    {
                        Key: taskMetadata.targetTag
                    }
                ],
                ResourcesPerPage: 100
            };

            // Filter the resources by the expected type
            taggingAPIParams.ResourceTypeFilters = [taskMetadata.targetResourceType];

            const resourceTaggingApi = new AWS.ResourceGroupsTaggingAPI(
                {
                    apiVersion: '2017-01-26',
                    accessKeyId: assumedRole.Credentials.AccessKeyId,
                    secretAccessKey: assumedRole.Credentials.SecretAccessKey,
                    sessionToken: assumedRole.Credentials.SessionToken,
                    region: region
                }
            );

            // Call the Resource API at least once and repeat if a PaginationToken was returned
            do {
                const data = await resourceTaggingApi.getResources(taggingAPIParams).promise();
                resources.push(...data.ResourceTagMappingList.map(rm => {
                    return parseARN(rm.ResourceARN);
                }));

                if (data.PaginationToken && data.PaginationToken.trim() !== '') {
                    taggingAPIParams.PaginationToken = data.PaginationToken;
                } else {
                    // Remove PaginationToken from params so we exit the while loop
                    delete taggingAPIParams.PaginationToken;
                }
            } while (Object.prototype.hasOwnProperty.call(taggingAPIParams, 'PaginationToken'));
        }
    }

    return resources;
}

/**
 * For each resource to be acted on, send an indidual message to the SQS Resource Queue to be processed
 * @param resourceQueueUrl QueueUrl for the Resource Queue that holds messages for each resource to be acted on
 * @param resourceARNs An array of ResourceARNs to be acted on
 * @param taskMetadata A map representing the details of the given Task
 */
async function sendMessagesToResourceQueue(resourceQueueUrl: string, resources: ParsedArn[], taskMetadata: OpsConductorTaskMetadata) {
    const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    const startTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
    const parentExecutionId = uuid.v4();

    LOGGER.info(`Number of resources to process: ${resources.length}`);

    await createTaskExecutionRecord(process.env.TaskExecutionsTableName, taskMetadata.taskId, parentExecutionId, resources.length, startTime);

    // Create maps to associate an ARN with an ID to be supplied in the SendMessageBatch entry
    const arnToId = {};
    const idToArn = {};

    for (let i = 0; i < resources.length; i++) {
        const msgID = `msg_id_${i}`;
        arnToId[resources[i].fullArn] = msgID;
        idToArn[msgID] = resources[i].fullArn;
    }

    // Split the resourceARNs array into chunks of 10
    const resourceChunks: ParsedArn[][] = [];

    while (resources.length > 0) {
        resourceChunks.push(resources.splice(0, 10));
    }

    LOGGER.info(`Number of message batches to send to queue: ${resourceChunks.length}`);

    // Map the chunks into SQSSendMessageBatch promises
    const sendMessageBatchRequests = resourceChunks.map(aChunk => {
        const params: AWS.SQS.SendMessageBatchRequest = {
            QueueUrl: resourceQueueUrl,
            Entries: aChunk.map(aResource => {
                const entry: AWS.SQS.SendMessageBatchRequestEntry = {
                    Id: arnToId[aResource.fullArn],
                    MessageBody: JSON.stringify({
                        MessageType: 'Resource',
                        AutomationDocumentName: taskMetadata.automationDocumentName,
                        TaskDescription: taskMetadata.taskDescription,
                        TaskName: taskMetadata.taskName,
                        TargetTag: taskMetadata.targetTag,
                        TaskId: taskMetadata.taskId,
                        ParentExecutionId: parentExecutionId,
                        TaskParameters: taskMetadata.taskParameters,
                        StartTime: startTime,
                        ResourceARN: aResource.fullArn,
                        ResourceRegion: aResource.resourceRegion ? aResource.resourceRegion : aResource.region,
                        ResourceAccount: aResource.resourceAccount ? aResource.resourceAccount : aResource.accountId,
                        ResourceId: aResource.resourceId
                    })
                }
                return entry;
            })
        };

        return sqs.sendMessageBatch(params).promise();
    });

    const sendMessageBatchResults = await Promise.all(sendMessageBatchRequests);

    let numFailedMessages: number = 0;
    sendMessageBatchResults.forEach(batchResult => {
        if (batchResult.Failed) {
            batchResult.Failed.forEach(failedResult => {
                LOGGER.error(`Failed to add ${idToArn[failedResult.Id]} to the Resource Queue. Reason: ${failedResult.Message} (${failedResult.Code})`);
                numFailedMessages++;
            });
        }
    });

    if (numFailedMessages > 0) {
        throw new Error(`Got ${numFailedMessages} error(s) while adding messages to the Resource Queue`);
    }
}

/**
 * Calls the Resource Tagging API and validates that for each Resource ARN passed to this lambda from CloudWatch, it is tagged
 * with the target tag for that task in Ops Conductor.
 * @param handlerData The validated input to this lambda handler. It will contain all properties needed to validate
 */
async function verifyTagExistsOnResources(handlerData: FunctionData): Promise<boolean> {
    const sts = new AWS.STS({ apiVersion: '2011-06-15' });
    const { resourceAccount, resourceRegion } = handlerData.passthroughResource;
    const taskId = handlerData.taskMetadata.taskId;
    const roleArn = `arn:aws:iam::${resourceAccount}:role/${resourceAccount}-${resourceRegion}-${taskId}`;
    const stsParams: AWS.STS.AssumeRoleRequest = {
        RoleArn: roleArn,
        RoleSessionName: 'ops_conductor_query_by_tag',
        DurationSeconds: 900
    };

    const assumedRole = await sts.assumeRole(stsParams).promise();

    const taggingAPIParams: AWS.ResourceGroupsTaggingAPI.GetResourcesInput = {
        TagFilters: [
            {
                Key: handlerData.taskMetadata.targetTag
            }
        ],
        ResourcesPerPage: 100,
    };

    const resourceTaggingApi = new AWS.ResourceGroupsTaggingAPI(
        {
            apiVersion: '2017-01-26',
            accessKeyId: assumedRole.Credentials.AccessKeyId,
            secretAccessKey: assumedRole.Credentials.SecretAccessKey,
            sessionToken: assumedRole.Credentials.SessionToken,
            region: handlerData.passthroughResource.resourceRegion
        }
    );

    // Call the Resource Tagging API at least once and repeat if a PaginationToken was returned
    let foundResource = false;
    do {
        const data = await resourceTaggingApi.getResources(taggingAPIParams).promise();
        for (let resourceMapping of data.ResourceTagMappingList) {
            // Due to the difference between API getResources ARN and the actual ARN, extract the resource ID from the ARNs
            let resourceArn = resourceMapping.ResourceARN.split(':').pop();
            let eventResourceArn = handlerData.passthroughResource.fullArn.split(':').pop();
            if (resourceArn === eventResourceArn) {
                foundResource = true;
                break;
            }
        }

        if (data.PaginationToken && data.PaginationToken.trim() !== '') {
            taggingAPIParams.PaginationToken = data.PaginationToken;
        } else {
            // Remove PaginationToken from params so we exit the while loop
            delete taggingAPIParams.PaginationToken;
        }
    } while (!foundResource && Object.prototype.hasOwnProperty.call(taggingAPIParams, 'PaginationToken'));

    return foundResource;
}

/**
 * Constructs a payload of anonymous usage data and sends to AWS. 
 * @param eventType The type of event we are tracking (i.e. ScheduledTaskExecution)
 * @param taskName The name given to the task within the Operations Conductor UI
 * @param automationDocumentName The name of the AWS Systems Manager Document that corresponds to this task
 */
async function sendMetric(eventType: string, taskName: string, automationDocumentName: string, resourceCount: number = null) {
    if (process.env && process.env.SendAnonymousUsageData === 'Yes') {
        let eventData = {
            TaskName: taskName,
            AutomationDocument: automationDocumentName
        };

        if (resourceCount != null) {
            eventData['ResourceCount'] = `${resourceCount}`;
        }

        let solutionId = null;
        let solutionVersion = null;
        let solutionUuid = null;

        if (process.env.SolutionId && process.env.SolutionId !== '') {
            solutionId = process.env.SolutionId;
        }

        if (process.env.SolutionVersion && process.env.SolutionVersion !== '') {
            solutionVersion = process.env.SolutionVersion;
        }

        if (process.env.SolutionUuid && process.env.SolutionUuid !== '') {
            solutionUuid = process.env.SolutionUuid;
        }

        if (solutionId && solutionVersion && solutionUuid) {
            await COMMON_UTIL.sendAnonymousMetric(solutionId, solutionVersion, solutionUuid, eventType, eventData);
        }
    }
}

/**
 * Logs an item in the Operations Conductor TaskExecutionsTable for the current execution. This enabled
 * users of the Operations Conductor UI to view details and track progress of this execution.
 * @param tableName The name for the Operations Conductor TaskOperationsTable
 * @param taskId The ID for the Operations Conductor Task, generated when the task was created in the UI
 * @param parentExecutionId A unique ID for the current execution
 * @param totalResourceCount The total number of resources that will be placed on the Operations Conductor Resource Queue
 * @param startTime The time this execution was triggered
 */
async function createTaskExecutionRecord(tableName: string, taskId: string, parentExecutionId: string, totalResourceCount: number, startTime: string) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
        TableName: tableName,
        Item: {
            taskId: taskId,
            parentExecutionId: parentExecutionId,
            startTime: startTime,
            lastUpdateTime: startTime,
            status: totalResourceCount > 0 ? 'InProgress' : 'Success',
            totalResourceCount: totalResourceCount,
            completedResourceCount: 0
        }
    };

    await docClient.put(params).promise();
}

/**
 * Takes an AWS ARN and returns an object comprised of its various components
 * @param arn An Amazon Resource Name
 */
function parseARN(arn: string): ParsedArn {
    const arnComponents = arn.split(':');

    if (arnComponents.length !== 6 && arnComponents.length !== 7) {
        throw new Error(`ARN (${arn}) is not in an expected format`);
    }

    const result: ParsedArn = {
        arn: arnComponents[0],
        partition: arnComponents[1],
        service: arnComponents[2],
        region: arnComponents[3],
        accountId: arnComponents[4],
        resourceType: null,
        resourceId: null,
        fullArn: arn
    };

    if (arnComponents.length === 7) {
        // ARN format is: arn:partition:service:region:account-id:resource-type:resource-id
        result.resourceType = arnComponents[5];
        result.resourceId = arnComponents[6];
    } else {
        const resourceComponents = arnComponents[5].split('/');

        if (resourceComponents.length === 1) {
            // ARN format is: arn:partition:service:region:account-id:resource-id
            result.resourceId = arnComponents[5];
        } else {
            // ARN format is: arn:partition:service:region:account-id:resource-type/resource-id
            result.resourceType = resourceComponents.shift();
            result.resourceId = resourceComponents.join('/');
        }
    }

    return result;
}
