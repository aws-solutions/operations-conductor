import { User } from './users';

const mockUser = {
    username: 'john+doe@email.com',
    name: 'John Doe',
    email: 'john+doe@email.com',
    group: 'GroupName',
    status: 'CONFIRMED'
};
const mockUsers = {
    Users: [
        {
            Attributes: [
                {
                    Value: mockUser.name,
                    Name: 'nickname'
                },
                {
                    Value: mockUser.email,
                    Name: 'email'
                }
            ],
            Username: mockUser.email,
            UserStatus: mockUser.status,
            Enabled: true,
            UserLastModifiedDate: 1563229839.603,
            UserCreateDate: 1563229601.474
        }
    ]
};
const mockGroups = {
    Groups: [
        {
            CreationDate: 1563229599.181,
            UserPoolId: 'region_userpoolId',
            GroupName: 'GroupName',
            Description: 'Description of the group',
            LastModifiedDate: 1563229599.181
        }
    ]
};

const mockCognito = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        CognitoIdentityServiceProvider: jest.fn(() => ({
            adminGetUser: mockCognito,
            listUsers: mockCognito,
            adminListGroupsForUser: mockCognito,
            adminCreateUser: mockCognito,
            adminAddUserToGroup: mockCognito,
            adminRemoveUserFromGroup: mockCognito,
            adminDeleteUser: mockCognito
        }))
    };
});

const user = new User();
const UserNotFoundException = {
    code: 'UserNotFoundException',
    statusCode: 400,
    message: 'User does not exist.'
};
const ResourceNotFoundException = {
    code: 'ResourceNotFoundException',
    statusCode: 400,
    message: 'Group not found.'
};

