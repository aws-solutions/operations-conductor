/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';

import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, Button, PageHeader, Breadcrumb, BreadcrumbItem, Alert, ProgressBar, Modal,
    Tabs, Tab, Table, Label, ButtonToolbar, Glyphicon, Pager, Form, FormGroup, ControlLabel,
    FormControl } from 'react-bootstrap';
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
    task: Task;
    taskId: string;
    taskExecutions: TaskExecution[];
    sortIcon: string;
    isLoading: boolean;
    isChangingStatus: boolean;
    isExecutionsLoading: boolean;
    error: string;
    showModal: boolean;
    modalAction: string;
    modalError: string;
    isModalInProgress: boolean;
    defaultActiveTab: string;
    sortType: string;
    itemsPerPage: number;
    queryKeys: object[];
    queryCurrentPosition: number;
    copyButtonName: string;
    executeResult: string;
}

// Task
export interface Task {
    taskId?: string;
    name?: string;
    description?: string;
    targetTag?: string;
    targetParameter?: string;
    taskParameters?: TaskParameter[];
    accounts?: string[];
    regions?: string[];
    actionName?: string;
    triggerType?: string;
    scheduledType?: ScheduledType;
    scheduledFixedRateInterval?: number;
    scheduledFixedRateType?: ScheduledFixedRateType;
    scheduledCronExpression?: string;
    eventPattern?: string;
    enabled?: boolean;
    templateUrl?: string;
}

// TaskParameter interface
interface TaskParameter {
    Name: string;
    Type: string;
    Description: string;
    Value?: string;
    DefaultValue?: string;
}

// TaskExecution interface
interface TaskExecution {
    parentExecutionId: string;
    status: TaskExecutionStatus;
    totalResourceCount: Number;
    completedResourceCount: Number;
    startTime: string;
    lastUpdateTime: string;
}

// Trigger type enum
enum TriggerType {
    Schedule = 'Schedule',
    Event = 'Event'
}

// Scheduled type enum
export enum ScheduledType {
    CronExpression = 'CronExpression',
    FixedRate = 'FixedRate'
}

// Scheduled fixed rate type enum
enum ScheduledFixedRateType {
    minutes = 'minutes',
    minute = 'minute',
    hours = 'hours',
    hour = 'hour',
    days = 'days',
    day = 'day'
}

// Task execution status enum
enum TaskExecutionStatus {
    pending = 'Pending',
    inProgress = 'InProgress',
    waiting = 'Waiting',
    success = 'Success',
    timedOut = 'TimedOut',
    cancelling = 'Cancelling',
    cancelled = 'Cancelled',
    failed = 'Failed'
}

// Sort type enum
enum SortType {
    asc = 'ASC',
    desc = 'DESC'
}

// Query type enum
enum QueryType {
    prev,
    new,
    next
}

// External variables
const LOGGER = new Logger('TaskDetail', LOGGING_LEVEL);
const API_NAME = 'operations-conductor-api';

