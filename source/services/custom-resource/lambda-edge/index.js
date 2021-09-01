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