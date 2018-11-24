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
     * Registers a listener for incoming messages. Received messages will only be delivered to listeners when their origin matches the
     * target origin specified at the constructor.
     * @param messageListener the listener to call when a message is received.
     */
    onMessage(messageListener: MessageListener);
    /**
     * Removes the specified message listener.
     */
    removeMessageListener(messageListener: MessageListener);
    /**
     * Registers a listener for incoming invalid messages (like those who failed the target origin check etc.)
     * @param messageListener the listener to call when a message is received.
     */
    onInvalidMessage(messageListener: MessageListener);
    /**
     * Removes the specified invalid message listener.
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
     * The service object to be exposed.
     */
    serviceObject: any
    /**
     * The origin of the target window (parent frame), messages will be sent to the origin specified here.
     */
    targetOrigin: string
    /**
     * The list of events the server object provides.
     */
    events?: EventMetadata[]
    /**
     * The name of the server. Use it when you would like to expose multiple objects from one iframe so you can distinguish them. A server
     * will accept messages sent specifically to them. If the name is unspecified then all messages will be accepted.
     */
    name?: string,

    /**
     * This function is called to decide if an incoming message is valid or not. If unspecified then only the messages' origin will be
     * checked agains the target origin. Invalid messages will not be dispatched to the service object.
     */
    messageValidator?: (message) => boolean

}

/**
 * Creates a server object.
 * @param serverConfig the configuration object.
 */
export function createServer(serverConfig: ServerConfig): any;

/**
 * Configuration of the client object.
 */
export interface ClientConfig {
    /**
     * The origin of the target window (parent frame). Messages will be sent to and received only from the target origin.
     */
    targetOrigin: string
    /**
     * The target window to send to and receive messages from.
     */
    targetWindow: Window
    /**
     * The optional name of the server object to send messages to. Use it when there are multiple objects exposed from one iframe.
     */
    serverName?: string
}

/**
 * Creates a new client object.
 * @param clientconfig the configuration object.
 */
export function createClient(clientconfig: ClientConfig): Promise<any>;