// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'


import {Amplify} from "@aws-amplify/core";
import {server} from "./__tests__/mocks/server";



beforeAll( async () => {
    Amplify.configure({
        "API": {
            "endpoints": [
                {
                    "endpoint": "", // empty endpoint URL means the mock server is called
                    "name": "operations-conductor-api"
                }
            ]
        }
    })

    //returning server.listen's promise ensures setup waits for the server to be finished setting up
    return server.listen()
})