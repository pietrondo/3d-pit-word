import { io } from 'socket.io-client';
import { CONFIG } from '../config/config.js';

/**
 * NetworkManager handles all multiplayer networking functionality
 */
export class NetworkManager {
    constructor(game) {
        this.game = game;
        
        // Socket connection
        this.socket = null;
        this.isConnected = false;
        this.isConnecting = false;
        
        // Player data
        this.playerId = null;
        this.playerName = null;
        this.sessionId = null;
        
        // Connected players
        this.players = new Map();
        
        // Network state
        this.serverUrl = CONFIG.MULTIPLAYER.SERVER_URL;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.MULTIPLAYER.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = CONFIG.MULTIPLAYER.RECONNECT_DELAY;
        
        // Message queues
        this.outgoingQueue = [];
        this.incomingQueue = [];
        
        // Network statistics
        this.stats = {
            ping: 0,
            packetsReceived: 0,
            packetsSent: 0,
            bytesReceived: 0,
            bytesSent: 0,
            lastPingTime: 0
        };
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Ping interval
        this.pingInterval = null;
        
        console.log('NetworkManager initialized');
    }
    
    /**
     * Connect to multiplayer server
     */
    async connect(playerName, serverUrl = null) {
        if (this.isConnected || this.isConnecting) {
            console.warn('Already connected or connecting');
            return false;
        }
        
        this.isConnecting = true;
        this.playerName = playerName;
        
        if (serverUrl) {
            this.serverUrl = serverUrl;
        }
        
        try {
            console.log(`Connecting to server: ${this.serverUrl}`);
            
            // Create socket connection
            this.socket = io(this.serverUrl, {
                timeout: CONFIG.MULTIPLAYER.CONNECTION_TIMEOUT,
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true
            });
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Wait for connection
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, CONFIG.MULTIPLAYER.CONNECTION_TIMEOUT);
                
                this.socket.once('connect', () => {
                    clearTimeout(timeout);
                    this.onConnected();
                    resolve(true);
                });
                
                this.socket.once('connect_error', (error) => {
                    clearTimeout(timeout);
                    this.onConnectionError(error);
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.isConnecting = false;
            return false;
        }
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        if (!this.socket) return;
        
        console.log('Disconnecting from server');
        
        // Clear ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Disconnect socket
        this.socket.disconnect();
        this.socket = null;
        
        // Reset state
        this.isConnected = false;
        this.isConnecting = false;
        this.playerId = null;
        this.sessionId = null;
        this.players.clear();
        this.outgoingQueue.length = 0;
        this.incomingQueue.length = 0;
        
        // Notify game
        this.emit('disconnected');
    }
    
    /**
     * Setup socket event listeners
     */
    setupEventListeners() {
        if (!this.socket) return;
        
        // Connection events
        this.socket.on('connect', () => this.onConnected());
        this.socket.on('disconnect', (reason) => this.onDisconnected(reason));
        this.socket.on('connect_error', (error) => this.onConnectionError(error));
        this.socket.on('reconnect', () => this.onReconnected());
        this.socket.on('reconnect_error', (error) => this.onReconnectError(error));
        
        // Game events
        this.socket.on('player_joined', (data) => this.onPlayerJoined(data));
        this.socket.on('player_left', (data) => this.onPlayerLeft(data));
        this.socket.on('player_moved', (data) => this.onPlayerMoved(data));
        this.socket.on('player_action', (data) => this.onPlayerAction(data));
        
        // World events
        this.socket.on('block_changed', (data) => this.onBlockChanged(data));
        this.socket.on('chunk_data', (data) => this.onChunkData(data));
        this.socket.on('world_update', (data) => this.onWorldUpdate(data));
        
        // Chat events
        this.socket.on('chat_message', (data) => this.onChatMessage(data));
        
        // System events
        this.socket.on('server_info', (data) => this.onServerInfo(data));
        this.socket.on('ping', (data) => this.onPing(data));
        this.socket.on('pong', (data) => this.onPong(data));
        this.socket.on('error', (error) => this.onError(error));
    }
    
    /**
     * Handle successful connection
     */
    onConnected() {
        console.log('Connected to server');
        
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send join request
        this.send('join_game', {
            playerName: this.playerName,
            version: CONFIG.GAME.VERSION
        });
        
        // Start ping monitoring
        this.startPingMonitoring();
        
        // Process queued messages
        this.processOutgoingQueue();
        
        // Notify game
        this.emit('connected');
    }
    
    /**
     * Handle disconnection
     */
    onDisconnected(reason) {
        console.log('Disconnected from server:', reason);
        
        this.isConnected = false;
        
        // Clear ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Attempt reconnection if not intentional
        if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
        }
        
        // Notify game
        this.emit('disconnected', { reason });
    }
    
