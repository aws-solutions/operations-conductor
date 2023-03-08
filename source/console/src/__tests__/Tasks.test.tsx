/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {MemoryRouter, Route, Switch} from "react-router-dom";
import {render, screen, within} from "@testing-library/react";
import * as React from "react";
import Tasks, {Task} from "../views/Tasks";
import Actions, {Action} from "../views/Actions";
import {server} from "./mocks/server";
import {PathParams, ResponseResolver, rest, RestContext, RestRequest} from "msw";
import userEvent from "@testing-library/user-event";
import TaskDetail from "../views/TaskDetail";


const mockTasksList: Task[] = [
    {
        name: "task1",
        taskId: "id1",
        description: "task 1 description",
    },
    {
        name: "task2",
        taskId: "id2",
        description: "task 2 description",
    },
    {
        name: "task3",
        taskId: "id3",
        description: "task 3 description",
    },
]

function getApiToken() {
    return "" //no need for api token in these tests
}
function renderTasksPage() {
    return render(
        <MemoryRouter initialEntries={['/tasks']}>
            <Switch>
                <Route exact path="/tasks"
                       render={(props) => (<Tasks {...props} getApiToken={getApiToken}/>)} />
                <Route exact path="/tasks/actions"
                       render={(props) => (<Actions {...props} getApiToken={getApiToken} />)} />
                <Route exact path="/tasks/:taskId"
                       render={(props) => (<TaskDetail {...props} getApiToken={getApiToken} />)} />
            </Switch>
        </MemoryRouter>
    )
}

function tasksApi() {
    return {
        returnsTasks: (tasks: Task[]) => {
            server.use(
                rest.get("/tasks", (request, response, context) => {
                    return response(
                        context.status(200),
                        context.json(tasks)
                    )
                })
            )
        },
        returnsTasksAfterDelay: (tasks: Task[], msDelay: number) => {
            server.use(
                rest.get("/tasks", (request, response, context) => {
                    return response(
                        context.delay(msDelay),
                        context.status(200),
                        context.json(tasks)
                    )
                })
            )
        },
        returnsResponse: (resolver: ResponseResolver<RestRequest<never, PathParams<string>>, RestContext>) => {
            server.use(
                rest.get("/tasks", (request, response, context) => {
                    return resolver(request, response, context);
                })
            )
        }
    }
}

