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
import { Authenticator } from 'aws-amplify-react';
import Auth from '@aws-amplify/auth';
import { Logger } from '@aws-amplify/core';

import CustomSignIn from './components/CustomSignIn';
import CustomRequireNewPassword from './components/CustomRequireNewPassword';
import CustomForgotPassword from './components/CustomForgotPassword';
import CustomVerifyContact from './components/CustomVerifyContact';
import App from './App';
import { LOGGING_LEVEL} from './components/CustomUtil';

declare var aws_exports: any;

interface IProps {}

interface IState {
    userState: string;
    groups?: string[];
}

const LOGGER = new Logger('AppWithAuth', LOGGING_LEVEL);

class AppWithAuth extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            userState: '',
            groups: []
        }

        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
    }

    // Gets user and group
    getUser = async () => {
        let user = await Auth.currentAuthenticatedUser();
        let groups = user.signInUserSession.idToken.payload['cognito:groups']
        return groups;
    };

    // Handles auth state change
    handleAuthStateChange(state: string) {
        if (state === 'signedIn') {
            this.getUser().then((groups) => {
                this.setState({ groups });
            }).catch((error) => {
                LOGGER.error('An error occurred while handling auth state change.', error);
                this.setState({ groups: [] });
            });
        } else {
            this.setState({ groups: []});
        }
    }

    render() {
        return (
            <Authenticator hideDefault={true} amplifyConfig={aws_exports} onStateChange={this.handleAuthStateChange}>
                <CustomSignIn />
                <CustomRequireNewPassword />
                <CustomForgotPassword />
                <CustomVerifyContact />
                <App groups={this.state.groups} />
            </Authenticator>
        )
   }
}

export default AppWithAuth;