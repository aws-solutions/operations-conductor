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

import * as React from 'react';

import Auth from '@aws-amplify/auth';
import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, Table, Button, ProgressBar, Modal, Form, FormGroup, ControlLabel,
    FormControl, Alert, PageHeader, Breadcrumb, BreadcrumbItem, InputGroup, Glyphicon, HelpBlock } from 'react-bootstrap';
import { LOGGING_LEVEL} from '../components/CustomUtil';

// Properties
interface IProps{
    history?: any;
    getApiToken: Function;
}

// States
interface IState {
    token: string;
    users: User[];
    sortIcon: string;
    isLoading: boolean;
    error: string;
    isModalInProgress: boolean;
    showModal: boolean;
    modalAction: string;
    modalError: string;
    username: string;
    name: string;
    email: string;
    group: string;
    loggedInUser: string;
    isEmailValid: boolean;
    emailValidation: any;
}

// User interface
interface User {
    username: string;
    name: string;
    email: string;
    group: string;
    status: string;
    visible?: boolean;
}

// External variables
const LOGGER = new Logger('Users', LOGGING_LEVEL);
const apiName = 'operations-conductor-api';

class Users extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            users: [],
            sortIcon: 'sort-by-attributes',
            isLoading: false,
            error: '',
            isModalInProgress: false,
            showModal: false,
            modalAction: '',
            modalError: '',
            username: '',
            name: '',
            email: '',
            group: '',
            loggedInUser: '',
            isEmailValid: true,
            emailValidation: null
        };
    }

    componentDidMount() {
        // If the user is not admin user, redirect to the main page.
        this.isAdminGroup().then((isAdmin) => {
            if (!isAdmin) {
                this.props.history.push('/tasks');
            } else {
                this.setApiToken().then(() => {
                    this.setLoggedInUser();
                    this.getUsers();
                }).catch((error) => {
                    this.handleError('Error occurred while setting API token', error);
                });
            }
        }).catch((error) => {
            this.handleError('Error occurred while checking user group.', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Checks user belonging to Admin group
    isAdminGroup = async () => {
        let session = await Auth.currentSession();
        let groups = session.getAccessToken().payload['cognito:groups'];

        return groups.indexOf('Admin') > -1;
    };

    // Sets logged in user
    setLoggedInUser = async () => {
        let user = await Auth.currentAuthenticatedUser();
        this.setState({ loggedInUser: user.attributes.email });
    }

    // Gets users
    getUsers = async () => {
        this.setState({
            isLoading: true,
            users: []
        });

        let path = '/users';
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let users: User[] = await API.get(apiName, path, params);

            // Filters the result
            let keyword = (document.getElementById("searchKeyword") as HTMLInputElement).value;
            for (let user of users) {
                if (keyword === '' || user.name.indexOf(keyword) > -1) {
                    user.visible = true;
                } else {
                    user.visible = false;
                }
            }

            // Sorts the result
            let sortIcon = this.state.sortIcon;
            if (sortIcon === 'sort-by-attributes') {
                users.sort((a: User, b: User) => a.name.localeCompare(b.name));
            } else if (sortIcon === 'sort-by-attributes-alt') {
                users.sort((a: User, b: User) => b.name.localeCompare(a.name));
            }
            this.setState({ users });
        } catch (error) {
            this.handleError('Error occurred while getting list of users.', error);
        } finally {
            this.setState({ isLoading: false });
        }
    };

    // Invites a user
    inviteUser = async (name: string, email: string, group: string) => {
        this.setState({
            isModalInProgress: true,
            modalError: ''
        });

        let path = '/users';
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                name,
                email,
                group
            }
        };

        try {
            let user: User = await API.post(apiName, path, params);
            LOGGER.info(`User invited: ${JSON.stringify(user)}`);

            this.setState({
                showModal: false,
                name: '',
                email: '',
                group: ''
            });
            await this.getUsers();
        } catch (error) {
            this.handleError('Error occurred while inviting a user.', error, 'modal');
        } finally {
            this.setState({ isModalInProgress: false });
        }
    };

    // Edits a user
    editUser = async (username: string, group: string) => {
        this.setState({
            isModalInProgress: true,
            modalError: ''
        });

        let path = `/users/${username}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                group
            }
        };

        try {
            let user: User = await API.put(apiName, path, params);
            LOGGER.info(`User edited: ${JSON.stringify(user)}`);

            this.setState({ showModal: false });
            await this.getUsers();
        } catch (error) {
            this.handleError('Error occurred while editing a user.', error, 'modal');
        } finally {
            this.setState({ isModalInProgress: false });
        }
    };

    // Deletes a user
    deleteUser = async (username: string) => {
        this.setState({
            isModalInProgress: true,
            modalError: ''
        });

        let path = `/users/${encodeURIComponent(username)}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            response: true
        };

        try {
            await API.del(apiName, path, params);
            LOGGER.info(`User deleted: ${username}`);

            this.setState({
                modalAction: 'deleteUserConfirm',
                isModalInProgress: false
            });
            await this.getUsers();
        } catch (error) {
            this.handleError('Error occurred while deleting a user.', error, 'modal');
            this.setState({ isModalInProgress: false });
        }
    };

    // Handles modal close
    handleModalClose = () => {
        this.setState({
            showModal: false,
            modalError: ''
        });
    };

    // Handles value changes
    handleUsernameChange = (event: any) => {
        this.setState({ name: event.target.value });
    };
    handleEmailChange = (event: any) => {
        let pattern = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*(\+[a-z0-9-]+)?@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        let email = event.target.value;
        if (!pattern.test(email)) {
            this.setState({
                emailValidation: 'error',
                isEmailValid: false
            });
        } else {
            this.setState({
                email: event.target.value,
                emailValidation: null,
                isEmailValid: true
            });
        }
    };
    handleGroupChange = (event: any) => {
        this.setState({ group: event.target.value });
    };
    handleSearch = (event: any) => {
        let keyword = event.target.value;
        let users = this.state.users;
        for (let user of users) {
            if (keyword === '' || user.name.indexOf(keyword) > -1) {
                user.visible = true;
            } else {
                user.visible = false;
            }
        }

        this.setState({ users });
    };
    handleSort = () => {
        let sortIcon = this.state.sortIcon;
        let users = this.state.users;
        if (sortIcon === 'sort-by-attributes') {
            users.sort((a: User, b: User) => b.name.localeCompare(a.name));
            sortIcon = 'sort-by-attributes-alt';
        } else if (sortIcon === 'sort-by-attributes-alt') {
            users.sort((a: User, b: User) => a.name.localeCompare(b.name));
            sortIcon = 'sort-by-attributes';
        }

        this.setState({ users, sortIcon });
    };

    // Handles error
    handleError = (message: string, error: any, type?: string) => {
        if (error.response !== undefined) {
            LOGGER.error(message, error.response.data.message);
            if (type === 'modal') {
                this.setState({ modalError: error.response.data.message });
            } else {
                this.setState({ error: error.response.data.message });
            }
        } else {
            LOGGER.error(message, error.message);
            if (type === 'modal') {
                this.setState({ modalError: error.message });
            } else {
                this.setState({ error: error.message });
            }
        }
    };

    render() {
        return (
            <div>
                <Grid>
                    <Row>
                        <Col md={12}>
                            <Breadcrumb>
                                <BreadcrumbItem active>Users</BreadcrumbItem>
                            </Breadcrumb>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <PageHeader>Users</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <Button className="pull-right" bsStyle="primary" onClick={() => this.setState({ showModal: true, modalAction: 'inviteUser' })}>Invite User</Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <span>&nbsp;</span>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <FormGroup>
                                <InputGroup>
                                    <InputGroup.Addon>
                                        <Glyphicon glyph="search" />
                                    </InputGroup.Addon>
                                    <FormControl id="searchKeyword" type="text" placeholder="Enter user name to search" onChange={this.handleSearch} />
                                </InputGroup>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <Table striped bordered condensed hover>
                                <thead>
                                    <tr>
                                        <th>
                                            User Name
                                            &nbsp;
                                            <Button bsSize="xsmall" onClick={this.handleSort}>
                                                <Glyphicon glyph={this.state.sortIcon} />
                                            </Button>
                                        </th>
                                        <th>E-Mail</th>
                                        <th>Status</th>
                                        <th>Group</th>
                                        <th colSpan={2}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.isLoading &&
                                        <tr>
                                            <td colSpan={6} align="center">Loading...</td>
                                        </tr>
                                    }
                                    {
                                        this.state.users.length === 0 && !this.state.isLoading &&
                                        <tr>
                                            <td colSpan={6} align="center">No user found.</td>
                                        </tr>
                                    }
                                    {
                                        this.state.users
                                            .filter((user: User) => user.visible)
                                            .map((user: User) => {
                                                return (
                                                    <tr key={user.username}>
                                                        <td>{user.name}</td>
                                                        <td>{user.email}</td>
                                                        <td>{user.status}</td>
                                                        <td>{user.group}</td>
                                                        <td>
                                                            {/* Users cannot edit themselves. */}
                                                            <Button bsStyle="warning" bsSize="xsmall" disabled={this.state.loggedInUser === user.username}
                                                                onClick={() => this.setState({ showModal: true, modalAction: 'editUser', username: user.username, group: user.group })}>Edit User</Button>
                                                        </td>
                                                        <td>
                                                            {/* Users cannot delete themselves. */}
                                                            <Button bsStyle="danger" bsSize="xsmall" disabled={this.state.loggedInUser === user.username}
                                                                onClick={() => this.setState({ showModal: true, modalAction: 'deleteUser', username: user.username, email: user.email, name: user.name, group: user.group })}>Delete User</Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    }
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                    {
                        this.state.error &&
                        <Row>
                            <Col md={12}>
                                <Alert bsStyle="danger">
                                    <strong>Error:</strong><br />
                                    {this.state.error}
                                </Alert>
                            </Col>
                        </Row>
                    }
                    {
                        this.state.isLoading &&
                        <Row>
                            <Col md={12}>
                                <ProgressBar active now={100} />
                            </Col>
                        </Row>
                    }
                </Grid>
                <Modal show={this.state.showModal} onHide={this.handleModalClose}>
                    {
                        this.state.modalAction === 'inviteUser' &&
                        [
                            <Modal.Header closeButton key="inviteUserModalHeader">
                                <Modal.Title>Invite User</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="inviteUserModalBody">
                                <Form horizontal>
                                    <FormGroup controlId="formUsername">
                                        <Col componentClass={ControlLabel} md={3}>
                                            User Name
                                        </Col>
                                        <Col md={9}>
                                            <FormControl type="text" placeholder="Enter the user name" onChange={this.handleUsernameChange} />
                                        </Col>
                                    </FormGroup>
                                    <FormGroup controlId="formEmail" validationState={this.state.emailValidation}>
                                        <Col componentClass={ControlLabel} md={3}>
                                            E-Mail
                                        </Col>
                                        <Col md={9}>
                                            <FormControl type="email" placeholder="Enter the E-Mail" onChange={this.handleEmailChange} />
                                            {
                                                !this.state.isEmailValid &&
                                                <HelpBlock>Enter the valid E-Mail address.</HelpBlock>
                                            }
                                        </Col>
                                    </FormGroup>
                                    <FormGroup controlId="formGroup">
                                        <Col componentClass={ControlLabel} md={3}>
                                            Group
                                        </Col>
                                        <Col md={9}>
                                            <FormControl componentClass="select" defaultValue="" onChange={this.handleGroupChange}>
                                                <option value="">Select the group</option>
                                                <option value="Admin">Admin</option>
                                                <option value="Member">Member</option>
                                            </FormControl>
                                        </Col>
                                    </FormGroup>
                                </Form>
                            </Modal.Body>,
                            <Modal.Footer key="inviteUserModalFooter">
                                <Button onClick={this.handleModalClose}>Cancel</Button>
                                <Button bsStyle="primary" onClick={() => this.inviteUser(this.state.name, this.state.email, this.state.group)} disabled={this.state.isModalInProgress || !this.state.isEmailValid}>Invite</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'editUser' &&
                        [
                            <Modal.Header closeButton key="editUserModalHeader">
                                <Modal.Title>Edit User</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="editUserModalBody">
                                <Form horizontal>
                                    <FormGroup controlId="formUsername">
                                        <Col componentClass={ControlLabel} md={3}>
                                            User Name
                                        </Col>
                                        <Col md={9}>
                                            <FormControl type="text" defaultValue={this.state.username} disabled />
                                        </Col>
                                    </FormGroup>
                                    <FormGroup controlId="formGroup">
                                        <Col componentClass={ControlLabel} md={3}>
                                            Group
                                        </Col>
                                        <Col md={9}>
                                            <FormControl componentClass="select" defaultValue={this.state.group} onChange={this.handleGroupChange} >
                                                <option value="Admin">Admin</option>
                                                <option value="Member">Member</option>
                                            </FormControl>
                                        </Col>
                                    </FormGroup>
                                </Form>
                            </Modal.Body>,
                            <Modal.Footer key="editUserModalFooter">
                                <Button onClick={this.handleModalClose}>Cancel</Button>
                                <Button bsStyle="primary" onClick={() => this.editUser(this.state.username, this.state.group)} disabled={this.state.isModalInProgress}>Edit</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'deleteUser' &&
                        [
                            <Modal.Header closeButton key="deleteUserModalHeader">
                                <Modal.Title>Delete User</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="deleteUserModalBody">
                                Are you sure to delete the following user?
                                <Table striped bordered condensed hover>
                                    <thead>
                                        <tr>
                                            <th>Attributes</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>User Name</td>
                                            <td>{ this.state.name }</td>
                                        </tr>
                                        <tr>
                                            <td>E-Mail</td>
                                            <td>{ this.state.email }</td>
                                        </tr>
                                        <tr>
                                            <td>Group</td>
                                            <td>{ this.state.group }</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </Modal.Body>,
                            <Modal.Footer key="deleteUserModalFooter">
                                <Button onClick={this.handleModalClose}>Cancel</Button>
                                <Button bsStyle="danger" onClick={() => this.deleteUser(this.state.username)} disabled={this.state.isModalInProgress}>Delete</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'deleteUserConfirm' &&
                        [
                            <Modal.Header closeButton key="deleteUserConfirmModalHeader">
                                <Modal.Title>User Deleted</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="deleteUserConfirmModalBody">
                                User <strong>{ this.state.name } ({ this.state.email })</strong> has been deleted.
                            </Modal.Body>,
                            <Modal.Footer key="deleteUserConfirmModalFooter">
                                <Button onClick={this.handleModalClose}>Close</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.isModalInProgress &&
                        <ProgressBar active now={100} />
                    }
                    {
                        this.state.modalError &&
                        <Alert bsStyle="danger">
                            <strong>Error:</strong><br />
                            {this.state.modalError}
                        </Alert>
                    }
                </Modal>
            </div>
        );
    }
}

export default Users;