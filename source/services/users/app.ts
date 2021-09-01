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
import * as jwtDecode from 'jwt-decode';
import { factory } from '../logger';
import { User } from './users';

export const configureApp = () => {
    // Logger
    const logger = factory.getLogger('users.App');

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

    // Declares User class
    const user = new User();

    // Checks the permission
    const checkAuthorization = async (req: any, res: any, next: any) => {
        const jwt = getJwtDecode(req);
        let group = await user.getUserGroup(jwt['cognito:username']);

        if (group === 'Admin') {
            next();
        } else {
            res.status(401).json({
                code: 'Unauthorized',
                statusCode: 401,
                message: 'Unauthorized to access the API.'
            });
        }
    };

    // GET /users
    router.get('/users', checkAuthorization, async (req: any, res: any) => {
        logger.info('GET /users');
        try {
            const result = await user.getUsers();
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // POST /users
    router.post('/users', checkAuthorization, async (req: any, res: any) => {
        logger.info('POST /users');
        const newUser = req.body;
        try {
            const result = await user.createUser(newUser);
            res.status(201).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // PUT /users/{userId}
    router.put('/users/:userId', checkAuthorization, async (req: any, res: any) => {
        logger.info('PUT /users/:userId');
        const jwt = getJwtDecode(req);
        const { userId } = req.params;
        if (jwt['cognito:username'] === userId) {
            res.status(405).json({
                code: 'MethodNotAllowed',
                statusCode: 405,
                message: 'Users cannot edit themselves.'
            });
        }

        const body = req.body;
        try {
            const result = await user.editUser(userId, body.group);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // DELETE /users/{userId}
    router.delete('/users/:userId', checkAuthorization, async (req: any, res: any) => {
        logger.info('DELETE /users/:userId');
        const jwt = getJwtDecode(req);
        const { userId } = req.params;
        if (jwt['cognito:username'] === userId) {
            res.status(405).json({
                code: 'MethodNotAllowed',
                statusCode: 405,
                message: 'Users cannot delete themselves.'
            });
        }

        try {
            await user.deleteUser(userId);
            res.sendStatus(204);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    app.use('/', router);

    return app;
};

/**
 * Gets JWT decoded authorization
 * @param {any} req - request
 */
const getJwtDecode = (req: any) => {
    return jwtDecode(req.header('Authorization'));
}