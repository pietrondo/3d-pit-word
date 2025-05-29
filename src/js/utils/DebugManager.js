/**
 * 3D Pit Word - Debug Manager
 * 
 * Gestisce il sistema di debug del gioco, inclusi overlay informativi,
 * comandi di debug, visualizzazione wireframe e statistiche avanzate.
 */

import { CONFIG } from '../config/config.js';

export class DebugManager {
    /**
     * Costruttore del Debug Manager
     * @param {Game} game - Riferimento al gioco principale
     */
    constructor(game) {
        this.game = game;
        this.enabled = CONFIG.debug.enabled || false;
        this.level = CONFIG.debug.level || 'info';
        
        // Stato del debug
        this.showWireframe = false;
        this.showBoundingBoxes = false;
        this.showChunkBorders = false;
        this.showPlayerInfo = false;
        this.showPerformanceInfo = false;
        this.showWorldInfo = false;
        this.showPhysicsDebug = false;
        this.freezePlayer = false;
        this.godMode = false;
        
        // Overlay DOM
        this.overlay = null;
        this.panels = new Map();
        
        // Comandi di debug
        this.commands = new Map();
        
        // Cronologia dei log
        this.logHistory = [];
        this.maxLogHistory = 1000;
        
        // Performance tracking
        this.performanceMetrics = {
            frameTime: [],
            renderTime: [],
            updateTime: [],
            memoryUsage: []
        };
        
        this.init();
    }
    
    /**
     * Inizializza il debug manager
     * @private
     */
    init() {
        if (!this.enabled) return;
        
        this.createOverlay();
        this.setupCommands();
        this.setupKeyBindings();
        
        // Override console methods per catturare i log
        this.setupConsoleCapture();
        
        console.log('Debug Manager initialized');
        this.log('Debug mode enabled', 'info');
    }
    
    /**
     * Crea l'overlay di debug
     * @private
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'debug-overlay';
        this.overlay.style.cssText = this.getOverlayCSS();
        
        // Pannello principale
        this.createPanel('main', 'Debug Info', 'top-left');
        this.createPanel('performance', 'Performance', 'top-right');
        this.createPanel('world', 'World Info', 'bottom-left');
        this.createPanel('console', 'Console', 'bottom-right');
        
        document.body.appendChild(this.overlay);
        
        // Inizialmente nascosto
        this.setVisible(false);
    }
    
    /**
     * Crea un pannello di debug
     * @param {string} id - ID del pannello
     * @param {string} title - Titolo del pannello
     * @param {string} position - Posizione del pannello
     * @private
     */
    createPanel(id, title, position) {
        const panel = document.createElement('div');
        panel.className = `debug-panel debug-panel-${id}`;
        panel.style.cssText = this.getPanelCSS(position);
        
        const header = document.createElement('div');
        header.className = 'debug-panel-header';
        header.textContent = title;
        header.style.cssText = this.getHeaderCSS();
        
        const content = document.createElement('div');
        content.className = 'debug-panel-content';
        content.style.cssText = this.getContentCSS();
        
        panel.appendChild(header);
        panel.appendChild(content);
        this.overlay.appendChild(panel);
        
        this.panels.set(id, {
            element: panel,
            header,
            content,
            visible: false
        });
    }
    
