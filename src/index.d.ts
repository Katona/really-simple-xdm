// Type definitions for xdm.js
// Project: xdm.js
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
 * Provides information about function pairs of registering/deregistering event listeners.
 */
export interface EventListenerRegistrationMetadata {
    /**
     * The name of the function which registers an event listener.
     */
    on: string,
    /**
     * The name of the function which deregisters an event listener.
     */
    off: string
}
export function createServer(messagingService: MessagingService, serverObject: any): any;

export interface ClientOptions {
    eventListenerRegistrationMetadata: EventListenerRegistrationMetadata[] = []
}
export function createClient(messagingService: MessagingService, options: ClientOptions): Promise<any>;