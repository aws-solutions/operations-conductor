import { Action } from './actions';

const mockAction = {
    name: 'OperationsConductor-MockAction',
    owner: 'owner-account-id',
    description: 'Mock document',
    parameters: [
        {
            Name: 'ActionId',
            Type: 'String',
            Description: 'Action ID',
            DefaultValue: ''
        }
    ]
};
const mockActions = [
    {
        name: mockAction.name,
        owner: mockAction.owner,
        description: mockAction.description
    }
];
const mockDocument = {
    Document: {
        Hash: 'hash-value',
        HashType: 'Sha256',
        Name: mockAction.name,
        Owner: mockAction.owner,
        CreatedDate: '2019-08-06T04:38:05.499Z',
        Status: 'Active',
        DocumentVersion: '1',
        Description: mockAction.description,
        Parameters: mockAction.parameters,
        PlatformTypes: [ 'Windows', 'Linux' ],
        DocumentType: 'Automation',
        SchemaVersion: '0.3',
        LatestVersion: '1',
        DefaultVersion: '1',
        DocumentFormat: 'YAML',
        Tags: []
    }
};
const mockDocuments = {
    DocumentIdentifiers: [
        {
            Name: mockDocument.Document.Name,
            Owner: mockDocument.Document.Owner,
            PlatformTypes: mockDocument.Document.PlatformTypes,
            DocumentVersion: mockDocument.Document.DocumentVersion,
            DocumentType: mockDocument.Document.DocumentType,
            SchemaVersion: mockDocument.Document.SchemaVersion,
            DocumentFormat: mockDocument.Document.DocumentFormat,
            Tags: [
                {
                    Key: 'SomeKey',
                    Value: 'SomeValue'
                }
            ]
        }
    ]
};

const mockSsm = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        SSM: jest.fn(() => ({
            listDocuments: mockSsm,
            describeDocument: mockSsm
        }))
    };
});

process.env.FilterTagKey = 'SomeKey';
process.env.FilterTagValue = 'SomeValue';

const action = new Action();
const InvalidDocument = {
    code: 'InvalidDocument',
    statusCode: 400,
    message: 'Document with name Invalid does not exist.'
};

describe('Actions', () => {
    describe('getActions', () => {
        beforeEach(() => {
            mockSsm.mockReset();
        });

        test('returns a success response', (done) => {
            mockSsm.mockImplementationOnce((data) => {
                expect(data).toStrictEqual({"Filters":[{"Key":"tag:SomeKey","Values":["SomeValue"]},{"Key":"Owner","Values":["Self"]}]})
                return {
                    promise() {
                        return Promise.resolve(mockDocuments);
                    }
                };
            }).mockImplementationOnce((data) => {
                return {
                    promise() {
                        return Promise.resolve(mockDocument);
                    }
                };
            });

            action.getActions().then((data) => {
                expect(data).toEqual(mockActions);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns a success response with nextToken', (done) => {
            let documentsWithNextToken = mockDocuments;
            documentsWithNextToken['NextToken'] = 'token';

            mockSsm.mockImplementationOnce((data) => {
                expect(data).toStrictEqual({"Filters":[{"Key":"tag:SomeKey","Values":["SomeValue"]},{"Key":"Owner","Values":["Self"]}]})
                return {
                    promise() {
                        return Promise.resolve(documentsWithNextToken);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockDocument);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        delete documentsWithNextToken['NextToken']
                        return Promise.resolve(documentsWithNextToken);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockDocument);
                    }
                };
            });;

            action.getActions().then((data) => {
                expect(data).toEqual([...mockActions, ...mockActions]);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when getting actions fails', (done) => {
            mockSsm.mockImplementation((data) => {
                expect(data).toStrictEqual({"Filters":[{"Key":"tag:SomeKey","Values":["SomeValue"]},{"Key":"Owner","Values":["Self"]}]})
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            action.getActions().then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetActionsFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting actions.'
                });
                done();
            });
        });
    });

    describe('getAction', () => {
        beforeEach(() => {
            mockSsm.mockReset();
        });

        test('returns a success response', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockDocument);
                    }
                };
            });

            action.getAction(mockAction.name).then((data) => {
                expect(data).toEqual(mockAction);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when document does not exists', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(InvalidDocument);
                    }
                };
            });

            action.getAction(mockAction.name).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetActionFailure',
                    statusCode: InvalidDocument.statusCode,
                    message: InvalidDocument.message
                });
                done();
            });
        });

        test('returns an error when getting an action fails', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            action.getAction(mockAction.name).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetActionFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting an action.'
                });
                done();
            });
        });
    });
});