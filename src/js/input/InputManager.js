/**
 * InputManager handles all input events and provides a centralized input system
 */
export class InputManager {
    constructor() {
        // Key states
        this.keys = new Map();
        this.keysPressed = new Map(); // For single-press detection
        this.keysReleased = new Map(); // For single-release detection
        
        // Mouse states
        this.mouseButtons = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseWheel = 0;
        
        // Touch states (for mobile support)
        this.touches = new Map();
        
        // Gamepad states
        this.gamepads = new Map();
        
        // Input bindings
        this.bindings = new Map();
        this.setupDefaultBindings();
        
        // Event listeners
        this.boundHandlers = {
            keydown: this.onKeyDown.bind(this),
            keyup: this.onKeyUp.bind(this),
            mousedown: this.onMouseDown.bind(this),
            mouseup: this.onMouseUp.bind(this),
            mousemove: this.onMouseMove.bind(this),
            wheel: this.onWheel.bind(this),
            contextmenu: this.onContextMenu.bind(this),
            touchstart: this.onTouchStart.bind(this),
            touchend: this.onTouchEnd.bind(this),
            touchmove: this.onTouchMove.bind(this),
            gamepadconnected: this.onGamepadConnected.bind(this),
            gamepaddisconnected: this.onGamepadDisconnected.bind(this)
        };
        
        this.setupEventListeners();
        
        // Update loop for gamepad polling
        this.gamepadUpdateInterval = setInterval(() => {
            this.updateGamepads();
        }, 16); // ~60fps
        
        console.log('InputManager initialized');
    }
    
    /**
     * Setup default key bindings
     */
    setupDefaultBindings() {
        // Movement
        this.bind('move_forward', ['KeyW', 'ArrowUp']);
        this.bind('move_backward', ['KeyS', 'ArrowDown']);
        this.bind('move_left', ['KeyA', 'ArrowLeft']);
        this.bind('move_right', ['KeyD', 'ArrowRight']);
        this.bind('jump', ['Space']);
        this.bind('crouch', ['ShiftLeft', 'ShiftRight']);
        this.bind('run', ['ControlLeft', 'ControlRight']);
        
        // Actions
        this.bind('break_block', ['Mouse0']); // Left click
        this.bind('place_block', ['Mouse2']); // Right click
        this.bind('pick_block', ['Mouse1']); // Middle click
        
        // UI
        this.bind('inventory', ['KeyE']);
        this.bind('chat', ['KeyT']);
        this.bind('menu', ['Escape']);
        this.bind('debug', ['F3']);
        this.bind('fullscreen', ['F11']);
        
        // Hotbar
        for (let i = 1; i <= 9; i++) {
            this.bind(`hotbar_${i}`, [`Digit${i}`]);
        }
        
        // Special
        this.bind('fly', ['KeyF']);
        this.bind('screenshot', ['F2']);
    }
    
    /**
     * Bind an action to one or more inputs
     */
    bind(action, inputs) {
        if (!this.bindings.has(action)) {
            this.bindings.set(action, new Set());
        }
        
        const actionBindings = this.bindings.get(action);
        inputs.forEach(input => {
            actionBindings.add(input);
        });
    }
    
    /**
     * Unbind an action from specific inputs or all inputs
     */
    unbind(action, inputs = null) {
        if (!this.bindings.has(action)) return;
        
        const actionBindings = this.bindings.get(action);
        
        if (inputs === null) {
            // Remove all bindings for this action
            actionBindings.clear();
        } else {
            // Remove specific bindings
            inputs.forEach(input => {
                actionBindings.delete(input);
            });
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.boundHandlers.keydown);
        document.addEventListener('keyup', this.boundHandlers.keyup);
        
        // Mouse events
        document.addEventListener('mousedown', this.boundHandlers.mousedown);
        document.addEventListener('mouseup', this.boundHandlers.mouseup);
        document.addEventListener('mousemove', this.boundHandlers.mousemove);
        document.addEventListener('wheel', this.boundHandlers.wheel);
        document.addEventListener('contextmenu', this.boundHandlers.contextmenu);
        
        // Touch events
        document.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
        document.addEventListener('touchend', this.boundHandlers.touchend, { passive: false });
        document.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
        
        // Gamepad events
        window.addEventListener('gamepadconnected', this.boundHandlers.gamepadconnected);
        window.addEventListener('gamepaddisconnected', this.boundHandlers.gamepaddisconnected);
    }
    