describe('Users', () => {
    describe('getUser', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        let resultUser = Object.assign({}, mockUsers.Users[0]);
                        resultUser['UserAttributes'] = resultUser.Attributes;
                        return Promise.resolve(resultUser);
                    }
                };
            });

            user.getUser(mockUser.username).then((data) => {
                expect(data).toEqual({
                    username: mockUser.username,
                    name: mockUser.name,
                    email: mockUser.email
                });
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when user does not exist', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(UserNotFoundException);
                    }
                };
            });

            user.getUser(mockUser.username).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetUserFailure',
                    statusCode: UserNotFoundException.statusCode,
                    message: UserNotFoundException.message
                });
                done();
            });
        });

        test('returns an error when getting a user fails', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.getUser(mockUser.username).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetUserFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting a user.'
                });
                done();
            });
        });
    });

    describe('getUsers', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockUsers);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockGroups);
                    }
                };
            });

            user.getUsers().then((data) => {
                expect(data).toEqual([mockUser]);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when getting the list of users fails', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.getUsers().then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetUsersFailure',
                    statusCode: 500,
                    message: 'Error occurred while getting users.'
                });
                done();
            });
        });
    });

    describe('getUserGroups', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve(mockGroups);
                    }
                };
            });

            user.getUserGroup(mockUser.username).then((data) => {
                expect(data).toEqual(mockUser.group);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when getting a group of user fails', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.getUserGroup(mockUser.username).then(() => {
                done('invalid failure for negative test ');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'GetUserGroupsFailure',
                    statusCode: 500,
                    message: 'Error occured while getting groups of a user.'
                });
                done();
            });
        });
    });

    describe('createUser', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({
                            User: mockUsers.Users[0]
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

            user.createUser(mockUser).then((data) => {
                expect(data).toEqual(mockUser);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when name is empty', (done) => {
            let emptyUser = Object.assign({}, mockUser);
            emptyUser.name = '';
            
            user.createUser(emptyUser).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateUserFailure',
                    statusCode: 400,
                    message: 'User name and E-Mail and Group cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when email is empty', (done) => {
            let emptyUser = Object.assign({}, mockUser);
            emptyUser.email = '';

            user.createUser(emptyUser).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateUserFailure',
                    statusCode: 400,
                    message: 'User name and E-Mail and Group cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when group is empty', (done) => {
            let emptyUser = Object.assign({}, mockUser);
            emptyUser.group = '';

            user.createUser(emptyUser).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateUserFailure',
                    statusCode: 400,
                    message: 'User name and E-Mail and Group cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when email is invalid', (done) => {
            let invalidUser = Object.assign({}, mockUser);
            invalidUser.email = '"<script>alert(1)</script>"@invalid.com';

            user.createUser(invalidUser).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateUserFailure',
                    statusCode: 400,
                    message: `The E-Mail address is invalid: ${invalidUser.email}.`
                });
                done();
            });
        });

        test('returns an error when creating a user fails', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.createUser(mockUser).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'CreateUserFailure',
                    statusCode: 500,
                    message: 'Error occured while creating a user.'
                });
                done();
            });
        });
    });

    describe('setUserGroup', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            user.setUserGroup(mockUser.username, mockUser.group).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when username is empty', (done) => {
            user.setUserGroup('', mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'SetUserGroupFailure',
                    statusCode: 400,
                    message: 'Username and Group cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when group is empty', (done) => {
            user.setUserGroup(mockUser.username, '').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'SetUserGroupFailure',
                    statusCode: 400,
                    message: 'Username and Group cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when user does not exist', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(UserNotFoundException);
                    }
                };
            });

            user.setUserGroup(mockUser.username, mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'SetUserGroupFailure',
                    statusCode: UserNotFoundException.statusCode,
                    message: UserNotFoundException.message
                });
                done();
            });
        });

        test('returns an error when group not found', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(ResourceNotFoundException);
                    }
                };
            });

            user.setUserGroup(mockUser.username, mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'SetUserGroupFailure',
                    statusCode: ResourceNotFoundException.statusCode,
                    message: ResourceNotFoundException.message
                });
                done();
            });
        });

        test('returns an error when adding a user to a group fails', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.setUserGroup(mockUser.username, mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'SetUserGroupFailure',
                    statusCode: 500,
                    message: 'Error occurred while setting a group for a user.'
                });
                done();
            });
        });
    });

    describe('editUser', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementationOnce(() => {
                return {
                    promise() {
                        let resultUser = Object.assign({}, mockUsers.Users[0]);
                        resultUser['UserAttributes'] = resultUser.Attributes;
                        return Promise.resolve(resultUser);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockGroups);
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

            user.editUser(mockUser.username, 'NewGroup').then((data) => {
                let newUser = {
                    username: mockUser.username,
                    name: mockUser.name,
                    email: mockUser.email,
                    group: 'NewGroup'
                };

                expect(data).toEqual(newUser);
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when username is empty', (done) => {
            user.editUser('', mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditUserFailure',
                    statusCode: 400,
                    message: 'Username and Group cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when group is empty', (done) => {
            user.editUser(mockUser.username, '').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'EditUserFailure',
                    statusCode: 400,
                    message: 'Username and Group cannot be empty.'
                });
                done();
            });
        });
    });

    describe('removeUserGroup', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            user.removeUserGroup(mockUser.username, mockUser.group).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when user does not exist', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(UserNotFoundException);
                    }
                };
            });

            user.removeUserGroup(mockUser.username, mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'RemoveUserGroupFailure',
                    statusCode: UserNotFoundException.statusCode,
                    message: UserNotFoundException.message
                });
                done();
            });
        });

        test('returns an error when group not found', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject(ResourceNotFoundException);
                    }
                };
            });

            user.removeUserGroup(mockUser.username, mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'RemoveUserGroupFailure',
                    statusCode: ResourceNotFoundException.statusCode,
                    message: ResourceNotFoundException.message
                });
                done();
            });
        });

        test('returns an error when removing a user from a group fails', (done) => {
            mockCognito.mockImplementation(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.removeUserGroup(mockUser.username, mockUser.group).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'RemoveUserGroupFailure',
                    statusCode: 500,
                    message: 'Error occurred while removing a user from a group.'
                });
                done();
            });
        });
    });

    describe('deleteUser', () => {
        beforeEach(() => {
            mockCognito.mockReset();
        });

        test('returns a success response', (done) => {
            mockCognito.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockGroups);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve();
                    }
                };
            });

            user.deleteUser(mockUser.username).then(() => {
                done();
            }).catch((error) => {
                done(error);
            });
        });

        test('returns an error when username is empty', (done) => {
            user.deleteUser('').then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteUserFailure',
                    statusCode: 400,
                    message: 'Username cannot be empty.'
                });
                done();
            });
        });

        test('returns an error when user does not exist', (done) => {
            mockCognito.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockGroups);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject(UserNotFoundException);
                    }
                };
            });

            user.deleteUser(mockUser.username).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteUserFailure',
                    statusCode: UserNotFoundException.statusCode,
                    message: UserNotFoundException.message
                });
                done();
            });
        });

        test('returns an error when deleting a user fails', (done) => {
            mockCognito.mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve(mockGroups);
                    }
                };
            }).mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject('error');
                    }
                };
            });

            user.deleteUser(mockUser.username).then(() => {
                done('invalid failure for negative test');
            }).catch((error) => {
                expect(error).toEqual({
                    code: 'DeleteUserFailure',
                    statusCode: 500,
                    message: 'Error occurred while deleting a user.'
                });
                done();
            });
        });
    });
});