async function tasksHaveLoaded() {
    //'taskname-panel' is included on all task panels as a testId
    await screen.findAllByTestId(/.*-panel/);
}
describe('ListTasks Page', ()=> {
    test('loads', async ()=> {
        renderTasksPage()
        expect(screen.getByRole('heading', {name:/Tasks/i})).toBeInTheDocument()
    })

    test('displays all tasks', async ()=> {
        tasksApi().returnsTasks(mockTasksList);
        renderTasksPage()
        await tasksHaveLoaded()

        expect(screen.getByText(/task1/)).toBeInTheDocument()
        expect(screen.getByText(/task2/)).toBeInTheDocument()
        expect(screen.getByText(/task3/)).toBeInTheDocument()
    })

    test('search bar filters tasks correctly', async ()=> {
        tasksApi().returnsTasks(mockTasksList);
        renderTasksPage()
        await tasksHaveLoaded()

        const searchBar = screen.getByRole('textbox')

        await userEvent.type(searchBar, "task1");

        expect(screen.queryByText(/task1/)).toBeInTheDocument()
        expect(screen.queryByText(/task2/)).not.toBeInTheDocument()
        expect(screen.queryByText(/task3/)).not.toBeInTheDocument()
    })

    test('search filter is case insensitive', async ()=> {
        tasksApi().returnsTasks(mockTasksList)
        renderTasksPage()
        await tasksHaveLoaded()

        const searchBar = screen.getByRole('textbox')

        await userEvent.type(searchBar, "tASk1");

        expect(screen.queryByText(/task1/)).toBeInTheDocument()
    })

    test('search filter performs partial matching', async ()=> {
        tasksApi().returnsTasks([{name: "ATaskWithAVeryVeryVeryLongName", taskId: "id", description: "description"}])
        renderTasksPage()
        await tasksHaveLoaded()

        const searchBar = screen.getByRole('textbox')

        await userEvent.type(searchBar, "longname");

        expect(screen.queryByText(/ATaskWithAVeryVeryVeryLongName/)).toBeInTheDocument()
    })

    test('initial task sort order is ascending by name', async()=> {
        tasksApi().returnsTasks(mockTasksList)
        renderTasksPage()
        await tasksHaveLoaded()

        const tasks = screen.getAllByTestId(/.*-panel/);
        const task1Panel = screen.getByTestId(/task1-panel/);
        const task2Panel = screen.getByTestId(/task2-panel/);

        expect(tasks.indexOf(task1Panel)).toBeLessThan(tasks.indexOf(task2Panel))
        screen.debug()
    })

    test('user can select task sort order', async()=> {
        tasksApi().returnsTasks(mockTasksList)
        renderTasksPage()
        await tasksHaveLoaded()


        const task1Panel = screen.getByTestId(/task1-panel/);
        const task2Panel = screen.getByTestId(/task2-panel/);
        const sortOrderSelector = screen.getByRole('combobox')
        const ascOrderSortOption = within(sortOrderSelector).getByRole('option', {name: /a-z/i});
        const descOrderSortOption = within(sortOrderSelector).getByRole('option', {name: /z-a/i});

        await userEvent.selectOptions(sortOrderSelector, descOrderSortOption)

        //confirm descending sort order
        let tasks = screen.getAllByTestId(/.*-panel/);
        expect(tasks.indexOf(task1Panel)).toBeGreaterThan(tasks.indexOf(task2Panel))

        await userEvent.selectOptions(sortOrderSelector, ascOrderSortOption)

        //confirm ascending sort order (user can switch back and forth
        tasks = screen.getAllByTestId(/.*-panel/);
        expect(tasks.indexOf(task1Panel)).toBeLessThan(tasks.indexOf(task2Panel))
    })

    test('each task has own details button', async ()=> {
        tasksApi().returnsTasks(mockTasksList)
        renderTasksPage()
        await tasksHaveLoaded()

        screen.getAllByTestId(/.*-panel/).forEach(task => {
            expect(within(task).queryByRole('button', {name:/detail/i})).toBeInTheDocument()
        });
    })

    test('get start button opens action select page', async ()=> {
        renderTasksPage()

        const getStartedButton = screen.getByRole('button', {name: /get started/i})

        await userEvent.click(getStartedButton)

        expect(screen.queryByRole('heading', {name: /action catalog/i})).toBeInTheDocument()
    })

    test('click task detail button opens correct details page', async ()=> {
        tasksApi().returnsTasks([{
            name: "task1",
            taskId: "task1id",
            description: "task 1 description",
        },])

        //necessary for taskdetails page
        server.use(
            rest.get("/tasks/task1id", (request, response, context) => {
                return response(
                    context.status(200),
                    context.json({
                        taskId: "task1id",
                        name: "task1",
                    })
                )
            })
        )
        renderTasksPage()
        await tasksHaveLoaded()

        const action1Panel = screen.getByTestId(/task1-panel/)
        const action1DetailsBtn = within(action1Panel).getByRole('button', {name:/detail/i})
        await userEvent.click(action1DetailsBtn);

        expect(await screen.findByRole('heading', {name: /task detail/i})).toBeInTheDocument()
        expect(await screen.findByRole('heading', {name: /task1/i})).toBeInTheDocument() //requires refactoring of taskDetails to be testable

    })



    test('shows error when tasks fail to load', async ()=> {
        tasksApi().returnsResponse((request, response, context) => {
            return response(
                context.status(500),
                context.json({
                    message: 'Error loading Actions'
                })
            )
        })
        renderTasksPage();

        expect(await screen.findByRole('alert')).toBeInTheDocument()
    })

    test('shows loading bar while tasks are loading', async ()=> {
        tasksApi().returnsTasksAfterDelay(mockTasksList, 500)
        renderTasksPage()

        expect(await screen.findByRole('progressbar')).toBeInTheDocument()
    })

    test('does not show loading bar when tasks have finished loading', async ()=> {
        tasksApi().returnsTasks(mockTasksList)
        renderTasksPage()
        await tasksHaveLoaded()

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })


})