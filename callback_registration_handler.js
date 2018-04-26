const equal = require('deep-equal');

class CallbackRegistrationHandler {

    constructor() {
        this.callbackFunctions = [];
        this.callbackRegistrations = [];
    }

    getCallback(callbackId) {
        const callbackEntry = this.callbackFunctions.find(c => c.callbackId === callbackId);
        return callbackEntry ? callbackEntry.callbackFunction : null;
    }

    getCallbackId(callbackFunction) {
        const callbackEntry = this.callbackFunctions.find(c => c.callbackFunction === callbackFunction);
        return callbackEntry ? callbackEntry.callbackId : null;
    }

    addCallback(callbackId, callbackFunction) {
        this.callbackFunctions.push({ callbackId, callbackFunction });
    }

    removeCallback(callbackId) {
        this.callbackFunctions = this.callbackFunctions.filter(c => c.callbackId !== callbackId);
    }

    addRegistration(callbackId, functionName, args) {
        this.callbackRegistrations.push({callbackId, functionName, args});
    }

    getRegistration(functionName, args) {
        return this.callbackRegistrations.find(registration => equal(registration.args, args) && registration.functionName === functionName);
    }
    
    removeRegistration(registration) {
        this.callbackRegistrations = this.callbackRegistrations.filter(reg => reg !== registration);
    }

    hasRegistrations(callbackId) {
        return this.callbackRegistrations.filter(reg => reg.callbackId === callbackId).length !== 0;
    }
}

module.exports = CallbackRegistrationHandler;