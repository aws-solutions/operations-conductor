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
import { RequireNewPassword } from 'aws-amplify-react';
import { Navbar, Form, FormGroup, ControlLabel, FormControl,
    Grid, Row, Col, PageHeader, Button } from 'react-bootstrap';
import Footer from './Footer';

class CustomRequireNewPassword extends RequireNewPassword {
    constructor(props: any) {
        super(props);
        this._validAuthStates = ['requireNewPassword'];
    }

    // Handles key down
    handleKeyDown = (event: any) => {
        // If an enter key (key code 13) is down, call the signIn function.
        if (event.keyCode === 13) {
            event.preventDefault();
            this.change();
        }
    }

    showComponent() {
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
                            <PageHeader>Change Password</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6} mdOffset={3}>
                            <Form horizontal>
                                <FormGroup controlId="formPassword" key="formPassword">
                                    <Col componentClass={ControlLabel} md={3}>
                                        New Password
                                    </Col>
                                    <Col md={9}>
                                        <FormControl key="password" name="password" type="password" placeholder="New Password" onKeyDown={this.handleKeyDown} onChange={this.handleInputChange} />
                                    </Col>
                                </FormGroup>
                            </Form>
                            <Button key="buttonBackToSignIn" bsStyle="link" onClick={() => this.changeState('signIn')}>Back to Sign In</Button>
                            <Button key="buttonSend" className="pull-right" bsStyle="primary" onClick={this.change}>Change</Button>
                        </Col>
                    </Row>
                </Grid>
                <Footer />
            </div>
        );
    }
}

export default CustomRequireNewPassword;