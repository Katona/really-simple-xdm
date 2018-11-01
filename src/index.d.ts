// Type definitions for really-simple-xdm
// Project: really-simple-xdm
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
 * A messaging service implementation to be used for communicating with a frame embedded in a html page.
 */
export class CrossWindowMessagingService implements MessagingService {
    /**
     * Constructs a new instance.
     * @param target the target window to send messages to. Usually, this is the content window of the frame or the parent window.
     * @param targetOrigin the origin of the target to send messages to or receive from. Messages will be sent with the target origin
     * specified here and will only be delivered to message listener if they are from this origin.
     */
    constructor(target: Window, targetOrigin: string);
    /**
     * Sends the specified message.
     * @param message the message to be sent.
     */
    sendMessage(message: any);
    /**
     * Registers a listener for incoming messages. The listener will be called only if the received messages is sent from the target origin
     * specified at the constructore.
     * @param messageListener the listener to call when a message is received.
     */
    onMessage(messageListener: MessageListener);
    /**
     * Removes the specified message listener.
     */
    removeMessageListener(messageListener: MessageListener);
}

/**
 * Provides information about events, such as the functions used for registering/deregistering listeners, etc.
 */
export interface EventMetadata {
    /**
     * The name of the function which registers an event listener.
     */
    on: string,
    /**
     * The name of the function which deregisters an event listener.
     */
    off: string
}

/**
 * The configuration object of the server.
 */
export interface ServerConfig {
    /**
     * The list of events the server object provides.
     */
    events?: EventMetadata[]
    /**
     * The name of the server. Use it when you would like to expose multiple objects from one iframe so you can distinguish them. A server
     * object will accepts messages sent specifically to them. If the name is unspecified then all messages will be accepted.
     */
    name?: string
}

/**
 * Creates a server object.
 * @param messagingService the messaging service to use for the communication.
 * @param serverObject the server object to be exposed.
 * @param serverConfig the configuration object.
 */
export function createServer(messagingService: MessagingService, serverObject: any, serverConfig?: ServerConfig): any;

/**
 * Configuration of the client object.
 */
export interface ClientConfig {
    /**
     * The optional name of the server object to send messages to. Use it when there are multiple objects exposed from one iframe.
     */
    serverName?: string
}

/**
 * Creates a new client object.
 * @param messagingService the messaging service to use for the communication.
 * @param clientconfig the configuration object.
 */
export function createClient(messagingService: MessagingService, clientconfig?: ClientConfig): Promise<any>;