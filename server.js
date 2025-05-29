import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Server configuration
const PORT = process.env.PORT || 3001;
const MAX_PLAYERS = 50;
const WORLD_SIZE = 1000;
const CHUNK_SIZE = 16;

// Game state
const gameState = {
    players: new Map(),
    world: {
        chunks: new Map(),
        changedBlocks: new Map()
    },
    chatHistory: [],
    serverStartTime: Date.now()
};

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// API routes
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        players: gameState.players.size,
        maxPlayers: MAX_PLAYERS,
        uptime: Date.now() - gameState.serverStartTime,
        version: '1.0.0'
    });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Handle player joining
    socket.on('join_game', (data) => {
        const { playerName, version } = data;
        
        // Check if server is full
        if (gameState.players.size >= MAX_PLAYERS) {
            socket.emit('error', { message: 'Server is full' });
            return;
        }
        
        // Create player data
        const playerId = uuidv4();
        const player = {
            id: playerId,
            socketId: socket.id,
            name: playerName || `Player_${playerId.substring(0, 8)}`,
            position: { x: 0, y: 100, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            health: 100,
            inventory: {},
            joinTime: Date.now(),
            lastUpdate: Date.now()
        };
        
        // Store player
        gameState.players.set(playerId, player);
        socket.playerId = playerId;
        
        // Send server info to player
        socket.emit('server_info', {
            playerId: playerId,
            sessionId: socket.id,
            serverVersion: '1.0.0',
            maxPlayers: MAX_PLAYERS,
            currentPlayers: gameState.players.size,
            worldSize: WORLD_SIZE,
            chunkSize: CHUNK_SIZE
        });
        
        // Notify other players
        socket.broadcast.emit('player_joined', {
            playerId: playerId,
            playerName: player.name,
            position: player.position,
            rotation: player.rotation
        });
        
        // Send existing players to new player
        for (const [id, existingPlayer] of gameState.players) {
            if (id !== playerId) {
                socket.emit('player_joined', {
                    playerId: id,
                    playerName: existingPlayer.name,
                    position: existingPlayer.position,
                    rotation: existingPlayer.rotation
                });
            }
        }
        
        // Send recent chat history
        const recentChat = gameState.chatHistory.slice(-10);
        recentChat.forEach(message => {
            socket.emit('chat_message', message);
        });
        
        console.log(`Player joined: ${player.name} (${playerId})`);
    });
    
    // Handle player movement
    socket.on('player_move', (data) => {
        const playerId = socket.playerId;
        const player = gameState.players.get(playerId);
        
        if (!player) return;
        
        const { position, rotation, velocity, timestamp } = data;
        
        // Update player data
        player.position = position;
        player.rotation = rotation;
        player.velocity = velocity;
        player.lastUpdate = Date.now();
        
        // Broadcast to other players
        socket.broadcast.emit('player_moved', {
            playerId: playerId,
            position: position,
            rotation: rotation,
            velocity: velocity,
            timestamp: timestamp
        });
    });
    
    // Handle player actions
    socket.on('player_action', (data) => {
        const playerId = socket.playerId;
        const player = gameState.players.get(playerId);
        
        if (!player) return;
        
        const { action, actionData, timestamp } = data;
        
        // Broadcast action to other players
        socket.broadcast.emit('player_action', {
            playerId: playerId,
            action: action,
            actionData: actionData,
            timestamp: timestamp
        });
        
        console.log(`Player action: ${action} from ${player.name}`);
    });
    
    // Handle block changes
    socket.on('block_change', (data) => {
        const playerId = socket.playerId;
        const player = gameState.players.get(playerId);
        
        if (!player) return;
        
        const { position, blockType, timestamp } = data;
        
        // Store block change
        const blockKey = `${position.x},${position.y},${position.z}`;
        gameState.world.changedBlocks.set(blockKey, {
            position: position,
            blockType: blockType,
            playerId: playerId,
            timestamp: timestamp
        });
        
        // Broadcast to all players
        io.emit('block_changed', {
            position: position,
            blockType: blockType,
            playerId: playerId,
            timestamp: timestamp
        });
        
        console.log(`Block changed at (${position.x}, ${position.y}, ${position.z}) to ${blockType} by ${player.name}`);
    });
    
    // Handle chunk requests
    socket.on('request_chunk', (data) => {
        const { chunkX, chunkZ } = data;
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Check if chunk exists
        let chunkData = gameState.world.chunks.get(chunkKey);
        
        if (!chunkData) {
            // Generate basic chunk data (placeholder)
            chunkData = generateChunkData(chunkX, chunkZ);
            gameState.world.chunks.set(chunkKey, chunkData);
        }
        
        // Send chunk data to player
        socket.emit('chunk_data', {
            chunkX: chunkX,
            chunkZ: chunkZ,
            blockData: chunkData
        });
    });
    
    // Handle chat messages
    socket.on('chat_message', (data) => {
        const playerId = socket.playerId;
        const player = gameState.players.get(playerId);
        
        if (!player) return;
        
        const { message, timestamp } = data;
        
        // Create chat message
        const chatMessage = {
            playerId: playerId,
            playerName: player.name,
            message: message,
            timestamp: timestamp || Date.now()
        };
        
        // Store in chat history
        gameState.chatHistory.push(chatMessage);
        
        // Keep only last 100 messages
        if (gameState.chatHistory.length > 100) {
            gameState.chatHistory.shift();
        }
        
        // Broadcast to all players
        io.emit('chat_message', chatMessage);
        
        console.log(`Chat [${player.name}]: ${message}`);
    });
    
    // Handle ping
    socket.on('ping', (data) => {
        socket.emit('pong', data);
    });
    
    // Handle pong
    socket.on('pong', (data) => {
        // Update player ping if needed
        const playerId = socket.playerId;
        const player = gameState.players.get(playerId);
        
        if (player) {
            player.ping = Date.now() - data.timestamp;
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        const playerId = socket.playerId;
        const player = gameState.players.get(playerId);
        
        if (player) {
            console.log(`Player disconnected: ${player.name} (${reason})`);
            
            // Remove player
            gameState.players.delete(playerId);
            
            // Notify other players
            socket.broadcast.emit('player_left', {
                playerId: playerId,
                playerName: player.name,
                reason: reason
            });
        } else {
            console.log(`Client disconnected: ${socket.id} (${reason})`);
        }
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error from ${socket.id}:`, error);
    });
});

// Generate basic chunk data (placeholder)
function generateChunkData(chunkX, chunkZ) {
    const chunkData = {};
    const chunkSize = CHUNK_SIZE;
    
    // Generate simple terrain
    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = chunkX * chunkSize + x;
            const worldZ = chunkZ * chunkSize + z;
            
            // Simple height calculation
            const height = Math.floor(50 + Math.sin(worldX * 0.1) * 10 + Math.cos(worldZ * 0.1) * 10);
            
            // Generate blocks
            for (let y = 0; y <= height; y++) {
                const blockKey = `${x},${y},${z}`;
                
                if (y === height) {
                    chunkData[blockKey] = 'grass';
                } else if (y >= height - 3) {
                    chunkData[blockKey] = 'dirt';
                } else {
                    chunkData[blockKey] = 'stone';
                }
            }
        }
    }
    
    return chunkData;
}

// Cleanup inactive players
setInterval(() => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    
    for (const [playerId, player] of gameState.players) {
        if (now - player.lastUpdate > timeout) {
            console.log(`Removing inactive player: ${player.name}`);
            gameState.players.delete(playerId);
            
            // Notify other players
            io.emit('player_left', {
                playerId: playerId,
                playerName: player.name,
                reason: 'timeout'
            });
        }
    }
}, 10000); // Check every 10 seconds

// World update loop
setInterval(() => {
    // Send world updates if needed
    if (gameState.world.changedBlocks.size > 0) {
        const updates = Array.from(gameState.world.changedBlocks.values());
        
        // Clear old changes (older than 1 minute)
        const now = Date.now();
        for (const [key, change] of gameState.world.changedBlocks) {
            if (now - change.timestamp > 60000) {
                gameState.world.changedBlocks.delete(key);
            }
        }
    }
}, 5000); // Every 5 seconds

// Start server
server.listen(PORT, () => {
    console.log(`3D Pit Word server running on port ${PORT}`);
    console.log(`Game server started at ${new Date().toISOString()}`);
    console.log(`Max players: ${MAX_PLAYERS}`);
    console.log(`World size: ${WORLD_SIZE}x${WORLD_SIZE}`);
    console.log(`Chunk size: ${CHUNK_SIZE}x${CHUNK_SIZE}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    
    // Notify all players
    io.emit('server_shutdown', {
        message: 'Server is shutting down',
        timestamp: Date.now()
    });
    
    // Close server
    server.close(() => {
        console.log('Server shut down gracefully');
        process.exit(0);
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});