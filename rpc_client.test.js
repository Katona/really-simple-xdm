import test from 'ava';
import {RpcClientHandler} from './rpc_client'
import sinon from 'sinon';

class ConsoleMessagingBackend {

    constructor() {
        this.callbacks = []
    }
    sendMessage(msg) {
        this.callbackId = msg.args.find(arg => arg.type === 'function').id;
        console.log(JSON.stringify(msg));
    }
    onResponse(callback) { 
        console.log(callback);
        this.callbacks.push(callback);
    }

    emitOnResponse(arg) {
        console.log('emitting onResponse');
        this.callbacks.forEach(c => c(arg));
    }
}


// GET /
// api.get()
// // GET /users
// api.getUsers()
// // GET /users/1234/likes
// api.getUsers$Likes('1234')
// // GET /users/1234/likes?page=2
// api.getUsers$Likes('1234', { page: 2 })
// // POST /items with body
// api.postItems({ name: 'Item name' })
// // api.foobar is not a function
// api.foobar()

test('should register a response listener for callbacks', t => {
	const testBackend = {
		sendMessage: sinon.stub(),
		onResponse: sinon.stub()
	}
	const api = new Proxy({}, new RpcClientHandler(testBackend));
	t.is(testBackend.onResponse.firstCall.args.length, 1);
});

test('should handle callback response.', t => {
	const testBackend = {
		sendMessage: sinon.stub(),
		onResponse: sinon.stub()
	}
	const client = new Proxy({}, new RpcClientHandler(testBackend));
	t.is(testBackend.onResponse.firstCall.args.length, 1);
	const callbackResponseListener = testBackend.onResponse.firstCall.args[0];
	const testCallback = sinon.stub();
	client.on('test', testCallback);
	t.is(testBackend.sendMessage.firstCall.args.length, 1);
	const message = testBackend.sendMessage.firstCall.args[0];
	t.is(message.type, 'CALLBACK_REGISTRATION');
	t.is(message.args.length, 2);
	t.is(message.args[0].type, 'string')
	t.is(message.args[1].type, 'function')
	const callbackArgument = message.args[1];
	callbackResponseListener({ type: 'CALLBACK', id: callbackArgument.id, args: ['firstArg', 'secondArg'] });
	t.is(testCallback.callCount, 1);
	t.deepEqual(testCallback.firstCall.args, ['firstArg', 'secondArg']);
});
