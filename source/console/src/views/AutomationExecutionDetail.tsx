/***************************************************************************************
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. *
 *                                                                                      *
 * Licensed under the Apache License, Version 2.0 (the "License").                      *
 * You may not use this file except in compliance with the License.                     *
 * A copy of the License is located at                                                  *
 *                                                                                      *
 *     http://www.apache.org/licenses/LICENSE-2.0                                       *
 *                                                                                      *
 * or in the "license" file accompanying this file. This file is distributed            *
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either            *
 * express or implied. See the License for the specific language governing              *
 * permissions and limitations under the License.                                       *
 ***************************************************************************************/

import * as React from 'react';

import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, PageHeader, Breadcrumb, BreadcrumbItem, Alert, ProgressBar, Panel, Table,
    FormGroup, ControlLabel, Glyphicon, FormControl } from 'react-bootstrap';
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
    taskId: string;
    parentExecutionId: string;
    automationExecutionId: string;
    execution: Execution;
    isLoading: boolean;
    error: string;
    showStepDetail: boolean;
    stepExecutionId: string;
}

// Execution interface
interface Execution {
    DocumentName: string;
    AutomationExecutionId: string;
    AutomationExecutionStatus: ExecutionStatus;
    ExecutionStartTime?: number;
    ExecutionEndTime?: number;
    StepExecutions?: StepExecution[];
}

// Step interface
interface StepExecution {
    StepExecutionId: string;
    StepStatus: ExecutionStatus;
    Inputs: object;
    Outputs?: {
        OutputPayload?: any;
    };
    OnFailure?: string;
    StepName?: string;
    Action?: string;
    FailureMessage?: string;
    ExecutionStartTime?: string;
    ExecutionEndTime?: string;
    FailureDetails?: {
        FailureStage: string;
        FailureType: string;
        Details: {
            ErrorCode?: string[];
            ExceptionMessage?: string[];
            ServiceName?: string[];
            APIName?: string[];
            StatusCode?: string[];
        }
    };
}

// Execution status enum
enum ExecutionStatus {
    pending = 'Pending',
    inProgress = 'InProgress',
    waiting = 'Waiting',
    success = 'Success',
    timedOut = 'TimedOut',
    cancelling = 'Cancelling',
    cancelled = 'Cancelled',
    failed = 'Failed'
}

// External variables
const LOGGER = new Logger('ExecutionDetail', LOGGING_LEVEL);
const API_NAME = 'operations-conductor-api';

