# xdm.js
[![CircleCI](https://circleci.com/gh/Katona/xdm.js.svg?style=shield&circle-token=4fe7750d41525e10efd25cf28e42b5b07c8230f9)](https://circleci.com/gh/Katona/rpc.js)

Experimental JavaScript Cross Domain Messaging library based on [JavaScript proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

The goal of this library to simplify cross domain messaging in browsers, that is, making the communication with a Javascript object in a frame (almost) as simple as it were a local one.

# Quick Start
Let's assume that we would like to call `Math.abs(-2)`, if `Math` were a local object, then the call would look like this:

```javascript
console.log(Math.abs(-2)); // Prints '2'
```

First, we need some setup in the frame:
```javascript
import { CrossWindowMessagingService, RpcServer } from 'xdm.js';

const messagingSrv = new CrossWindowMessagingService(window.parent, "*");
const server = createServer(messagingSrv, Math);
```

And in the client:
```javascript
import { createClient, CrossWindowMessagingService } from 'xdm.js';

const iframeElement = document.getElementById('testFrame'); // the id of the frame containing the `Math` object to be called
const messagingService = new CrossWindowMessagingService(iframeElement.contentWindow, "*");
const client = createClient(messagingService); // 'client' is a promise which resolves with the proxy of 'Math'
client.then(mathProxy => {
    mathProxy.abs(-2).then(result => console.log(result)); // Prints '2'
});
```

If we were to use `async` functions, then the client code would be the following:
```javascript
import { createClient, CrossWindowMessagingService } from 'xdm.js';

async function test() {
    const iframeElement = document.getElementById('testFrame');
    const messagingService = new CrossWindowMessagingService(iframeElement.contentWindow, "*");
    const client = await createClient(messagingService);

    const result = await client.abs(-2);
    console.log(result);
}
```

The `createClient` method returns a promise which is resolved with a proxy object when the connection is estabilished with the server object in the embedded frame. All the methods of the server object (`Math` in the example) can be called on the proxy almost the same as if it was the server object itself. The only difference is the calls return a `Promise` in every case. If the call is successful, then the promise is resolved with the return value if any, if the call fails then the promise is rejected.