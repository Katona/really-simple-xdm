import test from 'ava';
import {RpcServer} from './rpc_server'
import sinon from 'sinon';

test.beforeEach(t => {
	t.context.testBackend = {
		sendMessage: sinon.stub(),
		onMessage: sinon.stub(),
		removeMessageListener: sinon.stub()		
	};
	t.context.serverObject = {
		testFunction: sinon.stub()
	};
	t.context.rpcServer = new RpcServer(t.context.testBackend, t.context.serverObject);
});

test('should register a message listener', t => {
	t.is(t.context.testBackend.onMessage.firstCall.args.length, 1);
});

test('should handle callbacks.', t => {
	t.is(t.context.testBackend.onMessage.firstCall.args.length, 1);
	// Grab the response listener which is registered on the messaging backend
	const callbackResponseListener = t.context.testBackend.onMessage.firstCall.args[0];
	const testCallback = sinon.stub();
	// Register a callback
	t.context.client.on('test', testCallback);
	// Check registration message
	t.is(t.context.testBackend.sendMessage.firstCall.args.length, 1);
	const cbRegistrationMessage = t.context.testBackend.sendMessage.firstCall.args[0];
	t.is(cbRegistrationMessage.type, 'CALLBACK_REGISTRATION');
	t.is(cbRegistrationMessage.args.length, 2);
	t.is(cbRegistrationMessage.args[0].type, 'string')
	t.is(cbRegistrationMessage.args[1].type, 'function')
	const callbackArgument = cbRegistrationMessage.args[1];
	// Trigger a callback response
	callbackResponseListener({ type: 'CALLBACK', id: callbackArgument.id, args: ['firstArg', 'secondArg'] });
	t.is(testCallback.callCount, 1);
	t.deepEqual(testCallback.firstCall.args, ['firstArg', 'secondArg']);

	// Deregister callback
	t.context.client.off('test', testCallback);
	// Check message
	t.is(t.context.testBackend.sendMessage.callCount, 2);
	const cbDeregistrationMessage = t.context.testBackend.sendMessage.secondCall.args[0];
	t.is(cbDeregistrationMessage.type, 'CALLBACK_DEREGISTRATION');
	t.is(cbDeregistrationMessage.args.length, 2);
	t.is(cbDeregistrationMessage.args[0].type, 'string')
	t.is(cbDeregistrationMessage.args[1].type, 'function')

	callbackResponseListener({ type: 'CALLBACK', id: cbDeregistrationMessage.args[1].id, args: ['firstArg']});
	t.is(testCallback.callCount, 1, 'Callback should have not been invoked since it has been deregistered.');
});

test('should handle function calls without return value', t => {
	const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
	messageListener({type: 'FUNCTION_CALL', id: 'test-id', functionName: 'testFunction', args: [1, 'secondArg']});
	t.is(t.context.serverObject.testFunction.callCount, 1);
	t.deepEqual(t.context.serverObject.testFunction.firstCall.args, [1, 'secondArg']);
	t.is(t.context.testBackend.sendMessage.callCount, 1)
	const returnValueMessage = t.context.testBackend.sendMessage.firstCall.args[0];
	t.is(returnValueMessage.id, 'test-id');
	t.is(returnValueMessage.type, 'RETURN_VALUE');
	t.is(returnValueMessage.value, undefined);
});

test('should handle function calls with return value', t => {
	const expectedReturnValue = { prop1: 1, prop2: 'two' };
	t.context.serverObject.testFunction.returns(expectedReturnValue);
	// Emulate function call message
	const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
	messageListener({type: 'FUNCTION_CALL', id: 'test-id', functionName: 'testFunction', args: []});
	t.is(t.context.serverObject.testFunction.callCount, 1);
	const returnValueMessage = t.context.testBackend.sendMessage.firstCall.args[0];
	t.deepEqual(returnValueMessage.value, expectedReturnValue);
});

test.only('should handle function calls returning a promise.', t => {
	const resolvedValue = 3;
	const returnedPromise = Promise.resolve(resolvedValue);
	t.context.serverObject.testFunction.returns(returnedPromise);
	// Emulate function call message
	const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
	// The return value message will happen asynchronously since testFunction returns a promise, 
	// so we wrap the rest of the test in a promise and let Ava wait for it.
	const result = new Promise((resolve, reject) => {
		t.context.testBackend.sendMessage = (message) => {
			t.is(message.id, 'test-id');
			t.is(message.type, 'RETURN_VALUE');
			t.deepEqual(message.value, resolvedValue);
			resolve();
		};
	});
	messageListener({type: 'FUNCTION_CALL', id: 'test-id', functionName: 'testFunction', args: []});
	return result;
});

test('should handle function call errors', t => {
	t.context.serverObject.testFunction.throws('error object');
	// Emulate function call message
	const messageListener = t.context.testBackend.onMessage.firstCall.args[0];
	messageListener({type: 'FUNCTION_CALL', id: 'test-id', functionName: 'testFunction', args: []});
	t.is(t.context.serverObject.testFunction.callCount, 1);
	const returnValueMessage = t.context.testBackend.sendMessage.firstCall.args[0];
	t.is(returnValueMessage.type, 'ERROR');
	t.not(returnValueMessage.error, undefined);
});