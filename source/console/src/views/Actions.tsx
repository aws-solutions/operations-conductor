/*****************************************************************************
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.   *
 *                                                                           *
 * Licensed under the Apache License, Version 2.0 (the "License").           *
 * You may not use this file except in compliance with the License.          *
 * A copy of the License is located at                                       *
 *                                                                           *
 *     http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                           *
 * or in the "license" file accompanying this file. This file is distributed *
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either *
 * express or implied. See the License for the specific language governing   *
 * permissions and limitations under the License.                            *
 ****************************************************************************/

import * as React from 'react';

import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, Button, ProgressBar, Table, PageHeader, Breadcrumb, BreadcrumbItem, Alert,
    Glyphicon, FormGroup, InputGroup, FormControl } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { LOGGING_LEVEL} from '../components/CustomUtil';

// Properties
interface IProps {
    history?: any;
    getApiToken: Function;
}

// States
interface IState {
    token: string;
    actions: Action[];
    sortIcon: string;
    isLoading: boolean;
    error: string;
}

// Action interface
interface Action {
    name: string;
    owner: string;
    description: string;
    visible?: boolean;
}

// External variables
const LOGGER = new Logger('Actions', LOGGING_LEVEL);
const API_NAME = 'operations-conductor-api';

class Actions extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            actions: [],
            sortIcon: 'sort-by-attributes',
            isLoading: false,
            error: ''
        };
    }

    componentDidMount() {
        this.setApiToken().then(() => {
            this.getActions();
        }).catch((error) => {
            this.handleError('Error occurred while setting API token', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Gets actions
    getActions = async () => {
        this.setState({
            isLoading: true,
            error: '',
            actions: []
        });

        let path = '/actions';
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let actions: Action[] = await API.get(API_NAME, path, params);
            for (let action of actions) {
                action.visible = true;
            }
            actions.sort((a: Action, b: Action) => a.name.localeCompare(b.name));
            this.setState({ actions });
        } catch (error) {
            this.handleError('Error occurred while getting list of actions.', error);
        } finally {
            this.setState({ isLoading: false });
        }
    };

    // Handles value changes
    handleSearch = (event: any) => {
        let keyword = event.target.value;
        let actions = this.state.actions;
        for (let action of actions) {
            if (keyword === '' || action.name.indexOf(keyword) > -1) {
                action.visible = true;
            } else {
                action.visible = false;
            }
        }

        this.setState({ actions });
    };
    handleSort = () => {
        let sortIcon = this.state.sortIcon;
        let actions = this.state.actions;
        if (sortIcon === 'sort-by-attributes') {
            actions.sort((a: Action, b: Action) => b.name.localeCompare(a.name));
            sortIcon = 'sort-by-attributes-alt';
        } else if (sortIcon === 'sort-by-attributes-alt') {
            actions.sort((a: Action, b: Action) => a.name.localeCompare(b.name));
            sortIcon = 'sort-by-attributes';
        }

        this.setState({ actions, sortIcon });
    };

    // Handles error
    handleError = (message: string, error: any) => {
        if (error.response !== undefined) {
            LOGGER.error(message, error.response.data.message);
            this.setState({ error: error.response.data.message });
        } else {
            LOGGER.error(message, error.message);
            this.setState({ error: error.message });
        }
    };

    render() {
        return (
            <div>
                <Grid>
                    <Row>
                        <Col md={12}>
                            <Breadcrumb>
                                <LinkContainer to="/tasks" exact>
                                    <BreadcrumbItem>Tasks</BreadcrumbItem>
                                </LinkContainer>
                                <BreadcrumbItem active>Actions</BreadcrumbItem>
                            </Breadcrumb>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <PageHeader>Action Catalog</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <FormGroup>
                                <InputGroup>
                                    <InputGroup.Addon>
                                        <Glyphicon glyph="search" />
                                    </InputGroup.Addon>
                                    <FormControl type="text" placeholder="Enter action name to search" onChange={this.handleSearch} />
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
                                            Action Name
                                            &nbsp;
                                            <Button bsSize="xsmall" onClick={this.handleSort}>
                                                <Glyphicon glyph={this.state.sortIcon} />
                                            </Button>
                                        </th>
                                        <th>Owner</th>
                                        <th>Description</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.isLoading &&
                                        <tr>
                                            <td colSpan={4} align="center">Loading...</td>
                                        </tr>
                                    }
                                    {
                                        this.state.actions.length === 0 && !this.state.isLoading &&
                                        <tr>
                                            <td colSpan={4} align="center">No action found.</td>
                                        </tr>
                                    }
                                    {
                                        this.state.actions
                                            .filter((action: Action) => action.visible)
                                            .map((action: Action) => {
                                                return (
                                                    <tr key={action.name}>
                                                        <td>{action.name}</td>
                                                        <td>{action.owner}</td>
                                                        <td>{action.description}</td>
                                                        <td>
                                                            <Button bsStyle="primary" bsSize="xsmall"
                                                                onClick={() => { this.props.history.push({ pathname: '/tasks/create', state: { actionName: action.name }}) }}>Create Task</Button>
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
            </div>
        );
    }
}

export default Actions;