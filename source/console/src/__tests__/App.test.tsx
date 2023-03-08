/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import {render, screen, within} from "@testing-library/react";
import App from "../App";
import userEvent from "@testing-library/user-event";

const USER_GROUPS = {
    ADMIN: "Admin"
}

function renderApp(params: {
    userGroups?: string[]
}) {
    return render(
        <App userGroups={params.userGroups ? params.userGroups : []}></App>
    )
}

describe('Main App', ()=> {
    test("loads", ()=> {
        renderApp({userGroups: [USER_GROUPS.ADMIN]})

        expect(screen.getByText(/Operations Conductor on AWS/i)).toBeInTheDocument()
    })

    test("users nav link is shown to admins", async ()=> {
        renderApp({userGroups: [USER_GROUPS.ADMIN]})

        expect(screen.queryByRole('link', {name:/users/i})).toBeInTheDocument()
    })

    test("users nav link is not shown to non-admins", async ()=> {
        renderApp({userGroups: []})

        expect(screen.queryByRole('link', {name:/users/i})).not.toBeInTheDocument()
    })

    test("tasks button goes to My Tasks page", async ()=> {
        renderApp({})

        const tasksNavButton = screen.getByRole('link', {name: /tasks/i})

        await userEvent.click(tasksNavButton)

        expect(screen.queryByRole('heading', {name: /my tasks/i})).toBeInTheDocument()
    })

    test("users button goes to Users page", async ()=> {
        renderApp({userGroups: [USER_GROUPS.ADMIN]})

        const usersNavButton = screen.getByRole('link', {name: /users/i})

        await userEvent.click(usersNavButton)

        expect(screen.queryByRole('heading', {name: /users/i})).toBeInTheDocument()
    })

    test("AWS Solutions Button in Footer redirects to AWS Solutions Library", async ()=>{
        renderApp({})

        const awsNavButton = screen.getByRole('link', {name: /aws solutions/i})

        expect(awsNavButton).toHaveAttribute('href', 'https://aws.amazon.com/solutions/')
    })
})