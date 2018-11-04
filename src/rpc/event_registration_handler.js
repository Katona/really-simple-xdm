class EventRegistrationHandler {
    constructor() {
        this.callbackRegistrations = [];
    }

    addRegistration(functionName, ...args) {
        this.callbackRegistrations.push({ functionName, args });
    }

    removeRegistration(registration) {
        this.callbackRegistrations = this.callbackRegistrations.filter(reg => reg !== registration);
    }

    hasRegistrations(callbackId) {
        return this.callbackRegistrations.filter(reg => reg.args.filter(a => a === callbackId)).length !== 0;
    }
}

module.exports = EventRegistrationHandler;
