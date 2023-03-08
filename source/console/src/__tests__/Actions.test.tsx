import {server} from "./mocks/server"
import {PathParams, ResponseResolver, rest, RestContext, RestRequest} from "msw";
import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event"
import Actions, {Action} from "../views/Actions";
import {MemoryRouter, Route, Switch} from "react-router-dom";
import TaskCreate from "../views/TaskCreate";
import * as React from "react";

const mockActionsList: Action[] = [
    {
        name: "action1",
        owner: "self",
        description: "action 1 description",
    },
    {
        name: "action2",
        owner: "self",
        description: "action 2 description",
    },
    {
        name: "action3",
        owner: "self",
        description: "action 3 description",
    },
]

function actionsApi() {
    return {
        returnsActions: (actions: Action[]) => {
            server.use(
                rest.get("/actions", (request, response, context) => {
                    return response(
                        context.status(200),
                        context.json(actions)
                    )
                })
            )
        },
        returnsActionsAfterDelay: (actions: Action[], msDelay: number) => {
            server.use(
                rest.get("/actions", (request, response, context) => {
                    return response(
                        context.delay(msDelay),
                        context.status(200),
                        context.json(actions)
                    )
                })
            )
        },
        returnsResponse: (resolver: ResponseResolver<RestRequest<never, PathParams<string>>, RestContext>) => {
            server.use(
                rest.get("/actions", (request, response, context) => {
                    return resolver(request, response, context);
                })
            )
        }
    }
}
function renderActionsPage() {
    return render(
     <MemoryRouter initialEntries={['/tasks/actions']}>
         <Switch>
             <Route exact path="/tasks/actions"
                    render={(props) => (<Actions {...props} getApiToken={()=> ""} />)} />
             <Route exact path="/tasks/create"
                    render={(props) => (<TaskCreate {...props} getApiToken={()=> ""} />)} />
         </Switch>
     </MemoryRouter>
    )
}

async function actionsHaveLoaded() {
    await screen.findByRole('table');
}
describe("ListActions page", ()=> {


    test("shows loading bar while actions are loading", async ()=> {
        actionsApi().returnsActionsAfterDelay(mockActionsList, 500)
        renderActionsPage();

        expect(await screen.findByRole('progressbar')).toBeInTheDocument()
    })

    test("does not show loading bar when actions have loaded", async ()=> {
        actionsApi().returnsActions(mockActionsList)
        renderActionsPage();
        await actionsHaveLoaded();

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    test("lists all actions", async ()=> {
        actionsApi().returnsActions(mockActionsList)
        renderActionsPage()
        await actionsHaveLoaded()

        const actionsTable = await screen.getByRole('table')

        expect(within(actionsTable).queryByRole('row', {name: /action1/})).toBeInTheDocument()
        expect(within(actionsTable).queryByRole('row', {name: /action2/})).toBeInTheDocument()
        expect(within(actionsTable).queryByRole('row', {name: /action3/})).toBeInTheDocument()
    })

    test("search filters actions correctly", async () => {
        //arrange
        actionsApi().returnsActions(mockActionsList);
        renderActionsPage()
        await actionsHaveLoaded()

        //elements of interest
        const searchBar = screen.getByRole('textbox')
        const actionsTable = await screen.findByRole('table')

        //act
        await userEvent.type(searchBar, "action1")

        //assert
        expect(within(actionsTable).queryByRole('row', {name: /action1/})).toBeInTheDocument()
        expect(within(actionsTable).queryByRole('row', {name: /action2/})).not.toBeInTheDocument()
        expect(within(actionsTable).queryByRole('row', {name: /action3/})).not.toBeInTheDocument()
    })

    test("search filter is case insensitive", async ()=> {
        actionsApi().returnsActions(mockActionsList);
        renderActionsPage()
        await actionsHaveLoaded()

        const searchBar = screen.getByRole('textbox')
        const actionsTable = screen.getByRole('table')

        await userEvent.type(searchBar, "AcTIon1")

        expect(within(actionsTable).queryByRole('row', {name: /action1/})).toBeInTheDocument()
    })

    test("search filter performs partial matching", async ()=> {
        actionsApi().returnsActions([{name:"ActionWithVeryVeryLongName", owner: "owner", description: "description"}]);
        renderActionsPage()
        await actionsHaveLoaded()

        const searchBar = screen.getByRole('textbox')
        const actionsTable = screen.getByRole('table')

        await userEvent.type(searchBar, "longname")

        expect(within(actionsTable).queryByRole('row', {name: /ActionWithVeryVeryLongName/})).toBeInTheDocument()
    })

    test("action initial sort order is ascending", async ()=> {
        actionsApi().returnsActions(mockActionsList)
        renderActionsPage()
        await actionsHaveLoaded()

        const actionsTable = screen.getByRole('table')
        const actionRows = within(actionsTable).getAllByRole('row');
        const action1Row = within(actionsTable).getByRole('row', {name: /action1/})
        const action2Row = within(actionsTable).getByRole('row', {name: /action2/})

        expect(actionRows.indexOf(action1Row)).toBeLessThan(actionRows.indexOf(action2Row));
    })

    test("action sort order can be toggled", async ()=> {
        //setup
        actionsApi().returnsActions(mockActionsList)
        renderActionsPage()
        await actionsHaveLoaded()

        const actionsTable = screen.getByRole('table');
        const sortButton = screen.getByTestId('sort-btn')
        const action1Row = within(actionsTable).getByRole('row', {name: /action1/})
        const action2Row = within(actionsTable).getByRole('row', {name: /action2/})

        //act
        await userEvent.click(sortButton)

        //first toggle toggles to descending order
        let actionRows = within(actionsTable).getAllByRole('row');
        expect(actionRows.indexOf(action1Row)).toBeGreaterThan(actionRows.indexOf(action2Row));

        //act
        await(userEvent.click(sortButton));

        //toggling again toggles back to ascending order
        actionRows = within(actionsTable).getAllByRole('row');
        expect(actionRows.indexOf(action1Row)).toBeLessThan(actionRows.indexOf(action2Row));
    })

    test("displays error when actions fail to fetch", async ()=> {
        actionsApi().returnsResponse((request, response, context) => {
            return response(
                context.status(500),
                context.json({
                    message: 'Error loading Actions'
                })
            )
        })

        renderActionsPage()
        expect(await screen.findByRole('alert')).toBeInTheDocument()
    })

    test("each action has create action button", async ()=> {
        actionsApi().returnsActions(mockActionsList)
        renderActionsPage()
        await actionsHaveLoaded();

        const action1Row = screen.getByRole('row', {name:/action1/})
        const action2Row = screen.getByRole('row', {name:/action2/})
        const action3Row = screen.getByRole('row', {name:/action3/})

        expect(within(action1Row).getByRole('button', {name:/create/i})).toBeInTheDocument()
        expect(within(action2Row).getByRole('button', {name:/create/i})).toBeInTheDocument()
        expect(within(action3Row).getByRole('button', {name:/create/i})).toBeInTheDocument()
    })

    test("clicking action create button opens correct create page", async ()=> {
        actionsApi().returnsActions(mockActionsList)
        renderActionsPage()
        await actionsHaveLoaded();

        const action1Row = screen.getByRole('row', {name:/action1/})
        const createAction1TaskBtn = within(action1Row).getByRole('button', {name:/create/i})

        await userEvent.click(createAction1TaskBtn);

        expect(await screen.findByText(/create a task/i)).toBeInTheDocument()
        expect(screen.getByText(/action1/)).toBeInTheDocument()
    })

})