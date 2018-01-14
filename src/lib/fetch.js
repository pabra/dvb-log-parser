// https://gist.github.com/kiliankoe/928c3ddf851fb47aa62bdc950ca5bb56
// https://github.com/kiliankoe/vvo/wiki/WebAPI

import _ from 'lodash';

/* eslint-disable import/prefer-default-export */
export async function fetchJson(options) {
    const defaults = {
        url: null,
        method: 'GET',
        username: null,
        password: null,
        data: null,
        type: 'application/json',
    };

    const opts = Object.assign({}, defaults, options);

    if (!opts.url) throw new Error('url required');

    const fetchArgs = {
        method: opts.method,
        headers: {},
    };

    if (opts.username && opts.password) {
        fetchArgs.headers.Authorization = `BASIC ${btoa(`${opts.username}:${opts.password}`)}`;
        fetchArgs.credentials = 'include';
    }

    if (opts.data) {
        fetchArgs.headers['Content-Type'] = `${opts.type}; charset=utf-8`;
        fetchArgs.body = _.isPlainObject(opts.data) ? JSON.stringify(opts.data) : opts.data;
    }

    const response = await fetch(opts.url, fetchArgs);
    const json = await response.json();

    return {
        ok: response.status === 200,
        text: '',
        data: json,
        status: response.status,
    };
}

export function xhrJson(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);

        request.onload = () => {
            if (request.status >= 200 && request.status < 400) {
                resolve({
                    ok: request.status === 200,
                    text: '',
                    data: JSON.parse(request.responseText),
                    status: request.status,
                });
            } else {
                reject(`request.status ${request.status}`);
            }
        };

        request.onerror = reject;

        request.send();
    });
}

// for debugging in browser
if (process.env && process.env.NODE_ENV === 'development') {
    window.fetchJson = fetchJson;
}
