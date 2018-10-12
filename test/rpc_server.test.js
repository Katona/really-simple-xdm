import test from "ava";
import { RpcServer } from "../src/rpc_server";
import sinon from "sinon";
import Messages from "../src/messages";

test.beforeEach(t => {
    t.context.testBackend = {
        sendMessage: sinon.stub(),
        onMessage: sinon.stub(),
        removeMessageListener: sinon.stub()
    };
    t.context.serverObject = {
        testFunction: sinon.stub(),
        testCallbackRegistrar: sinon.stub(),
        testCallbackDeregistrar: sinon.stub(),
        testCallbackRegistrar2: sinon.stub(),
        testCallbackDeregistrar2: sinon.stub()
    };
    const config = {
        events: [{ register: "testCallbackRegistrar", deregister: "testCallbackDeregistrar" }]
    };
    t.context.rpcServer = new RpcServer(t.context.testBackend, t.context.serverObject, config);
    t.context.rpcServer.serve();
    t.context.messages = new Messages();
});

test("should register a message listener", t => {
    t.is(t.context.testBackend.onMessage.firstCall.args.length, 1);
});

test("should handle callback registrations.", t => {
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    messageListener(
        t.context.messages.functionCall("testCallbackRegistrar", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    t.is(t.context.serverObject.testCallbackRegistrar.callCount, 1);
    const callbackRegistrationArguments = t.context.serverObject.testCallbackRegistrar.firstCall.args;
    t.is(callbackRegistrationArguments[0], "test");
    const registeredCallback = callbackRegistrationArguments[1];
    t.true(typeof registeredCallback === "function");
    const callCountBeforeCall = t.context.testBackend.sendMessage.callCount;
    registeredCallback("firstArg", 2);
    t.is(t.context.testBackend.sendMessage.callCount, callCountBeforeCall + 1);
    const callbackMessage = t.context.testBackend.sendMessage.lastCall.args[0];
    t.is(callbackMessage.type, "CALLBACK");
    t.is(callbackMessage.id, "callback-id");
    t.deepEqual(callbackMessage.args, ["firstArg", 2]);
});

test("should handle callback deregistrations.", t => {
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    messageListener(
        t.context.messages.functionCall("testCallbackRegistrar", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    t.is(t.context.serverObject.testCallbackRegistrar.callCount, 1);
    const callbackRegistrationArguments = t.context.serverObject.testCallbackRegistrar.firstCall.args;
    t.is(callbackRegistrationArguments[0], "test");
    const registeredCallback = callbackRegistrationArguments[1];
    // Deregistration test
    messageListener(
        t.context.messages.functionCall("testCallbackDeregistrar", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    t.is(t.context.serverObject.testCallbackDeregistrar.callCount, 1);
    t.is(t.context.serverObject.testCallbackDeregistrar.firstCall.args[1], registeredCallback);
});

test("should handle same callbacks registered multiple times.", t => {
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    messageListener(
        t.context.messages.functionCall("testCallbackRegistrar", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    const registeredCallback = t.context.serverObject.testCallbackRegistrar.firstCall.args[1];
    messageListener(
        t.context.messages.functionCall("testCallbackRegistrar2", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    const registeredCallback1 = t.context.serverObject.testCallbackRegistrar2.firstCall.args[1];
    t.is(registeredCallback, registeredCallback1);

    // Deregistration test
    messageListener(
        t.context.messages.functionCall("testCallbackDeregistrar", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    t.is(t.context.serverObject.testCallbackDeregistrar.callCount, 1);
    const deregisteredCallback = t.context.serverObject.testCallbackDeregistrar.firstCall.args[1];
    messageListener(
        t.context.messages.functionCall("testCallbackDeregistrar2", [
            { type: "string", value: "test" },
            { type: "function", value: "callback-id" }
        ])
    );
    t.is(t.context.serverObject.testCallbackDeregistrar2.callCount, 1);
    const deregisteredCallback2 = t.context.serverObject.testCallbackDeregistrar2.firstCall.args[1];
    t.is(registeredCallback, deregisteredCallback);
    t.is(deregisteredCallback, deregisteredCallback2);
});

test("should handle function calls without return value", t => {
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    const functionCallMessage = t.context.messages.functionCall("testFunction", [
        { type: "number", value: 1 },
        { type: "string", value: "secondArg" }
    ]);
    messageListener(functionCallMessage);
    t.is(t.context.serverObject.testFunction.callCount, 1);
    t.deepEqual(t.context.serverObject.testFunction.firstCall.args, [1, "secondArg"]);
    t.is(t.context.testBackend.sendMessage.callCount, 1);
    const returnValueMessage = t.context.testBackend.sendMessage.firstCall.args[0];
    t.is(returnValueMessage.id, functionCallMessage.id);
    t.is(returnValueMessage.type, "RETURN_VALUE");
    t.is(returnValueMessage.value, undefined);
});

test("should handle function calls with return value", t => {
    const expectedReturnValue = { prop1: 1, prop2: "two" };
    t.context.serverObject.testFunction.returns(expectedReturnValue);
    // Emulate function call message
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    messageListener(t.context.messages.functionCall("testFunction", []));
    t.is(t.context.serverObject.testFunction.callCount, 1);
    const returnValueMessage = t.context.testBackend.sendMessage.firstCall.args[0];
    t.deepEqual(returnValueMessage.value, expectedReturnValue);
});

test("should handle function calls returning a promise.", t => {
    const resolvedValue = 3;
    const returnedPromise = Promise.resolve(resolvedValue);
    t.context.serverObject.testFunction.returns(returnedPromise);
    // Emulate function call message
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    const functionCallMessage = t.context.messages.functionCall("testFunction", []);
    // The return value message will happen asynchronously since testFunction returns a promise,
    // so we wrap the rest of the test in a promise and let Ava wait for it.
    const result = new Promise((resolve, reject) => {
        t.context.testBackend.sendMessage = message => {
            t.is(message.id, functionCallMessage.id);
            t.is(message.type, "RETURN_VALUE");
            t.deepEqual(message.value, resolvedValue);
            resolve();
        };
    });
    messageListener(functionCallMessage);
    return result;
});

test("should handle function call errors", t => {
    t.context.serverObject.testFunction.throws("error object");
    // Emulate function call message
    const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
    messageListener(t.context.messages.functionCall("testFunction", []));
    t.is(t.context.serverObject.testFunction.callCount, 1);
    const returnValueMessage = t.context.testBackend.sendMessage.firstCall.args[0];
    t.is(returnValueMessage.type, "ERROR");
    t.not(returnValueMessage.error, undefined);
});
