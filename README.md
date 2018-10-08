# xdm.js
[![CircleCI](https://circleci.com/gh/Katona/xdm.js.svg?style=shield&circle-token=4fe7750d41525e10efd25cf28e42b5b07c8230f9)](https://circleci.com/gh/Katona/xdm.js)

Experimental JavaScript Cross Domain Messaging library based on [JavaScript proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

The goal of this library to simplify cross domain messaging in browsers, that is, making the communication with a Javascript object in a frame (almost) as simple as it were a local one.

# Quick Start
Let's assume that we would like to call `Math.abs(-2)`, if `Math` were a local object, then the call would look like this:

```javascript
console.log(Math.abs(-2)); // Prints '2'
```

Assuming `Math` resides in a cross domain frame, the calling it would be the following. Some initialization is needed in the frame:
```javascript
import { CrossWindowMessagingService, createServer } from 'xdm.js';

const messagingSrv = new CrossWindowMessagingService(window.parent, "*");
const server = createServer(messagingSrv, Math);
```
`createServer` requires to arguments, a `MessagingService` and the object which we want to make accessible in the host page (`Math` in our
case). We use `CrossWindowMessagingService` which handles the message passing between cross domain frames.

And in host page:
```javascript
import { createClient, CrossWindowMessagingService } from 'xdm.js';

const iframeElement = document.getElementById('testFrame'); // the id of the frame containing the `Math` object to be called
const messagingService = new CrossWindowMessagingService(iframeElement.contentWindow, "*");
const mathProxyPromise = createClient(messagingService); // 'mathProxy' is a promise which resolves with the proxy of 'Math'

```
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

The `createClient`, just as `createServer`, requires a `MessagingService` to use for the messaging, and we `CrossWindowMessagingService` again. It returns a promise which is resolved with a proxy object when the connection is estabilished with the server object in the embedded frame. All the methods of the server object (`Math` in the example) can be called on the proxy almost the same as if it was the server object itself. The only difference is the calls return a `Promise` in every case. If the call is successful, then the promise is resolved with the return value if any, if the call fails then the promise is rejected.

# Callback support

Only event handlers are supported.

```javascript
const client = await xdmjs.createClient(messagingService, [ { register: 'on', deregister: 'off' } ]);
const clickListener = e => {
    console.log(e);
};
const result = await client.on('click', clickListener); // registering the listener
client.off('click', clickListener); // deregistration
```

The `createClient` function accepts an array of `EventListenerRegistrationMetadata`, which describes the functions used for registering and
deregistering the event listeners. This information will be used for book keeping the event listener registrations. From this point event listeners has to be registered as usual, keeping in mind that the registration function (as mentioned above) returns a promise.