/************************************************************************************
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.          *
 *                                                                                  *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of  *
 * this software and associated documentation files (the "Software"), to deal in    *
 * the Software without restriction, including without limitation the rights to     *
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of *
 * the Software, and to permit persons to whom the Software is furnished to do so.  *
 *                                                                                  *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR       *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS *
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR   *
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER   *
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN          *
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.       *
 ***********************************************************************************/

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