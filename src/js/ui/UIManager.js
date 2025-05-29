import { CONFIG } from '../config/config.js';

/**
 * UIManager handles all user interface elements and interactions
 */
export class UIManager {
    constructor(game) {
        this.game = game;
        
        // UI elements
        this.elements = {
            loadingScreen: null,
            gameContainer: null,
            gameUI: null,
            crosshair: null,
            hud: null,
            hotbar: null,
            debugPanel: null,
            mainMenu: null,
            settingsMenu: null,
            errorDisplay: null,
            fpsCounter: null,
            coordinates: null,
            inventoryPanel: null,
            chatPanel: null
        };
        
        // UI state
        this.isMenuOpen = false;
        this.isInventoryOpen = false;
        this.isChatOpen = false;
        this.isDebugOpen = false;
        
        // Performance tracking
        this.fpsHistory = [];
        this.lastFpsUpdate = 0;
        
        // Initialize UI
        this.initializeElements();
        this.setupEventListeners();
        
        console.log('UIManager initialized');
    }
    
    /**
     * Initialize UI elements
     */
    initializeElements() {
        // Get main elements
        this.elements.loadingScreen = document.getElementById('loading-screen');
        this.elements.gameContainer = document.getElementById('game-container');
        this.elements.gameUI = document.getElementById('game-ui');
        this.elements.mainMenu = document.getElementById('main-menu');
        this.elements.settingsMenu = document.getElementById('settings-menu');
        this.elements.errorDisplay = document.getElementById('error-display');
        
        // Get game UI elements
        this.elements.crosshair = document.getElementById('crosshair');
        this.elements.hud = document.getElementById('hud');
        this.elements.hotbar = document.getElementById('hotbar');
        this.elements.debugPanel = document.getElementById('debug-panel');
        this.elements.fpsCounter = document.getElementById('fps-counter');
        this.elements.coordinates = document.getElementById('coordinates');
        
        // Initialize hotbar
        this.initializeHotbar();
        
        // Initialize debug panel
        this.initializeDebugPanel();
        
        // Create additional UI elements
        this.createInventoryPanel();
        this.createChatPanel();
    }
    
    /**
     * Initialize hotbar with block types
     */
    initializeHotbar() {
        if (!this.elements.hotbar) return;
        
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        this.elements.hotbar.innerHTML = '';
        
        blockTypes.slice(0, 9).forEach((blockType, index) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.blockType = blockType;
            slot.dataset.slot = index;
            
            // Add block icon/texture
            const icon = document.createElement('div');
            icon.className = 'block-icon';
            icon.style.backgroundImage = `url(${CONFIG.PATHS.TEXTURES}/blocks/${blockType}.svg)`;
            
            // Add slot number
            const number = document.createElement('span');
            number.className = 'slot-number';
            number.textContent = index + 1;
            
            // Add item count
            const count = document.createElement('span');
            count.className = 'item-count';
            count.textContent = '64';
            
            slot.appendChild(icon);
            slot.appendChild(number);
            slot.appendChild(count);
            
            this.elements.hotbar.appendChild(slot);
        });
        
