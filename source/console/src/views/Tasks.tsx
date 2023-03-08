/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';

import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, Button, PageHeader, Panel, Breadcrumb, BreadcrumbItem, Jumbotron, Alert,
    ProgressBar, FormGroup, FormControl, InputGroup, Glyphicon } from 'react-bootstrap';
import { LOGGING_LEVEL} from '../components/CustomUtil';

// Properties
interface IProps {
    history?: any;
    getApiToken: Function;
}

// States
interface IState {
    token: string;
    tasks: TaskDisplay[];
    isLoading: boolean;
    error: string;
}

// Task
export interface Task {
    taskId: string;
    name: string;
    description: string;
}
interface TaskDisplay extends Task {
    visible?: boolean;
}

// External variables
const LOGGER = new Logger('Tasks', LOGGING_LEVEL);
const API_NAME = 'operations-conductor-api';

class Tasks extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            tasks: [],
            isLoading: true,
            error: ''
        };
    }

    componentDidMount() {
        this.setApiToken().then(() => {
            this.getTasks();
        }).catch((error) => {
            this.handleError('Error occurred while setting API token', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Gets tasks
    getTasks = async () => {
        this.setState({
            isLoading: true,
            error: '',
            tasks: []
        });

        let path = '/tasks';
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let tasks: TaskDisplay[] = await API.get(API_NAME, path, params);
            for (let task of tasks) {
                task.visible = true;
            }
            tasks.sort((a: TaskDisplay, b: TaskDisplay) => a.name.localeCompare(b.name));
            this.setState({ tasks });
        } catch (error) {
            this.handleError('Error occurred while getting list of tasks.', error);
        } finally {
            this.setState({ isLoading: false });
        }
    };

    // Handles value changes
    handleSearch = (event: any) => {
        let keyword = event.target.value;
        let tasks = this.state.tasks;
        for (let task of tasks) {
            if (keyword === '' || task.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
                task.visible = true;
            } else {
                task.visible = false;
            }
        }

        this.setState({ tasks });
    };
    handleSort = (event: any) => {
        let order = event.target.value;
        let tasks = this.state.tasks;
        if (order === 'asc') {
            tasks.sort((a: TaskDisplay, b: TaskDisplay) => a.name.localeCompare(b.name));
        } else if (order === 'desc') {
            tasks.sort((a: TaskDisplay, b: TaskDisplay) => b.name.localeCompare(a.name));
        }

        this.setState({ tasks });
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
                                <BreadcrumbItem active>Tasks</BreadcrumbItem>
                            </Breadcrumb>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <PageHeader>My Tasks</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <Button className="pull-right" bsStyle="primary" onClick={() => { this.props.history.push('/tasks/actions')}}>Get Started</Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <span>&nbsp;</span>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <FormGroup>
                                <InputGroup>
                                    <InputGroup.Addon>
                                        <Glyphicon glyph="search" />
                                    </InputGroup.Addon>
                                    <FormControl type="text" placeholder="Enter task name to search" onChange={this.handleSearch} />
                                </InputGroup>
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <InputGroup>
                                    <InputGroup.Addon>
                                        <Glyphicon glyph="sort" />
                                    </InputGroup.Addon>
                                    <FormControl componentClass="select" defaultValue="asc" onChange={this.handleSort}>
                                        <option value="asc">A-Z</option>
                                        <option value="desc">Z-A</option>
                                    </FormControl>
                                </InputGroup>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        {
                            this.state.tasks.length === 0 && !this.state.isLoading &&
                            <Col md={12}>
                                <Jumbotron>
                                    <p>
                                        No task found.
                                    </p>
                                </Jumbotron>
                            </Col>
                        }
                        {
                            this.state.tasks
                                .filter((task: TaskDisplay) => task.visible)
                                .map((task: TaskDisplay) => {
                                    return (
                                        <Col md={4} key={task.taskId}>
                                            <Panel data-testid={`${task.name}-panel`}>
                                                <Panel.Heading>
                                                    <Panel.Title componentClass="h3">{task.name}</Panel.Title>
                                                </Panel.Heading>
                                                <Panel.Body>
                                                    <div>
                                                        {task.description}
                                                    </div>
                                                    <Button className="pull-right" bsStyle="primary" bsSize="small" onClick={() => { this.props.history.push(`/tasks/${task.taskId}`) }}>Detail</Button>
                                                </Panel.Body>
                                            </Panel>
                                        </Col>
                                    );
                            })
                        }
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

export default Tasks;