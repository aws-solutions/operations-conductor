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
import { VerifyContact } from 'aws-amplify-react';
import { Navbar, Form, FormGroup, ControlLabel, FormControl, Radio,
    Grid, Row, Col, PageHeader, Button } from 'react-bootstrap';
import Footer from './Footer';

class CustomVerifyContact extends VerifyContact {
    constructor(props: any) {
        super(props);
        this._validAuthStates = ['verifyContact'];
        this.state = { verifyAttr: null };
    }

    // Handles key down
    handleKeyDown = (event: any) => {
        // If an enter key (key code 13) is down, call the signIn function.
        if (event.keyCode === 13) {
            event.preventDefault();
            this.submit();
        }
    }

    showComponent() {
        const { authData } = this.props;
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
                            <PageHeader>Account recovery requires verified contact information</PageHeader>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6} mdOffset={3}>
                            <Form horizontal>
                                {
                                    this.state.verifyAttr ?
                                    <FormGroup controlId="formCode" key="formCode">
                                        <Col componentClass={ControlLabel} md={3}>
                                            Code
                                        </Col>
                                        <Col md={9}>
                                            <FormControl key="code" name="code" type="text" autoComplete="off" placeholder="Code" onKeyDown={this.handleKeyDown} onChange={this.handleInputChange} />
                                        </Col>
                                    </FormGroup> :
                                    <FormGroup controlId="formEmailRadio" key="formEmailRadio">
                                        <Col componentClass={ControlLabel} md={3} />
                                        <Col md={9}>
                                        <Radio key="email" name="contact" value="email" onChange={this.handleInputChange} placeholder="Email">
                                            <strong>E-Mail</strong>
                                        </Radio>
                                        </Col>
                                    </FormGroup>
                                }
                            </Form>
                            {
                                this.state.verifyAttr ?
                                <Button key="buttonSubmit" className="pull-right" bsStyle="primary" onClick={this.submit}>Submit</Button> :
                                <Button key="buttonVerify" className="pull-right" bsStyle="primary" onClick={this.verify}>Send</Button>
                            }
                            <Button key="buttonSkip" onClick={() => this.changeState('signedIn', authData)}>Skip</Button>
                        </Col>
                    </Row>
                </Grid>
                <Footer />
            </div>
        );
    }
}

export default CustomVerifyContact;