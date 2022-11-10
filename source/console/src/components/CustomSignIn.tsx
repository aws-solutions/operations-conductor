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
import { SignIn } from 'aws-amplify-react';
import { Navbar, Form, FormGroup, ControlLabel, FormControl,
    Grid, Row, Col, PageHeader, Button } from 'react-bootstrap';

import Footer from './Footer';

class CustomSignIn extends SignIn {
    constructor(props: any) {
        super(props);
        this._validAuthStates = ['signIn', 'signedOut', 'signedUp'];
    }

    // Handles key down
    handleKeyDown = (event: any) => {
        // If an enter key (key code 13) is down, call the signIn function.
        if (event.keyCode === 13) {
            event.preventDefault();
            this.signIn();
        }
    }

    showComponent() {
        return (
            <div className="main-wrapper">
                <Navbar>
                    <Navbar.Header>
                        <Navbar.Brand>Operations Conductor on AWS</Navbar.Brand>
                    </Navbar.Header>
                </Navbar>
                <Grid>
                    <Row>
                        <Col md={12}>
                            <PageHeader>Sign in to your account</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6} mdOffset={3}>
                            <Form horizontal onSubmit={this.signIn}>
                                <FormGroup controlId="formUsername">
                                    <Col componentClass={ControlLabel} md={3}>
                                        E-Mail
                                    </Col>
                                    <Col md={9}>
                                        <FormControl key="username" name="username" type="text" placeholder="Enter your username" onChange={this.handleInputChange} />
                                    </Col>
                                </FormGroup>
                                <FormGroup controlId="formPassword">
                                    <Col componentClass={ControlLabel} md={3}>
                                        Password
                                    </Col>
                                    <Col md={9}>
                                    <FormControl key="password" name="password" type="password" placeholder="Enter your password" onKeyDown={this.handleKeyDown} onChange={this.handleInputChange} />
                                    </Col>
                                </FormGroup>
                            </Form>
                            Forgot password? <Button bsStyle="link" onClick={() => this.changeState('forgotPassword')}>Reset password</Button>
                            <Button className="pull-right" bsStyle="primary" onClick={this.signIn}>Sign In</Button>
                        </Col>
                    </Row>
                </Grid>
                <Footer />
            </div>
        );
    }
}

export default CustomSignIn;