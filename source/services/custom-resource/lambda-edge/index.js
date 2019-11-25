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

 exports.handler = async (event, context, callback) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;

    headers['x-xss-protection'] = [
        {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
        }
    ];
    headers['x-frame-options'] = [
        {
            key: 'X-Frame-Options',
            value: 'DENY'
        }
    ];
    headers['x-content-type-options'] = [
        {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
            }
    ];
    headers['strict-transport-security'] = [
        {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubdomains; preload'
        }
    ];
    headers['referrer-policy'] = [
        {
            key: 'Referrer-Policy',
            value: 'same-origin'
        }
    ];
    headers['content-security-policy'] = [
        {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; base-uri 'self'; img-src 'self'; script-src 'self'; style-src 'self' https:; object-src 'none'; frame-ancestors 'none'; font-src 'self' https:; form-action 'self'; manifest-src 'self'; connect-src 'self' *.amazonaws.com"

        }];

    callback(null, response);
};