    /**
     * Configura i comandi di debug
     * @private
     */
    setupCommands() {
        // Comandi base
        this.addCommand('help', 'Mostra tutti i comandi disponibili', () => {
            this.log('=== COMANDI DEBUG ===', 'info');
            for (const [name, cmd] of this.commands) {
                this.log(`${name}: ${cmd.description}`, 'info');
            }
        });
        
        this.addCommand('clear', 'Pulisce la console', () => {
            this.clearConsole();
        });
        
        this.addCommand('wireframe', 'Toggle wireframe mode', () => {
            this.toggleWireframe();
        });
        
        this.addCommand('bbox', 'Toggle bounding boxes', () => {
            this.toggleBoundingBoxes();
        });
        
        this.addCommand('chunks', 'Toggle chunk borders', () => {
            this.toggleChunkBorders();
        });
        
        this.addCommand('player', 'Toggle player info', () => {
            this.togglePanel('main');
        });
        
        this.addCommand('performance', 'Toggle performance info', () => {
            this.togglePanel('performance');
        });
        
        this.addCommand('world', 'Toggle world info', () => {
            this.togglePanel('world');
        });
        
        this.addCommand('console', 'Toggle console', () => {
            this.togglePanel('console');
        });
        
        this.addCommand('freeze', 'Freeze/unfreeze player', () => {
            this.toggleFreezePlayer();
        });
        
        this.addCommand('god', 'Toggle god mode', () => {
            this.toggleGodMode();
        });
        
        this.addCommand('tp', 'Teleport player (x, y, z)', (args) => {
            if (args.length >= 3) {
                const x = parseFloat(args[0]);
                const y = parseFloat(args[1]);
                const z = parseFloat(args[2]);
                this.teleportPlayer(x, y, z);
            } else {
                this.log('Usage: tp <x> <y> <z>', 'error');
            }
        });
        
        this.addCommand('spawn', 'Spawn block at position (type, x, y, z)', (args) => {
            if (args.length >= 4) {
                const type = args[0];
                const x = parseInt(args[1]);
                const y = parseInt(args[2]);
                const z = parseInt(args[3]);
                this.spawnBlock(type, x, y, z);
            } else {
                this.log('Usage: spawn <type> <x> <y> <z>', 'error');
            }
        });
    }
    
    /**
     * Configura i key binding per il debug
     * @private
     */
    setupKeyBindings() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            // F3 - Toggle debug overlay
            if (e.code === 'F3') {
                e.preventDefault();
                this.toggle();
            }
            
            // F4 - Toggle wireframe
            if (e.code === 'F4') {
                e.preventDefault();
                this.toggleWireframe();
            }
            
            // F5 - Toggle chunk borders
            if (e.code === 'F5') {
                e.preventDefault();
                this.toggleChunkBorders();
            }
            
            // F6 - Toggle physics debug
            if (e.code === 'F6') {
                e.preventDefault();
                this.togglePhysicsDebug();
            }
            
