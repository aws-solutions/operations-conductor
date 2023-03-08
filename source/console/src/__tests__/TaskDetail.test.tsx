/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {render, screen, within} from "@testing-library/react";
import {MemoryRouter, Route, Switch} from "react-router-dom";
import * as React from "react";
import TaskDetail, {ScheduledType, Task} from "../views/TaskDetail";
import {server} from "./mocks/server";
import {PathParams, ResponseResolver, rest, RestContext, RestRequest} from "msw";
import TaskCreate from "../views/TaskCreate";
import userEvent from "@testing-library/user-event";

function getApiToken() {
    return "" //no need for api token in these tests
}

const mockCronTask: Task = {
    taskId: "cronTask",
    actionName: "actionName",
    name: "name", //taskName
    description: "description",
    triggerType: "Schedule",
    targetTag: "targetTag",
    accounts: ["account1", "account2"],
    regions: ["us-east-1", "us-east-2"],
    templateUrl: "templateUrl",

    scheduledType: ScheduledType.CronExpression,
    scheduledCronExpression: "0/5 * ? * * *",
    enabled: true,


    taskParameters: [
        {Name: "param1Name", Value: "param1Value", Type: "String", Description: "param1Description" },
        {Name: "param2Name", Value: "param2Value", Type: "String", Description: "param2Description" }
    ],
}
function taskApi() {
    return {
        onGet: (taskId: string) => {
            return {
                returnsTask: (task: Task) => {
                    server.use(
                        rest.get(`/task/${taskId}`, (request, response, context) => {
                            return response(
                                context.status(200),
                                context.json(task)
                            )
                        })
                    )
                },
                returnsTaskAfterDelay: (task: Task, msDelay: number) => {
                    server.use(
                        rest.get(`/task/${taskId}`, (request, response, context) => {
                            return response(
                                context.delay(msDelay),
                                context.status(200),
                                context.json(task)
                            )
                        })
                    )
                },
                returnsResponse: (resolver: ResponseResolver<RestRequest<never, PathParams<string>>, RestContext>) => {
                    server.use(
                        rest.get(`/task/${taskId}`, (request, response, context) => {
                            return resolver(request, response, context);
                        })
                    )
                }
            }
        }
    }
}
function renderTaskDetailPage(taskId: string) {
    return render(
        <MemoryRouter initialEntries={[`/tasks/${taskId}`]}>
            <Switch>
                <Route exact path="/tasks/:taskId"
                       render={(props) => (<TaskDetail {...props} getApiToken={getApiToken} />)} />
                <Route exact path="/tasks/edit"
                       render={(props) => (<TaskCreate {...props} getApiToken={getApiToken} />)} />
            </Switch>
        </MemoryRouter>
    )
}

describe('TaskDetail page', ()=> {
    test("loads", async ()=> {
        taskApi().onGet(mockCronTask.taskId!).returnsTask(mockCronTask)
        renderTaskDetailPage(mockCronTask.taskId!)

        expect(screen.getByRole('heading', {name:/Task Detail/i})).toBeInTheDocument()
    })
})