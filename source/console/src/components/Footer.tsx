/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Navbar, Nav, NavItem, Image} from 'react-bootstrap';

class Footer extends React.Component {
    render() {
        return (
            <footer key="footer">
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
            </footer>
        );
    }
}

export default Footer;