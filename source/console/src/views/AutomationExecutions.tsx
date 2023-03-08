/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';

import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, Button, PageHeader, Breadcrumb, BreadcrumbItem, Alert, ProgressBar, Table,
    Glyphicon, Pager, Form, FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { LOGGING_LEVEL} from '../components/CustomUtil';

// Properties
interface IProps {
    history?: any;
    match?: any;
    location?: any;
    getApiToken: Function;
}

// States
interface IState {
    token: string;
    automationExecutions: AutomationExecution[];
    isLoading: boolean;
    error: string;
    itemsPerPage: number;
    queryKeys: object[];
    queryCurrentPosition: number;
}

// AutomationExecution interface
interface AutomationExecution {
    automationExecutionId: string;
    status: AutomationExecutionStatus;
}

// Automation execution status enum
enum AutomationExecutionStatus {
    inProgress = 'InProgress',
    success = 'Success'
}

// Query type enum
enum QueryType {
    prev,
    new,
    next
}

// External variables
const LOGGER = new Logger('ParentExecutions', LOGGING_LEVEL);
const API_NAME = 'operations-conductor-api';

class AutomationExecutions extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            automationExecutions: [],
            isLoading: false,
            error: '',
            itemsPerPage: 10,
            queryKeys: [{}],
            queryCurrentPosition: 0
        };
    }

    componentDidMount() {
        this.setApiToken().then(() => {
            this.getAutomationExecutions(QueryType.new);
        }).catch((error) => {
            this.handleError('Error occurred while setting API token', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Gets automation executions
    getAutomationExecutions = async (queryType: QueryType) => {
        const { taskId, parentExecutionId } = this.props.match.params;

        this.setState({
            isLoading: true,
            error: '',
            automationExecutions: [],
        });

        let path = `/tasks/${taskId}/executions/${parentExecutionId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                itemsPerPage: this.state.itemsPerPage,
                lastKey: {}
            }
        };

        let { queryCurrentPosition, queryKeys } = this.state;
        switch (queryType) {
            case QueryType.prev:
                params.body.lastKey = queryKeys[queryCurrentPosition - 1];
                break;
            case QueryType.next:
                params.body.lastKey = queryKeys[queryCurrentPosition + 1];
                break;
            default:
                break;
        }

        try {
            let automationExecutions = await API.post(API_NAME, path, params);
            switch (queryType) {
                case QueryType.prev:
                    this.setState((prevState) => ({
                        queryCurrentPosition: prevState.queryCurrentPosition - 1
                    }));
                    break;
                case QueryType.next:
                    if (automationExecutions.LastEvaluatedKey) {
                        queryKeys.push(automationExecutions.LastEvaluatedKey);
                    }

                    this.setState((prevState) => ({
                        queryCurrentPosition: prevState.queryCurrentPosition + 1,
                        queryKeys
                    }));
                    break;
                default:
                    queryKeys = [{}];
                    if (automationExecutions.LastEvaluatedKey) {
                        queryKeys.push(automationExecutions.LastEvaluatedKey);
                    }

                    this.setState({
                        queryCurrentPosition: 0,
                        queryKeys
                    });
                    break;
            }
            this.setState({ automationExecutions: automationExecutions.Items });
        } catch (error) {
            this.handleError('Error occurred while getting automation executions.', error);
        } finally {
            this.setState({ isLoading: false });
        }
    };

    // Handles error
    handleError = (message: string, error: any) => {
        if (error.response !== undefined) {
            LOGGER.error(message, error.response.data.message);
            if (error.response.data.statusCode === 404) {
                this.props.history.push(`/tasks/${this.props.match.params.taskId}`);
            }
            this.setState({ error: error.response.data.message });
        } else {
            LOGGER.error(message, error.message);
                this.setState({ error: error.message });
        }
    };

    // Handles value changes
    handleItemsPerChange = (event: any) => {
        this.setState({ itemsPerPage: parseInt(event.target.value) }, () => {
            this.getAutomationExecutions(QueryType.new);
        });
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
                                <LinkContainer to={`/tasks/${this.props.match.params.taskId}`} exact>
                                    <BreadcrumbItem>{`Task Detail: ${this.props.location.state.taskName}`}</BreadcrumbItem>
                                </LinkContainer>
                                <BreadcrumbItem active>Task Execution ID: {this.props.match.params.parentExecutionId}</BreadcrumbItem>
                            </Breadcrumb>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <PageHeader>
                                Task Automation Executions - <small>{this.props.match.params.parentExecutionId}</small>
                            </PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <Table striped bordered condensed hover>
                                <tbody>
                                    <tr>
                                        <th>Task ID</th>
                                        <td>
                                            {this.props.match.params.taskId}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Task Execution ID</th>
                                        <td>{this.props.match.params.parentExecutionId}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={4} mdOffset={7}>
                            <Form horizontal>
                                <FormGroup>
                                    <Col componentClass={ControlLabel} md={3}>
                                        Items
                                    </Col>
                                    <Col md={9}>
                                        <FormControl componentClass="select" defaultValue={`${this.state.itemsPerPage}`} onChange={this.handleItemsPerChange}>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </FormControl>
                                    </Col>
                                </FormGroup>
                            </Form>
                            <div className="clearfix" />
                        </Col>
                        <Col md={1}>
                            <Button className="pull-right" bsStyle="primary"
                                onClick={() => {
                                    this.getAutomationExecutions(QueryType.new);
                                }}>
                                Refresh
                            </Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <span>&nbsp;</span>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <Table striped bordered condensed hover>
                                <thead>
                                    <tr>
                                        <th>Automation Execution ID</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.isLoading &&
                                        <tr>
                                            <td colSpan={2} align="center">Loading...</td>
                                        </tr>
                                    }
                                    {
                                        this.state.automationExecutions.length === 0 && !this.state.isLoading &&
                                        <tr>
                                            <td colSpan={2} align="center">No automation execution found.</td>
                                        </tr>
                                    }
                                    {
                                        this.state.automationExecutions.map((automationExecution: AutomationExecution) => {
                                            return (
                                                <tr key={automationExecution.automationExecutionId}>
                                                    <td>
                                                        <LinkContainer key={`link-${automationExecution.automationExecutionId}`}
                                                            to={
                                                                {
                                                                    pathname: `/tasks/${this.props.match.params.taskId}/executions/${this.props.match.params.parentExecutionId}/${automationExecution.automationExecutionId}`,
                                                                    state: { taskName: this.props.location.state.taskName }
                                                                }
                                                            }
                                                            exact>
                                                            <span className="execution-link">{automationExecution.automationExecutionId}</span>
                                                        </LinkContainer>
                                                    </td>
                                                    <td>
                                                        {
                                                            AutomationExecutionStatus.inProgress === automationExecution.status &&
                                                            <span className="execution-blue">
                                                                <Glyphicon glyph="hourglass" /> {automationExecution.status}
                                                            </span>
                                                        }
                                                        {
                                                            AutomationExecutionStatus.success === automationExecution.status &&
                                                            <span className="execution-green">
                                                                <Glyphicon glyph="ok" /> {automationExecution.status}
                                                            </span>
                                                        }
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={12}>
                            <Pager>
                                <Pager.Item previous disabled={this.state.queryCurrentPosition === 0} onClick={() => this.getAutomationExecutions(QueryType.prev)}>
                                    <Glyphicon glyph="triangle-left" /> Previous Page
                                </Pager.Item>
                                {
                                    !this.state.isLoading &&
                                    <span>
                                        {
                                            this.state.automationExecutions.length === 0 &&
                                            <strong>No Automation Execution</strong>
                                        }
                                        {
                                            this.state.automationExecutions.length > 0 &&
                                            <strong>Automation Executions {this.state.itemsPerPage * this.state.queryCurrentPosition + 1} - {this.state.itemsPerPage * this.state.queryCurrentPosition + this.state.automationExecutions.length}</strong>
                                        }
                                    </span>
                                }
                                <Pager.Item next disabled={this.state.queryKeys.length === this.state.queryCurrentPosition + 1} onClick={() => this.getAutomationExecutions(QueryType.next)}>
                                    Next Page <Glyphicon glyph="triangle-right" />
                                </Pager.Item>
                            </Pager>
                        </Col>
                    </Row>
                    {
                        this.state.isLoading &&
                        <Row>
                            <Col md={12}>
                                <ProgressBar active now={100} />
                            </Col>
                        </Row>
                    }
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
                </Grid>
            </div>
        );
    }
}

export default AutomationExecutions;