    /**
     * Remove event listeners
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        document.removeEventListener('keyup', this.boundHandlers.keyup);
        document.removeEventListener('mousedown', this.boundHandlers.mousedown);
        document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        document.removeEventListener('mousemove', this.boundHandlers.mousemove);
        document.removeEventListener('wheel', this.boundHandlers.wheel);
        document.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
        document.removeEventListener('touchstart', this.boundHandlers.touchstart);
        document.removeEventListener('touchend', this.boundHandlers.touchend);
        document.removeEventListener('touchmove', this.boundHandlers.touchmove);
        window.removeEventListener('gamepadconnected', this.boundHandlers.gamepadconnected);
        window.removeEventListener('gamepaddisconnected', this.boundHandlers.gamepaddisconnected);
    }
    
    /**
     * Keyboard event handlers
     */
    onKeyDown(event) {
        const key = event.code;
        
        if (!this.keys.get(key)) {
            this.keysPressed.set(key, true);
        }
        
        this.keys.set(key, true);
        
        // Prevent default for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
    }
    
    onKeyUp(event) {
        const key = event.code;
        
        this.keys.set(key, false);
        this.keysReleased.set(key, true);
        
        // Prevent default for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
    }
    
    /**
     * Mouse event handlers
     */
    onMouseDown(event) {
        const button = `Mouse${event.button}`;
        this.mouseButtons.set(button, true);
        
        // Prevent context menu on right click
        if (event.button === 2) {
            event.preventDefault();
        }
    }
    
    onMouseUp(event) {
        const button = `Mouse${event.button}`;
        this.mouseButtons.set(button, false);
        
        event.preventDefault();
    }
    
    onMouseMove(event) {
        this.mouseDelta.x = event.movementX || 0;
        this.mouseDelta.y = event.movementY || 0;
        
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
    }
    
    onWheel(event) {
        this.mouseWheel = event.deltaY;
        event.preventDefault();
    }
    
    onContextMenu(event) {
        event.preventDefault();
    }
    
