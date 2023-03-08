/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { factory } from '../logger';
import { Task } from './tasks';

export const configureApp = () => {
    // Logger
    const logger = factory.getLogger('tasks.App');

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

    // Declares Task class
    const task = new Task();

    // GET /tasks
    router.get('/tasks', async (req: any, res: any) => {
        logger.info('GET /tasks');
        try {
            const result = await task.getTasks();
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // POST /tasks
    router.post('/tasks', async (req: any, res: any) => {
        logger.info('POST /tasks');
        const newTask = req.body;
        try {
            const result = await task.createTask(newTask);
            res.status(201).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // GET /tasks/{taskId}
    router.get('/tasks/:taskId', async (req: any, res: any) => {
        logger.info('GET /tasks/:taskId');
        const { taskId } = req.params;
        try {
            const result = await task.getTask(taskId);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // PUT /tasks/{taskId}
    router.put('/tasks/:taskId', async (req: any, res: any) => {
        logger.info('PUT /tasks/:taskId');
        const { taskId } = req.params;
        const updatedTask = req.body;
        try {
            const result = await task.editTask(taskId, updatedTask);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // DELETE /tasks/{taskId}
    router.delete('/tasks/:taskId', async (req: any, res: any) => {
        logger.info('DELETE /tasks/:taskId');
        const { taskId } = req.params;
        try {
            await task.deleteTask(taskId);
            res.sendStatus(204);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // PUT /tasks/{taskId}/execute
    router.put('/tasks/:taskId/execute', async (req: any, res: any) => {
        logger.info('PUT /tasks/:taskId/execute');
        const { taskId } = req.params;
        try {
            const result = await task.executeTask(taskId);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // POST /tasks/{taskId}/executions
    router.post('/tasks/:taskId/executions', async (req: any, res: any) => {
        logger.info('POST /tasks/:taskId/executions');
        const { taskId } = req.params;
        const { sortType, itemsPerPage, lastKey } = req.body;
        try {
            const result = await task.getTaskExecutions(taskId, sortType, itemsPerPage, lastKey);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // POST /tasks/{taskId}/executions/{parentExecutionId}
    router.post('/tasks/:taskId/executions/:parentExecutionId', async (req: any, res: any) => {
        logger.info('POST /tasks/:taskId/executions/:parentExecutionId');
        const { taskId, parentExecutionId } = req.params;
        const { itemsPerPage, lastKey } = req.body;
        try {
            const result = await task.getAutomationExecutions(taskId, parentExecutionId, itemsPerPage, lastKey);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    // GET /tasks/{taskId}/executions/{parentExecutionId}/{automationExecutionId}
    router.get('/tasks/:taskId/executions/:parentExecutionId/:automationExecutionId', async (req: any, res: any) => {
        logger.info('GET /tasks/:taskId/executions/:parentExecutionId/:automationExecutionId');
        const { taskId, parentExecutionId, automationExecutionId } = req.params;
        try {
            const result = await task.getAutomationExecution(taskId, parentExecutionId, automationExecutionId);
            res.status(200).json(result);
        } catch (error) {
            logger.error(JSON.stringify(error));
            res.status(error.statusCode).json(error);
        }
    });

    app.use('/', router);

    return app;
};
