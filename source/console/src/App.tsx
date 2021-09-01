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
import { Logger } from '@aws-amplify/core';
import Auth from '@aws-amplify/auth';

import { Navbar, Nav, NavItem, Glyphicon } from 'react-bootstrap';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { LOGGING_LEVEL} from './components/CustomUtil';

import Users from './views/Users';
import Actions from './views/Actions';
import Tasks from './views/Tasks';
import TaskCreate from './views/TaskCreate';
import TaskDetail from './views/TaskDetail';
import AutomationExecutions from './views/AutomationExecutions';
import AutomationExecutionDetail from './views/AutomationExecutionDetail';
import Footer from './components/Footer';

interface IProps {
    authState?: any;
    groups?: string[];
}

interface IState {
    groups?: string[];
    token: string;
}

const LOGGER = new Logger('App', LOGGING_LEVEL);

class App extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            groups: [],
            token: ''
        };
    }

    // Gets API token
    getApiToken = async () => {
        let user = await Auth.currentAuthenticatedUser();
        return user.signInUserSession.idToken.jwtToken;
    };

    // Signs out
    signout = () => {
        Auth.signOut().catch((error) => {
            LOGGER.error('Error happened while signing out', error);
        });
    };

    render() {
        if (this.props.authState === 'signedIn') {
            return (
                <div className="main-wrapper">
                    <Router>
                        <Navbar>
                            <Navbar.Header>
                                <Navbar.Brand>Operations Conductor</Navbar.Brand>
                            </Navbar.Header>
                            <Nav>
                                <LinkContainer to="/tasks">
                                    <NavItem>
                                        <Glyphicon glyph="tasks" /> Tasks
                                    </NavItem>
                                </LinkContainer>
                                {
                                    this.props.groups!.indexOf('Admin') > -1 &&
                                    <LinkContainer to="/users">
                                        <NavItem>
                                            <Glyphicon glyph="user" /> Users
                                        </NavItem>
                                    </LinkContainer>
                                }
                            </Nav>
                            <Nav pullRight>
                                <NavItem onClick={() => this.signout()}>Sign Out</NavItem>
                            </Nav>
                        </Navbar>
                        <Switch>
                            <Route exact path="/tasks"
                                render={(props) => (<Tasks {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/tasks/actions"
                                render={(props) => (<Actions {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/tasks/create"
                                render={(props) => (<TaskCreate {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/tasks/edit"
                                render={(props) => (<TaskCreate {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/tasks/:taskId"
                                render={(props) => (<TaskDetail {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/tasks/:taskId/executions/:parentExecutionId"
                                render={(props) => (<AutomationExecutions {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/tasks/:taskId/executions/:parentExecutionId/:automationExecutionId"
                                render={(props) => (<AutomationExecutionDetail {...props} getApiToken={this.getApiToken} />)} />
                            <Route exact path="/users"
                                render={(props) => (<Users {...props} getApiToken={this.getApiToken} />)} />
                            <Redirect to="/tasks" />
                        </Switch>
                    </Router>
                    <Footer />
                </div>
            );
        } else {
            return null;
        }
    }
}

export default App;