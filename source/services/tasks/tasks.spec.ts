import { Task } from './tasks';

process.env.CloudFormationBucket = 'cloudformation-bucket';
process.env.MasterSnsArn = 'arn:of:mater:sns';
process.env.Region = 'mock-region-1'

// Trigger type enum
enum TriggerType {
    Schedule = 'Schedule',
    Event = 'Event'
}

// Scheduled type enum
enum ScheduledType {
    CronExpression = 'CronExpression',
    FixedRate = 'FixedRate'
}

// Scheduled fixed rate type enum
enum ScheduledFixedRateType {
    minutes = 'minutes',
    hours = 'hours',
    days = 'days'
}

const mockCronExpressionTask = {
    taskId: 'mock-id',
    name: 'mock-cron-expression-task',
    description: 'Task to test mock',
    targetTag: 'mock-tag',
    taskParameters: [
        {
            Name: 'parameter',
            Type: 'String',
            Description: 'parameter description',
            Value: 'parameter'
        }
    ],
    accounts: ['000000000000', '111111111111'],
    regions: ['region-a', 'region-b'],
    actionName: 'action',
    triggerType: TriggerType.Schedule,
    scheduledType: ScheduledType.CronExpression,
    scheduledCronExpression: '* * * * ? *',
    enabled: true
};

const mockFixedRateTask = {
    taskId: 'mock-id',
    name: 'mock-fixed-rate-task',
    description: 'Task to test mock',
    targetTag: 'mock-tag',
    taskParameters: [
        {
            Name: 'parameter',
            Type: 'String',
            Description: 'parameter description',
            Value: 'parameter'
        }
    ],
    accounts: ['000000000000', '111111111111'],
    regions: ['region-a', 'region-b'],
    actionName: 'action',
    triggerType: TriggerType.Schedule,
    scheduledType: ScheduledType.FixedRate,
    scheduledFixedRateInterval: 5,
    scheduledFixedRateType: 'minutes',
    enabled: true
};

const mockEventTask = {
    taskId: 'mock-id',
    name: 'mock-event-task',
    description: 'Task to test mock',
    targetTag: 'mock-tag',
    taskParameters: [
        {
            Name: 'parameter',
            Type: 'String',
            Description: 'parameter description',
            Value: 'parameter'
        }
    ],
    accounts: ['000000000000', '111111111111'],
    regions: ['region-a', 'region-b'],
    actionName: 'action',
    triggerType: TriggerType.Event,
    eventPattern: '{"someKey": "someValue"}',
    enabled: true
};

const mockDynamoDbTaskExecution = {
    taskId: 'mock-task-id',
    parentExecutionId: 'mock-parent-execution-id',
    status: 'pending',
    startTime: '2019-09-14T00:00:00.0',
    endTime: '2019-09-14T01:00:00.0',
    totalResourceCount: 100,
    completedResourceCount: 50
};

const mockDynamoDbAutomationExecution = {
    parentExecutionId: 'mock-parent-execution-id',
    automationExecutionId: 'mock-execution-id',
    status: 'pending',
    startTime: '2019-09-14T00:00:00.0',
    endTime: '2019-09-14T01:00:00.0'
};

const mockExecution = {
     // This returns a lot of informations, so just make it simple for the test.
    AutomationExecution: {
        AutomationExecutionId: mockDynamoDbAutomationExecution.automationExecutionId,
        DocumentName: 'mock-document',
        Mode: 'Auto'
    }
};

const mockCloudFormationTemplate = `
Mappings:
    NeedsToChange:
        DocumentAssumeRole:
            Name: "%%DOCUMENT_ASSUME_ROLE%%"
Resources:
`;

const mockRegions = {
    Regions : [
        {
            Endpoint: 'ec2.region-a.amazonaws.com',
            RegionName: 'region-a'
        },
        {
            Endpoint: 'ec2.region-b.amazonaws.com',
            RegionName: 'region-b'
        },
        {
            Endpoint: 'ec2.region-c.amazonaws.com',
            RegionName: 'region-c'
        }
    ]
};

const mockPolicy = {
    Version: '2008-10-17',
    Statement: [
        {
            Sid: 'default',
            Effect: 'Allow',
            Principal: {
                AWS: 'mock-role'
            },
            Action: [
                's3:GetObject'
            ],
            Resource: [
                'arn-of-s3-bucket'
            ]
        },
        {
            Sid: 'some-task',
            Effect: 'Allow',
            Principal: {
                AWS: 'mock-role'
            },
            Action: [
                's3:GetObject'
            ],
            Resource: [
                'arn-of-s3-bucket'
            ]
        },
        {
            Sid: 'mock-id',
            Effect: 'Allow',
            Principal: {
                AWS: 'mock-role'
            },
            Action: [
                's3:GetObject'
            ],
            Resource: [
                'arn-of-s3-bucket'
            ]
        }
    ]
}
const mockS3Policy = {
    Policy: JSON.stringify(mockPolicy)
};