            // Ctrl + ~ - Toggle console
            if (e.ctrlKey && e.code === 'Backquote') {
                e.preventDefault();
                this.togglePanel('console');
            }
        });
    }
    
    /**
     * Configura la cattura dei log della console
     * @private
     */
    setupConsoleCapture() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.addToHistory('log', args.join(' '));
        };
        
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.addToHistory('warn', args.join(' '));
        };
        
        console.error = (...args) => {
            originalError.apply(console, args);
            this.addToHistory('error', args.join(' '));
        };
    }
    
    /**
     * Aggiorna il debug manager
     * @param {number} deltaTime - Tempo trascorso
     */
    update(deltaTime) {
        if (!this.enabled || !this.overlay.style.display === 'block') return;
        
        // Aggiorna le informazioni nei pannelli
        this.updateMainPanel();
        this.updatePerformancePanel();
        this.updateWorldPanel();
        this.updateConsolePanel();
        
        // Traccia le metriche di performance
        this.trackPerformance(deltaTime);
    }
    
    /**
     * Aggiorna il pannello principale
     * @private
     */
    updateMainPanel() {
        const panel = this.panels.get('main');
        if (!panel || !panel.visible) return;
        
        const player = this.game.player;
        const camera = this.game.camera;
        
        const info = [
            `Position: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`,
            `Rotation: ${player.rotation.x.toFixed(2)}, ${player.rotation.y.toFixed(2)}, ${player.rotation.z.toFixed(2)}`,
            `Velocity: ${player.velocity.x.toFixed(2)}, ${player.velocity.y.toFixed(2)}, ${player.velocity.z.toFixed(2)}`,
            `On Ground: ${player.isOnGround}`,
            `Flying: ${player.isFlying}`,
            `God Mode: ${this.godMode}`,
            `Frozen: ${this.freezePlayer}`,
            `Camera FOV: ${camera.fov}`,
            `Render Distance: ${CONFIG.world.renderDistance}`
        ];
        
        panel.content.innerHTML = info.join('<br>');
    }
    
    /**
     * Aggiorna il pannello delle performance
     * @private
     */
    updatePerformancePanel() {
        const panel = this.panels.get('performance');
        if (!panel || !panel.visible) return;
        
        const stats = this.game.stats ? this.game.stats.getStats() : {};
        const renderer = this.game.renderer;
        
        const info = [
            `FPS: ${stats.fps || 0}`,
            `Frame Time: ${(stats.frameTime || 0).toFixed(2)}ms`,
            `Memory: ${stats.memory ? stats.memory.used : 0}MB`,
            `Triangles: ${renderer.info.render.triangles}`,
            `Draw Calls: ${renderer.info.render.calls}`,
            `Textures: ${renderer.info.memory.textures}`,
            `Geometries: ${renderer.info.memory.geometries}`,
            `Programs: ${renderer.info.programs ? renderer.info.programs.length : 0}`
        ];
        
        panel.content.innerHTML = info.join('<br>');
    }
    
    /**
     * Aggiorna il pannello del mondo
     * @private
     */
    updateWorldPanel() {
        const panel = this.panels.get('world');
        if (!panel || !panel.visible) return;
        
        const world = this.game.world;
        const voxelWorld = world ? world.voxelWorld : null;
        
        if (!voxelWorld) {
            panel.content.innerHTML = 'World not loaded';
            return;
        }
        
        const info = [
            `Loaded Chunks: ${voxelWorld.loadedChunks.size}`,
            `Chunk Size: ${CONFIG.world.chunkSize}`,
            `World Height: ${CONFIG.world.worldHeight}`,
            `Seed: ${CONFIG.world.seed}`,
            `Biome: ${voxelWorld.getCurrentBiome ? voxelWorld.getCurrentBiome() : 'Unknown'}`,
            `Time: ${this.game.timeManager ? this.game.timeManager.getTimeString() : 'Unknown'}`,
            `Weather: Clear` // TODO: implementare sistema meteo
        ];
        
        panel.content.innerHTML = info.join('<br>');
    }
    
    /**
     * Aggiorna il pannello della console
     * @private
     */
    updateConsolePanel() {
        const panel = this.panels.get('console');
        if (!panel || !panel.visible) return;
        
        // Mostra gli ultimi 10 log
        const recentLogs = this.logHistory.slice(-10);
        const logHTML = recentLogs.map(log => 
            `<div class="log-${log.level}">[${log.timestamp}] ${log.message}</div>`
        ).join('');
        
        panel.content.innerHTML = logHTML;
        
        // Auto-scroll verso il basso
        panel.content.scrollTop = panel.content.scrollHeight;
    }
    
    /**
     * Traccia le metriche di performance
     * @param {number} deltaTime - Tempo trascorso
     * @private
     */
    trackPerformance(deltaTime) {
        const maxSamples = 60; // 1 secondo a 60fps
        
        // Frame time
        this.performanceMetrics.frameTime.push(deltaTime);
        if (this.performanceMetrics.frameTime.length > maxSamples) {
            this.performanceMetrics.frameTime.shift();
        }
        
        // Memory usage (se disponibile)
        if (performance.memory) {
            this.performanceMetrics.memoryUsage.push(performance.memory.usedJSHeapSize);
            if (this.performanceMetrics.memoryUsage.length > maxSamples) {
                this.performanceMetrics.memoryUsage.shift();
            }
        }
    }
    
    /**
     * Aggiunge un comando di debug
     * @param {string} name - Nome del comando
     * @param {string} description - Descrizione del comando
     * @param {Function} callback - Funzione da eseguire
     */
    addCommand(name, description, callback) {
        this.commands.set(name, { description, callback });
    }
    
    /**
     * Esegue un comando di debug
     * @param {string} commandLine - Linea di comando
     */
    executeCommand(commandLine) {
        const parts = commandLine.trim().split(' ');
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        const command = this.commands.get(commandName);
        if (command) {
            try {
                command.callback(args);
                this.log(`Executed: ${commandLine}`, 'info');
            } catch (error) {
                this.log(`Error executing command: ${error.message}`, 'error');
            }
        } else {
            this.log(`Unknown command: ${commandName}. Type 'help' for available commands.`, 'error');
        }
    }
    
    /**
     * Aggiunge un messaggio alla cronologia dei log
     * @param {string} level - Livello del log
     * @param {string} message - Messaggio
     * @private
     */
    addToHistory(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logHistory.push({ level, message, timestamp });
        
        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory.shift();
        }
    }
    
    /**
     * Log personalizzato per il debug
     * @param {string} message - Messaggio
     * @param {string} level - Livello (info, warn, error)
     */
    log(message, level = 'info') {
        if (!this.enabled) return;
        
        const timestamp = new Date().toLocaleTimeString();
        this.addToHistory(level, message);
        
        // Log anche nella console normale
        switch (level) {
            case 'warn':
                console.warn(`[DEBUG] ${message}`);
                break;
            case 'error':
                console.error(`[DEBUG] ${message}`);
                break;
            default:
                console.log(`[DEBUG] ${message}`);
        }
    }
    
    /**
     * Toggle del debug overlay
     */
    toggle() {
        const isVisible = this.overlay.style.display !== 'none';
        this.setVisible(!isVisible);
    }
    
    /**
     * Imposta la visibilità del debug overlay
     * @param {boolean} visible - Visibilità
     */
    setVisible(visible) {
        this.overlay.style.display = visible ? 'block' : 'none';
        
        if (visible) {
            this.log('Debug overlay shown', 'info');
        }
    }
    
    /**
     * Toggle di un pannello specifico
     * @param {string} panelId - ID del pannello
     */
    togglePanel(panelId) {
        const panel = this.panels.get(panelId);
        if (!panel) return;
        
        panel.visible = !panel.visible;
        panel.element.style.display = panel.visible ? 'block' : 'none';
        
        this.log(`Panel ${panelId} ${panel.visible ? 'shown' : 'hidden'}`, 'info');
    }
    
    /**
     * Toggle wireframe mode
     */
    toggleWireframe() {
        this.showWireframe = !this.showWireframe;
        
        // Applica a tutti i materiali nella scena
        this.game.scene.traverse((object) => {
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.wireframe = this.showWireframe);
                } else {
                    object.material.wireframe = this.showWireframe;
                }
            }
        });
        
        this.log(`Wireframe ${this.showWireframe ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle bounding boxes
     */
    toggleBoundingBoxes() {
        this.showBoundingBoxes = !this.showBoundingBoxes;
        // TODO: implementare visualizzazione bounding boxes
        this.log(`Bounding boxes ${this.showBoundingBoxes ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle chunk borders
     */
    toggleChunkBorders() {
        this.showChunkBorders = !this.showChunkBorders;
        // TODO: implementare visualizzazione bordi chunk
        this.log(`Chunk borders ${this.showChunkBorders ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle physics debug
     */
    togglePhysicsDebug() {
        this.showPhysicsDebug = !this.showPhysicsDebug;
        // TODO: implementare debug fisica
        this.log(`Physics debug ${this.showPhysicsDebug ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Toggle freeze player
     */
    toggleFreezePlayer() {
        this.freezePlayer = !this.freezePlayer;
        
        if (this.game.player) {
            this.game.player.frozen = this.freezePlayer;
        }
        
        this.log(`Player ${this.freezePlayer ? 'frozen' : 'unfrozen'}`, 'info');
    }
    
    /**
     * Toggle god mode
     */
    toggleGodMode() {
        this.godMode = !this.godMode;
        
        if (this.game.player) {
            this.game.player.godMode = this.godMode;
        }
        
        this.log(`God mode ${this.godMode ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Teletrasporta il giocatore
     * @param {number} x - Coordinata X
     * @param {number} y - Coordinata Y
     * @param {number} z - Coordinata Z
     */
    teleportPlayer(x, y, z) {
        if (this.game.player) {
            this.game.player.position.set(x, y, z);
            this.log(`Player teleported to ${x}, ${y}, ${z}`, 'info');
        }
    }
    
    /**
     * Spawna un blocco
     * @param {string} type - Tipo di blocco
     * @param {number} x - Coordinata X
     * @param {number} y - Coordinata Y
     * @param {number} z - Coordinata Z
     */
    spawnBlock(type, x, y, z) {
        if (this.game.world && this.game.world.voxelWorld) {
            this.game.world.voxelWorld.setBlock(x, y, z, type);
            this.log(`Spawned ${type} block at ${x}, ${y}, ${z}`, 'info');
        }
    }
    
    /**
     * Pulisce la console
     */
    clearConsole() {
        this.logHistory = [];
        this.log('Console cleared', 'info');
    }
    
    /**
     * CSS per l'overlay principale
     * @returns {string} CSS
     * @private
     */
    getOverlayCSS() {
        return `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #ffffff;
        `;
    }
    
    /**
     * CSS per i pannelli
     * @param {string} position - Posizione del pannello
     * @returns {string} CSS
     * @private
     */
    getPanelCSS(position) {
        let positionCSS = '';
        
        switch (position) {
            case 'top-left':
                positionCSS = 'top: 10px; left: 10px;';
                break;
            case 'top-right':
                positionCSS = 'top: 10px; right: 10px;';
                break;
            case 'bottom-left':
                positionCSS = 'bottom: 10px; left: 10px;';
                break;
            case 'bottom-right':
                positionCSS = 'bottom: 10px; right: 10px;';
                break;
        }
        
        return `
            position: absolute;
            ${positionCSS}
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #444;
            border-radius: 4px;
            padding: 0;
            min-width: 200px;
            max-width: 300px;
            pointer-events: auto;
            display: none;
        `;
    }
    
    /**
     * CSS per gli header dei pannelli
     * @returns {string} CSS
     * @private
     */
    getHeaderCSS() {
        return `
            background: rgba(255, 255, 255, 0.1);
            padding: 5px 10px;
            border-bottom: 1px solid #444;
            font-weight: bold;
            cursor: move;
        `;
    }
    
    /**
     * CSS per il contenuto dei pannelli
     * @returns {string} CSS
     * @private
     */
    getContentCSS() {
        return `
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
            line-height: 1.4;
        `;
    }
    
    /**
     * Abilita/disabilita il debug
     * @param {boolean} enabled - Stato del debug
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled && this.overlay) {
            this.setVisible(false);
        }
        
        this.log(`Debug ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Ottiene lo stato del debug
     * @returns {Object} Stato del debug
     */
    getState() {
        return {
            enabled: this.enabled,
            level: this.level,
            wireframe: this.showWireframe,
            boundingBoxes: this.showBoundingBoxes,
            chunkBorders: this.showChunkBorders,
            physicsDebug: this.showPhysicsDebug,
            freezePlayer: this.freezePlayer,
            godMode: this.godMode
        };
    }
    
    /**
     * Pulisce le risorse
     */
    dispose() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        this.panels.clear();
        this.commands.clear();
        this.logHistory = [];
        
        console.log('Debug Manager disposed');
    }
}