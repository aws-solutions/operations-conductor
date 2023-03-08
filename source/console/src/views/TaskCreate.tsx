/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

 import * as React from 'react';

import API from '@aws-amplify/api';
import { Logger } from '@aws-amplify/core';

import { Grid, Row, Col, Button, ProgressBar, PageHeader, Breadcrumb, BreadcrumbItem, Alert, ButtonToolbar,
    Form, FormGroup, ControlLabel, FormControl, HelpBlock, Table } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { LOGGING_LEVEL} from '../components/CustomUtil';

// Properties
interface IProps {
    history?: any;
    location: any;
    getApiToken: Function;
}

// States
interface IState {
    token: string;
    mode: string;
    step: number;
    task: Task;
    isLoading: boolean;
    error: string;
    validation: {
        taskName: any,
        targetTag: any,
        cronExpression: any,
        interval: any,
        accounts: any,
        regions: any
	};
	showHelp: {
		taskName: boolean,
        targetTag: boolean,
        cronExpression: boolean,
        interval: boolean,
        accounts: boolean,
        regions: boolean
	};
}

// TaskParameter interface
interface TaskParameter {
    Name: string;
    Type: string;
    Description: string;
    Value?: string;
    DefaultValue?: string;
}

// Task interface
interface Task {
    taskId: string;
    name: string;
    description: string;
    targetTag: string;
    taskParameters: TaskParameter[];
    accounts: string;
    regions: string;
    actionName: string;
    triggerType: TriggerType;
    scheduledType?: ScheduledType;
    scheduledFixedRateInterval?: string;
    scheduledFixedRateType?: ScheduledFixedRateType;
    scheduledCronExpression?: string;
    eventPattern?: string;
}

// Action interface
interface Action {
    name: string;
    owner: string;
    description: string;
    parameters: TaskParameter[];
}

// Trigger type enum
enum TriggerType {
    Schedule = 'Schedule',
    Event = 'Event'
}

// Scheduled type enum
enum ScheduledType {
    CronExpression = 'CronExpression',
    FixedRate = 'FixedRate'
}

// Scheduled fixed rate type enum
enum ScheduledFixedRateType {
    minutes = 'minutes',
    hours = 'hours',
    days = 'days'
}

// External variables
const LOGGER = new Logger('TaskCreate', LOGGING_LEVEL);
const API_NAME = 'operations-conductor-api';
const EVENT_PLACEHOLDER = `{
    "source": [
      "aws.ec2"
    ],
    "detail-type": [
      "EC2 Instance State-change Notification"
    ],
    "detail": {
      "state": [
        "running"
      ]
    }
}`;

