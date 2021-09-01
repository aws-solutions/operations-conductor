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
import { factory } from '../logger';
import { Metrics } from '../metrics';
import { CommonUtil } from '../common/util';
import { ErrorReturn } from '../common/interfaces';

// Logger
const LOGGER = factory.getLogger('users.User');

// Common util
const COMMON_UTIL = new CommonUtil();

/**
 * @interface UserInfo
 */
interface UserInfo {
    username: string;
    name: string;
    email: string;
    group?: string;
    status?: string;
}

/**
 * Performs user actions for admin users
 * @class User
 */
export class User {
    // Cognito Properties
    userPool: string;
    cognitoIdentityServiceProvider: AWS.CognitoIdentityServiceProvider;

    // Anonymous Metrics Properties
    metrics: Metrics;
    sendAnonymousUsageData: string;
    solutionId: string;
    solutionVersion: string;
    solutionUuid: string;

    /**
     * @constructor
     */
    constructor() {
        this.userPool = process.env.CognitoUserPool;
        this.cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

        this.metrics = new Metrics();
        this.sendAnonymousUsageData = process.env.SendAnonymousUsageData;
        this.solutionId =  process.env.SolutionId;
        this.solutionVersion =  process.env.SolutionVersion;
        this.solutionUuid =  process.env.SolutionUuid;
    }

    /**
     * Gets a user
     * @param {string} username - username to get user detail
     */
    async getUser(username: string): Promise<UserInfo | ErrorReturn> {
        const params = {
            UserPoolId: this.userPool,
            Username: username
        };

        try {
            let user = await this.cognitoIdentityServiceProvider.adminGetUser(params).promise();
            return Promise.resolve({
                username: user.Username,
                name: this.getAttributeValue(user.UserAttributes, 'nickname'),
                email: this.getAttributeValue(user.UserAttributes, 'email')
            });
        } catch (error) {
            LOGGER.error(`getUser Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetUserFailure', 500, 'Error occurred while getting a user.', error)
            );
        }
    }

    /**
     * Gets users
     */
    async getUsers(): Promise<UserInfo[] | ErrorReturn> {
        const params = {
            UserPoolId: this.userPool,
            AttributesToGet: ['nickname', 'email']
        };

        try {
            let data = await this.cognitoIdentityServiceProvider.listUsers(params).promise();
            let users = [];
            for (let userResult of data.Users) {
                let user: UserInfo = {
                    username: userResult.Username,
                    name: '',
                    email: '',
                    group: '',
                    status: userResult.UserStatus,
                };

                // Gets groups for a user
                let group: string | ErrorReturn = await this.getUserGroup(userResult.Username);
                user.group = (group as string);

                // Extracts attributes
                user.name = this.getAttributeValue(userResult.Attributes, 'nickname');
                user.email = this.getAttributeValue(userResult.Attributes, 'email');

                users.push(user);
            }

            return Promise.resolve(users);
        } catch (error) {
            LOGGER.error(`getUsers Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetUsersFailure', 500, 'Error occurred while getting users.', error)
            );
        }
    }

    /**
     * Gets a group of a user
     * @param {string} username - username to get groups
     */
    async getUserGroup(username: string): Promise<string | ErrorReturn> {
        const params = {
            UserPoolId: this.userPool,
            Username: username
        };

        try {
            let data = await this.cognitoIdentityServiceProvider.adminListGroupsForUser(params).promise();
            let groups = [];
            for (let group of data.Groups) {
                groups.push(group.GroupName);
            }

            // No group for the user
            if (groups.length === 0) {
                groups.push('No Group');
            }

            return Promise.resolve(groups[0]);
        } catch (error) {
            LOGGER.error(`getUserGroups Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('GetUserGroupsFailure', 500, 'Error occured while getting groups of a user.', error)
            );
        }
    }

    /**
     * Creates a user and send an invitation
     * @param {UserInfo} user - user information to create
     */
    async createUser(user: UserInfo): Promise<UserInfo | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([user.name, user.email, user.group])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('CreateUserFailure', 400, 'User name and E-Mail and Group cannot be empty.')
            );
        }

        let pattern = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*(\+[a-z0-9-]+)?@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!pattern.test(user.email)) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('CreateUserFailure', 400, `The E-Mail address is invalid: ${user.email}.`)
            );
        }

        const params = {
            UserPoolId: this.userPool,
            Username: user.email,
            DesiredDeliveryMediums: ['EMAIL'],
            ForceAliasCreation: true,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: user.email
                },
                {
                    Name: 'nickname',
                    Value: user.name
                }
            ]
        };

        try {
            // Creates a user
            let data = await this.cognitoIdentityServiceProvider.adminCreateUser(params).promise();
            user.username = data.User.Username;
            user.status = data.User.UserStatus;

            // Sets a group for the user
            await this.setUserGroup(user.username, user.group);

            // Sends a metric
            if (this.sendAnonymousUsageData === 'Yes') {
                await COMMON_UTIL.sendAnonymousMetric(this.solutionId, this.solutionVersion, this.solutionUuid, `${user.group}Created`);
            }

            return Promise.resolve(user);
        } catch (error) {
            LOGGER.error(`createUser Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('CreateUserFailure', 500, 'Error occured while creating a user.', error)
            );
        }
    }