    /**
     * Touch event handlers
     */
    onTouchStart(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            });
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.touches.delete(touch.identifier);
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.touches.get(touch.identifier);
            
            if (touchData) {
                touchData.x = touch.clientX;
                touchData.y = touch.clientY;
            }
        }
    }
    
    /**
     * Gamepad event handlers
     */
    onGamepadConnected(event) {
        console.log('Gamepad connected:', event.gamepad.id);
        this.gamepads.set(event.gamepad.index, {
            id: event.gamepad.id,
            buttons: new Array(event.gamepad.buttons.length).fill(false),
            axes: new Array(event.gamepad.axes.length).fill(0)
        });
    }
    
    onGamepadDisconnected(event) {
        console.log('Gamepad disconnected:', event.gamepad.id);
        this.gamepads.delete(event.gamepad.index);
    }
    
    /**
     * Update gamepad states
     */
    updateGamepads() {
        const gamepads = navigator.getGamepads();
        
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) continue;
            
            const gamepadData = this.gamepads.get(i);
            if (!gamepadData) continue;
            
            // Update button states
            for (let j = 0; j < gamepad.buttons.length; j++) {
                gamepadData.buttons[j] = gamepad.buttons[j].pressed;
            }
            
            // Update axis states
            for (let j = 0; j < gamepad.axes.length; j++) {
                gamepadData.axes[j] = gamepad.axes[j];
            }
        }
    }
    
    /**
     * Check if an action is currently active
     */
    isActionActive(action) {
        const bindings = this.bindings.get(action);
        if (!bindings) return false;
        
        for (const input of bindings) {
            if (this.isInputActive(input)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if an action was just pressed
     */
    isActionPressed(action) {
        const bindings = this.bindings.get(action);
        if (!bindings) return false;
        
        for (const input of bindings) {
            if (this.isInputPressed(input)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if an action was just released
     */
    isActionReleased(action) {
        const bindings = this.bindings.get(action);
        if (!bindings) return false;
        
        for (const input of bindings) {
            if (this.isInputReleased(input)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a specific input is active
     */
    isInputActive(input) {
        if (input.startsWith('Mouse')) {
            return this.mouseButtons.get(input) || false;
        } else if (input.startsWith('Gamepad')) {
            // Parse gamepad input (e.g., "Gamepad0Button0")
            const match = input.match(/Gamepad(\d+)Button(\d+)/);
            if (match) {
                const gamepadIndex = parseInt(match[1]);
                const buttonIndex = parseInt(match[2]);
                const gamepadData = this.gamepads.get(gamepadIndex);
                return gamepadData ? gamepadData.buttons[buttonIndex] : false;
            }
        } else {
            return this.keys.get(input) || false;
        }
        
        return false;
    }
    
    /**
     * Check if a specific input was just pressed
     */
    isInputPressed(input) {
        if (input.startsWith('Mouse')) {
            // Mouse press detection would need additional logic
            return false;
        } else {
            return this.keysPressed.get(input) || false;
        }
    }
    
    /**
     * Check if a specific input was just released
     */
    isInputReleased(input) {
        if (input.startsWith('Mouse')) {
            // Mouse release detection would need additional logic
            return false;
        } else {
            return this.keysReleased.get(input) || false;
        }
    }
    
    /**
     * Get mouse delta movement
     */
    getMouseDelta() {
        return { ...this.mouseDelta };
    }
    
    /**
     * Get mouse wheel delta
     */
    getMouseWheel() {
        return this.mouseWheel;
    }
    
    /**
     * Get gamepad axis value
     */
    getGamepadAxis(gamepadIndex, axisIndex) {
        const gamepadData = this.gamepads.get(gamepadIndex);
        return gamepadData ? gamepadData.axes[axisIndex] : 0;
    }
    
    /**
     * Get touch data
     */
    getTouches() {
        return new Map(this.touches);
    }
    
    /**
     * Check if a key is a game key (should prevent default)
     */
    isGameKey(key) {
        const gameKeys = [
            'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'Space', 'ShiftLeft', 'ShiftRight',
            'ControlLeft', 'ControlRight',
            'KeyE', 'KeyT', 'KeyF',
            'F2', 'F3', 'F11',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
        ];
        
        // Add digit keys
        for (let i = 1; i <= 9; i++) {
            gameKeys.push(`Digit${i}`);
        }
        
        return gameKeys.includes(key);
    }
    
    /**
     * Update input manager (call once per frame)
     */
    update() {
        // Clear single-frame input states
        this.keysPressed.clear();
        this.keysReleased.clear();
        
        // Reset mouse delta and wheel
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        this.mouseWheel = 0;
    }
    
    /**
     * Get all current bindings
     */
    getBindings() {
        const result = {};
        for (const [action, inputs] of this.bindings) {
            result[action] = Array.from(inputs);
        }
        return result;
    }
    
    /**
     * Load bindings from configuration
     */
    loadBindings(bindings) {
        this.bindings.clear();
        
        for (const [action, inputs] of Object.entries(bindings)) {
            this.bind(action, inputs);
        }
    }
    
    /**
     * Save current bindings to localStorage
     */
    saveBindings() {
        const bindings = this.getBindings();
        localStorage.setItem('inputBindings', JSON.stringify(bindings));
    }
    
    /**
     * Load bindings from localStorage
     */
    loadBindingsFromStorage() {
        const saved = localStorage.getItem('inputBindings');
        if (saved) {
            try {
                const bindings = JSON.parse(saved);
                this.loadBindings(bindings);
                console.log('Input bindings loaded from storage');
            } catch (error) {
                console.error('Failed to load input bindings:', error);
            }
        }
    }
    
    /**
     * Get input statistics
     */
    getStats() {
        return {
            activeKeys: Array.from(this.keys.entries()).filter(([key, active]) => active).map(([key]) => key),
            activeMouseButtons: Array.from(this.mouseButtons.entries()).filter(([button, active]) => active).map(([button]) => button),
            mousePosition: { ...this.mousePosition },
            touchCount: this.touches.size,
            gamepadCount: this.gamepads.size,
            bindingCount: this.bindings.size
        };
    }
    
    /**
     * Dispose of input manager
     */
    dispose() {
        this.removeEventListeners();
        
        if (this.gamepadUpdateInterval) {
            clearInterval(this.gamepadUpdateInterval);
        }
        
        this.keys.clear();
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouseButtons.clear();
        this.touches.clear();
        this.gamepads.clear();
        this.bindings.clear();
        
        console.log('InputManager disposed');
    }
}