class TaskDetail extends React.Component<IProps, IState> {
    // class properties
    hiddenParameters: string[];

    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            task: {},
            taskId: '',
            taskExecutions: [],
            sortIcon: 'sort-by-attributes',
            isLoading: false,
            isChangingStatus: false,
            isExecutionsLoading: false,
            error: '',
            modalAction: '',
            showModal: false,
            modalError: '',
            isModalInProgress: false,
            defaultActiveTab: 'overview',
            sortType: 'DESC',
            itemsPerPage: 10,
            queryKeys: [{}],
            queryCurrentPosition: 0,
            copyButtonName: 'Copy URL',
            executeResult: ''
        };

        this.hiddenParameters = ['SQSMsgBody', 'SQSMsgReceiptHandle', 'TargetResourceType'];
    }

    componentDidMount() {
        this.setApiToken().then(() => {
            if (this.props.location.state) {
                this.setState({
                    modalAction: 'acknowledgement',
                    showModal: true
                });
            }
            this.getTask();
            this.getTaskExecutions(QueryType.new);
        }).catch((error) => {
            this.handleError('Error occurred while setting API token', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Gets a task
    getTask = async () => {
        const { taskId } = this.props.match.params;

        this.setState({
            isLoading: true,
            error: '',
            task: {},
            taskId
        });

        let path = `/tasks/${taskId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let task: Task = await API.get(API_NAME, path, params);
            this.setState({ task });
        } catch (error) {
            this.handleError('Error occurred while getting a task detail.', error);
        } finally {
            this.setState({ isLoading: false });
        }
    };

    // Edits a task
    editTask = async () => {
        // Going to task create page with the current information
        this.props.history.push({
            pathname: '/tasks/edit',
            state: { task: this.state.task }
        });
    };

    // Changes a task status
    changeStatus = async () => {
        const task = this.state.task;

        this.setState({
            isChangingStatus: true,
            error: '',
        });

        let path = `/tasks/${task.taskId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                ...task,
                enabled: !task.enabled,
                accounts: task.accounts!.join(','),
                regions: task.regions!.join(','),
                scheduledFixedRateInterval: task.scheduledFixedRateInterval ? `${task.scheduledFixedRateInterval}` : undefined,
            }
        };

        try {
            let task: Task = await API.put(API_NAME, path, params);
            this.setState({ task });
        } catch (error) {
            this.handleError('Error occurred while changing a task status.', error);
        } finally {
            this.setState({ isChangingStatus: false });
        }
    };

    // Executes a task
    executeTask = async (taskId: string) => {
        this.setState({
            isModalInProgress: true,
            modalError: ''
        });

        let path = `/tasks/${taskId}/execute`;
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let executeResult = await API.put(API_NAME, path, params);
            LOGGER.info(`Task executed, taskId: ${taskId}, taskName: ${this.state.task.name}`);

            if (executeResult['errorMessage']) {
                executeResult = `Error: ${executeResult['errorMessage']}`;
            }
            this.setState({
                modalAction: 'executeTaskResult',
                executeResult,
                defaultActiveTab: 'logs'
            }, async () => {
                await this.getTaskExecutions(QueryType.new);
            });
        } catch (error) {
            this.handleError('Error occurred while executing a task.', error, 'modal');
        } finally {
            this.setState({ isModalInProgress: false });
        }
    }

    // Deletes a task
    deleteTask = async (taskId: string) => {
        this.setState({
            isModalInProgress: true,
            modalError: ''
        });

        let path = `/tasks/${taskId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            await API.del(API_NAME, path, params);
            LOGGER.info(`Task deleted: ${taskId} - ${this.state.task.name}`);

            this.setState({
                modalAction: 'deleteTaskConfirm',
                isModalInProgress: false
            });
        } catch (error) {
            this.handleError('Error occurred while deleting a task.', error, 'modal');
            this.setState({ isModalInProgress: false });
        }
    };

    // Gets task executions
    getTaskExecutions = async (queryType: QueryType) => {
        const { taskId } = this.props.match.params;

        this.setState({
            isExecutionsLoading: true,
            error: '',
            taskExecutions: [],
            taskId
        });

        let path = `/tasks/${taskId}/executions`;
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                sortType: this.state.sortType,
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
            let taskExecutions = await API.post(API_NAME, path, params);
            switch (queryType) {
                case QueryType.prev:
                    this.setState((prevState) => ({
                        queryCurrentPosition: prevState.queryCurrentPosition - 1
                    }));
                    break;
                case QueryType.next:
                    if (taskExecutions.LastEvaluatedKey) {
                        queryKeys.push(taskExecutions.LastEvaluatedKey);
                    }

                    this.setState((prevState) => ({
                        queryCurrentPosition: prevState.queryCurrentPosition + 1,
                        queryKeys
                    }));
                    break;
                default:
                    queryKeys = [{}];
                    if (taskExecutions.LastEvaluatedKey) {
                        queryKeys.push(taskExecutions.LastEvaluatedKey);
                    }

                    this.setState({
                        queryCurrentPosition: 0,
                        queryKeys
                    });
                    break;
            }
            this.setState({ taskExecutions: taskExecutions.Items });
        } catch (error) {
            this.handleError('Error occurred while getting task executions.', error);
        } finally {
            this.setState({ isExecutionsLoading: false });
        }
    };

    // Handles modal close
    handleModalClose = () => {
        this.setState({
            showModal: false,
            modalError: ''
        });
    };

    // Handles error
    handleError = (message: string, error: any, type?: string) => {
        if (error.response !== undefined) {
            LOGGER.error(message, error.response.data.message);
            if (type === 'modal') {
                this.setState({ modalError: error.response.data.message });
            } else {
                if (error.response.data.statusCode === 404) {
                    this.props.history.push('/tasks');
                }
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

    // Handles executions sort
    handleSort = () => {
        let sortType = this.state.sortType === SortType.asc ? 'DESC' : 'ASC';
        this.setState({ sortType }, () => {
            this.getTaskExecutions(QueryType.new);
        });
    };

    // Handles value changes
    handleItemsPerChange = (event: any) => {
        this.setState({ itemsPerPage: parseInt(event.target.value) }, () => {
            this.getTaskExecutions(QueryType.new);
        });
    };

    // Copies CloudFormation template URL to clipboard
    copyUrlToClipboard = () => {
        let url = this.state.task.templateUrl;
        if (url) {
            let tempInput = document.createElement('input');
            tempInput.value = url;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            this.setState({
                copyButtonName: 'URL Copied!'
            });
        }
    }

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
                                <BreadcrumbItem active>{`Task Detail${this.state.isLoading ? '' : ': ' + this.state.task.name}`}</BreadcrumbItem>
                            </Breadcrumb>
                        </Col>
                    </Row>
                    {
                        !this.state.isLoading &&
                        [
                            <Row key="header">
                                <Col md={12}>
                                    <PageHeader>
                                        Task Detail - <small>{this.state.task.name}</small>
                                    </PageHeader>
                                </Col>
                            </Row>,
                            <Row key="buttons">
                                <Col md={12}>
                                <ButtonToolbar className="pull-right">
                                    <Button onClick={this.editTask}
                                        disabled={this.state.error ? true : false}>Edit Task</Button>
                                    {
                                        // Event type does not require to execute a task manually.
                                        this.state.task.triggerType === TriggerType.Schedule &&
                                        <Button bsStyle="primary" onClick={() => this.setState({ showModal: true, modalAction: 'executeTask', modalError: '' })}
                                            disabled={this.state.error ? true: false}>Start Manual Task Execution</Button>
                                    }
                                    <Button bsStyle="warning" onClick={this.changeStatus}
                                        disabled={this.state.error || this.state.isChangingStatus ? true : false}>
                                        {this.state.task.enabled ? "Disable" : "Enable"} Automatic Task Execution {this.state.isChangingStatus ? " - Changing..." : ""}
                                    </Button>
                                    <Button bsStyle="danger" onClick={() => this.setState({ showModal: true, modalAction: 'deleteTask', modalError: '' })}
                                        disabled={this.state.error ? true : false}>Delete Task</Button>
                                </ButtonToolbar>
                                </Col>
                            </Row>,
                            <Row key="row-for-space">
                                <Col md={12}>&nbsp;</Col>
                            </Row>,
                            <Row key="tabs">
                                <Col md={12}>
                                    <Tabs defaultActiveKey={this.state.defaultActiveTab} animation={false} id="task-tabs">
{/*
    General Tab
*/}
                                        <Tab eventKey={"overview"} title="Overview">
                                            <Row>
                                                <Col md={12}>&nbsp;</Col>
                                            </Row>
                                            <Row>
                                                <Col md={6}>
                                                    <Table striped bordered condensed hover>
                                                        <thead>
                                                            <tr>
                                                                <th colSpan={2}>General Information</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td><strong>Action Name</strong></td>
                                                                <td>{this.state.task.actionName}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Task Name</strong></td>
                                                                <td>{this.state.task.name}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Description</strong></td>
                                                                <td>{this.state.task.description}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Trigger Type</strong></td>
                                                                <td>{this.state.task.triggerType}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Target Tag</strong></td>
                                                                <td>{this.state.task.targetTag}</td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Accounts</strong></td>
                                                                <td>
                                                                {
                                                                    this.state.task.accounts !== undefined &&
                                                                    this.state.task.accounts.map((account) => {
                                                                        return (
                                                                            [
                                                                                <Label bsStyle="info" key={`Overview-${account}`}>{account}</Label>,
                                                                                <span key={`Overview-${account}-space`}>&nbsp;</span>
                                                                            ]
                                                                        );
                                                                    })
                                                                }
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>Regions</strong></td>
                                                                <td>
                                                                {
                                                                    this.state.task.regions !== undefined &&
                                                                    this.state.task.regions.map((region) => {
                                                                        return (
                                                                            [
                                                                                <Label bsStyle="info" key={`Overview-${region}`}>{region}</Label>,
                                                                                <span key={`Overview-${region}-space`}>&nbsp;</span>
                                                                            ]
                                                                        );
                                                                    })
                                                                }
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td><strong>CloudFormation Template</strong></td>
                                                                <td>
                                                                    <ButtonToolbar>
                                                                        <Button bsSize="xsmall" onClick={this.copyUrlToClipboard}>{this.state.copyButtonName}</Button>
                                                                    </ButtonToolbar>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </Table>
                                                    <Table striped bordered condensed hover>
                                                        <thead>
                                                            <tr>
                                                                <th colSpan={2}>Trigger</th>
                                                            </tr>
                                                        </thead>
                                                        {
                                                            this.state.task.triggerType !== undefined &&
                                                            <tbody>
                                                                <tr>
                                                                    <td><strong>Trigger Type</strong></td>
                                                                    <td>{this.state.task.triggerType}</td>
                                                                </tr>
                                                                {
                                                                    this.state.task.triggerType === TriggerType.Schedule &&
                                                                    [
                                                                        <tr key="Overview-Schedule">
                                                                            <td><strong>Scheduled Type</strong></td>
                                                                            <td>{this.state.task.scheduledType}</td>
                                                                        </tr>,
                                                                        <tr key="Overview-ScheduleDetail">
                                                                            {
                                                                                this.state.task.scheduledType === ScheduledType.CronExpression &&
                                                                                [
                                                                                    <td key="Overview-CronExpressionKey"><strong>Scheduled Cron Expression</strong></td>,
                                                                                    <td key="Overview-CronExpressionValue">{this.state.task.scheduledCronExpression}</td>
                                                                                ]
                                                                            }
                                                                            {
                                                                                this.state.task.scheduledType === ScheduledType.FixedRate &&
                                                                                [
                                                                                    <td key="Overview-FixedRateKey"><strong>Scheduled Fixed Rate</strong></td>,
                                                                                    <td key="Overview-FixedRateValue">{this.state.task.scheduledFixedRateInterval} {this.state.task.scheduledFixedRateType}</td>
                                                                                ]
                                                                            }
                                                                        </tr>
                                                                    ]
                                                                }
                                                                {
                                                                    this.state.task.triggerType === TriggerType.Event &&
                                                                    <tr key="Overview-Event">
                                                                        <td><strong>Event Pattern</strong></td>
                                                                        <td>
                                                                            <pre>{this.state.task.eventPattern}</pre>
                                                                        </td>
                                                                    </tr>
                                                                }
                                                            </tbody>
                                                        }
                                                    </Table>
                                                </Col>
                                                <Col md={6}>
                                                    <Table striped bordered condensed hover>
                                                        <thead>
                                                            <tr>
                                                                <th colSpan={3}>Parameters</th>
                                                            </tr>
                                                            <tr>
                                                                <th>Name</th>
                                                                <th>Key</th>
                                                                <th>Value</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {
                                                                this.state.task.taskParameters !== undefined &&
                                                                this.state.task.taskParameters.map((parameter: TaskParameter) => {
                                                                    return (
                                                                        this.hiddenParameters.indexOf(parameter.Name) < 0 &&
                                                                        [
                                                                            <tr key={parameter.Name}>
                                                                                <td rowSpan={3}><strong>{parameter.Name}</strong></td>
                                                                                <td>Value</td>
                                                                                <td>{parameter.Value}</td>
                                                                            </tr>,
                                                                            <tr key={parameter.Name+parameter.Type}>
                                                                                <td>Type</td>
                                                                                <td>{parameter.Type}</td>
                                                                            </tr>,
                                                                            <tr key={parameter.Description}>
                                                                                <td>Description</td>
                                                                                <td>{parameter.Description}</td>
                                                                            </tr>
                                                                        ]
                                                                    );
                                                                })
                                                            }
                                                        </tbody>
                                                    </Table>
                                                </Col>
                                            </Row>
                                        </Tab>
{/*
    Trigger Tab
*/}
                                        <Tab eventKey={"trigger"} title="Trigger">
                                            <Row>
                                                <Col md={12}>&nbsp;</Col>
                                            </Row>
                                            <Row>
                                                <Col md={12}>
                                                    <Table striped bordered condensed hover>
                                                        <thead>
                                                            <tr>
                                                                <th colSpan={2}>Trigger</th>
                                                            </tr>
                                                        </thead>
                                                        {
                                                            this.state.task.triggerType !== undefined &&
                                                            <tbody>
                                                                <tr>
                                                                    <td><strong>Trigger Type</strong></td>
                                                                    <td>{this.state.task.triggerType}</td>
                                                                </tr>
                                                                {
                                                                    this.state.task.triggerType === TriggerType.Schedule &&
                                                                    [
                                                                        <tr key="Trigger-Schedule">
                                                                            <td><strong>Scheduled Type</strong></td>
                                                                            <td>{this.state.task.scheduledType}</td>
                                                                        </tr>,
                                                                        <tr key="Trigger-ScheduleDetail">
                                                                            {
                                                                                this.state.task.scheduledType === ScheduledType.CronExpression &&
                                                                                [
                                                                                    <td key="Trigger-CronExpressionKey"><strong>Scheduled Cron Expression</strong></td>,
                                                                                    <td key="Trriger-CronExpressionValue">{this.state.task.scheduledCronExpression}</td>
                                                                                ]
                                                                            }
                                                                            {
                                                                                this.state.task.scheduledType === ScheduledType.FixedRate &&
                                                                                [
                                                                                    <td key="Trigger-FixedRateKey"><strong>Scheduled Fixed Rate</strong></td>,
                                                                                    <td key="Trigger-FixedRateValue">{this.state.task.scheduledFixedRateInterval} {this.state.task.scheduledFixedRateType}</td>
                                                                                ]
                                                                            }
                                                                        </tr>
                                                                    ]
                                                                }
                                                                {
                                                                    this.state.task.triggerType === TriggerType.Event &&
                                                                    <tr key="Trigger-Event">
                                                                        <td><strong>Event Pattern</strong></td>
                                                                        <td>
                                                                            <pre>{this.state.task.eventPattern}</pre>
                                                                        </td>
                                                                    </tr>
                                                                }
                                                            </tbody>
                                                        }
                                                    </Table>
                                                </Col>
                                            </Row>
                                        </Tab>
{/*
    Logs Tab
*/}
                                        <Tab eventKey={"logs"} title="Logs">
                                            <Row>
                                                <Col md={12}>&nbsp;</Col>
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
                                                            this.getTaskExecutions(QueryType.new);
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
                                                                <th>Task Execution ID</th>
                                                                <th>Status</th>
                                                                <th>Total Resources</th>
                                                                <th>Completed Resources</th>
                                                                <th>
                                                                    Start Time
                                                                    &nbsp;
                                                                    <Button bsSize="xsmall" onClick={this.handleSort}>
                                                                        <Glyphicon glyph={this.state.sortType === SortType.asc ? 'sort-by-attributes' : 'sort-by-attributes-alt'} />
                                                                    </Button>
                                                                </th>
                                                                <th>
                                                                    Last Update Time
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {
                                                                this.state.isExecutionsLoading &&
                                                                <tr>
                                                                    <td colSpan={6} align="center">Loading...</td>
                                                                </tr>
                                                            }
                                                            {
                                                                this.state.taskExecutions.length === 0 && !this.state.isExecutionsLoading &&
                                                                <tr>
                                                                    <td colSpan={6} align="center">No task execution found.</td>
                                                                </tr>
                                                            }
                                                            {
                                                                this.state.taskExecutions.map((taskExecution: TaskExecution) => {
                                                                    return (
                                                                        <tr key={taskExecution.parentExecutionId}>
                                                                            <td>
                                                                                <LinkContainer key={`link-${taskExecution.parentExecutionId}`}
                                                                                    to={
                                                                                        {
                                                                                            pathname: `/tasks/${this.state.task.taskId}/executions/${taskExecution.parentExecutionId}`,
                                                                                            state: { taskName: this.state.task.name }
                                                                                        }
                                                                                    } exact>
                                                                                    <span className="execution-link">{taskExecution.parentExecutionId}</span>
                                                                                </LinkContainer>
                                                                            </td>
                                                                            <td>
                                                                                {
                                                                                    [
                                                                                        TaskExecutionStatus.pending,
                                                                                        TaskExecutionStatus.inProgress,
                                                                                        TaskExecutionStatus.waiting,
                                                                                        TaskExecutionStatus.cancelling
                                                                                    ].indexOf(taskExecution.status) > -1 &&
                                                                                    <span className="execution-blue">
                                                                                        <Glyphicon glyph="hourglass" /> {taskExecution.status}
                                                                                    </span>
                                                                                }
                                                                                {
                                                                                    taskExecution.status === TaskExecutionStatus.success &&
                                                                                    <span className="execution-green">
                                                                                        <Glyphicon glyph="ok" /> {taskExecution.status}
                                                                                    </span>
                                                                                }
                                                                                {
                                                                                    [
                                                                                        TaskExecutionStatus.timedOut,
                                                                                        TaskExecutionStatus.cancelled,
                                                                                        TaskExecutionStatus.failed
                                                                                    ].indexOf(taskExecution.status) > -1 &&
                                                                                    <span className="execution-red">
                                                                                        <Glyphicon glyph="remove" /> {taskExecution.status}
                                                                                    </span>
                                                                                }
                                                                            </td>
                                                                            <td>{taskExecution.totalResourceCount}</td>
                                                                            <td>{taskExecution.completedResourceCount}</td>
                                                                            <td>{taskExecution.startTime}</td>
                                                                            <td>{taskExecution.lastUpdateTime.replace('_', ' ').replace(/\./g, ':')}</td>
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
                                                        <Pager.Item previous disabled={this.state.queryCurrentPosition === 0} onClick={() => this.getTaskExecutions(QueryType.prev)}>
                                                            <Glyphicon glyph="triangle-left" /> Previous Page
                                                        </Pager.Item>
                                                        {
                                                            !this.state.isExecutionsLoading &&
                                                            <span>
                                                            {
                                                                this.state.taskExecutions.length === 0 &&
                                                                <strong>No Task Execution</strong>
                                                            }
                                                            {
                                                                this.state.taskExecutions.length > 0 &&
                                                                <strong>Task Executions {this.state.itemsPerPage * this.state.queryCurrentPosition + 1} - {this.state.itemsPerPage * this.state.queryCurrentPosition + this.state.taskExecutions.length}</strong>
                                                            }
                                                            </span>
                                                        }
                                                        <Pager.Item next disabled={this.state.queryKeys.length === this.state.queryCurrentPosition + 1} onClick={() => this.getTaskExecutions(QueryType.next)}>
                                                            Next Page <Glyphicon glyph="triangle-right" />
                                                        </Pager.Item>
                                                    </Pager>
                                                </Col>
                                            </Row>
                                            {
                                                this.state.isExecutionsLoading &&
                                                <Row>
                                                    <Col md={12}>
                                                        <ProgressBar active now={100} />
                                                    </Col>
                                                </Row>
                                            }
                                        </Tab>
                                    </Tabs>
                                </Col>
                            </Row>
                        ]
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
                        this.state.modalAction === 'deleteTask' &&
                        [
                            <Modal.Header closeButton key="Delete-Modal-Header">
                                <Modal.Title>Delete Task</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="Delete-Modal-Body">Are you sure to delete the task <strong>{this.state.task.name}</strong>?</Modal.Body>,
                            <Modal.Footer key="Delete-Modal-Footer">
                                <Button onClick={this.handleModalClose}>Cancel</Button>
                                <Button bsStyle="danger" onClick={() => this.deleteTask(this.state.task.taskId as string)} disabled={this.state.isModalInProgress}>Delete</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'deleteTaskConfirm' &&
                        [
                            <Modal.Header closeButton key="Delete-Confirm-Modal-Header">
                                <Modal.Title>Task Deleted</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="Delete-Confirm-Modal-Body">
                                Task <strong>{this.state.task.name}</strong> has been deleted.
                            </Modal.Body>,
                            <Modal.Footer key="Delete-Confirm-Modal-Footer">
                                <Button onClick={() => { this.props.history.push('/tasks') }}>Close</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'executeTask' &&
                        [
                            <Modal.Header closeButton key="Execute-Modal-Header">
                                <Modal.Title>Execute Task</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="Execute-Modal-Body">Are you sure to execute the task <strong>{this.state.task.name}</strong> manually?</Modal.Body>,
                            <Modal.Footer key="Execute-Modal-Footer">
                                <Button onClick={this.handleModalClose}>Cancel</Button>
                                <Button bsStyle="primary" onClick={() => this.executeTask(this.state.task.taskId as string)} disabled={this.state.isModalInProgress}>Execute</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'executeTaskResult' &&
                        [
                            <Modal.Header closeButton key="Execute-Result-Modal-Header">
                                <Modal.Title>Execute Task Result</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="Execute-Result-Modal-Body">{this.state.executeResult}</Modal.Body>,
                            <Modal.Footer key="Execute-Result-Modal-Footer">
                                <Button onClick={this.handleModalClose}>Close</Button>
                            </Modal.Footer>
                        ]
                    }
                    {
                        this.state.modalAction === 'acknowledgement' &&
                        [
                            <Modal.Header closeButton key="Acknowledgement-Modal-Header">
                                <Modal.Title>Launch the secondary stack</Modal.Title>
                            </Modal.Header>,
                            <Modal.Body key="Acknowledgement-Modal-Body">
                                <p>
                                    You need to launch the secondary CloudFormation stacks in <strong>every region in every account</strong>.<br />
                                    To copy the CloudFormation template URL, click <strong>Copy URL</strong> button in the task detail page.
                                </p>
                            </Modal.Body>,
                            <Modal.Footer key="Acknowledgement-Modal-Footer">
                                <Button bsStyle="primary" onClick={this.handleModalClose}>Acknowledge</Button>
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

export default TaskDetail;