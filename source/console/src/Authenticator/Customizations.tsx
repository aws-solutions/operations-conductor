/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {Image, Nav, Navbar, NavItem} from "react-bootstrap";
import * as React from "react";

const authComponents = {
    Header: () => (
        <Navbar>
            <Navbar.Header>
                <Navbar.Brand>Operations Conductor on AWS</Navbar.Brand>
            </Navbar.Header>
        </Navbar>
    ),
    Footer: () => (
        <Navbar className="custom-navbar">
            <Navbar.Header>
                <Navbar.Brand>
                    <Image src="/images/logo.png" />
                </Navbar.Brand>
            </Navbar.Header>
            <Nav>
                <NavItem href="https://aws.amazon.com/solutions/">
                    AWS Solutions
                </NavItem>
            </Nav>
        </Navbar>
    )


}

export default authComponents
