/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import {CognitoUser} from '@aws-amplify/auth';
import {Amplify, I18n, Logger} from '@aws-amplify/core';

import App from './App';
import { LOGGING_LEVEL} from './components/CustomUtil';
import authComponents from "./Authenticator/Customizations";

declare var aws_exports: any;

interface IProps {}

interface IState {
    userState: string;
}

const LOGGER = new Logger('AppWithAuth', LOGGING_LEVEL);

class AppWithAuth extends React.Component<IProps, IState> {
    constructor(props: Readonly<IProps>) {
        super(props);

        this.state = {
            userState: ''
        }

        Amplify.configure(aws_exports);

        //overrides error message in email verification flow
        I18n.putVocabulariesForLanguage('en', {
            "1 validation error detected: Value null at 'attributeName' failed to satisfy constraint: Member must not be null": 'You must select an authentication method to verify'
        })
    }


    userGroupsFromUser(user?: CognitoUser): string[] {
        let groups = user?.getSignInUserSession()?.getIdToken().payload['cognito:groups']
        return groups ? groups : [];
    }

    render() {
        return (
            <Authenticator hideSignUp={true} loginMechanisms={['email']}
            components={authComponents} variation={"modal"}>
                {({user}) => (
                    <App userGroups={this.userGroupsFromUser(user)}/>
                )}
            </Authenticator>
        )
   }
}



export default AppWithAuth;