/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from 'aws-lambda';
import { createServer, proxy } from 'aws-serverless-express';
import { configureApp } from './app';

const app = configureApp();
const server = createServer(app);

export const handler = (event: any, context: Context) => {
    proxy(server, event, context);
};