const mockKmsPolicy = {
    Policy: JSON.stringify({
        Version: '2008-10-17',
        Statement: [
            {
                Sid: 'default',
                Effect: 'Allow',
                Principal: {
                    AWS: 'mock-role'
                },
                Action: [
                    'kms:*'
                ],
                Resource: [
                    '*'
                ]
            }
        ]
    })
};

const mockDynamoDb = jest.fn();
jest.mock('aws-sdk/clients/dynamodb', () => {
    return {
        DocumentClient: jest.fn(() => ({
            scan: mockDynamoDb,
            query: mockDynamoDb,
            get: mockDynamoDb,
            put: mockDynamoDb,
            delete: mockDynamoDb
        }))
    };
});
jest.mock('uuid', () => {
    return {
        v4: jest.fn(() => 'mock-id')
    };
});
const mockCloudWatchEvents = jest.fn();
const mockSsm = jest.fn();
const mockLambda = jest.fn();
const mockS3 = jest.fn();
const mockSns = jest.fn();
const mockKms = jest.fn();
const mockEc2 = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        CloudWatchEvents: jest.fn(() => ({
            listRules: mockCloudWatchEvents,
            putRule: mockCloudWatchEvents,
            putTargets: mockCloudWatchEvents,
            deleteRule: mockCloudWatchEvents,
            removeTargets: mockCloudWatchEvents
        })),
        SSM: jest.fn(() => ({
            startAutomationExecution: mockSsm,
            getAutomationExecution: mockSsm
        })),
        Lambda: jest.fn(() => ({
            addPermission: mockLambda,
            removePermission: mockLambda,
            invoke: mockLambda
        })),
        S3: jest.fn(() => ({
            getObject: mockS3,
            putObject: mockS3,
            deleteObject: mockS3,
            getBucketPolicy: mockS3,
            deleteBucketPolicy: mockS3,
            putBucketPolicy: mockS3
        })),
        SNS: jest.fn(() => ({
            addPermission: mockSns,
            removePermission: mockSns
        })),
        KMS: jest.fn(() => ({
            getKeyPolicy: mockKms,
            putKeyPolicy: mockKms
        })),
        EC2: jest.fn(() => ({
            describeRegions: mockEc2,
        }))
    };
});

const task = new Task();

