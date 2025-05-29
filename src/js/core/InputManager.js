/**
 * 3D Pit Word - Input Manager
 * 
 * Gestisce tutti gli input dell'utente: tastiera, mouse, touch.
 * Fornisce un'interfaccia unificata per i controlli del gioco.
 */

import { CONFIG } from '../config/config.js';

export class InputManager {
    /**
     * Costruttore dell'InputManager
     * @param {Game} game - Riferimento al gioco principale
     */
    constructor(game) {
        this.game = game;
        
        // Stato dei tasti
        this.keys = new Map();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        
        // Stato del mouse
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            buttons: new Map(),
            wheel: 0,
            isLocked: false
        };
        
        // Stato del touch (per dispositivi mobili)
        this.touch = {
            touches: new Map(),
            isActive: false
        };
        
        // Configurazione controlli
        this.keyBindings = new Map([
            ['KeyW', 'forward'],
            ['KeyS', 'backward'],
            ['KeyA', 'left'],
            ['KeyD', 'right'],
            ['Space', 'jump'],
            ['ShiftLeft', 'crouch'],
            ['ControlLeft', 'run'],
            ['KeyE', 'interact'],
            ['KeyQ', 'drop'],
            ['KeyF', 'fly'],
            ['KeyT', 'chat'],
            ['Escape', 'menu'],
            ['Tab', 'inventory'],
            ['KeyF1', 'debug'],
            ['KeyF11', 'fullscreen']
        ]);
        
        // Hotbar bindings (1-9)
        for (let i = 1; i <= 9; i++) {
            this.keyBindings.set(`Digit${i}`, `hotbar${i}`);
        }
        
        // Inizializza gli event listener
        this.initEventListeners();
        
