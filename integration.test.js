import test from 'ava';
import {createRpcClient} from './rpc_client';
import {RpcServer} from './rpc_server';
import sinon from 'sinon';

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

class TestServiceClass {
    register(arg1, arg2, callback) {
        this.callback = callback;
    }

    deregister(arg1, arg2, callback) {
        if (this.callback === callback) {
            this.callback = undefined;
        }
    }

    add(a, b) {
        return a + b;
    }

    multiply(a, b) {
        return Promise.resolve(a * b);
    }

    objectParameter(obj) {
        return obj.field;
    }

    emitEvent(arg) {
        if (this.callback !== undefined) {
            this.callback(arg);
        }
    }
}

test.only('simple', async t => {

    const testBackend = new TestMessagingService();
    const rpcClient = createRpcClient(testBackend.getClientBackend(), [{ register: 'on', deregister: 'off' }]);
    const serviceObject = new TestServiceClass();
    serviceObject.voidFunction = sinon.stub();
    const rpcServer = new RpcServer(testBackend.getServerBackend(), serviceObject);

    rpcClient.voidFunction('adf');
    t.is(serviceObject.voidFunction.callCount, 1);
    t.deepEqual(serviceObject.voidFunction.firstCall.args, ['adf']);

    const testCallback = sinon.stub();
    rpcClient.register('test', 'test2', testCallback);
    t.not(serviceObject.callback, undefined);
    serviceObject.emitEvent('test event');
    t.is(testCallback.callCount, 1);
    t.deepEqual(testCallback.firstCall.args, ['test event']);
    const sum = await rpcClient.add(3, 4);
    t.is(sum, 7);
    const product = await rpcClient.multiply(8, 6);
    t.is(product, 48);
    const field = await rpcClient.objectParameter({ field: 'field of object' });
    t.is(field, 'field of object');
    rpcClient.deregister('test', 'test2', testCallback);
    t.is(serviceObject.callback, undefined);
});