class AutomationExecutionDetail extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            taskId: this.props.match.params.taskId,
            parentExecutionId: this.props.match.params.parentExecutionId,
            automationExecutionId: this.props.match.params.automationExecutionId,
            execution: {
                DocumentName: '',
                AutomationExecutionId: '',
                AutomationExecutionStatus: ExecutionStatus.inProgress
            },
            isLoading: false,
            error: '',
            showStepDetail: false,
            stepExecutionId: ''
        };
    }

    componentDidMount() {
        this.setApiToken().then(() => {
            this.getExecution();
        }).catch((error) => {
            this.handleError('Error occurred while setting API token', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Gets an execution
    getExecution = async () => {
        this.setState({
            isLoading: true,
            error: '',
        });

        const { taskId, parentExecutionId, automationExecutionId } = this.state;
        let path = `/tasks/${taskId}/executions/${parentExecutionId}/${automationExecutionId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let execution: Execution = await API.get(API_NAME, path, params);
            this.setState({ execution });
        } catch (error) {
            this.handleError('Error occurred while getting an execution detail.', error);
        } finally {
            this.setState({ isLoading: false });
        }
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
                                <LinkContainer to={`/tasks/${this.props.match.params.taskId}`} exact>
                                    <BreadcrumbItem>{`Task Detail: ${this.props.location.state.taskName}`}</BreadcrumbItem>
                                </LinkContainer>
                                <LinkContainer
                                    to={
                                        {
                                            pathname: `/tasks/${this.props.match.params.taskId}/executions/${this.props.match.params.parentExecutionId}`,
                                            state: { taskName: this.props.location.state.taskName }
                                        }} exact>
                                    <BreadcrumbItem>Task Execution ID: {this.props.match.params.parentExecutionId}</BreadcrumbItem>
                                </LinkContainer>
                                <BreadcrumbItem active>Automation Execution ID: {this.props.match.params.automationExecutionId}</BreadcrumbItem>
                            </Breadcrumb>
                        </Col>
                    </Row>
                    {
                        !this.state.isLoading &&
                        [
                            <Row key="header">
                                <Col md={12}>
                                    <PageHeader>
                                        Automation Execution Detail - <small>{this.state.execution.DocumentName}</small>
                                    </PageHeader>
                                </Col>
                            </Row>,
                            <Row key="execution-description">
                                <Col md={12}>
                                   <Panel>
                                       <Panel.Heading>
                                           <Panel.Title componentClass="h3">Execution description</Panel.Title>
                                       </Panel.Heading>
                                       <Panel.Body>
                                            <Row className="show-grid">
                                                <Col md={6}>
                                                    <FormGroup>
                                                        <ControlLabel>Executed automation</ControlLabel>
                                                        <FormControl.Static>{this.state.execution.DocumentName}</FormControl.Static>
                                                    </FormGroup>
                                                    <FormGroup>
                                                        <ControlLabel>Execution ID</ControlLabel>
                                                        <FormControl.Static>{this.state.execution.AutomationExecutionId}</FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={6}>
                                                    <FormGroup>
                                                        <ControlLabel>Start time</ControlLabel>
                                                        <FormControl.Static>{this.state.execution.ExecutionStartTime}</FormControl.Static>
                                                    </FormGroup>
                                                    <FormGroup>
                                                        <ControlLabel>End time</ControlLabel>
                                                        <FormControl.Static>{this.state.execution.ExecutionEndTime}</FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                       </Panel.Body>
                                    </Panel>
                                </Col>
                            </Row>,
                            <Row key="execution-status">
                                <Col md={12}>
                                    <Panel>
                                        <Panel.Heading>
                                            <Panel.Title componentClass="h3">Execution status</Panel.Title>
                                        </Panel.Heading>
                                        <Panel.Body>
                                            <Row>
                                                <Col md={2}>
                                                    <FormGroup>
                                                        <ControlLabel>Overall status</ControlLabel>
                                                        <FormControl.Static>
                                                            {
                                                                [
                                                                    ExecutionStatus.pending,
                                                                    ExecutionStatus.inProgress,
                                                                    ExecutionStatus.waiting,
                                                                    ExecutionStatus.cancelling
                                                                ].indexOf(this.state.execution.AutomationExecutionStatus) > -1 &&
                                                                <span className="execution-blue">
                                                                    <Glyphicon glyph="hourglass" /> {this.state.execution.AutomationExecutionStatus}
                                                                </span>
                                                            }
                                                            {
                                                                this.state.execution.AutomationExecutionStatus === ExecutionStatus.success &&
                                                                <span className="execution-green">
                                                                    <Glyphicon glyph="ok" /> {this.state.execution.AutomationExecutionStatus}
                                                                </span>
                                                            }
                                                            {
                                                                [
                                                                    ExecutionStatus.timedOut,
                                                                    ExecutionStatus.cancelled,
                                                                    ExecutionStatus.failed
                                                                ].indexOf(this.state.execution.AutomationExecutionStatus) > -1 &&
                                                                <span className="execution-red">
                                                                    <Glyphicon glyph="remove" /> {this.state.execution.AutomationExecutionStatus}
                                                                </span>
                                                            }
                                                        </FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={2}>
                                                    <FormGroup>
                                                        <ControlLabel>All executed steps</ControlLabel>
                                                        <FormControl.Static>
                                                            {
                                                                this.state.execution.StepExecutions ?
                                                                this.state.execution.StepExecutions
                                                                    .filter((stepExecution: StepExecution) =>
                                                                        [
                                                                            ExecutionStatus.success,
                                                                            ExecutionStatus.timedOut,
                                                                            ExecutionStatus.cancelled,
                                                                            ExecutionStatus.failed
                                                                        ].indexOf(stepExecution.StepStatus) > -1
                                                                    ).length
                                                                : '0'
                                                            }
                                                        </FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={2}>
                                                    <FormGroup>
                                                        <ControlLabel># Succeeded</ControlLabel>
                                                        <FormControl.Static>
                                                            {
                                                                this.state.execution.StepExecutions ?
                                                                this.state.execution.StepExecutions
                                                                    .filter((stepExecution: StepExecution) => stepExecution.StepStatus === ExecutionStatus.success)
                                                                    .length
                                                                : '0'
                                                            }
                                                        </FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={2}>
                                                    <FormGroup>
                                                        <ControlLabel># Failed</ControlLabel>
                                                        <FormControl.Static>
                                                            {
                                                                this.state.execution.StepExecutions ?
                                                                this.state.execution.StepExecutions
                                                                    .filter((stepExecution: StepExecution) => stepExecution.StepStatus === ExecutionStatus.failed)
                                                                    .length
                                                                : '0'
                                                            }
                                                        </FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={2}>
                                                    <FormGroup>
                                                        <ControlLabel># Cancelled</ControlLabel>
                                                        <FormControl.Static>
                                                            {
                                                                this.state.execution.StepExecutions ?
                                                                this.state.execution.StepExecutions
                                                                    .filter((stepExecution: StepExecution) => stepExecution.StepStatus === ExecutionStatus.cancelled)
                                                                    .length
                                                                : '0'
                                                            }
                                                        </FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={2}>
                                                    <FormGroup>
                                                        <ControlLabel># TimedOut</ControlLabel>
                                                        <FormControl.Static>
                                                            {
                                                                this.state.execution.StepExecutions ?
                                                                this.state.execution.StepExecutions
                                                                    .filter((stepExecution: StepExecution) => stepExecution.StepStatus === ExecutionStatus.timedOut)
                                                                    .length
                                                                : '0'
                                                            }
                                                        </FormControl.Static>
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                        </Panel.Body>
                                    </Panel>
                                </Col>
                            </Row>,
                            <Row key="execution-steps">
                                <Col md={12}>
                                    <Panel>
                                        <Panel.Heading>
                                            <Panel.Title componentClass="h3">Executed steps</Panel.Title>
                                        </Panel.Heading>
                                        <Panel.Body>
                                            <Table striped bordered condensed hover>
                                                <thead>
                                                    <tr>
                                                        <th>Step ID</th>
                                                        <th>Step #</th>
                                                        <th>Step Name</th>
                                                        <th>Action</th>
                                                        <th>Status</th>
                                                        <th>Start Time</th>
                                                        <th>End Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {
                                                        this.state.execution.StepExecutions ?
                                                        this.state.execution.StepExecutions.length === 0 ?
                                                        <tr key="step-execution-length-zero">
                                                            <td colSpan={7}>No step execution found.</td>
                                                        </tr> :
                                                        this.state.execution.StepExecutions
                                                            .filter((stepExecution) => (
                                                                (this.state.execution.AutomationExecutionStatus === ExecutionStatus.success && stepExecution.StepStatus !== ExecutionStatus.pending) ||
                                                                (this.state.execution.AutomationExecutionStatus !== ExecutionStatus.success))
                                                            )
                                                        .map((stepExecution: StepExecution, index: number) => {
                                                            return (
                                                                <tr key={`step-execution-${stepExecution.StepExecutionId}`}>
                                                                    <td>
                                                                        <span className="execution-link"
                                                                            onClick={() => {this.setState({ showStepDetail: true, stepExecutionId: stepExecution.StepExecutionId })}}>
                                                                            {stepExecution.StepExecutionId}
                                                                        </span>
                                                                    </td>
                                                                    <td>{index + 1}</td>
                                                                    <td>{stepExecution.StepName}</td>
                                                                    <td>{stepExecution.Action}</td>
                                                                    <td>
                                                                        {
                                                                            [
                                                                                ExecutionStatus.pending,
                                                                                ExecutionStatus.inProgress,
                                                                                ExecutionStatus.waiting,
                                                                                ExecutionStatus.cancelling
                                                                            ].indexOf(stepExecution.StepStatus) > -1 &&
                                                                            <span className="execution-blue">
                                                                                <Glyphicon glyph="hourglass" /> {stepExecution.StepStatus}
                                                                            </span>
                                                                        }
                                                                        {
                                                                            stepExecution.StepStatus === ExecutionStatus.success &&
                                                                            <span className="execution-green">
                                                                                <Glyphicon glyph="ok" /> {stepExecution.StepStatus}
                                                                            </span>
                                                                        }
                                                                        {
                                                                            [
                                                                                ExecutionStatus.timedOut,
                                                                                ExecutionStatus.cancelled,
                                                                                ExecutionStatus.failed
                                                                            ].indexOf(stepExecution.StepStatus) > -1 &&
                                                                            <span className="execution-red">
                                                                                <Glyphicon glyph="remove" /> {stepExecution.StepStatus}
                                                                            </span>
                                                                        }
                                                                    </td>
                                                                    <td>{stepExecution.ExecutionStartTime}</td>
                                                                    <td>{stepExecution.ExecutionEndTime}</td>
                                                                </tr>
                                                                );
                                                        }) :
                                                        <tr key="step-execution-not-found">
                                                            <td colSpan={7}>No step execution found.</td>
                                                        </tr>
                                                    }
                                                </tbody>
                                            </Table>
                                        </Panel.Body>
                                    </Panel>
                                </Col>
                            </Row>,
                            <Row key="execution-step-detail">
                                <Col md={12}>
                                    {
                                        this.state.showStepDetail &&
                                        <div>
                                            {
                                                this.state.execution.StepExecutions !== undefined &&
                                                this.state.execution.StepExecutions
                                                    .filter((stepExecution: StepExecution) => stepExecution.StepExecutionId === this.state.stepExecutionId)
                                                    .map((stepExecution: StepExecution) => {
                                                        return (
                                                            <div key={stepExecution.StepExecutionId}>
                                                                <Panel key="execution-step-detail-general">
                                                                    <Panel.Heading>
                                                                        <Panel.Title componentClass="h3">Automation step: {stepExecution.StepName}</Panel.Title>
                                                                    </Panel.Heading>
                                                                    <Panel.Body>
                                                                        <Row>
                                                                            <Col md={3}>
                                                                                <FormGroup>
                                                                                    <ControlLabel>Status</ControlLabel>
                                                                                    <FormControl.Static>
                                                                                    {
                                                                                        [
                                                                                            ExecutionStatus.pending,
                                                                                            ExecutionStatus.inProgress,
                                                                                            ExecutionStatus.waiting,
                                                                                            ExecutionStatus.cancelling
                                                                                        ].indexOf(stepExecution.StepStatus) > -1 &&
                                                                                        <span className="execution-blue">
                                                                                            <Glyphicon glyph="hourglass" /> {stepExecution.StepStatus}
                                                                                        </span>
                                                                                    }
                                                                                    {
                                                                                        stepExecution.StepStatus === ExecutionStatus.success &&
                                                                                        <span className="execution-green">
                                                                                            <Glyphicon glyph="ok" /> {stepExecution.StepStatus}
                                                                                        </span>
                                                                                    }
                                                                                    {
                                                                                        [
                                                                                            ExecutionStatus.timedOut,
                                                                                            ExecutionStatus.cancelled,
                                                                                            ExecutionStatus.failed
                                                                                        ].indexOf(stepExecution.StepStatus) > -1 &&
                                                                                        <span className="execution-red">
                                                                                            <Glyphicon glyph="remove" /> {stepExecution.StepStatus}
                                                                                        </span>
                                                                                    }
                                                                                    </FormControl.Static>
                                                                                </FormGroup>
                                                                            </Col>
                                                                            <Col md={3}>
                                                                                <FormGroup>
                                                                                    <ControlLabel>Action</ControlLabel>
                                                                                    <FormControl.Static>{stepExecution.Action}</FormControl.Static>
                                                                                </FormGroup>
                                                                            </Col>
                                                                            <Col md={3}>
                                                                                <FormGroup>
                                                                                    <ControlLabel>Start time</ControlLabel>
                                                                                    <FormControl.Static>{stepExecution.ExecutionStartTime}</FormControl.Static>
                                                                                </FormGroup>
                                                                            </Col>
                                                                            <Col md={3}>
                                                                                <FormGroup>
                                                                                    <ControlLabel>End time</ControlLabel>
                                                                                    <FormControl.Static>{stepExecution.ExecutionEndTime}</FormControl.Static>
                                                                                </FormGroup>
                                                                            </Col>
                                                                        </Row>
                                                                    </Panel.Body>
                                                                </Panel>
                                                                {
                                                                    stepExecution.Outputs !== undefined &&
                                                                    <Panel key="execution-step-detail-outputs">
                                                                        <Panel.Heading>
                                                                        <Panel.Title componentClass="h3">Outputs step: {stepExecution.StepName}</Panel.Title>
                                                                    </Panel.Heading>
                                                                        <Panel.Body>
                                                                            <Row>
                                                                                <Col md={12}>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>Payload</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            <code>
                                                                                                {stepExecution.Outputs['OutputPayload']}
                                                                                            </code>
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                </Col>
                                                                            </Row>
                                                                        </Panel.Body>
                                                                    </Panel>
                                                                }
                                                                {
                                                                    stepExecution.FailureMessage !== undefined &&
                                                                    <Panel key="execution-step-detail-failure">
                                                                        <Panel.Heading componentClass="h3">
                                                                            <Panel.Title>Automation step: {stepExecution.StepName} - Failure details</Panel.Title>
                                                                        </Panel.Heading>
                                                                        <Panel.Body>
                                                                            <Row>
                                                                                <Col md={12}>
                                                                                    <Alert bsStyle="danger">
                                                                                        <Row>
                                                                                            <Col md={1}>
                                                                                                <h2 className="step-failure-glyphicon"><Glyphicon glyph="remove-circle" /></h2>
                                                                                            </Col>
                                                                                            <Col md={11}>
                                                                                                <p className="step-failure-p">
                                                                                                    <strong>Failure message</strong><br />
                                                                                                    {stepExecution.FailureMessage}
                                                                                                </p>
                                                                                            </Col>
                                                                                        </Row>
                                                                                    </Alert>
                                                                                </Col>
                                                                            </Row>
                                                                            <Row>
                                                                                <Col md={3}>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>FailureType</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.FailureType :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>ServiceName</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.Details.ServiceName ?
                                                                                                stepExecution.FailureDetails.Details.ServiceName[0] :
                                                                                                '-' :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={3}>
                                                                                <FormGroup>
                                                                                    <ControlLabel>FailureStage</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.FailureStage :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>StatusCode</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.Details.StatusCode ?
                                                                                                stepExecution.FailureDetails.Details.StatusCode[0] :
                                                                                                '-' :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={3}>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>APIName</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.Details.APIName ?
                                                                                                stepExecution.FailureDetails.Details.APIName[0] :
                                                                                                '-' :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={3}>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>ErrorCode</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.Details.ErrorCode ?
                                                                                                stepExecution.FailureDetails.Details.ErrorCode[0] :
                                                                                                '-' :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                </Col>
                                                                            </Row>
                                                                            <Row>
                                                                                <Col md={12}>
                                                                                    <FormGroup>
                                                                                        <ControlLabel>ExceptionMessage</ControlLabel>
                                                                                        <FormControl.Static>
                                                                                            {
                                                                                                stepExecution.FailureDetails ?
                                                                                                stepExecution.FailureDetails.Details.ExceptionMessage ?
                                                                                                stepExecution.FailureDetails.Details.ExceptionMessage[0] :
                                                                                                '-' :
                                                                                                '-'
                                                                                            }
                                                                                        </FormControl.Static>
                                                                                    </FormGroup>
                                                                                </Col>
                                                                            </Row>
                                                                        </Panel.Body>
                                                                    </Panel>
                                                                }
                                                            </div>
                                                        );
                                                    })
                                            }
                                        </div>
                                    }
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
            </div>
        );
    }
}

export default AutomationExecutionDetail;