    /**
     * Handle connection error
     */
    onConnectionError(error) {
        console.error('Connection error:', error);
        
        this.isConnecting = false;
        
        // Notify game
        this.emit('connection_error', { error });
    }
    
    /**
     * Handle reconnection
     */
    onReconnected() {
        console.log('Reconnected to server');
        
        this.reconnectAttempts = 0;
        
        // Notify game
        this.emit('reconnected');
    }
    
    /**
     * Handle reconnection error
     */
    onReconnectError(error) {
        console.error('Reconnection error:', error);
        
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed');
        }
    }
    
    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        
        this.reconnectAttempts++;
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected && this.socket) {
                this.socket.connect();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }
    
    /**
     * Start ping monitoring
     */
    startPingMonitoring() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.stats.lastPingTime = Date.now();
                this.send('ping', { timestamp: this.stats.lastPingTime });
            }
        }, CONFIG.MULTIPLAYER.PING_INTERVAL);
    }
    
    /**
     * Send message to server
     */
    send(event, data = {}) {
        if (!this.socket || !this.isConnected) {
            // Queue message for later
            this.outgoingQueue.push({ event, data, timestamp: Date.now() });
            return false;
        }
        
        try {
            this.socket.emit(event, data);
            this.stats.packetsSent++;
            this.stats.bytesSent += JSON.stringify(data).length;
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }
    
    /**
     * Process outgoing message queue
     */
    processOutgoingQueue() {
        while (this.outgoingQueue.length > 0) {
            const message = this.outgoingQueue.shift();
            
            // Check if message is too old
            if (Date.now() - message.timestamp > CONFIG.MULTIPLAYER.MESSAGE_TIMEOUT) {
                continue;
            }
            
            this.send(message.event, message.data);
        }
    }
    
    /**
     * Handle player joined
     */
    onPlayerJoined(data) {
        const { playerId, playerName, position, rotation } = data;
        
        console.log(`Player joined: ${playerName} (${playerId})`);
        
        // Store player data
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            position: position,
            rotation: rotation,
            lastUpdate: Date.now()
        });
        
        // Notify game
        this.emit('player_joined', data);
    }
    
    /**
     * Handle player left
     */
    onPlayerLeft(data) {
        const { playerId, playerName } = data;
        
        console.log(`Player left: ${playerName} (${playerId})`);
        
        // Remove player data
        this.players.delete(playerId);
        
        // Notify game
        this.emit('player_left', data);
    }
    
    /**
     * Handle player movement
     */
    onPlayerMoved(data) {
        const { playerId, position, rotation, velocity } = data;
        
        // Update player data
        const player = this.players.get(playerId);
        if (player) {
            player.position = position;
            player.rotation = rotation;
            player.velocity = velocity;
            player.lastUpdate = Date.now();
        }
        
        // Notify game
        this.emit('player_moved', data);
    }
    
    /**
     * Handle player action
     */
    onPlayerAction(data) {
        const { playerId, action, actionData } = data;
        
        console.log(`Player action: ${action} from ${playerId}`);
        
        // Notify game
        this.emit('player_action', data);
    }
    
    /**
     * Handle block change
     */
    onBlockChanged(data) {
        const { position, blockType, playerId } = data;
        
        // Notify game
        this.emit('block_changed', data);
    }
    
    /**
     * Handle chunk data
     */
    onChunkData(data) {
        const { chunkX, chunkZ, blockData } = data;
        
        // Notify game
        this.emit('chunk_data', data);
    }
    
    /**
     * Handle world update
     */
    onWorldUpdate(data) {
        // Notify game
        this.emit('world_update', data);
    }
    
    /**
     * Handle chat message
     */
    onChatMessage(data) {
        const { playerId, playerName, message, timestamp } = data;
        
        console.log(`Chat [${playerName}]: ${message}`);
        
        // Notify game
        this.emit('chat_message', data);
    }
    
    /**
     * Handle server info
     */
    onServerInfo(data) {
        const { playerId, sessionId, serverVersion, maxPlayers, currentPlayers } = data;
        
        this.playerId = playerId;
        this.sessionId = sessionId;
        
        console.log(`Server info - ID: ${playerId}, Session: ${sessionId}`);
        console.log(`Server version: ${serverVersion}, Players: ${currentPlayers}/${maxPlayers}`);
        
        // Notify game
        this.emit('server_info', data);
    }
    
    /**
     * Handle ping request
     */
    onPing(data) {
        // Respond with pong
        this.send('pong', data);
    }
    
    /**
     * Handle pong response
     */
    onPong(data) {
        const { timestamp } = data;
        
        if (timestamp === this.stats.lastPingTime) {
            this.stats.ping = Date.now() - timestamp;
        }
    }
    
    /**
     * Handle error
     */
    onError(error) {
        console.error('Network error:', error);
        
        // Notify game
        this.emit('error', { error });
    }
    
    /**
     * Send player movement
     */
    sendPlayerMovement(position, rotation, velocity) {
        this.send('player_move', {
            position: position,
            rotation: rotation,
            velocity: velocity,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send player action
     */
    sendPlayerAction(action, actionData = {}) {
        this.send('player_action', {
            action: action,
            actionData: actionData,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send block change
     */
    sendBlockChange(position, blockType) {
        this.send('block_change', {
            position: position,
            blockType: blockType,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send chat message
     */
    sendChatMessage(message) {
        this.send('chat_message', {
            message: message,
            timestamp: Date.now()
        });
    }
    
    /**
     * Request chunk data
     */
    requestChunk(chunkX, chunkZ) {
        this.send('request_chunk', {
            chunkX: chunkX,
            chunkZ: chunkZ
        });
    }
    
    /**
     * Get player by ID
     */
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    
    /**
     * Get all players
     */
    getAllPlayers() {
        return Array.from(this.players.values());
    }
    
    /**
     * Get player count
     */
    getPlayerCount() {
        return this.players.size;
    }
    
    /**
     * Check if connected
     */
    isConnectedToServer() {
        return this.isConnected;
    }
    
    /**
     * Get connection status
     */
    getConnectionStatus() {
        if (this.isConnected) return 'connected';
        if (this.isConnecting) return 'connecting';
        return 'disconnected';
    }
    
    /**
     * Get network statistics
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            playerId: this.playerId,
            playerCount: this.players.size,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.outgoingQueue.length
        };
    }
    
    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * Remove event listener
     */
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event
     */
    emit(event, data = {}) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Update network manager
     */
    update(deltaTime) {
        // Process incoming messages
        this.processIncomingQueue();
        
        // Update network statistics
        this.updateStats(deltaTime);
        
        // Clean up old player data
        this.cleanupPlayers();
    }
    
    /**
     * Process incoming message queue
     */
    processIncomingQueue() {
        while (this.incomingQueue.length > 0) {
            const message = this.incomingQueue.shift();
            // Process message
        }
    }
    
    /**
     * Update network statistics
     */
    updateStats(deltaTime) {
        // Update statistics here if needed
    }
    
    /**
     * Clean up old player data
     */
    cleanupPlayers() {
        const now = Date.now();
        const timeout = CONFIG.MULTIPLAYER.PLAYER_TIMEOUT;
        
        for (const [playerId, player] of this.players) {
            if (now - player.lastUpdate > timeout) {
                console.log(`Removing inactive player: ${player.name}`);
                this.players.delete(playerId);
                this.emit('player_timeout', { playerId, player });
            }
        }
    }
    
    /**
     * Dispose of network manager
     */
    dispose() {
        // Disconnect from server
        this.disconnect();
        
        // Clear event handlers
        this.eventHandlers.clear();
        
        // Clear queues
        this.outgoingQueue.length = 0;
        this.incomingQueue.length = 0;
        
        console.log('NetworkManager disposed');
    }
}