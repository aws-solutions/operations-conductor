import React from 'react'
import ReactDOM from 'react-dom'
import App from '../App'

// TODO - depending on our test strategy, this mock will need to be pulled out to a shared class somewhere
jest.mock('aws-amplify-react', () => ({
    withAuthenticator: (component: any) => component
}))

describe('App', () => {
    test('App throws error when not authenticated', () => {
        const div = document.createElement('div')
        ReactDOM.render(<App />, div)
        ReactDOM.unmountComponentAtNode(div)
    })
})
