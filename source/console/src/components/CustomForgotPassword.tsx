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
import { ForgotPassword } from 'aws-amplify-react';
import { Navbar, Form, FormGroup, ControlLabel, FormControl,
    Grid, Row, Col, PageHeader, Button } from 'react-bootstrap';
import Footer from './Footer';

class CustomForgotPassword extends ForgotPassword {
    constructor(props: any) {
        super(props);
        this._validAuthStates = ['forgotPassword'];
        this.state = { delivery: null };
    }

    // Handles key down
    handleKeyDown = (event: any, type: string) => {
        // If an enter key (key code 13) is down, call the signIn function.
        if (event.keyCode === 13) {
            event.preventDefault();
            if (type === 'username') {
                this.send();
            } else if (type === 'password') {
                this.submit();
            }
        }
    }

    showComponent() {
        const { authData={} } = this.props;
        return (
            <div className="main-wrapper">
                <Navbar>
                    <Navbar.Header>
                        <Navbar.Brand>Operations Conductor</Navbar.Brand>
                    </Navbar.Header>
                </Navbar>
                <Grid>
                    <Row>
                        <Col md={12}>
                            <PageHeader>Reset your password</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6} mdOffset={3}>
                            <Form horizontal>
                                {
                                    this.state.delivery || authData.username ?
                                    [
                                        <FormGroup controlId="formCode" key="formCode">
                                            <Col componentClass={ControlLabel} md={3}>
                                                Code
                                            </Col>
                                            <Col md={9}>
                                                <FormControl key="code" name="code" type="text" autoComplete="off" placeholder="Code" onChange={this.handleInputChange} />
                                            </Col>
                                        </FormGroup>,
                                        <FormGroup controlId="formPassword" key="formPassword">
                                            <Col componentClass={ControlLabel} md={3}>
                                                New Password
                                            </Col>
                                            <Col md={9}>
                                                <FormControl key="password" name="password" type="password" placeholder="New Password" onKeyDown={(event) => { this.handleKeyDown(event, 'password') }} onChange={this.handleInputChange} />
                                            </Col>
                                        </FormGroup>
                                    ] :
                                    <FormGroup controlId="formUsername">
                                        <Col componentClass={ControlLabel} md={3}>
                                            E-Mail
                                        </Col>
                                        <Col md={9}>
                                            <FormControl key="username" name="username" type="text" placeholder="Enter your username" onKeyDown={(event) => { this.handleKeyDown(event, 'username') }} onChange={this.handleInputChange} />
                                        </Col>
                                    </FormGroup>
                                }
                            </Form>
                            {
                                this.state.delivery || authData.username ?
                                [
                                    <Button key="buttonResendCode" bsStyle="link" onClick={this.send}>Resend Code</Button>,
                                    <Button key="buttonSubmit" className="pull-right" bsStyle="primary" onClick={this.submit}>Submit</Button>
                                ] :
                                [
                                    <Button key="buttonBackToSignIn" bsStyle="link" onClick={() => this.changeState('signIn')}>Back to Sign In</Button>,
                                    <Button key="buttonSend" className="pull-right" bsStyle="primary" onClick={this.send}>Send</Button>
                                ]
                            }
                        </Col>
                    </Row>
                </Grid>
                <Footer />
            </div>
        );
    }
}

export default CustomForgotPassword;