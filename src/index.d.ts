// Type definitions for rpc.js
// Project: rpc.js
// Definitions by: Gabor Hornyak

/**
 * The callback function to be called with the received message as a parameter.
 */
interface MessageListener {
    (message: any): void;
}

/**
 * Encapsulates the functionality to sending and receiving messages.
 */
export interface MessagingService {
    /**
     * Sends a message.
     * @param message the message object
     */
    sendMessage(message: any);

    /**
     * Registers a callback to be called when a message is received.
     * @param messageListener the callback function to call when message is received.
     */
    onMessage(messageListener: MessageListener);

    /**
     * Deregisters a callback function which was registered via an 'onMessage' call earlier.
     * @param messageListener the callback function which should no longer be called when a message is received.
     */
    removeMessageListener(messageListener: MessageListener);
}

/**
 * A messaging service implementation to be used for communacting with a frame embedded in a html page.
 */
export class CrossWindowMessagingService implements MessagingService {
    constructor(target: Window, targetOrigin: string);
    sendMessage(message: any);
    onMessage(messageListener: MessageListener);
    removeMessageListener(messageListener: MessageListener);
}

/**
 * Provides information about function pairs of registering/deregistering callbacks.
 */
export interface CallbackRegistrationMetadata {
    /**
     * The name of the function which registers a callback.
     */
    on: string,
    /**
     * The name of the function which deregisters a callback.
     */
    off: string
}
export function createServer(messagingService: MessagingService, serverObject: any): any;

export function createClient(messagingService: MessagingService, callbackRegistrationMetadatas: CallbackRegistrationMetadata[] = []): Promise<any>;