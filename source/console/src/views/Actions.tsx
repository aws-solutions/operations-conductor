/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

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
    actions: DisplayAction[];
    sortDirection: SortDirection
    isLoading: boolean;
    error: string;
}

// Action interface
export interface Action {
    name: string;
    owner: string;
    description: string;
}
interface DisplayAction extends Action{
    visible?: boolean;
}

enum SortDirection {
    ASC, DESC
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
            sortDirection: SortDirection.ASC,
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
            let actions: DisplayAction[] = await API.get(API_NAME, path, params);
            for (let action of actions) {
                action.visible = true;
            }
            this.sortActions(actions, this.state.sortDirection)
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
            if (keyword === '' || action.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
                action.visible = true;
            } else {
                action.visible = false;
            }
        }

        this.setState({ actions });
    };

    toggleSortDirection = () => {
        this.setState((prevState, props) => {
            const newSortDirection = prevState.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC
            const newlySortedActions = this.sortActions(prevState.actions, newSortDirection)

            return {
                sortDirection: newSortDirection,
                actions: newlySortedActions
            }
        })
    };

    sortActions = (actions: DisplayAction[], sortDirection: SortDirection) => {
        switch (sortDirection) {
            case SortDirection.ASC: return actions.sort((a: DisplayAction, b: DisplayAction) => a.name.localeCompare(b.name));
            case SortDirection.DESC: return actions.sort((a: DisplayAction, b: DisplayAction) => b.name.localeCompare(a.name));
            default: throw new Error("Invalid SortDirection")
        }

    }


    getSortIconName = () => {
        switch (this.state.sortDirection) {
            case SortDirection.ASC: return 'sort-by-attributes';
            case SortDirection.DESC: return 'sort-by-attributes-alt';
        }
    }


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
                                            <Button bsSize="xsmall" onClick={this.toggleSortDirection} data-testid="sort-btn">
                                                <Glyphicon glyph={this.getSortIconName()} />
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
                                            .filter((action: DisplayAction) => action.visible)
                                            .map((action: DisplayAction) => {
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