class TaskCreate extends React.Component<IProps, IState> {
    // class properties
    TriggerForm: Function;
    hiddenParameters: string[];

    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            token: '',
            mode: '',
            step: 1,
            task: {
                taskId: '',
                name: '',
                description: '',
                targetTag: '',
                taskParameters: [],
                accounts: '',
                regions: '',
                actionName: '',
                triggerType: TriggerType.Schedule,
                scheduledType: ScheduledType.CronExpression,
                scheduledFixedRateType: ScheduledFixedRateType.minutes
            },
            isLoading: false,
            error: '',
            validation: {
                taskName: null,
                targetTag: null,
                cronExpression: null,
                interval: null,
                accounts: null,
                regions: null
			},
			showHelp: {
				taskName: false,
				targetTag: false,
				cronExpression: false,
                interval: false,
				accounts: false,
				regions: false
			}
        };

        this.TriggerForm = () => {
            if (this.state.task.triggerType === TriggerType.Schedule) {
                return (
                    <div>
                        <FormGroup controlId="scheduleType">
                            <Col componentClass={ControlLabel} md={3}>
                                Schedule Type
                            </Col>
                            <Col md={9}>
                                <FormControl componentClass="select" defaultValue={this.state.task.scheduledType}
                                    onChange={(event) => {
                                        event.persist();
                                        this.handleScheduledTypeChange(event);
                                    }}
                                >
                                    <option value={ScheduledType.CronExpression}>Cron Expression</option>
                                    <option value={ScheduledType.FixedRate}>Fixed Rate</option>
                                </FormControl>
                            </Col>
                        </FormGroup>
                        {
                            (this.state.task.scheduledType === ScheduledType.CronExpression || !this.state.task.scheduledType) &&
                            <FormGroup controlId="cronExpression" validationState={this.state.validation.cronExpression}>
                                <Col componentClass={ControlLabel} md={3}>
                                    Cron Expression
                                </Col>
                                <Col md={9}>
                                    <FormControl key="cronExpression" type="text" placeholder="0/5 * * * ? *" defaultValue={this.state.task.scheduledCronExpression}
                                        onChange={(event) => {
                                            event.persist();
                                            this.handleCronExpressionChange(event);
                                        }}
                                    />
                                    <HelpBlock>
                                        <a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html" target="_blank" rel="noopener noreferrer">Learn more</a> about CloudWatch Events schedules.
                                    </HelpBlock>
                                </Col>
                            </FormGroup>
                        }
                        {
                            this.state.task.scheduledType === ScheduledType.FixedRate &&
                            <FormGroup controlId="scheduledFixedRate" validationState={this.state.validation.interval}>
                                <Col componentClass={ControlLabel} md={3}>
                                    Fixed Rate of
                                </Col>
                                <Col md={5}>
                                    <FormControl type="text" placeholder="Enter interval" defaultValue={this.state.task.scheduledFixedRateInterval}
                                        onChange={(event) => {
                                            event.persist();
                                            this.handleScheduledFixedRateIntervalChange(event);
                                        }}
                                    />
                                    <HelpBlock>
                                        {
                                            this.state.showHelp.interval &&
                                            <span>Invalid interval (1 &lt;= interval, integer number). </span>
                                        }
                                        <a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html" target="_blank" rel="noopener noreferrer">Learn more</a> about CloudWatch Events schedules.
                                    </HelpBlock>
                                </Col>
                                <Col md={4}>
                                    <FormControl componentClass="select" defaultValue={this.state.task.scheduledFixedRateType}
                                        onChange={(event) => {
                                            event.persist();
                                            this.handleScheduledFixedRateTypeChange(event);
                                        }}
                                    >
                                        <option value={ScheduledFixedRateType.minutes}>Minutes</option>
                                        <option value={ScheduledFixedRateType.hours}>Hours</option>
                                        <option value={ScheduledFixedRateType.days}>Days</option>
                                    </FormControl>
                                </Col>
                            </FormGroup>
                        }
                    </div>
                );
            } else if (this.state.task.triggerType === TriggerType.Event) {
                return (
                    <div>
                        <FormGroup controlId="eventPattern">
                            <Col componentClass={ControlLabel} md={3}>
                                Event Pattern
                            </Col>
                            <Col md={9}>
                                <FormControl componentClass="textarea" placeholder={EVENT_PLACEHOLDER} defaultValue={this.state.task.eventPattern}
                                    onChange={(event) => {
                                        event.persist();
                                        this.handleEventPatternChange(event);
                                    }}
                                    className="textarea" />
                                <HelpBlock>
                                    Learn more about <a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/CloudWatchEventsandEventPatterns.html" target="_blank" rel="noopener noreferrer">event pattens</a>
                                    &nbsp;and <a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/EventTypes.html" target="_blank" rel="noopener noreferrer">event examples from supported services</a>.
                                </HelpBlock>
                            </Col>
                        </FormGroup>
                    </div>
                );
            } else {
                return (null);
            }
        };

        this.hiddenParameters = ['SQSMsgBody', 'SQSMsgReceiptHandle', 'TargetResourceType'];
    }

    componentDidMount() {
        if (this.props.location.state === undefined) {
            this.props.history.push('/tasks/actions');
        }

        this.setApiToken().then(() => {
            let actionName = '';
            if (this.props.location.state.task) {
                actionName = this.props.location.state.task.actionName;
                let task = this.props.location.state.task;
                this.setState({
                    task: {
                        ...task,
                        accounts: task.accounts!.join(','),
                        regions: task.regions!.join(','),
                        scheduledFixedRateInterval: task.scheduledFixedRateInterval ? `${task.scheduledFixedRateInterval}` : undefined,
                        scheduledFixedRateType: task.scheduledFixedRateType ? this.getScheduledFixedRateType(task.scheduledFixedRateType) : ScheduledFixedRateType.minutes
                    },
                    mode: 'Edit'
                });
            } else {
                actionName = this.props.location.state.actionName;
                this.setState((prevState) => ({
                    task: {
                        ...prevState.task,
                        actionName
                    },
                    mode: 'Create'
                }));
            }
            this.getActionDocument(actionName);
        }).catch((error) => {
            this.handleError('Error occurred while setting API token', error);
        });
    }

    // Sets API token
    setApiToken = async () => {
        let token = await this.props.getApiToken();
        this.setState({ token });
    };

    // Gets scheduled fixed rate type
    getScheduledFixedRateType = (scheduledFixedRateType: string) => {
        return scheduledFixedRateType.endsWith('s') ? scheduledFixedRateType : `${scheduledFixedRateType}s`
    }

    // Gets an action document
    getActionDocument = async (actionId: string) => {
        this.setState({
            isLoading: true,
            error: ''
        });

        let path = `/actions/${actionId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            }
        };

        try {
            let action: Action = await API.get(API_NAME, path, params);
            if (this.state.mode === 'Create') {
                this.setState((prevState) => ({
                    task: {
                        ...prevState.task,
                        taskParameters: action.parameters,
                        targetParameter: action.parameters[0].Name
                    }
                }));
            }
        } catch (error) {
            this.handleError('Error occurred while getting an action document.', error);
        } finally {
            this.setState({ isLoading: false });
        }
    };

    // Gets a default value of a parameter
    getParameterValue = (name: string): string => {
        let parameters = this.state.task.taskParameters;
        for (let parameter of parameters) {
            if (parameter.Name === name) {
                if (parameter.Value !== undefined) {
                    return parameter.Value;
                } else {
                    return '';
                }
            }
        }

        return '';
    };

    // Checks validation of values
    checkValidation = () => {
        let isPass: boolean = true;
        let step: number = this.state.step;
        let task: Task = this.state.task;

        switch (step) {
            // Define Task
            case 1:
                // Checks task name is valid
                isPass = task.name.trim()!== '';
				this.setState((prevState) => ({
					validation: {
						...prevState.validation,
                        taskName: isPass ? null : 'error'
					},
					showHelp: {
						...prevState.validation,
                        taskName: !isPass
					}
                }));
                break;
            // Target Tag
            case 2:
                isPass = task.targetTag.trim() !== '';
                this.setState((prevState) => ({
                    validation: {
                        ...prevState.validation,
                        targetTag: isPass ? null : 'error'
                    },
                    showHelp: {
                        ...prevState.validation,
						targetTag: !isPass
                    }
                }));
                break;
            // Task Parameters
            case 3:
				// Required parameters are going to be checked at the backend.
                break;
            // Task Trigger
            case 4:
                /**
                 * At this stage, only interval value is going to be validated.
                 * Cron expression and event validation are going to be done at the backend.
                 */
				if (task.triggerType === TriggerType.Schedule) {
					if (task.scheduledType === ScheduledType.FixedRate) {
						let interval = task.scheduledFixedRateInterval;
						if (interval === undefined) {
							isPass = false;
						} else {
							isPass = /^[1-9]\d*$/.test(interval);
						}

						this.setState((prevState) => ({
							validation: {
								...prevState.validation,
								cronExpression: null,
								interval: isPass ? null : 'error'
							},
							showHelp: {
								...prevState.validation,
								cronExpression: false,
								interval: !isPass
							}
						}));
					}
                }
                break;
            // Task Scrope
            case 5:
                // Backend is going to validate again.
				let isAccountValid: boolean = task.accounts.trim() !== '';
				let isRegionValid: boolean = task.regions.trim() !== '';

				this.setState((prevState) => ({
					validation: {
						...prevState.validation,
						accounts: isAccountValid ? null : 'error',
						regions: isRegionValid ? null : 'error'
					},
					showHelp: {
						...prevState.validation,
						accounts: !isAccountValid,
						regions: !isRegionValid
					}
				}));

				isPass = isAccountValid && isRegionValid;
                break;
        }

        if (isPass) {
            this.setState({ step: step + 1 });
        }
    }

    // Creates a task
    createTask = async () => {
        this.setState({
            isLoading: true,
            error: ''
        });

        let path = '/tasks';
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                ...this.state.task
            }
        };

        try {
            let task: Task = await API.post(API_NAME, path, params);
            LOGGER.info(`Task created: ${JSON.stringify(task)}`);

            this.setState({ isLoading: false });
            this.props.history.push({
                pathname: `/tasks/${task.taskId}`,
                state: {new: true}
            });
        } catch (error) {
            this.setState({ isLoading: false });
            this.handleError('Error occurred while creating a task.', error);
        }
    };

    // Edits a task
    editTask = async () => {
        this.setState({
            isLoading: true,
            error: ''
        });

        let path = `/tasks/${this.state.task.taskId}`;
        let params = {
            headers: {
                'Authorization': this.state.token
            },
            body: {
                ...this.state.task
            }
        };

        try {
            let task: Task = await API.put(API_NAME, path, params);
            LOGGER.info(`Task created: ${JSON.stringify(task)}`);

            this.setState({ isLoading: false });
            this.props.history.push({
                pathname: `/tasks/${task.taskId}`,
                state: {new: true}
            });
        } catch (error) {
            this.setState({ isLoading: false });
            this.handleError('Error occurred while creating a task.', error);
        }
    };

    // Sets a parameter value
    setParameterValue = (name: string, value: string) => {
        let parameters = this.state.task.taskParameters;
        for (let parameter of parameters) {
            if (parameter.Name === name) {
                parameter.Value = value;
                break;
            }
        }

        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                taskParameters: parameters
            }
        }));
    };

    // Handles value changes
    handleTaskNameChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                name: event.target.value
            }
        }));
    };
    handleTaskDescriptionChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                description: event.target.value
            }
        }));
    };
    handleTargetParameterChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                targetParameter: event.target.value
            }
        }));
    }
    handleTargetTagChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                targetTag: event.target.value
            }
        }));
    };
    handleParameterChange = (event: any, name: string) => {
        this.setParameterValue(name, event.target.value);
    };
    handleTriggerTypeChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                triggerType: event.target.value
            }
        }));
    };
    handleEventPatternChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                eventPattern: event.target.value
            }
        }));
    };
    handleScheduledTypeChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                scheduledType: event.target.value
            }
        }));
    };
    handleCronExpressionChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                scheduledCronExpression: event.target.value
            }
        }));
    };
    handleScheduledFixedRateIntervalChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                scheduledFixedRateInterval: event.target.value
            }
        }));
    };
    handleScheduledFixedRateTypeChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                scheduledFixedRateType: event.target.value
            }
        }));
    };
    handleAccountsChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                accounts: event.target.value
            }
        }));
    };
    handleRegionsChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                regions: event.target.value
            }
        }));
    };
    handleConcurrencyChange = (event: any) => {
        this.setState((prevState) => ({
            task: {
                ...prevState.task,
                concurrency: event.target.value
            }
        }));
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
			<Grid>
				<Row>
					<Col md={12}>
						<Breadcrumb>
							<LinkContainer to="/tasks" exact>
								<BreadcrumbItem>Tasks</BreadcrumbItem>
							</LinkContainer>
                            {
                                this.state.mode === 'Create' &&
                                <LinkContainer to="/tasks/actions" exact>
                                    <BreadcrumbItem>Actions</BreadcrumbItem>
                                </LinkContainer>
                            }
                            {
                                this.state.mode === 'Edit' &&
                                <LinkContainer to={`/tasks/${this.state.task.taskId}`} exact>
                                    <BreadcrumbItem>Update Task</BreadcrumbItem>
                                </LinkContainer>
                            }
							<BreadcrumbItem active>{this.state.mode} Task</BreadcrumbItem>
						</Breadcrumb>
					</Col>
				</Row>
				<Row>
					<Col md={12}>
						<PageHeader>{this.state.mode} a task - <small>{this.state.task.actionName}</small></PageHeader>
					</Col>
				</Row>
				{
					!this.state.isLoading && this.state.step === 1 &&
					<Row>
						<Col md={3}>
							<Button block active>Step 1: Define Task</Button>
                            <Button block disabled>Step 2: Target Tag</Button>
							<Button block disabled>Step 3: Parameters</Button>
							<Button block disabled>Step 4: Task Trigger</Button>
							<Button block disabled>Step 5: Task Scope</Button>
							<Button block disabled>Review</Button>
						</Col>
						<Col md={9}>
							<Form horizontal>
								<FormGroup controlId="taskName" validationState={this.state.validation.taskName}>
									<Col componentClass={ControlLabel} md={3}>
										Task Name
									</Col>
									<Col md={9}>
										<FormControl type="text" placeholder="Enter task name" defaultValue={this.state.task.name}
											onChange={(event) => {
												event.persist();
												this.handleTaskNameChange(event);
											}}
										    disabled={this.state.mode === 'Edit'} />
										{
											this.state.showHelp.taskName &&
											<HelpBlock>Task name cannot be empty.</HelpBlock>
										}
									</Col>
								</FormGroup>
								<FormGroup controlId="taskDescription">
									<Col componentClass={ControlLabel} md={3}>
										Task Description
									</Col>
									<Col md={9}>
										<FormControl type="text" placeholder="Enter task description" defaultValue={this.state.task.description}
											onChange={(event) => {
												event.persist();
												this.handleTaskDescriptionChange(event);
											}}
										/>
									</Col>
								</FormGroup>
							</Form>
							<ButtonToolbar>
								<Button className="pull-right" bsStyle="primary" onClick={this.checkValidation}>Next</Button>
								<Button className="pull-right" bsStyle="link" onClick={() => { this.props.history.goBack() }}>Cancel</Button>
							</ButtonToolbar>
						</Col>
					</Row>
                }
                {
					this.state.step === 2 &&
					<Row>
						<Col md={3}>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 1 }) }}>Step 1: Define Task</Button>
                            <Button block active>Step 2: Target Tag</Button>
							<Button block disabled>Step 3: Parameters</Button>
							<Button block disabled>Step 4: Task Trigger</Button>
							<Button block disabled>Step 5: Task Scope</Button>
                            <Button block disabled>Review</Button>
						</Col>
						<Col md={9}>
							<Form horizontal>
								<FormGroup controlId="targetTag" validationState={this.state.validation.targetTag}>
									<Col componentClass={ControlLabel} md={3}>
										Target Tag
									</Col>
									<Col md={9}>
										<FormControl type="text" placeholder="Enter target tag" defaultValue={this.state.task.targetTag}
											onChange={(event) => {
												event.persist();
												this.handleTargetTagChange(event);
											}} />
                                        <HelpBlock>The task will select resources tagged with the target tag.</HelpBlock>
                                        {
                                            this.state.showHelp.targetTag &&
                                            <HelpBlock>Target tag cannot be empty.</HelpBlock>
                                        }
									</Col>
								</FormGroup>
							</Form>
							<ButtonToolbar>
								<Button className="pull-right" bsStyle="primary" onClick={this.checkValidation}>Next</Button>
								<Button className="pull-right" onClick={() => { this.setState({ step: 1 }) }}>Previous</Button>
								<Button className="pull-right" bsStyle="link" onClick={() => { this.props.history.goBack() }}>Cancel</Button>
							</ButtonToolbar>
						</Col>
					</Row>
				}
				{
					this.state.step === 3 &&
					<Row>
						<Col md={3}>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 1 }) }}>Step 1: Define Task</Button>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 2 }) }}>Step 2: Target Tag</Button>
							<Button block active>Step 3: Parameters</Button>
							<Button block disabled>Step 4: Task Trigger</Button>
							<Button block disabled>Step 5: Task Scope</Button>
                            <Button block disabled>Review</Button>
						</Col>
						<Col md={9}>
							<Form horizontal>
								{
									this.state.task.taskParameters.map((parameter: TaskParameter) => {
                                        return (
                                            this.hiddenParameters.indexOf(parameter.Name) < 0 &&
											<FormGroup controlId={parameter.Name} key={parameter.Name}>
												<Col componentClass={ControlLabel} md={4}>
													{parameter.Name}
												</Col>
												<Col md={8}>
                                                    <FormControl type="text"
                                                        placeholder="Enter the action parameter."
                                                        defaultValue={
                                                            this.getParameterValue(parameter.Name)
                                                        }
                                                        onChange={(event) => this.handleParameterChange(event, parameter.Name)} />
                                                    <HelpBlock>{parameter.Description}</HelpBlock>
												</Col>
											</FormGroup>
										);
									})
								}
							</Form>
							<ButtonToolbar>
								<Button className="pull-right" bsStyle="primary" onClick={this.checkValidation}>Next</Button>
								<Button className="pull-right" onClick={() => { this.setState({ step: 2 }) }}>Previous</Button>
								<Button className="pull-right" bsStyle="link" onClick={() => { this.props.history.goBack() }}>Cancel</Button>
							</ButtonToolbar>
						</Col>
					</Row>
				}
				{
					this.state.step === 4 &&
					<Row>
						<Col md={3}>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 1 }) }}>Step 1: Define Task</Button>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 2 }) }}>Step 2: Target Tag</Button>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 3 }) }}>Step 3: Parameters</Button>
							<Button block active>Step 4: Task Trigger</Button>
							<Button block disabled>Step 5: Task Scope</Button>
                            <Button block disabled>Review</Button>
						</Col>
						<Col md={9}>
							<Form horizontal>
                                <FormGroup controlId="triggerType">
									<Col componentClass={ControlLabel} md={3}>
										Trigger Type
									</Col>
									<Col md={9}>
										<FormControl componentClass="select" defaultValue={this.state.task.triggerType}
											onChange={(event) => {
												event.persist();
												this.handleTriggerTypeChange(event);
											}} >
											<option value={TriggerType.Schedule}>Schedule</option>
											<option value={TriggerType.Event}>Event</option>
										</FormControl>
									</Col>
								</FormGroup>
								<this.TriggerForm />
							</Form>
							<ButtonToolbar>
								<Button className="pull-right" bsStyle="primary" onClick={this.checkValidation}>Next</Button>
								<Button className="pull-right" onClick={() => { this.setState({ step: 3 }) }}>Previous</Button>
								<Button className="pull-right" bsStyle="link" onClick={() => { this.props.history.goBack() }}>Cancel</Button>
							</ButtonToolbar>
						</Col>
					</Row>
				}
				{
					this.state.step === 5 &&
					<Row>
						<Col md={3}>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 1 }) }}>Step 1: Define Task</Button>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 2 }) }}>Step 2: Target Tag</Button>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 3 }) }}>Step 3: Parameters</Button>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 4 }) }}>Step 4: Task Trigger</Button>
							<Button block active>Step 5: Task Scope</Button>
                            <Button block disabled>Review</Button>
						</Col>
						<Col md={9}>
							<Form horizontal>
								<FormGroup controlId="accounts" validationState={this.state.validation.accounts}>
									<Col componentClass={ControlLabel} md={3}>
										Accounts
									</Col>
									<Col md={9}>
										<FormControl type="text" placeholder="Enter comma separated accounts" defaultValue={this.state.task.accounts}
											onChange={(event) => {
												event.persist();
												this.handleAccountsChange(event);
											}} />
                                        <HelpBlock>List of accounts in which Operations Conductor on AWS should operate. Requires 12 digit account IDs</HelpBlock>
                                        {
                                            this.state.showHelp.accounts &&
                                            <HelpBlock>Accounts cannot be empty.</HelpBlock>
                                        }
									</Col>
								</FormGroup>
								<FormGroup controlId="regions" validationState={this.state.validation.regions}>
									<Col componentClass={ControlLabel} md={3}>
										Regions
									</Col>
									<Col md={9}>
										<FormControl type="text" placeholder="Enter comma separated regions" defaultValue={this.state.task.regions}
											onChange={(event) => {
												event.persist();
												this.handleRegionsChange(event);
											}} />
                                        <HelpBlock>
                                            List of regions in which Operations Conductor on AWS should operate. Requires region codes (e.g. us-east-1). <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions" target="_blank" rel="noopener noreferrer">See more</a> about the available region codes.
                                        </HelpBlock>
                                        {
                                            this.state.showHelp.accounts &&
                                            <HelpBlock>Regions cannot be empty.</HelpBlock>
                                        }
									</Col>
								</FormGroup>
							</Form>
							<ButtonToolbar>
								<Button className="pull-right" bsStyle="primary" onClick={this.checkValidation}>Next</Button>
								<Button className="pull-right" onClick={() => { this.setState({ step: 4 }) }}>Previous</Button>
								<Button className="pull-right" bsStyle="link" onClick={() => { this.props.history.goBack() }}>Cancel</Button>
							</ButtonToolbar>
						</Col>
					</Row>
                }
				{
                    this.state.step === 6 &&
					<Row key="reviewDetail">
						<Col md={3}>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 1 }) }}>Step 1: Define Task</Button>
                            <Button block bsStyle="success" onClick={() => { this.setState({ step: 2 }) }}>Step 2: Target Tag</Button>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 3 }) }}>Step 3: Parameters</Button>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 4 }) }}>Step 4: Task Trigger</Button>
							<Button block bsStyle="success" onClick={() => { this.setState({ step: 5 }) }}>Step 5: Task Scope</Button>
                            <Button block active>Review</Button>
						</Col>
						<Col md={9}>
							<h3>Define Task</h3>
							<Table>
								<tbody>
									<tr key="taskName">
										<td><strong>Task Name</strong></td>
										<td>{this.state.task.name}</td>
									</tr>
									<tr key="taskDefinition">
										<td><strong>Task Definition</strong></td>
										<td>{this.state.task.description}</td>
									</tr>
								</tbody>
							</Table>
							<hr />
                            <h3>Target Tag</h3>
							<Table>
								<tbody>
									<tr key="targetTag">
										<td><strong>Target Tag</strong></td>
										<td>{this.state.task.targetTag}</td>
									</tr>
								</tbody>
							</Table>
							<hr />
							<h3>Parameters</h3>
							<Table>
								<tbody>
									{
										this.state.task.taskParameters.map((parameter: TaskParameter) => {
											return (
                                                this.hiddenParameters.indexOf(parameter.Name) < 0 &&
												<tr key={parameter.Name}>
													<td><strong>{parameter.Name}</strong></td>
                                                    <td>{parameter.Value}</td>
												</tr>
											);
										})
									}
								</tbody>
							</Table>
							<hr />
							<h3>Task Trigger</h3>
							<Table>
								<tbody>
									<tr key="triggerType">
										<td><strong>Trigger Type</strong></td>
										<td>{this.state.task.triggerType}</td>
									</tr>
									{
										this.state.task.triggerType === TriggerType.Event &&
                                        <tr key="eventPattern">
                                            <td><strong>Event Pattern</strong></td>
                                            <td>
                                                <pre>{this.state.task.eventPattern}</pre>
                                            </td>
                                        </tr>
									}
									{
										this.state.task.triggerType === TriggerType.Schedule &&
										<tr key="scheduleType">
											<td><strong>Schedule Type</strong></td>
											<td>{this.state.task.scheduledType}</td>
										</tr>
									}
									{
										this.state.task.triggerType === TriggerType.Schedule && this.state.task.scheduledType === ScheduledType.CronExpression &&
										<tr key="cronExpression">
											<td><strong>Scheduled Cron Expression</strong></td>
											<td>{this.state.task.scheduledCronExpression}</td>
										</tr>
									}
									{
										this.state.task.triggerType === TriggerType.Schedule && this.state.task.scheduledType === ScheduledType.FixedRate &&
										<tr key="fixedRateOf">
											<td><strong>Scheduled Fixed Rate of</strong></td>
											<td>{this.state.task.scheduledFixedRateInterval} {this.state.task.scheduledFixedRateType}</td>
										</tr>
									}
								</tbody>
							</Table>
							<hr />
							<h3>Task Scope</h3>
							<Table>
								<tbody>
									<tr key="accounts">
										<td><strong>Accounts</strong></td>
										<td>{this.state.task.accounts}</td>
									</tr>
									<tr key="regions">
										<td><strong>Regions</strong></td>
										<td>{this.state.task.regions}</td>
									</tr>
								</tbody>
							</Table>
                            <hr />
							<ButtonToolbar>
								<Button className="pull-right" bsStyle="primary" onClick={() => { this.state.mode === 'Create' ? this.createTask() : this.editTask() }} disabled={this.state.isLoading}>{this.state.mode === 'Create' ? 'Create' : 'Update'}</Button>
								<Button className="pull-right" onClick={() => { this.setState({ step: 5 }) }} disabled={this.state.isLoading}>Previous</Button>
								<Button className="pull-right" bsStyle="link" onClick={() => { this.props.history.goBack() }} disabled={this.state.isLoading}>Cancel</Button>
							</ButtonToolbar>
						</Col>
					</Row>
				}
				<Row key="emptyLine">
					<Col md={12}>
						<span>&nbsp;</span>
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
        );
    }
}

export default TaskCreate;