        // Select first slot by default
        this.selectHotbarSlot(0);
    }
    
    /**
     * Initialize debug panel
     */
    initializeDebugPanel() {
        if (!this.elements.debugPanel) return;
        
        this.elements.debugPanel.innerHTML = `
            <div class="debug-section">
                <h3>Performance</h3>
                <div id="debug-fps">FPS: 0</div>
                <div id="debug-frame-time">Frame Time: 0ms</div>
                <div id="debug-memory">Memory: 0MB</div>
            </div>
            <div class="debug-section">
                <h3>Player</h3>
                <div id="debug-position">Position: 0, 0, 0</div>
                <div id="debug-velocity">Velocity: 0, 0, 0</div>
                <div id="debug-rotation">Rotation: 0°, 0°</div>
                <div id="debug-chunk">Chunk: 0, 0</div>
            </div>
            <div class="debug-section">
                <h3>World</h3>
                <div id="debug-chunks-loaded">Chunks Loaded: 0</div>
                <div id="debug-blocks-rendered">Blocks Rendered: 0</div>
                <div id="debug-draw-calls">Draw Calls: 0</div>
            </div>
            <div class="debug-section">
                <h3>System</h3>
                <div id="debug-browser">Browser: Unknown</div>
                <div id="debug-webgl">WebGL: Unknown</div>
                <div id="debug-device">Device: Unknown</div>
            </div>
        `;
        
        // Initially hide debug panel
        this.elements.debugPanel.style.display = 'none';
    }
    
    /**
     * Create inventory panel
     */
    createInventoryPanel() {
        const inventoryPanel = document.createElement('div');
        inventoryPanel.id = 'inventory-panel';
        inventoryPanel.className = 'menu-panel';
        inventoryPanel.style.display = 'none';
        
        inventoryPanel.innerHTML = `
            <div class="inventory-header">
                <h2>Inventory</h2>
                <button class="close-btn" id="close-inventory">&times;</button>
            </div>
            <div class="inventory-grid" id="inventory-grid">
                <!-- Inventory slots will be generated here -->
            </div>
            <div class="inventory-stats">
                <div>Total Items: <span id="total-items">0</span></div>
                <div>Unique Types: <span id="unique-types">0</span></div>
            </div>
        `;
        
        document.body.appendChild(inventoryPanel);
        this.elements.inventoryPanel = inventoryPanel;
        
        // Initialize inventory grid
        this.initializeInventoryGrid();
    }
    
    /**
     * Create chat panel
     */
    createChatPanel() {
        const chatPanel = document.createElement('div');
        chatPanel.id = 'chat-panel';
        chatPanel.className = 'chat-panel';
        
        chatPanel.innerHTML = `
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-container" id="chat-input-container" style="display: none;">
                <input type="text" id="chat-input" placeholder="Type a message..." maxlength="256">
                <button id="chat-send">Send</button>
            </div>
        `;
        
        this.elements.gameUI.appendChild(chatPanel);
        this.elements.chatPanel = chatPanel;
    }
    
    /**
     * Initialize inventory grid
     */
    initializeInventoryGrid() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        grid.innerHTML = '';
        
        blockTypes.forEach(blockType => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.blockType = blockType;
            
            const icon = document.createElement('div');
            icon.className = 'block-icon';
            icon.style.backgroundImage = `url(${CONFIG.PATHS.TEXTURES}/blocks/${blockType}.svg)`;
            
            const label = document.createElement('div');
            label.className = 'block-label';
            label.textContent = blockType.charAt(0).toUpperCase() + blockType.slice(1);
            
            const count = document.createElement('div');
            count.className = 'block-count';
            count.textContent = '0';
            
            slot.appendChild(icon);
            slot.appendChild(label);
            slot.appendChild(count);
            
            grid.appendChild(slot);
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Main menu buttons
        const startButton = document.getElementById('start-game');
        const settingsButton = document.getElementById('settings-btn');
        const exitButton = document.getElementById('exit-game');
        
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }
        
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.openSettings());
        }
        
        if (exitButton) {
            exitButton.addEventListener('click', () => this.exitGame());
        }
        
        // Settings menu
        const backButton = document.getElementById('back-to-menu');
        if (backButton) {
            backButton.addEventListener('click', () => this.closeSettings());
        }
        
        // Inventory
        const closeInventory = document.getElementById('close-inventory');
        if (closeInventory) {
            closeInventory.addEventListener('click', () => this.closeInventory());
        }
        
        // Chat
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');
        
        if (chatInput) {
            chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    this.sendChatMessage();
                } else if (event.key === 'Escape') {
                    this.closeChat();
                }
            });
        }
        
        if (chatSend) {
            chatSend.addEventListener('click', () => this.sendChatMessage());
        }
        
        // Hotbar clicks
        if (this.elements.hotbar) {
            this.elements.hotbar.addEventListener('click', (event) => {
                const slot = event.target.closest('.hotbar-slot');
                if (slot) {
                    const slotIndex = parseInt(slot.dataset.slot);
                    this.selectHotbarSlot(slotIndex);
                }
            });
        }
        
        // Error display close
        const errorClose = document.querySelector('#error-display .close-btn');
        if (errorClose) {
            errorClose.addEventListener('click', () => this.hideError());
        }
    }
    
    /**
     * Show loading screen
     */
    showLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
    }
    
    /**
     * Update loading progress
     */
    updateLoadingProgress(progress, message = '') {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const loadingMessage = document.getElementById('loading-message');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
        
        if (loadingMessage && message) {
            loadingMessage.textContent = message;
        }
    }
    
    /**
     * Start game
     */
    startGame() {
        this.hideMainMenu();
        this.showGameUI();
        
        if (this.game) {
            this.game.start();
        }
    }
    
    /**
     * Show main menu
     */
    showMainMenu() {
        if (this.elements.mainMenu) {
            this.elements.mainMenu.style.display = 'flex';
        }
        this.isMenuOpen = true;
    }
    
    /**
     * Hide main menu
     */
    hideMainMenu() {
        if (this.elements.mainMenu) {
            this.elements.mainMenu.style.display = 'none';
        }
        this.isMenuOpen = false;
    }
    
    /**
     * Show game UI
     */
    showGameUI() {
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'block';
        }
    }
    
    /**
     * Hide game UI
     */
    hideGameUI() {
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'none';
        }
    }
    
    /**
     * Open settings menu
     */
    openSettings() {
        if (this.elements.settingsMenu) {
            this.elements.settingsMenu.style.display = 'flex';
        }
    }
    
    /**
     * Close settings menu
     */
    closeSettings() {
        if (this.elements.settingsMenu) {
            this.elements.settingsMenu.style.display = 'none';
        }
    }
    
    /**
     * Toggle inventory
     */
    toggleInventory() {
        if (this.isInventoryOpen) {
            this.closeInventory();
        } else {
            this.openInventory();
        }
    }
    
    /**
     * Open inventory
     */
    openInventory() {
        if (this.elements.inventoryPanel) {
            this.elements.inventoryPanel.style.display = 'flex';
            this.isInventoryOpen = true;
            this.updateInventoryDisplay();
        }
    }
    
    /**
     * Close inventory
     */
    closeInventory() {
        if (this.elements.inventoryPanel) {
            this.elements.inventoryPanel.style.display = 'none';
            this.isInventoryOpen = false;
        }
    }
    
    /**
     * Toggle chat
     */
    toggleChat() {
        if (this.isChatOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    /**
     * Open chat
     */
    openChat() {
        const chatInputContainer = document.getElementById('chat-input-container');
        const chatInput = document.getElementById('chat-input');
        
        if (chatInputContainer && chatInput) {
            chatInputContainer.style.display = 'flex';
            chatInput.focus();
            this.isChatOpen = true;
        }
    }
    
    /**
     * Close chat
     */
    closeChat() {
        const chatInputContainer = document.getElementById('chat-input-container');
        const chatInput = document.getElementById('chat-input');
        
        if (chatInputContainer && chatInput) {
            chatInputContainer.style.display = 'none';
            chatInput.blur();
            this.isChatOpen = false;
        }
    }
    
    /**
     * Send chat message
     */
    sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (message) {
            this.addChatMessage('Player', message);
            chatInput.value = '';
        }
        
        this.closeChat();
    }
    
    /**
     * Add chat message
     */
    addChatMessage(sender, message, type = 'normal') {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message chat-${type}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `
            <span class="chat-time">[${timestamp}]</span>
            <span class="chat-sender">${sender}:</span>
            <span class="chat-text">${message}</span>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Remove old messages if too many
        const messages = chatMessages.children;
        if (messages.length > 100) {
            chatMessages.removeChild(messages[0]);
        }
    }
    
    /**
     * Toggle debug panel
     */
    toggleDebug() {
        if (this.elements.debugPanel) {
            const isVisible = this.elements.debugPanel.style.display !== 'none';
            this.elements.debugPanel.style.display = isVisible ? 'none' : 'block';
            this.isDebugOpen = !isVisible;
        }
    }
    
    /**
     * Select hotbar slot
     */
    selectHotbarSlot(index) {
        const slots = this.elements.hotbar?.querySelectorAll('.hotbar-slot');
        if (!slots) return;
        
        slots.forEach((slot, i) => {
            slot.classList.toggle('selected', i === index);
        });
    }
    
    /**
     * Update hotbar display
     */
    updateHotbar(inventory) {
        const slots = this.elements.hotbar?.querySelectorAll('.hotbar-slot');
        if (!slots) return;
        
        slots.forEach(slot => {
            const blockType = slot.dataset.blockType;
            const count = inventory.get(blockType) || 0;
            const countElement = slot.querySelector('.item-count');
            
            if (countElement) {
                countElement.textContent = count;
                countElement.style.display = count > 0 ? 'block' : 'none';
            }
        });
    }
    
    /**
     * Update inventory display
     */
    updateInventoryDisplay() {
        if (!this.game?.player) return;
        
        const inventory = this.game.player.getInventory();
        const slots = document.querySelectorAll('#inventory-grid .inventory-slot');
        
        let totalItems = 0;
        let uniqueTypes = 0;
        
        slots.forEach(slot => {
            const blockType = slot.dataset.blockType;
            const count = inventory.get(blockType) || 0;
            const countElement = slot.querySelector('.block-count');
            
            if (countElement) {
                countElement.textContent = count;
            }
            
            if (count > 0) {
                totalItems += count;
                uniqueTypes++;
                slot.classList.add('has-items');
            } else {
                slot.classList.remove('has-items');
            }
        });
        
        // Update stats
        const totalItemsElement = document.getElementById('total-items');
        const uniqueTypesElement = document.getElementById('unique-types');
        
        if (totalItemsElement) totalItemsElement.textContent = totalItems;
        if (uniqueTypesElement) uniqueTypesElement.textContent = uniqueTypes;
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(fps) {
        if (this.elements.fpsCounter) {
            this.elements.fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
        }
        
        // Update debug panel
        const debugFps = document.getElementById('debug-fps');
        if (debugFps) {
            debugFps.textContent = `FPS: ${Math.round(fps)}`;
        }
    }
    
    /**
     * Update coordinates display
     */
    updateCoordinates(x, y, z) {
        if (this.elements.coordinates) {
            this.elements.coordinates.textContent = `X: ${Math.round(x)} Y: ${Math.round(y)} Z: ${Math.round(z)}`;
        }
    }
    
    /**
     * Update debug information
     */
    updateDebugInfo(debugData) {
        if (!this.isDebugOpen) return;
        
        // Performance
        const debugFrameTime = document.getElementById('debug-frame-time');
        const debugMemory = document.getElementById('debug-memory');
        
        if (debugFrameTime && debugData.frameTime) {
            debugFrameTime.textContent = `Frame Time: ${debugData.frameTime.toFixed(2)}ms`;
        }
        
        if (debugMemory && performance.memory) {
            const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            debugMemory.textContent = `Memory: ${memoryMB}MB`;
        }
        
        // Player
        if (debugData.player) {
            const debugPosition = document.getElementById('debug-position');
            const debugVelocity = document.getElementById('debug-velocity');
            const debugRotation = document.getElementById('debug-rotation');
            const debugChunk = document.getElementById('debug-chunk');
            
            if (debugPosition) {
                const pos = debugData.player.position;
                debugPosition.textContent = `Position: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
            }
            
            if (debugVelocity) {
                const vel = debugData.player.velocity;
                debugVelocity.textContent = `Velocity: ${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)}`;
            }
            
            if (debugRotation) {
                const rot = debugData.player.rotation;
                debugRotation.textContent = `Rotation: ${rot.x}°, ${rot.y}°`;
            }
            
            if (debugChunk) {
                const chunkX = Math.floor(debugData.player.position.x / 16);
                const chunkZ = Math.floor(debugData.player.position.z / 16);
                debugChunk.textContent = `Chunk: ${chunkX}, ${chunkZ}`;
            }
        }
        
        // World
        if (debugData.world) {
            const debugChunksLoaded = document.getElementById('debug-chunks-loaded');
            const debugBlocksRendered = document.getElementById('debug-blocks-rendered');
            const debugDrawCalls = document.getElementById('debug-draw-calls');
            
            if (debugChunksLoaded) {
                debugChunksLoaded.textContent = `Chunks Loaded: ${debugData.world.chunksLoaded || 0}`;
            }
            
            if (debugBlocksRendered) {
                debugBlocksRendered.textContent = `Blocks Rendered: ${debugData.world.blocksRendered || 0}`;
            }
            
            if (debugDrawCalls) {
                debugDrawCalls.textContent = `Draw Calls: ${debugData.world.drawCalls || 0}`;
            }
        }
    }
    
    /**
     * Show error message
     */
    showError(message, details = '') {
        if (!this.elements.errorDisplay) return;
        
        const errorMessage = this.elements.errorDisplay.querySelector('.error-message');
        const errorDetails = this.elements.errorDisplay.querySelector('.error-details');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (errorDetails) {
            errorDetails.textContent = details;
            errorDetails.style.display = details ? 'block' : 'none';
        }
        
        this.elements.errorDisplay.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideError();
        }, 10000);
    }
    
    /**
     * Hide error message
     */
    hideError() {
        if (this.elements.errorDisplay) {
            this.elements.errorDisplay.style.display = 'none';
        }
    }
    
    /**
     * Exit game
     */
    exitGame() {
        if (confirm('Are you sure you want to exit the game?')) {
            window.close();
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update UI elements that depend on window size
        // This will be called by the game when window resizes
    }
    
    /**
     * Update UI (called every frame)
     */
    update(deltaTime) {
        // Update any animated UI elements
        // Update performance counters
        // Handle UI state changes
    }
    
    /**
     * Get UI state
     */
    getState() {
        return {
            isMenuOpen: this.isMenuOpen,
            isInventoryOpen: this.isInventoryOpen,
            isChatOpen: this.isChatOpen,
            isDebugOpen: this.isDebugOpen
        };
    }
    
    /**
     * Dispose of UI manager
     */
    dispose() {
        // Remove event listeners
        // Clean up UI elements
        // Clear intervals/timeouts
        
        console.log('UIManager disposed');
    }
}