        console.log('InputManager initialized');
    }
    
    /**
     * Inizializza tutti gli event listener
     * @private
     */
    initEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Mouse events
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('wheel', this.onMouseWheel.bind(this));
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));
        
        // Touch events (per dispositivi mobili)
        document.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Context menu (disabilita il menu contestuale)
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Gestisce l'evento keydown
     * @param {KeyboardEvent} event
     * @private
     */
    onKeyDown(event) {
        const action = this.keyBindings.get(event.code);
        
        if (action) {
            event.preventDefault();
            
            if (!this.keys.get(action)) {
                this.keysPressed.add(action);
            }
            
            this.keys.set(action, true);
        }
    }
    
    /**
     * Gestisce l'evento keyup
     * @param {KeyboardEvent} event
     * @private
     */
    onKeyUp(event) {
        const action = this.keyBindings.get(event.code);
        
        if (action) {
            event.preventDefault();
            this.keys.set(action, false);
            this.keysReleased.add(action);
        }
    }
    
    /**
     * Gestisce l'evento mousedown
     * @param {MouseEvent} event
     * @private
     */
    onMouseDown(event) {
        this.mouse.buttons.set(event.button, true);
        
        // Richiedi pointer lock se non è già attivo
        if (!this.mouse.isLocked && event.button === 0) {
            this.requestPointerLock();
        }
    }
    
    /**
     * Gestisce l'evento mouseup
     * @param {MouseEvent} event
     * @private
     */
    onMouseUp(event) {
        this.mouse.buttons.set(event.button, false);
    }
    
    /**
     * Gestisce l'evento mousemove
     * @param {MouseEvent} event
     * @private
     */
    onMouseMove(event) {
        if (this.mouse.isLocked) {
            this.mouse.deltaX = event.movementX || 0;
            this.mouse.deltaY = event.movementY || 0;
        } else {
            this.mouse.x = event.clientX;
            this.mouse.y = event.clientY;
        }
    }
    
    /**
     * Gestisce l'evento wheel
     * @param {WheelEvent} event
     * @private
     */
    onMouseWheel(event) {
        event.preventDefault();
        this.mouse.wheel = event.deltaY;
    }
    
    /**
     * Gestisce il cambio di stato del pointer lock
     * @private
     */
    onPointerLockChange() {
        this.mouse.isLocked = document.pointerLockElement === document.body;
        
        if (this.mouse.isLocked) {
            console.log('Pointer locked');
        } else {
            console.log('Pointer unlocked');
        }
    }
    
    /**
     * Gestisce gli errori del pointer lock
     * @private
     */
    onPointerLockError() {
        console.error('Pointer lock error');
    }
    
    /**
     * Gestisce l'evento touchstart
     * @param {TouchEvent} event
     * @private
     */
    onTouchStart(event) {
        event.preventDefault();
        
        for (let touch of event.changedTouches) {
            this.touch.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY
            });
        }
        
        this.touch.isActive = true;
    }
    
    /**
     * Gestisce l'evento touchmove
     * @param {TouchEvent} event
     * @private
     */
    onTouchMove(event) {
        event.preventDefault();
        
        for (let touch of event.changedTouches) {
            const touchData = this.touch.touches.get(touch.identifier);
            if (touchData) {
                touchData.x = touch.clientX;
                touchData.y = touch.clientY;
            }
        }
    }
    
    /**
     * Gestisce l'evento touchend
     * @param {TouchEvent} event
     * @private
     */
    onTouchEnd(event) {
        event.preventDefault();
        
        for (let touch of event.changedTouches) {
            this.touch.touches.delete(touch.identifier);
        }
        
        if (this.touch.touches.size === 0) {
            this.touch.isActive = false;
        }
    }
    
    /**
     * Richiede il pointer lock
     */
    requestPointerLock() {
        document.body.requestPointerLock();
    }
    
    /**
     * Rilascia il pointer lock
     */
    exitPointerLock() {
        document.exitPointerLock();
    }
    
    /**
     * Verifica se un tasto è premuto
     * @param {string} action - Nome dell'azione
     * @returns {boolean}
     */
    isKeyDown(action) {
        return this.keys.get(action) || false;
    }
    
    /**
     * Verifica se un tasto è stato appena premuto
     * @param {string} action - Nome dell'azione
     * @returns {boolean}
     */
    isKeyPressed(action) {
        return this.keysPressed.has(action);
    }
    
    /**
     * Verifica se un tasto è stato appena rilasciato
     * @param {string} action - Nome dell'azione
     * @returns {boolean}
     */
    isKeyReleased(action) {
        return this.keysReleased.has(action);
    }
    
    /**
     * Verifica se un pulsante del mouse è premuto
     * @param {number} button - Numero del pulsante (0=sinistro, 1=centrale, 2=destro)
     * @returns {boolean}
     */
    isMouseButtonDown(button) {
        return this.mouse.buttons.get(button) || false;
    }
    
    /**
     * Ottiene il movimento del mouse
     * @returns {Object} Oggetto con deltaX e deltaY
     */
    getMouseDelta() {
        return {
            x: this.mouse.deltaX,
            y: this.mouse.deltaY
        };
    }
    
    /**
     * Ottiene la posizione del mouse
     * @returns {Object} Oggetto con x e y
     */
    getMousePosition() {
        return {
            x: this.mouse.x,
            y: this.mouse.y
        };
    }
    
    /**
     * Ottiene il valore della rotella del mouse
     * @returns {number}
     */
    getMouseWheel() {
        return this.mouse.wheel;
    }
    
    /**
     * Verifica se il pointer è bloccato
     * @returns {boolean}
     */
    isPointerLocked() {
        return this.mouse.isLocked;
    }
    
    /**
     * Ottiene i touch attivi
     * @returns {Map} Mappa dei touch attivi
     */
    getTouches() {
        return this.touch.touches;
    }
    
    /**
     * Verifica se ci sono touch attivi
     * @returns {boolean}
     */
    isTouchActive() {
        return this.touch.isActive;
    }
    
    /**
     * Aggiorna l'InputManager (chiamato ogni frame)
     */
    update() {
        // Reset dei delta del mouse
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        this.mouse.wheel = 0;
        
        // Reset degli eventi di pressione/rilascio
        this.keysPressed.clear();
        this.keysReleased.clear();
    }
    
    /**
     * Imposta un nuovo binding per un tasto
     * @param {string} keyCode - Codice del tasto
     * @param {string} action - Nome dell'azione
     */
    setKeyBinding(keyCode, action) {
        this.keyBindings.set(keyCode, action);
    }
    
    /**
     * Rimuove un binding per un tasto
     * @param {string} keyCode - Codice del tasto
     */
    removeKeyBinding(keyCode) {
        this.keyBindings.delete(keyCode);
    }
    
    /**
     * Ottiene tutti i binding attuali
     * @returns {Map} Mappa dei binding
     */
    getKeyBindings() {
        return new Map(this.keyBindings);
    }
    
    /**
     * Pulisce le risorse dell'InputManager
     */
    dispose() {
        // Rimuovi tutti gli event listener
        document.removeEventListener('keydown', this.onKeyDown.bind(this));
        document.removeEventListener('keyup', this.onKeyUp.bind(this));
        document.removeEventListener('mousedown', this.onMouseDown.bind(this));
        document.removeEventListener('mouseup', this.onMouseUp.bind(this));
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('wheel', this.onMouseWheel.bind(this));
        document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.removeEventListener('pointerlockerror', this.onPointerLockError.bind(this));
        document.removeEventListener('touchstart', this.onTouchStart.bind(this));
        document.removeEventListener('touchmove', this.onTouchMove.bind(this));
        document.removeEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Rilascia il pointer lock se attivo
        if (this.mouse.isLocked) {
            this.exitPointerLock();
        }
        
        console.log('InputManager disposed');
    }
}