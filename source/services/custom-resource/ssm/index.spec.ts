import { SSM } from './index';

const mockDocument = {
    DocumentDescription: {
        Hash: 'hash-value',
        HashType: 'Sha256',
        Name: 'OperationsConductor-MockDocument',
        Owner: 'owner-account-id',
        CreatedDate: '2019-08-06T04:38:05.499Z',
        Status: 'Active',
        DocumentVersion: '1',
        Description: 'Mock document',
        Parameters: [ Object, Object ],
        PlatformTypes: [ 'Windows', 'Linux' ],
        DocumentType: 'Automation',
        SchemaVersion: '0.3',
        LatestVersion: '1',
        DefaultVersion: '1',
        DocumentFormat: 'YAML',
        Tags: [
            {
                Key: 'SomeKey',
                Value: 'SomeValue'
            }
        ]
    }
};

const mockSsm = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        SSM: jest.fn(() => ({
            createDocument: mockSsm,
            deleteDocument: mockSsm
        }))
    };
});

const ssm = new SSM('MockStack', 0.1, 'SomeKey', 'SomeValue');
const InvalidDocumentCreation = {
    code: 'InvalidDocument',
    statusCode: 400,
    message: 'Document with name Invalid does not exist.'
};
const InvalidDocumentDeletion = {
    code: 'InvalidDocument',
    statusCode: 400,
    message: 'Document document-name does not exist in your account'
};
const mainDirectory = 'custom-resource/ssm/';

describe('SSM', () => {
    describe('createDocuments', () => {
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

            let directories: string[] = ssm.getDocumentDirectories(mainDirectory);
            ssm.createDocuments(mainDirectory, null).then((data) => {
                expect(data).toEqual(`Create ${directories.length} document(s) successful`);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when document is not valid', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(InvalidDocumentCreation);
                    }
                };
            });

            ssm.createDocuments(mainDirectory, null).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual(InvalidDocumentCreation);
                done();
            });
        });

        test('returns an error when creating documents fails', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            ssm.createDocuments(mainDirectory, null).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual('error');
                done();
            });
        });
    });

    describe('deleteDocuments', () => {
        beforeEach(() => {
            mockSsm.mockReset();
        });

        test('returns a success response', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            let directories: string[] = ssm.getDocumentDirectories(mainDirectory);
            ssm.deleteDocuments(mainDirectory).then((data) => {
                expect(data).toEqual(`Delete ${directories.length} document(s) successful`);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when document does not exist', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(InvalidDocumentDeletion);
                    }
                };
            });

            ssm.deleteDocuments(mainDirectory).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual(InvalidDocumentDeletion);
                done();
            });
        });

        test('returns an error when deleting document fails', (done) => {
            mockSsm.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            ssm.deleteDocuments(mainDirectory).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual('error');
                done();
            });
        });
    });
});