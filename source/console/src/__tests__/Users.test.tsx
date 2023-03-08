/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {server} from "./mocks/server"
import {PathParams, ResponseResolver, rest, RestContext, RestRequest} from "msw";
import {render, screen, within} from "@testing-library/react";
import Users, {User} from "../views/Users";
import {MemoryRouter, Route, Switch} from "react-router-dom";

const mockUsers : User[] = [
    {
        name: 'user1',
        username: 'username1',
        email: 'user1@example.com',
        group: 'Member',
        status: 'CONFIRMED'
    },
    {
        name: 'user2',
        username: 'username2',
        email: 'user2@example.com',
        group: 'Member',
        status: 'CONFIRMED'
    },
    {
        name: 'user3',
        username: 'username3',
        email: 'user3@example.com',
        group: 'Member',
        status: 'FORCE_CHANGE_PASSWORD'
    },
]

function usersApi() {
    return {
        returnsUsers: (users: User[]) => {
            server.use(
                rest.get("/users", (request, response, context) => {
                    return response(
                        context.status(200),
                        context.json(users)
                    )
                })
            )
        },
        returnsUsersAfterDelay: (users: User[], msDelay: number) => {
            server.use(
                rest.get("/users", (request, response, context) => {
                    return response(
                        context.delay(msDelay),
                        context.status(200),
                        context.json(users)
                    )
                })
            )
        },
        returnsResponse: (resolver: ResponseResolver<RestRequest<never, PathParams<string>>, RestContext>) => {
            server.use(
                rest.get("/users", (request, response, context) => {
                    return resolver(request, response, context);
                })
            )
        }
    }
}

function getApiToken() {
    return "" //no need for api token in these tests
}
function renderUsersPage() {
    return render(
        <MemoryRouter initialEntries={['/users']}>
            <Switch>
                <Route exact path="/users"
                       render={(props) => (<Users {...props} getApiToken={getApiToken} />)} />
            </Switch>
        </MemoryRouter>
    )
}

async function usersHaveLoaded() {
    await screen.findByRole('table');
}

describe('Users page', ()=> {
    test('page loads', ()=> {
        renderUsersPage()
        expect(screen.getByRole('heading', {name:/Users/i})).toBeInTheDocument()
    })
})