    /**
     * Sets a group for the user
     * @param {string} username - username to set a group
     * @param {string} group - group name for the user
     */
    async setUserGroup(username: string, group: string): Promise<void | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([username, group])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('SetUserGroupFailure', 400, 'Username and Group cannot be empty.')
            );
        }

        const params = {
            GroupName: group,
            UserPoolId: this.userPool,
            Username: username
        };

        try {
            await this.cognitoIdentityServiceProvider.adminAddUserToGroup(params).promise();
            return Promise.resolve();
        } catch (error) {
            LOGGER.error(`setUserGroup Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('SetUserGroupFailure', 500, 'Error occurred while setting a group for a user.', error)
            );
        }
    }

    /**
     * Edits a user
     * @param {string} username - username to edit
     * @param {string} group - group for the user
     */
    async editUser(username: string, group: string): Promise<UserInfo | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([username, group])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditUserFailure', 400, 'Username and Group cannot be empty.')
            );
        }

        try {
            let user = await this.getUser(username);
            let currentGroup: string | ErrorReturn = await this.getUserGroup(username);

            // If a user has a group, remove the user from the current group.
            if ((currentGroup as string) !== '') {
                await this.removeUserGroup(username, (currentGroup as string));
            }

            // Sets a new group for the user
            await this.setUserGroup(username, group);
            user['group'] = group;

            // Sends a metric
            if (this.sendAnonymousUsageData === 'Yes') {
                await COMMON_UTIL.sendAnonymousMetric(this.solutionId, this.solutionVersion, this.solutionUuid, `${currentGroup}ConvertedTo${group}`);
            }

            return Promise.resolve(user);
        } catch (error) {
            LOGGER.error(`editUser Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('EditUserFailure', 500, 'Error occurred while editing a user.', error)
            );
        }
    }

    /**
     * Removes a user from a group
     * @param {string} username - username to remove from a group
     * @param {string} group - group to remove a user
     */
    async removeUserGroup(username: string, group: string): Promise<void | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([username, group])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('RemoveUserGroupFailure', 400, 'Username and Group cannot be empty.')
            );
        }

        const params = {
            GroupName: group,
            UserPoolId: this.userPool,
            Username: username
        };

        try {
            await this.cognitoIdentityServiceProvider.adminRemoveUserFromGroup(params).promise();
            return Promise.resolve();
        } catch (error) {
            LOGGER.error(`removeUserGroup Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('RemoveUserGroupFailure', 500, 'Error occurred while removing a user from a group.', error)
            );
        }
    }

    /**
     * Deletes a user
     * @param {string} username - username to delete
     */
    async deleteUser(username: string): Promise<void | ErrorReturn> {
        if (!COMMON_UTIL.isStringValuesValid([username])) {
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteUserFailure', 400, 'Username cannot be empty.')
            );
        }

        try {
            // Gets user group
            let group = await this.getUserGroup(username);
            const params = {
                UserPoolId: this.userPool,
                Username: username
            };

            await this.cognitoIdentityServiceProvider.adminDeleteUser(params).promise();

            // Sends a metric
            if (this.sendAnonymousUsageData === 'Yes') {
                await COMMON_UTIL.sendAnonymousMetric(this.solutionId, this.solutionVersion, this.solutionUuid, `${group}Deleted`);
            }

            return Promise.resolve();
        } catch (error) {
            LOGGER.error(`deletUser Error: ${JSON.stringify(error)}`);
            return Promise.reject(
                COMMON_UTIL.getErrorObject('DeleteUserFailure', 500, 'Error occurred while deleting a user.', error)
            );
        }
    }

    /**
     * Gets a value of Cognito user attribute
     * @param {AWS.CognitoIdentityServiceProvider.AttributeType[]} attributes - Cognito user attributes
     * @param {string} name - name of user attribute
     */
    getAttributeValue(attributes: AWS.CognitoIdentityServiceProvider.AttributeType[], name: string): string {
        for (let attribute of attributes) {
            if (attribute.Name === name) {
                return attribute.Value;
            }
        }
    }
}
