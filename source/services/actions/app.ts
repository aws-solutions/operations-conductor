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

    router.use(cors());
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
