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

import { factory } from '../logger';
import * as AWS from 'aws-sdk';
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
const logger = factory.getLogger('queue-consumer');

const SQS_RECEIVE_MESSAGE_MAX = 10; // https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
const SSM_CONCURRENT_LIMIT = 25;    // https://docs.aws.amazon.com/general/latest/gr/aws_service_limits.html
const PADDING_AMOUNT_FOR_SSM = 2;   // We will effectively consider the SSM_CONCURRENT_LIMIT to be the true max minus this padding value. This helps avoid having automations queued within SSM
const SSM_ACTIVE_AND_PENDING_STATUSES = ['Pending', 'InProgress', 'Waiting', 'Cancelling'];

/**
 * Computes the current number of active & pending SSM automation steps and determines if there is bandwidth to start additional executions.
 * If there is bandwidth, reads messages (up to the current SQS max) off the passed QueueUrl and for each message, starts an SSM 
 * automation execution to perform the given action.
 * Invoked by a scheduled CloudWatch Event Rule. 
 * @param event CloudWatch Event Rule. Should be configured to send Constant JSON containing a QueueUrl.
 */
export const handler = async (event: any = {}): Promise<any> => {
    logger.info(`Received event: ${JSON.stringify(event, null, 2)}`);

    if (!event.QueueUrl) {
        throw new Error('QueueUrl was not passed');
    } else {
        try {
            const maxNumOfMessages: number = await getMaxNumberOfMessagesToReadFromQueue();
            logger.info(`Max num of messages to read from queue: ${maxNumOfMessages}`);

            if (maxNumOfMessages === 0) {
                logger.info('SSM is at its limit for active automations. Not going to read from the queue at this time.');
                return 'SSM is at its limit for active automations. Not going to read from the queue at this time.';
            } else {
                const messagesFromQueue = await getMessagesFromQueue(event.QueueUrl, maxNumOfMessages);
                if (messagesFromQueue.length === 0) {
                    logger.info('No messages on the queue to process');
                    return 'No messages on the queue to process';
                } else {
                    let failedMessages = 0;

                    for (let i = 0; i < messagesFromQueue.length; i++) {
                        const sqsMsg = messagesFromQueue[i];

                        if (sqsMsg) {
                            await processMessageFromQueue(sqsMsg, sqsMsg.ReceiptHandle).catch(err => {
                                // If there's an error processing a message, leave it on the queue and it will be retried after
                                // the visibility timeout elapses. If it fails multiple times, it should end up in a dead letter queue
                                logger.error('Error while attempting to proceess message from queue.', err);
                                failedMessages++;
                            });
                        }
                    }

                    if (failedMessages > 0) {
                        logger.info(`${failedMessages} (${((failedMessages / messagesFromQueue.length) * 100).toFixed(2)} %) were not processed successfully. They are going to remain on the queue.`);
                        return `${failedMessages} (${((failedMessages / messagesFromQueue.length) * 100).toFixed(2)} %) were not processed successfully. They are going to remain on the queue.`;
                    } else {
                        logger.info(`All (${messagesFromQueue.length}) automation executions were successfully started`);
                        return `All (${messagesFromQueue.length}) automation executions were successfully started`;
                    }
                }
            }
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }
};

/**
 * Looks for active/pending SSM automations (and their underlying steps) to determine the maximum number of messages that should be read off the SQS queue
 */
async function getMaxNumberOfMessagesToReadFromQueue(): Promise<number> {
    let data: AWS.SSM.DescribeAutomationExecutionsResult = null;

    try {
        data = await ssm.describeAutomationExecutions({ Filters: [{ Key: 'ExecutionStatus', 'Values': SSM_ACTIVE_AND_PENDING_STATUSES }], MaxResults: SSM_CONCURRENT_LIMIT }).promise();
    } catch (err) {
        logger.error('Unable to query SSM for active executions. ssm.describeAutomationExecutions returned an error');
        throw (err);
    }

    if (!data) {
        throw (new Error('Unexpected response from ssm.describeAutomationExecutions'));
    }

    if (!data.AutomationExecutionMetadataList) {
        // The API should at least return an empty array
        logger.error('Unable to determine number of active SSM executions');
        throw (new Error('ssm.describeAutomationExecutions response did not contain AutomationExecutionMetadataList'));
    } else if (data.AutomationExecutionMetadataList.length >= (SSM_CONCURRENT_LIMIT - PADDING_AMOUNT_FOR_SSM)) {
        logger.info(`SSM is either close to or at its limit of active executions (${SSM_CONCURRENT_LIMIT}). We won't read anything from the queue in this case.`);
        return 0;
    } else if (data.AutomationExecutionMetadataList.length === 0) {
        // Since there are no automations currently running, read the max number of messages off the queue
        logger.info('There are no SSM automations running');
        return SQS_RECEIVE_MESSAGE_MAX;
    } else {
        logger.info(`Current active/pending automations: ${data.AutomationExecutionMetadataList.length}`);

        const getActiveSteps = data.AutomationExecutionMetadataList.map(a => {
            return getNumberOfActiveStepsForAutomationId(a.AutomationExecutionId, SSM_CONCURRENT_LIMIT);
        });

        const activeSteps = await Promise.all(getActiveSteps);

        const totalActiveAutomationSteps = activeSteps.reduce((x, y) => x + y, 0);

        logger.info(`Current active/pending automation steps: ${totalActiveAutomationSteps}`);

        const maxMessagesToRead = SSM_CONCURRENT_LIMIT - PADDING_AMOUNT_FOR_SSM - totalActiveAutomationSteps;

        if (maxMessagesToRead < 0) {
            // Negative number here means we don't have bandwidth in SSM to add more automations.
            // Return 0 so we don't bother reading from the queue
            return 0;
        } else if (maxMessagesToRead > SQS_RECEIVE_MESSAGE_MAX) {
            // We have extra bandwidth in SSM but there's a limit in SQS. Return the SQS limit
            return SQS_RECEIVE_MESSAGE_MAX;
        } else {
            // Return the amount of executions we can add to SSM before they start being queued on the SSM side
            return maxMessagesToRead;
        }
    }
}

/**
 * Returns the number of active & pending steps within a given automation execution
 * @param automationID The ID of the automation execution to query
 * @param maxResults The maximum number of steps to query for
 */
async function getNumberOfActiveStepsForAutomationId(automationID: string, maxResults: number): Promise<number> {
    const ssmParams: AWS.SSM.DescribeAutomationStepExecutionsRequest = {
        AutomationExecutionId: automationID,
        Filters: [{ Key: 'StepExecutionStatus', 'Values': SSM_ACTIVE_AND_PENDING_STATUSES }],
        MaxResults: maxResults
    };

    let data: AWS.SSM.DescribeAutomationStepExecutionsResult = null;

    try {
        data = await ssm.describeAutomationStepExecutions(ssmParams).promise();
    } catch (err) {
        logger.error(`SSM returned an error while looking up the number of active/pending automation steps for AutomationExecutionId: ${automationID}`);
        throw (err);
    }

    if (!data) {
        logger.error(`SSM did not return a valid response to ssm.describeAutomationStepExecutions when looking up the number of active/pending automation steps for AutomationExecutionId: ${automationID}`);
        throw (new Error(`Issue while looking up the number of active/pending automation steps for AutomationExecutionId: ${automationID}`));
    } else if (!data.StepExecutions) {
        logger.error(`In the response from ssm.describeAutomationStepExecutions, StepExecutions array was empty or did not exist when looking up the number of active/pending automation steps for AutomationExecutionId: ${automationID}`);
        throw (new Error(`Issue while looking up the number of active/pending automation steps for AutomationExecutionId: ${automationID}`));
    }

    return data.StepExecutions.length;
}

/**
 * Calls ReceiveMessage on the passed QueueUrl and returns an array of AWS.SQS.Message objects to be handled by the caller
 * @param queueURL The URL of the queue off which to read messages
 * @param maxNumberOfMessages The maximum number of messages to be read
 */
async function getMessagesFromQueue(queueURL: string, maxNumberOfMessages: number): Promise<AWS.SQS.Message[]> {
    try {
        const sqsParams: AWS.SQS.ReceiveMessageRequest = {
            QueueUrl: queueURL,
            MaxNumberOfMessages: maxNumberOfMessages
        };

        let data = await sqs.receiveMessage(sqsParams).promise();

        if (!data.Messages || data.Messages.length === 0) {
            return [];
        } else {
            return data.Messages;
        }
    } catch (err) {
        logger.error(`Error while getting messages from Queue: ${queueURL}`);
        throw (err);
    }
}

/**
 * Processes the message from the queue by calling SSM to start an automation execution. The message body itself
 * should contain all the information needed to execute the action.
 * @param msg The message that was read off the SQS queue
 */
async function processMessageFromQueue(msg: AWS.SQS.Message, msgReceiptHandle: string): Promise<AWS.SSM.StartAutomationExecutionResult> {
    if (!msg.Body) {
        throw (new Error('SQS Message did not contain a Body'));
    }

    let parsedMsgBody = null;

    try {
        parsedMsgBody = JSON.parse(msg.Body);
    } catch (err) {
        throw (new Error('Unable to parse the SQS Message Body'));
    }

    if (!parsedMsgBody.AutomationDocumentName) {
        // Without the AutomationDocumentName here, we don't know what automation document to execute in SSM
        throw (new Error('SQS Message Body is missing AutomationDocumentName'));
    }

    const ssmParams: AWS.SSM.StartAutomationExecutionRequest = {
        DocumentName: parsedMsgBody.AutomationDocumentName,
        Parameters: {
            SQSMsgBody: [JSON.stringify(parsedMsgBody)],
            SQSMsgReceiptHandle: [msgReceiptHandle]
        }
    };

    // Set parameters that are specific to a given action
    parsedMsgBody.TaskParameters.forEach((taskParameter: any) => {
        if (taskParameter.name !== 'SQSMsgBody' && taskParameter.name !== 'SQSMsgReceiptHandle') {
            if (taskParameter.value && taskParameter.value.trim() !== '') {
                ssmParams.Parameters[taskParameter.name] = [taskParameter.value];
            }
        }
    });

    try {
        const data = await ssm.startAutomationExecution(ssmParams).promise();
        return data;
    } catch (err) {
        logger.error('Error while starting an automation document in SSM');
        throw (err);
    }
}
