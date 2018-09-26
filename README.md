# rpc.js
[![CircleCI](https://circleci.com/gh/Katona/rpc.js.svg?style=shield&circle-token=4fe7750d41525e10efd25cf28e42b5b07c8230f9)](https://circleci.com/gh/Katona/rpc.js)

Experimental Javascript RPC library based on [Javascript proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

The original goal was to simplify cross window messaging in browsers, that is, making the communication with a Javascript object in a frame (almost) as simple as it were a local one. Considering the following example:

```
console.log(Math.abs(-2)); // Prints '2'
```

If the `Math` object were in a cross domain frame, then calling it with `rpc.js` would be the following. We need some setup in the frame:

```
const messagingSrv = new rpc.CrossWindowMessagingService(window.parent, "*");
const server = new rpc.createServer(messagingSrv, Math);
```

And in the client:
```
const iframeElement = document.getElementById('testFrame'); // the id of the frame containing the `Math` object to be proxied
const messagingService = new rpc.CrossWindowMessagingService(iframeElement.contentWindow, "*");
createClient(messagingService).then(mathProxy => {
    mathProxy.abs(-2).then(result => console.log(result)); // Prints '2'
});
```

If we were to use `async` functions, then the client code would be like the following:
```
async function test() {
    const iframeElement = document.getElementById('testFrame');
    const messagingService = new rpc.CrossWindowMessagingService(iframeElement.contentWindow, "*");
    const client = await rpc.createClient(messagingService);
    const result = await client.abs(-2);
    console.log(result);
}
```

The `createClient` method returns a promise which is resolved with a proxy object when the connection is estabilished with the server object in the embedded frame. All the methods of the server object (`Math` in the example) can be called on the proxy almost the same as if it was the server object itself. The only difference is the calls return a `Promise` in every case. If the call is successful, then the promise is resolved with the return value if any, if the call fails then the promise is rejected.