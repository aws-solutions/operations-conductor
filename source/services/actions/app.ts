/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { factory } from '../logger';
import { Action } from './actions';

export const configureApp = () => {
    // Logger
    const logger = factory.getLogger('actions.App');

    // Declares a new express app
    const app = express();
    const router = express.Router();

    router.use(cors({
        origin: process.env.CorsAllowedOrigins
    }));
    router.use((req: any, res: any, next: any) => {
        bodyParser.json()(req, res, (err: any) => {
            if (err) {
                return res.status(400).json({
                    code: 400,
                    error: 'BadRequest',
                    message: err.message
                });
            }
            next();
        });
    });
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(awsServerlessExpressMiddleware.eventContext());

    // Declares Action class
    const action = new Action();

    // GET /actions
    router.get('/actions', async (req: any, res: any) => {
        logger.info('GET /actions');
        try {
            const result = await action.getActions();
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // GET /actions/{actionId}
    router.get('/actions/:actionId', async (req: any, res: any) => {
        logger.info('GET /actions/:actionId');
        const { actionId } = req.params;
        try {
            const result = await action.getAction(actionId);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    app.use('/', router);

    return app;
};
