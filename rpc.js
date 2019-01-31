let rpcClient = {};

rpcClient._pending = {};

rpcClient._counter = 1;

rpcClient.registerTransport = (registerListener) => {
    registerListener(event => {
        let response;

        if (typeof event.data !== 'string') {
            return;
        }

        try {
            response = JSON.parse(event.data);
        } catch (error) {
            return;
        }

        if (!response || response.jsonrpc !== '2.0' || !response.id) { // skip non-RPC messages
            return;
        }

        if (!rpcClient._pending[response.id]) {
            return;
        }

        if (response.error) {
            console.log('JSON-RPC error:', rpcClient._pending[response.id].request, response);
            rpcClient._pending[response.id].reject(response.error);
        } else {
            rpcClient._pending[response.id].resolve(response.result);
        }

        delete rpcClient._pending[response.id];
    });
};

rpcClient.createSender = function (sendRequestFn) {
    return {
        method: function (method, params) {
            return function () {
                let id = rpcClient._counter++;
                params = params || Array.from(arguments);
                let request = {jsonrpc: '2.0', method: method, params: params, id: id};
                sendRequestFn(JSON.stringify(request));
                return new Promise((resolve, reject) => {
                    rpcClient._pending[id] = {resolve: resolve, reject: reject, request: request};
                });
            };
        },
        notify: function (method, params) {
            params = params || Array.from(arguments);
            let request = {jsonrpc: '2.0', method: method, params: params};
            sendRequestFn(JSON.stringify(request));
        }
    }
};

// ------------------------------------------------------------------------------------------------

let rpcServer = {};

rpcServer.api = {};

rpcServer.registerTransport = (registerListener, sendResponse) => {
    registerListener(event => {
        let request;

        if (typeof event.data !== 'string') {
            return;
        }

        try {
            request = JSON.parse(event.data);
        } catch (error) {
            return;
        }

        if (!request || request.jsonrpc !== '2.0' || request.error || request.result) {
            return;
        }

        if (typeof rpcServer.api[request.method] !== 'function') {
            return _error(event, -32601, 'Method not found: ' + request.method, request.id);
        }

        if (request.method && !Array.isArray(request.params)) {
            return _error(event, -32700, 'Invalid request', request.id);
        }

        try {
            let result = rpcServer.api[request.method].apply(null, request.params);
            Promise.resolve(result).then(result => {
                if (request.id) {
                    sendResponse(event, JSON.stringify({jsonrpc: '2.0', result: result, id: request.id}));
                }
            });
        } catch (error) {
            _error(event, -32000, error.message, request.id);
            throw error;
        }
    }, false);

    function _error(event, code, message, id) {
        let json = JSON.stringify({jsonrpc: '2.0', code: code, error: message, id: id || null});
        sendResponse(event, json);
    }

};

rpcServer.registerApi = (apiMethods) => {
    Object.assign(rpcServer.api, apiMethods);
};