describe('Tasks', () => {
    describe('getTasks', () => {
        beforeEach(() => {
            mockDynamoDb.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [mockCronExpressionTask]
                        });
                    }
                };
            });

            task.getTasks().then((data) => {
                expect(data).toEqual([{
                    taskId: mockCronExpressionTask.taskId,
                    name: mockCronExpressionTask.name,
                    description: mockCronExpressionTask.description
                }]);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when scanning DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getTasks().then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetTasksFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting tasks.'
                });
                done();
            });
        });
    });

    describe('getTask', () => {
        beforeEach(() => {
            mockDynamoDb.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            });

            task.getTask(mockCronExpressionTask.taskId).then((data) => {
                expect(data).toEqual(mockCronExpressionTask);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when taskId is empty', (done) => {
            task.getTask('').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetTaskFailure',
                    statusCode: 400,
                    message: 'Task ID cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when task not found', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({});
                    }
                };
            });

            task.getTask(mockCronExpressionTask.taskId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetTaskFailure',
                    statusCode: 404,
                    message: 'Task not found.'
                });
                done();
            });
        });

        test('returns an error when getting DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getTask(mockCronExpressionTask.taskId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetTaskFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting a task.'
                });
                done();
            });
        });
    });

    describe('createTask', () => {
        let templateUrl = `https://${process.env.CloudFormationBucket}.s3.${process.env.Region}.amazonaws.com/action/mock-id.template`;
        let cronExpressionTask = {
            name: 'mock-cron-expression-task',
            description: 'Task to test mock',
            targetTag: 'mock-tag',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            accounts: '000000000000,111111111111',
            regions: 'region-a,region-b',
            actionName: 'action',
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.CronExpression,
            scheduledCronExpression: '* * * * ? *',
            enabled: true
        };

        let fixedRateTask = {
            name: 'mock-fixed-rate-task',
            description: 'Task to test mock',
            targetTag: 'mock-tag',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            accounts: '000000000000,111111111111',
            regions: 'region-a,region-b',
            actionName: 'action',
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.FixedRate,
            scheduledFixedRateInterval: '5',
            scheduledFixedRateType: ScheduledFixedRateType.minutes,
            enabled: true
        };

        let eventTask = {
            name: 'mock-event-task',
            description: 'Task to test mock',
            targetTag: 'mock-tag',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            accounts: '000000000000,111111111111',
            regions: 'region-a,region-b',
            actionName: 'action',
            triggerType: TriggerType.Event,
            eventPattern: '{"someKey": "someValue"}',
            enabled: true
        };

        beforeEach(() => {
            mockDynamoDb.mockReset();
            mockCloudWatchEvents.mockReset();
            mockS3.mockReset();
            mockSns.mockReset();
            mockKms.mockReset();
            mockEc2.mockReset();
        });

        test('returns a success response - CronExpression', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.createTask(cronExpressionTask).then((data) => {
                let result = {
                    ...mockCronExpressionTask,
                    templateUrl
                };
                expect(data).toEqual(result);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response - FixedRate', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.createTask(fixedRateTask).then((data) => {
                let result = {
                    ...mockFixedRateTask,
                    templateUrl
                };
                expect(data).toEqual(result);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response - FixedRate - 1 Hour', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            fixedRateTask.scheduledFixedRateInterval = '1';
            fixedRateTask.scheduledFixedRateType = ScheduledFixedRateType.hours;

            let copyMockFixedRateTask = mockFixedRateTask;
            copyMockFixedRateTask.scheduledFixedRateInterval = 1;
            copyMockFixedRateTask.scheduledFixedRateType = 'hour'

            task.createTask(fixedRateTask).then((data) => {
                let result = {
                    ...copyMockFixedRateTask,
                    templateUrl
                };
                expect(data).toEqual(result);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when putting DynamoDB fails', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.createTask(cronExpressionTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateTaskFailure',
                    statusCode: 500,
                    message: 'Error occurred while creating a task.'
                });
                done();
            });
        });

        test('returns a success response - Event', (done) => {
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.createTask(eventTask).then((data) => {
                let result = {
                    ...mockEventTask,
                    templateUrl
                };
                expect(data).toEqual(result);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when required value is empty', (done) => {
            eventTask.name = '';
            task.createTask(eventTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateTaskFailure',
                    statusCode: 400,
                    message: 'Required values cannot be empty.'
                });
                done();
            });
        });
    });

    describe('editTask', () => {
        let templateUrl = `https://${process.env.CloudFormationBucket}.s3.${process.env.Region}.amazonaws.com/action/mock-id.template`;
        let updatedTask = {
            taskId: mockCronExpressionTask.taskId,
            name: 'mock-cron-expression-task',
            description: 'Task to test mock',
            targetTag: 'mock-tag',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            accounts: '000000000000,111111111111',
            regions: 'region-a,region-b',
            actionName: 'action',
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.CronExpression,
            scheduledCronExpression: '* * * * ? *',
            enabled: false,
            templateUrl
        };

        let updatedTaskResult = {
            taskId: mockCronExpressionTask.taskId,
            name: 'mock-cron-expression-task',
            description: 'Task to test mock',
            targetTag: 'mock-tag',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            accounts: ['000000000000', '111111111111'],
            regions: ['region-a', 'region-b'],
            actionName: 'action',
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.CronExpression,
            scheduledCronExpression: '* * * * ? *',
            enabled: false,
            templateUrl
        };

        beforeEach(() => {
            mockDynamoDb.mockReset();
            mockCloudWatchEvents.mockReset();
            mockS3.mockReset();
            mockEc2.mockReset();
            mockSns.mockReset();
            mockKms.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                // get
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // put
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // listRule
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: []
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putRule
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // addPermission
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.editTask(mockCronExpressionTask.taskId, updatedTask).then((data) => {
                expect(data).toEqual(updatedTaskResult);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when putting DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                // get
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // put
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // listRule
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: []
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putRule
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // addPermission
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.editTask(mockCronExpressionTask.taskId, updatedTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditTaskFailure',
                    statusCode: 500,
                    message: 'Error occurred while editing a task.'
                });
                done();
            });
        });

        test('returns a success response for event type', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                // get
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // put
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // listRule
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: []
                        });
                    }
                };
            });
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            updatedTask.triggerType = TriggerType.Event;
            delete updatedTask.scheduledType;
            delete updatedTask.scheduledCronExpression;
            updatedTask['eventPattern'] = '{"someKey": "someValue"}';

            updatedTaskResult.triggerType = TriggerType.Event;
            delete updatedTaskResult.scheduledType;
            delete updatedTaskResult.scheduledCronExpression;
            updatedTaskResult['eventPattern'] = '{"someKey": "someValue"}';

            task.editTask(mockCronExpressionTask.taskId, updatedTask).then((data) => {
                expect(data).toEqual(updatedTaskResult);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when required fields are empty - taskId', (done) => {
            task.editTask('', updatedTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditTaskFailure',
                    statusCode: 400,
                    message: 'Required values cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when enabled is undefined', (done) => {
            updatedTask.enabled = undefined;
            task.editTask(mockCronExpressionTask.taskId, updatedTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditTaskFailure',
                    statusCode: 400,
                    message: 'Enabled parameter cannot be undefined.'
                });
                done();
            });
        });
    });

    describe('deleteTask', () => {
        beforeEach(() => {
            mockDynamoDb.mockReset();
            mockCloudWatchEvents.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockCloudWatchEvents.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: [
                                {
                                    EventPattern: 'event-pattern-json-string',
                                    State: 'ENABLED',
                                    Name: 'name-of-rule',
                                    Arn: 'arn-of-rule'
                                }
                            ]
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockS3.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.deleteTask(mockCronExpressionTask.taskId).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when taskId is empty', (done) => {
            task.deleteTask('').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteTaskFailure',
                    statusCode: 400,
                    message: 'Task ID cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when task not found', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({});
                    }
                };
            });

            task.deleteTask(mockCronExpressionTask.taskId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteTaskFailure',
                    statusCode: 404,
                    message: 'Task not found.'
                });
                done();
            });
        });

        test('returns an error when deleting DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockCloudWatchEvents.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.deleteTask(mockCronExpressionTask.taskId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteTaskFailure',
                    statusCode: 500,
                    message: 'Error occurred while deleting a task.'
                });
                done();
            });
        });
    });

    describe('getTaskExecutions', () => {
        beforeEach(() => {
            mockDynamoDb.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [ mockDynamoDbTaskExecution ]
                        });
                    }
                };
            });

            task.getTaskExecutions(mockDynamoDbTaskExecution.taskId, 'DESC', 1).then((data) => {
                expect(data).toEqual({
                    Items: [ mockDynamoDbTaskExecution ]
                });
                done();
            }).catch((error) => {
                done(error);
            })

        });

        test('returns a success response with DynamoDB LastEvaluatedKey', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [mockDynamoDbTaskExecution],
                            LastEvaluatedKey: {
                                taskId: 'mock-task-id',
                                parentExecutionId: 'last-parent-execution-id',
                                startTime: '2019-09-14T00:00:00.0'
                            }
                        });
                    }
                };
            });

            task.getTaskExecutions(mockDynamoDbTaskExecution.taskId, 'DESC', 1).then((data) => {
                expect(data).toEqual({
                    Items: [ mockDynamoDbTaskExecution ],
                    LastEvaluatedKey: {
                        taskId: 'mock-task-id',
                        parentExecutionId: 'last-parent-execution-id',
                        startTime: '2019-09-14T00:00:00.0'
                    }
                });
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response to next page', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [ mockDynamoDbTaskExecution ]
                        });
                    }
                };
            });

            let lastEvaluatedKey = {
                taskId: 'mock-task-id',
                parentExecutionId: 'last-parent-execution-id',
                startTime: '2019-09-14T00:00:00.0'
            };

            task.getTaskExecutions(mockDynamoDbTaskExecution.taskId, 'DESC', 1, lastEvaluatedKey).then((data) => {
                expect(data).toEqual({
                    Items: [ mockDynamoDbTaskExecution ]
                });
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when taskId is empty', (done) => {
            task.getTaskExecutions('').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetTaskExecutionsFailure',
                    statusCode: 400,
                    message: 'Task ID cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when querying DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getTaskExecutions(mockDynamoDbTaskExecution.taskId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetTaskExecutionsFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting task executions.'
                });
                done();
            });
        });
    });

    describe('getAutomationExecutions', () => {
        beforeEach(() => {
            mockDynamoDb.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [ mockDynamoDbAutomationExecution ]
                        });
                    }
                };
            });

            task.getAutomationExecutions(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, 1).then((data) => {
                expect(data).toEqual({
                    Items: [ mockDynamoDbAutomationExecution ]
                });
                done();
            }).catch((error) => {
                done(error);
            })

        });

        test('returns a success response with DynamoDB LastEvaluatedKey', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [ mockDynamoDbAutomationExecution ],
                            LastEvaluatedKey: {
                                parentExecutionId: 'mock-parent-execution-id',
                                automationExecutionId: 'last-execution-id'
                            }
                        });
                    }
                };
            });

            task.getAutomationExecutions(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, 1).then((data) => {
                expect(data).toEqual({
                    Items: [ mockDynamoDbAutomationExecution ],
                    LastEvaluatedKey: {
                        parentExecutionId: 'mock-parent-execution-id',
                        automationExecutionId: 'last-execution-id'
                    }
                });
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response to next page', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Items: [ mockDynamoDbAutomationExecution ]
                        });
                    }
                };
            });

            let lastEvaluatedKey = {
                parentExecutionId: 'mock-parent-execution-id',
                automationExecutionId: 'last-execution-id'
            };

            task.getAutomationExecutions(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, 1, lastEvaluatedKey).then((data) => {
                expect(data).toEqual({
                    Items: [ mockDynamoDbAutomationExecution ]
                });
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when taskId and parentExecutionId are empty', (done) => {
            task.getAutomationExecutions('', '').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionsFailure',
                    statusCode: 400,
                    message: 'Task ID and parent execution ID cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when task execution not found from DynamoDB', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({});
                    }
                };
            });

            task.getAutomationExecutions(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionsFailure',
                    statusCode: 404,
                    message: 'Task execution not found for the task.'
                });
                done();
            });
        });

        test('returns an error when getting task execution from DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getAutomationExecutions(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionsFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting a task execution.'
                });
                done();
            });
        });

        test('returns an error when querying DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getAutomationExecutions(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionsFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting automation executions.'
                });
                done();
            });
        });
    });

    describe('getAutomationExecution', () => {
        beforeEach(() => {
            mockDynamoDb.mockReset();
            mockSsm.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbAutomationExecution
                        });
                    }
                };
            });
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockExecution);
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then((data) => {
                expect(data).toEqual(mockExecution.AutomationExecution);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when taskId,parentExecutionId, and automationExecutionId are empty', (done) => {
            task.getAutomationExecution('', '', '').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 400,
                    message: 'Task ID, parent execution ID and automation execution ID cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when task execution not found from DynamoDB', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({});
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 404,
                    message: 'Task execution not found for the task.'
                });
                done();
            });
        });

        test('returns an error when getting task execution from DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting an execution from DynamoDB.'
                });
                done();
            });
        });

        test('returns an error when automation execution not found from DynamoDB', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({});
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 404,
                    message: 'Automation execution not found for the task.'
                });
                done();
            });
        });

        test('returns an error when getting automation execution from DynamoDB fails', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting an execution from DynamoDB.'
                });
                done();
            });
        });

        test('returns an error when execution not found from SSM', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbAutomationExecution
                        });
                    }
                };
            });
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject({
                            code: 'AutomationExecutionNotFoundException',
                            statusCode: 400,
                            message: `Automation execution ${mockDynamoDbAutomationExecution.automationExecutionId} does not exist.`
                        });
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then((data) => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 400,
                    message: `Automation execution ${mockDynamoDbAutomationExecution.automationExecutionId} does not exist.`
                });
                done();
            });
        });

        test('returns an error when getting SSM execution fails', (done) => {
            mockDynamoDb.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbTaskExecution
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockDynamoDbAutomationExecution
                        });
                    }
                };
            });
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getAutomationExecution(mockDynamoDbTaskExecution.taskId, mockDynamoDbAutomationExecution.parentExecutionId, mockDynamoDbAutomationExecution.automationExecutionId).then((data) => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAutomationExecutionFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting an automation execution.'
                });
                done();
            });
        });
    });

    describe('checkParameterValue', () => {
        let parameters = [
            {
                Name: 'required-parameter',
                Type: 'String',
                Description: '(Required) This is a required parameter.',
                Value: 'value'
            },
            {
                Name: 'optional-parameter',
                Type: 'String',
                Description: '(Optional) This is an optional parameter.'
            }
        ];

        test('returns a success response', (done) => {
            task.checkParameterValue(parameters).then((data) => {
                expect(data).toEqual(parameters);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response with default value for the empty required parameter', (done) => {
            delete parameters[0]['Value'];
            parameters[0]['DefaultValue'] = 'default';

            task.checkParameterValue(parameters).then((data) => {
                expect(data).toEqual([
                    {
                        Name: 'required-parameter',
                        Type: 'String',
                        Description: '(Required) This is a required parameter.',
                        Value: 'default',
                        DefaultValue: 'default'
                    },
                    {
                        Name: 'optional-parameter',
                        Type: 'String',
                        Description: '(Optional) This is an optional parameter.'
                    }
                ]);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response when default value or value is null', (done) => {
            parameters[0]['DefaultValue'] = null;
            parameters[1]['Value'] = null;

            task.checkParameterValue(parameters).then((data) => {
                expect(data).toEqual([
                    {
                        Name: 'required-parameter',
                        Type: 'String',
                        Description: '(Required) This is a required parameter.',
                        Value: 'default',
                        DefaultValue: ''
                    },
                    {
                        Name: 'optional-parameter',
                        Type: 'String',
                        Description: '(Optional) This is an optional parameter.',
                        Value: ''
                    }
                ]);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when a required parameter is undefined', (done) => {
            delete parameters[0]['Value'];
            delete parameters[0]['DefaultValue'];

            task.checkParameterValue(parameters).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CheckParameterValueFailure',
                    statusCode: 400,
                    message: 'Required parameter cannot be empty: required-parameter'
                });
                done();
            });
        });

        test('returns an error when a required parameter is empty', (done) => {
            parameters[0]['Value'] = ' ';

            task.checkParameterValue(parameters).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CheckParameterValueFailure',
                    statusCode: 400,
                    message: 'Required parameter cannot be empty: required-parameter'
                });
                done();
            });
        });
    });

    describe('buildTaskItem', () => {
        let buildTask = {
            name: 'mock-cron-expression-task',
            description: 'Task to test mock',
            targetTag: 'mock-tag',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            accounts: '000000000000,111111111111',
            regions: 'region-a,region-b',
            actionName: 'action',
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.CronExpression,
            scheduledCronExpression: '* * * * ? *',
            enabled: true
        };

        beforeEach(() => {
            mockEc2.mockReset();
        });

        test('returns a success response - CronExpression', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.buildTaskItem(buildTask).then((data) => {
                expect(data).toEqual(mockCronExpressionTask);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when scheduledCronExpression is invalid', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            delete buildTask['scheduledCronExpression'];
            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Missing key/value: scheduledCronExpression'
                });
                done();
            });
        });

        test('returns a success response - FixedRate', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['name'] = 'mock-fixed-rate-task';
            buildTask['scheduledType'] = ScheduledType.FixedRate;
            buildTask['scheduledFixedRateInterval'] = '5';
            buildTask['scheduledFixedRateType'] = ScheduledFixedRateType.minutes;

            let copyMockFixedRateTask = mockFixedRateTask;
            copyMockFixedRateTask.scheduledFixedRateInterval = 5;
            copyMockFixedRateTask.scheduledFixedRateType = 'minutes'

            task.buildTaskItem(buildTask).then((data) => {
                expect(data).toEqual(copyMockFixedRateTask);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response - FixedRate - Interval 1', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['scheduledFixedRateInterval'] = '1';

            let copyMockFixedRateTask = mockFixedRateTask;
            copyMockFixedRateTask.scheduledFixedRateInterval = 1;
            copyMockFixedRateTask.scheduledFixedRateType = 'minute'

            task.buildTaskItem(buildTask).then((data) => {
                expect(data).toEqual(copyMockFixedRateTask);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when scheduledFixedRateInterval is undefined', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            delete buildTask['scheduledFixedRateInterval'];

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Missing key/value: scheduledFixedRateInterval'
                });
                done();
            });
        });

        test('returns an error when scheduledFixedRateType is invalid', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['scheduledFixedRateInterval'] = 'invalid';

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Invalid interval (1 <= interval, integer).'
                });
                done();
            });
        });

        test('returns an error when scheduledFixedRateType is undefined', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['scheduledFixedRateInterval'] = '5';
            delete buildTask['scheduledFixedRateType'];

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Missing key/value: scheduledFixedRateType'
                });
                done();
            });
        });

        test('returns a success response - Event', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            delete buildTask['scheduledFixedRateInterval'];
            buildTask['triggerType'] = TriggerType.Event;
            buildTask['name'] = 'mock-event-task';
            buildTask['eventPattern'] = '{"someKey": "someValue"}';

            task.buildTaskItem(buildTask).then((data) => {
                expect(data).toEqual(mockEventTask);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when eventPattern is undefined', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            delete buildTask['eventPattern'];

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Missing key/value: eventPattern'
                });
                done();
            });
        });

        test('returns an error when eventPattern is invalid JSON', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['eventPattern'] = '{"invalid"}';

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Invalid eventPattern: Unexpected token } in JSON at position 10'
                });
                done();
            });
        });

        test ('returns an error when region is invalid', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['regions'] = 'invalid-region-a';

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Invalid region: invalid-region-a'
                });
                done();
            });
        });

        test ('returns an error when account is invalid', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            buildTask['regions'] = 'region-a,region-b';
            buildTask['accounts'] = 'invalid-account';

            task.buildTaskItem(buildTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'BuildTaskItemFailure',
                    statusCode: 400,
                    message: 'Invalid account, account should be 12 digit number: invalid-account'
                });
                done();
            });
        })
    });

    describe('putCloudWatchEventRule', () => {
        let simpleTask = {
            taskId: 'mock-id',
            description: 'Task to test mock',
            taskParameters: [
                {
                    Name: 'parameter',
                    Type: 'String',
                    Description: 'parameter description',
                    Value: 'parameter'
                }
            ],
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.CronExpression,
            scheduledCronExpression: '* * * * ? *'
        };

        beforeEach(() => {
            mockCloudWatchEvents.mockReset();
        });

        test('returns a success response - CronExpression', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // putRule
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // addPermission
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response - FixedRate', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // putRule
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // addPermission
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            delete simpleTask['scheduledCronExpression'];
            simpleTask['scheduleType'] = ScheduledType.FixedRate;
            simpleTask['scheduledFixedRateInterval'] = 5;
            simpleTask['scheduledFixedRateType'] = 'minutes';

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when CloudWatchEvents putRule fails', (done) => {
            mockCloudWatchEvents.mockImplementation(() => {
                // putRule
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'PutCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while putting a CloudWatchEvents rule.'
                });
                done();
            });
        });

        test('returns an error when CloudWatchEvents putTargets fails', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // putRule
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putTargets
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'PutCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while putting CloudWatchEvents targets.'
                });
                done();
            });
        });

        test('returns an error when adding Lambda permission fails', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // putRule
                return {
                    promise() {
                        return Promise.resolve({
                            RuleArn: 'cloudwatch-events-rule-arn'
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // putTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // addPermission
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'PutCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while adding Lambda permission.'
                });
                done();
            });
        });

        test('returns an error when ScheduleExpression is invalid', (done) => {
            mockCloudWatchEvents.mockImplementation(() => {
                // putRule
                return {
                    promise() {
                        return Promise.reject({
                            code: 'ValidationException',
                            statusCode: 400,
                            message: 'Parameter ScheduleExpression is not valid.'
                        });
                    }
                };
            });

            simpleTask['scheduledFixedRateType'] = 'minute';

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'PutCloudWatchEventRuleFailure',
                    statusCode: 400,
                    message: 'Parameter ScheduleExpression is not valid.'
                });
                done();
            });
        });

        test('returns a success response - Event', (done) => {
            delete simpleTask['scheduleType'];
            delete simpleTask['scheduledFixedRateInterval'];
            delete simpleTask['scheduledFixedRateType'];
            simpleTask['triggerType'] = TriggerType.Event;
            simpleTask['eventPattern'] = '{"someKey": "someValue"}';

            task.putCloudWatchEventRule(simpleTask).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });
    });

    describe('deleteCloudWatchEventRule', () => {
        beforeEach(() => {
            mockCloudWatchEvents.mockReset();
        });

        test('returns a success response', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                return {
                    // listRules
                    promise() {
                        return Promise.resolve({
                            Rules: [
                                {
                                    EventPattern: 'event-pattern-json-string',
                                    State: 'ENABLED',
                                    Name: 'name-of-rule',
                                    Arn: 'arn-of-rule'
                                }
                            ]
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // removeTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // deleteRule
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // removePermission
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.deleteCloudWatchEventRule('taskId').then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response when CloudWatchEvents returns empty rules', (done) => {
            mockCloudWatchEvents.mockImplementation(() => {
                // listRules
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: []
                        });
                    }
                };
            });

            task.deleteCloudWatchEventRule('taskId').then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when CloudWatchEvent listRules fails', (done) => {
            mockCloudWatchEvents.mockImplementation(() => {
                // listRules
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.deleteCloudWatchEventRule('taskId').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while listing CloudWatchEvents rules.'
                });
                done();
            });
        });

        test('returns an error when removing Lambda permission fails', (done) => {
            mockCloudWatchEvents.mockImplementation(() => {
                // listRules
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: [
                                {
                                    EventPattern: 'event-pattern-json-string',
                                    State: 'ENABLED',
                                    Name: 'name-of-rule',
                                    Arn: 'arn-of-rule'
                                }
                            ]
                        });
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // removePermission
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.deleteCloudWatchEventRule('taskId').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while removing Lambda permission.'
                });
                done();
            });
        });

        test('returns an error when CloudWatchEvents removeTargets fails', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // listRules
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: [
                                {
                                    EventPattern: 'event-pattern-json-string',
                                    State: 'ENABLED',
                                    Name: 'name-of-rule',
                                    Arn: 'arn-of-rule'
                                }
                            ]
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // removeTargets
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.deleteCloudWatchEventRule('taskId').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while removing CloudWatchEvents targets.'
                });
                done();
            });
        });

        test('returns an error when CloudWatchEvents deleteRule fails', (done) => {
            mockCloudWatchEvents.mockImplementationOnce(() => {
                // listRules
                return {
                    promise() {
                        return Promise.resolve({
                            Rules: [
                                {
                                    EventPattern: 'event-pattern-json-string',
                                    State: 'ENABLED',
                                    Name: 'name-of-rule',
                                    Arn: 'arn-of-rule'
                                }
                            ]
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // removeTargets
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // deleteRule
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                // removePermission
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.deleteCloudWatchEventRule('taskId').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteCloudWatchEventRuleFailure',
                    statusCode: 500,
                    message: 'Error occurred while deleting a CloudWatchEvents rule.'
                });
                done();
            });
        });
    });

    describe('executeTask', () => {
        beforeEach(() => {
            mockSsm.mockReset();
            mockDynamoDb.mockReset();
        });

        test('returns a success response', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Payload: 'Success'
                        });
                    }
                };
            });

            task.executeTask(mockCronExpressionTask.taskId).then((data) => {
                expect(data).toEqual('Success');
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when invoking Lambda fails', (done) => {
            mockDynamoDb.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Item: mockCronExpressionTask
                        });
                    }
                };
            });
            mockLambda.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.executeTask(mockCronExpressionTask.taskId).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'ExecuteTaskFailure',
                    statusCode: 500,
                    message: 'Error occurred while executing a task.'
                });
                done();
            });
        });
    });

    describe('generateCloudFormationTemplate', () => {
        let simpleTask = {
            taskId: 'mock-id',
            description: 'Task to test mock',
            actionName: 'mock-action',
            accounts: ['000000000000', '111111111111'],
            triggerType: TriggerType.Schedule,
            scheduledType: ScheduledType.CronExpression,
            scheduledCronExpression: '* * * * ? *'
        };

        beforeEach(() => {
            mockS3.mockReset();
            mockKms.mockReset();
        });

        test('returns a success response - Schedule', (done) => {
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.generateCloudFormationTemplate(simpleTask).then((data) => {
                expect(data).toEqual(`https://${process.env.CloudFormationBucket}.s3.${process.env.Region}.amazonaws.com/${simpleTask.actionName}/${simpleTask.taskId}.template`);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response - Event', (done) => {
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            simpleTask['triggerType'] = TriggerType.Event;
            simpleTask['eventPattern'] = '{"someKey": "someValue"}';
            task.generateCloudFormationTemplate(simpleTask).then((data) => {
                expect(data).toEqual(`https://${process.env.CloudFormationBucket}.s3.${process.env.Region}.amazonaws.com/${simpleTask.actionName}/${simpleTask.taskId}.template`);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when getting S3 object fails', (done) => {
            mockS3.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.generateCloudFormationTemplate(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GenerateCloudFormationTemplateFailure',
                    statusCode: 500,
                    message: 'Error occurred while generating CloudFormation template.'
                });
                done();
            });
        });

        test('returns an error when putting S3 object fails', (done) => {
            mockS3.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.generateCloudFormationTemplate(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GenerateCloudFormationTemplateFailure',
                    statusCode: 500,
                    message: 'Error occurred while generating CloudFormation template.'
                });
                done();
            });
        });

        test('returns an error when getting S3 bucket policy fails', (done) => {
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                }
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.generateCloudFormationTemplate(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GenerateCloudFormationTemplateFailure',
                    statusCode: 500,
                    message: 'Error occurred while generating CloudFormation template.'
                });
                done();
            });
        });

        test('returns an error when deleting S3 bucket policy fails', (done) => {
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.generateCloudFormationTemplate(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GenerateCloudFormationTemplateFailure',
                    statusCode: 500,
                    message: 'Error occurred while generating CloudFormation template.'
                });
                done();
            });
        });

        test('returns an error when putting S3 bucket policy fails', (done) => {
            mockS3.mockImplementationOnce(() => {
                // Get object
                return {
                    promise() {
                        return Promise.resolve({
                            Body: Buffer.alloc(mockCloudFormationTemplate.length, mockCloudFormationTemplate)
                        });
                    }
                };
            }).mockImplementationOnce(() => {
                // Put object
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Get bucket policy
                return {
                    promise() {
                        return Promise.resolve(mockS3Policy);
                    }
                }
            }).mockImplementationOnce(() => {
                // Delete bucket policy
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                // Put bucket policy
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.generateCloudFormationTemplate(simpleTask).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GenerateCloudFormationTemplateFailure',
                    statusCode: 500,
                    message: 'Error occurred while generating CloudFormation template.'
                });
                done();
            });
        });
    });

    describe('editSnsPolicy', () => {
        beforeEach(() => {
            mockSns.mockReset();
        });

        test('returns a success respons', (done) => {
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.editSnsPolicy(mockEventTask.taskId, mockEventTask.accounts).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when removing SNS permission fails', (done) => {
            mockSns.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.editSnsPolicy(mockEventTask.taskId, mockEventTask.accounts).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditSnsPolicyFailure',
                    statusCode: 500,
                    message: 'Error occurred while removing permission from SNS policy.'
                });
                done();
            });
        });

        test('returns an error when adding SNS permission fails', (done) => {
            mockSns.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.editSnsPolicy(mockEventTask.taskId, mockEventTask.accounts).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditSnsPolicyFailure',
                    statusCode: 500,
                    message: 'Error occurred while adding permission from SNS policy.'
                });
                done();
            });
        });
    });

    describe('editKmsPolicy', () => {
        beforeEach(() => {
            mockKms.mockReset();
        });

        test('returns a success respons', (done) => {
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            task.editKmsPolicy(mockEventTask.taskId, mockEventTask.accounts).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when getting KMS policy fails', (done) => {
            mockKms.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.editKmsPolicy(mockEventTask.taskId, mockEventTask.accounts).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditKmsPolicyFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting KMS policy.'
                });
                done();
            });
        });

        test('returns an error when putting KSM policy fails', (done) => {
            mockKms.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockKmsPolicy);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.editKmsPolicy(mockEventTask.taskId, mockEventTask.accounts).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditKmsPolicyFailure',
                    statusCode: 500,
                    message: 'Error occurred while putting KMS policy.'
                });
                done();
            });
        });
    });

    describe('getAwsRegions', () => {
        beforeEach(() => {
            mockEc2.mockReset();
        });

        test('returns a success response', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockRegions);
                    }
                };
            });

            task.getAwsRegions().then((data) => {
                expect(data).toEqual(['region-a', 'region-b', 'region-c']);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when describing regions fails', (done) => {
            mockEc2.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            task.getAwsRegions().then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetAwsRegionsFailure',
                    statusCode: 500,
                    message: 'Error occurred while desribing regions.'
                })
                done();
            });
        });
    });
});