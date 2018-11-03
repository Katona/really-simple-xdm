# really-simple-xdm

[![CircleCI](https://circleci.com/gh/Katona/really-simple-xdm.svg?style=shield&circle-token=4fe7750d41525e10efd25cf28e42b5b07c8230f9)](https://circleci.com/gh/Katona/really-simple-xdm)

Experimental JavaScript Cross Domain Messaging library based on [JavaScript proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

The goal of this library is to simplify cross domain messaging in browsers, that is, making the communication with a Javascript object in a iframe (almost) as simple as it were a local one.

# Quick Start
Let's assume that we would like to call `Math.abs(-2)`, if `Math` were a local object, then the call would look like this:

```javascript
console.log(Math.abs(-2)); // Prints '2'
```

If Math is in an iframe, calling it with `really-simple-xdm` is demonstrated below.

## Initialization in the iframe
The first step is to expose the service object (`Math` in our case) by creating a _server_:

```javascript
import { CrossWindowMessagingService, createServer } from 'really-simple-xdm';

const messagingSrv = new CrossWindowMessagingService(window.parent, "*");
const server = createServer(messagingSrv, Math);
server.serve();
```
`createServer` requires two arguments, a `MessagingService` and the object which we want to make accessible in the host page (`Math` in our
case). We use `CrossWindowMessagingService` which handles the message passing between cross domain frames. `server.serve()` will instruct the server to start serving requests.

__Note:__ the second argument of `CrossWindowMessaigingServer`'s constructor is the target origin, which is `*` in the example but you should
always specify the origin of the host page. See the documentation of [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) for more information.

## Initialization in the host page

In the host page a _client_ has to be made which connects to the server created above.
```javascript
import { createClient, CrossWindowMessagingService } from 'really-simple-xdm';

const iframeElement = document.getElementById('testFrame'); // the id of the frame containing the `Math` object to be called
const messagingService = new CrossWindowMessagingService(iframeElement.contentWindow, "*");
const mathProxyPromise = createClient(messagingService); // 'mathProxy' is a promise which resolves with the proxy of 'Math'
```

## Using the object

Now, with everything is setup, the actual call would be the following:
```javascript
mathProxyPromise.then(mathProxy => {
    mathProxy.abs(-2).then(result => console.log(result)); // Prints '2'
});
```

If we were to use `async` functions, then the client code would be as simple as:
```javascript
const mathProxy = await createClient(messagingService);
const result = await mathProxy.abs(-2);
console.log(result);
```

The `createClient`, just as `createServer`, requires a `MessagingService` to use for the messaging, and we use `CrossWindowMessagingService` again. It returns a promise which is resolved with a proxy object when the connection is estabilished with the server object in the embedded frame. All the methods of the service object (`Math` in the example) can be called on the proxy almost the same as if it was the service object itself. The only difference is the calls return a `Promise` in every case. If the call is successful, then the promise is resolved with the return value if any, if the call fails then the promise is rejected.

# Callback support

Functions can also be passed as arguments and when called in the frame, the call be be dispatched to the host page.

## Event listeners

Event listeners here are treated as special callbacks: they can be registered _and_ deregistered. For this to work, the server needs some auxiliary information to know the function pairs used to register and deregister the event listener.
```javascript
import { CrossWindowMessagingService, createServer } from 'really-simple-xdm';

const messagingSrv = new CrossWindowMessagingService(window.parent, "*");
const config = {
    events: [ { register: 'on', deregister: 'off' } ]
}
const server = createServer(messagingSrv, Math, config);
server.serve();
```
The `createServer` function accepts a `ServerConfig` object of which the `events` property is an array of `EventMetadata`, which describes events provided by the proxied object. The `EventMetadata` specifies the functions used to register and deregister event listeners for the particular event. This information will be used for book keeping the event listener registrations.

After the server is configured properly, event listeners can be registered on the client:
```javascript
import { createClient, CrossWindowMessagingService } from 'really-simple-xdm';

const client = await createClient(messagingService, config);
const clickListener = e => {
    console.log(e);
};
await client.on('click', clickListener); // registering the listener
await client.off('click', clickListener); // deregistration
```

Note that the register/deregister methods (`on` and `off` respectively) return a promise which resolves when the registration/deregistration is completed.

__The only difference between normal callbacks and event listeners__ is callback registrations are not tracked so they can not be deregistered.

# Exposing multiple service objects from one iframe

It is possible to expose multiple service objects from one iframe by giving them a name:

```javascript
import { CrossWindowMessagingService, createServer } from 'really-simple-xdm';

const messagingSrv = new CrossWindowMessagingService(window.parent, "*");
const mathServer = createServer(messagingSrv, Math, { name: "Math" });
mathServer.serve();

const numberServer = createServer(messagingSrv, Number, { name: "Number" });
numberServer.serve();
```

The names specified during server creation has to be passed to the clients:

```javascript
import { createClient, CrossWindowMessagingService } from 'really-simple-xdm';

const mathProxy = await createClient(messagingService, { serverName: "Math" });
const abs = await mathProxy.abs(-1);
console.log(abs);

const integerProxy = await createClient(messagingService, { serverName: "Number" });
const isInteger = await integerProxy.isInteger(1);
console.log(isInteger);
```

# API documentation

See [TypeScript type definitions for the API documentation](https://github.com/Katona/really-simple-xdm/blob/master/src/index.d.ts).