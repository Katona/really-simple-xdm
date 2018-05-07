import test from 'ava';
import {createRpcClient} from './rpc_client';
import {RpcServer} from './rpc_server';
import sinon from 'sinon';
import {EventEmitter} from 'events';

class SimpleMessagingService {
    constructor() {
        this.listeners = [];
    }

    setTarget(target) {
        this.target = target;
    }

    acceptMessage(msg) {
        this.listeners.forEach(l => l(msg));
    }

    sendMessage(msg) {
        this.target.acceptMessage(msg)
    }

    onMessage(callback) {
        this.listeners.push(callback);
    }

    removeMessageListener(callback) {
        this.listeners = this.listeners.filter(listener => listener === callback);
    }
}

class TestMessagingService {
    constructor() {
        this.serverBackend = new SimpleMessagingService();
        this.clientBackend = new SimpleMessagingService();
        this.serverBackend.setTarget(this.clientBackend);
        this.clientBackend.setTarget(this.serverBackend);
    }

    getServerBackend() { return this.serverBackend; }
    getClientBackend() { return this.clientBackend; }
}

test.beforeEach(t => {
    const testBackend = new TestMessagingService();
	t.context.createClient = (params) => createRpcClient(testBackend.getClientBackend(), params);
	t.context.createServer = (serviceObject) => new RpcServer(testBackend.getServerBackend(), serviceObject);
});

test('with Math object', async t => {
    const rpcClient = t.context.createClient([]);
    const rpcServer = t.context.createServer(Math);
    const abs = await rpcClient.abs(-1);
    t.is(abs, 1);

    const max = await rpcClient.max(-10, 0, 22);
    t.is(max, 22);
});

test('test calling of non existing function', async t => {
    const rpcClient = t.context.createClient([]);
    const rpcServer = t.context.createServer({});

    const promise = rpcClient.nonExisting('asdfds');
    const error = await t.throws(promise);
	t.is(error.message, 'nonExisting is not a function');
});

test('test callbacks', async t => {
    const testEventEmitter = new EventEmitter();
    const rpcClient = t.context.createClient([{register: 'on', deregister: 'removeListener'}]);
    const rpcServer = t.context.createServer(testEventEmitter);
    const event1Listener1 = sinon.stub();
    const event1Listener2 = sinon.stub();
    const event2Listener = sinon.stub();
    
    rpcClient.on('event1', event1Listener1);
    testEventEmitter.emit('event1', 1);
    t.is(event1Listener1.callCount, 1)
    t.is(event1Listener1.firstCall.args[0], 1);

    rpcClient.on('event2', event2Listener);
    testEventEmitter.emit('event2', 2);
    t.is(event2Listener.callCount, 1);
    t.is(event2Listener.firstCall.args[0], 2);

    rpcClient.on('event1', event1Listener2);
    testEventEmitter.emit('event1', 1);
    t.is(event1Listener1.callCount, 2)
    t.is(event1Listener2.callCount, 1)

    rpcClient.removeListener('event1', event1Listener1);
    testEventEmitter.emit('event1', 1);
    t.is(event1Listener1.callCount, 2);
    t.is(event1Listener2.callCount, 2);

    rpcClient.on('event1', event1Listener2);
    testEventEmitter.emit('event1', 1);
    t.is(event1Listener2.callCount, 4);

    rpcClient.removeListener('event1', event1Listener2);
    testEventEmitter.emit('event1', 1);
    t.is(event1Listener2.callCount, 5);
});