/**
 * 3D Pit Word - Game Core
 * 
 * Classe principale del gioco che gestisce il ciclo di gioco,
 * il renderer, la scena, la camera e tutti i sistemi principali.
 */

import * as THREE from 'three';
import { World } from '../world/World.js';
import { Player } from '../player/Player.js';
import { InputManager } from './InputManager.js';
import { PhysicsManager } from './PhysicsManager.js';
import { TimeManager } from '../utils/TimeManager.js';
import { Stats } from '../utils/Stats.js';

export class Game {
    /**
     * Costruttore della classe Game
     * @param {Object} options - Opzioni di configurazione
     * @param {AssetManager} options.assetManager - Gestore delle risorse
     * @param {UIManager} options.uiManager - Gestore dell'interfaccia utente
     * @param {DebugManager} options.debugManager - Gestore del debug
     * @param {Object} options.config - Configurazione del gioco
     */
    constructor(options) {
        this.assetManager = options.assetManager;
        this.uiManager = options.uiManager;
        this.debugManager = options.debugManager;
        this.config = options.config;
        
        // Stato del gioco
        this.running = false;
        this.paused = false;
        
        // Inizializza i sistemi principali
        this._initRenderer();
        this._initScene();
        this._initCamera();
        this._initLighting();
        
        // Inizializza i manager
        this.timeManager = new TimeManager();
        this.inputManager = new InputManager(this);
        this.physicsManager = new PhysicsManager(this.config.PHYSICS);
        
        // Inizializza le statistiche se il debug è abilitato
        if (this.config.DEBUG.ENABLE_STATS) {
            this.stats = new Stats();
            document.body.appendChild(this.stats.dom);
        }
        
        // Inizializza il mondo e il giocatore
        this.world = new World(this);
        this.player = new Player(this);
        
        // Aggiungi il giocatore alla scena
        this.scene.add(this.player.object);
        
        // Collega gli eventi di resize
        window.addEventListener('resize', this._onWindowResize.bind(this));
        
        console.log('Game core initialized');
    }
    
    /**
     * Inizializza il renderer WebGL
     * @private
     */
    _initRenderer() {
        const canvas = document.getElementById('game-canvas');
        
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: this.config.RENDERER.ANTIALIAS,
            alpha: this.config.RENDERER.ALPHA,
            powerPreference: this.config.RENDERER.POWER_PREFERENCE
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Configura le ombre
        if (this.config.RENDERER.SHADOW_MAP_ENABLED) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE[this.config.RENDERER.SHADOW_MAP_TYPE];
        }
        
        // Configura il tone mapping
        this.renderer.toneMapping = THREE[this.config.RENDERER.TONE_MAPPING];
        this.renderer.toneMappingExposure = this.config.RENDERER.TONE_MAPPING_EXPOSURE;
        
        console.log('Renderer initialized');
    }
    
    /**
     * Inizializza la scena
     * @private
     */
    _initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Colore del cielo
        
        // Aggiungi la nebbia per limitare la visibilità
        const fogColor = new THREE.Color(0xC8D6E5);
        const fogNear = this.config.WORLD.CHUNK_SIZE * (this.config.WORLD.RENDER_DISTANCE - 2);
        const fogFar = this.config.WORLD.CHUNK_SIZE * this.config.WORLD.RENDER_DISTANCE;
        this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
        
        console.log('Scene initialized');
    }
    
    /**
     * Inizializza la camera
     * @private
     */
    _initCamera() {
        const { FOV, NEAR, FAR, INITIAL_POSITION } = this.config.CAMERA;
        
        this.camera = new THREE.PerspectiveCamera(
            FOV,
            window.innerWidth / window.innerHeight,
            NEAR,
            FAR
        );
        
        this.camera.position.set(
            INITIAL_POSITION.x,
            INITIAL_POSITION.y,
            INITIAL_POSITION.z
        );
        
        console.log('Camera initialized');
    }
    
    /**
     * Inizializza l'illuminazione della scena
     * @private
     */
    _initLighting() {
        const { AMBIENT_INTENSITY, AMBIENT_COLOR, SUN } = this.config.LIGHTING;
        
        // Luce ambientale
        this.ambientLight = new THREE.AmbientLight(
            AMBIENT_COLOR,
            AMBIENT_INTENSITY
        );
        this.scene.add(this.ambientLight);
        
        // Luce direzionale (sole)
        this.sunLight = new THREE.DirectionalLight(
            SUN.COLOR,
            SUN.INTENSITY
        );
        
        this.sunLight.position.set(
            SUN.POSITION.x,
            SUN.POSITION.y,
            SUN.POSITION.z
        );
        
        // Configura le ombre del sole
        if (SUN.CAST_SHADOW) {
            this.sunLight.castShadow = true;
            this.sunLight.shadow.mapSize.width = this.config.RENDERER.SHADOW_MAP_SIZE;
            this.sunLight.shadow.mapSize.height = this.config.RENDERER.SHADOW_MAP_SIZE;
            
            const d = 200;
            this.sunLight.shadow.camera.left = -d;
            this.sunLight.shadow.camera.right = d;
            this.sunLight.shadow.camera.top = d;
            this.sunLight.shadow.camera.bottom = -d;
            this.sunLight.shadow.camera.near = 0.5;
            this.sunLight.shadow.camera.far = 500;
        }
        
        this.scene.add(this.sunLight);
        
        console.log('Lighting initialized');
    }
    
    /**
     * Gestisce il ridimensionamento della finestra
     * @private
     */
    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Avvia il gioco
     */
    start() {
        if (this.running) return;
        
        console.log('Starting game...');
        
        // Inizializza il mondo
        this.world.init();
        
        // Inizializza il giocatore
        this.player.init();
        
        // Inizializza l'input manager
        this.inputManager.init();
        
        // Imposta lo stato di gioco
        this.running = true;
        this.paused = false;
        
        // Avvia il loop di gioco
        this.timeManager.reset();
        this._gameLoop();
        
        console.log('Game started');
    }
    
    /**
     * Mette in pausa il gioco
     */
    pause() {
        if (!this.running || this.paused) return;
        
        this.paused = true;
        console.log('Game paused');
    }
    
    /**
     * Riprende il gioco dalla pausa
     */
    resume() {
        if (!this.running || !this.paused) return;
        
        this.paused = false;
        console.log('Game resumed');
    }
    
    /**
     * Ferma il gioco
     */
    stop() {
        if (!this.running) return;
        
        this.running = false;
        this.paused = false;
        
        // Rilascia le risorse
        this.inputManager.dispose();
        this.world.dispose();
        
        console.log('Game stopped');
    }
    
    /**
     * Loop principale del gioco
     * @private
     */
    _gameLoop() {
        if (!this.running) return;
        
        // Richiedi il prossimo frame
        requestAnimationFrame(this._gameLoop.bind(this));
        
        // Aggiorna le statistiche se abilitate
        if (this.stats) this.stats.begin();
        
        // Aggiorna il tempo
        this.timeManager.update();
        
        // Salta l'aggiornamento se il gioco è in pausa
        if (!this.paused) {
            // Aggiorna la fisica
            this.physicsManager.update(this.timeManager.deltaTime);
            
            // Aggiorna il mondo
            this.world.update(this.timeManager.deltaTime);
            
            // Aggiorna il giocatore
            this.player.update(this.timeManager.deltaTime);
            
            // Aggiorna l'interfaccia utente
            this.uiManager.update(this.timeManager.deltaTime);
            
            // Aggiorna il debug
            if (this.config.DEBUG.SHOW_PERFORMANCE_STATS) {
                this._updateDebugInfo();
            }
        }
        
        // Renderizza la scena
        this.renderer.render(this.scene, this.camera);
        
        // Termina le statistiche
        if (this.stats) this.stats.end();
    }
    
    /**
     * Aggiorna le informazioni di debug
     * @private
     */
    _updateDebugInfo() {
        const fps = Math.round(1 / this.timeManager.deltaTime);
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
        
        const position = this.player.getPosition();
        document.getElementById('coordinates').textContent = 
            `X: ${position.x.toFixed(1)}, Y: ${position.y.toFixed(1)}, Z: ${position.z.toFixed(1)}`;
        
        // Aggiorna le informazioni di debug avanzate se il pannello è visibile
        if (!document.getElementById('debug-panel').classList.contains('hidden')) {
            document.getElementById('chunks-loaded').textContent = this.world.getLoadedChunksCount();
            document.getElementById('triangle-count').textContent = this.renderer.info.render.triangles;
            
            // Memoria utilizzata (approssimativa)
            const memoryInfo = this.renderer.info.memory;
            const geometries = memoryInfo.geometries || 0;
            const textures = memoryInfo.textures || 0;
            document.getElementById('memory-usage').textContent = 
                `Geo: ${geometries}, Tex: ${textures}`;
        }
    }
    
    /**
     * Aggiorna la distanza di rendering
     * @param {number} distance - Nuova distanza di rendering
     */
    updateRenderDistance(distance) {
        this.config.WORLD.RENDER_DISTANCE = distance;
        
        // Aggiorna la nebbia
        const fogNear = this.config.WORLD.CHUNK_SIZE * (distance - 2);
        const fogFar = this.config.WORLD.CHUNK_SIZE * distance;
        this.scene.fog.near = fogNear;
        this.scene.fog.far = fogFar;
        
        // Aggiorna il mondo
        if (this.world) {
            this.world.updateRenderDistance(distance);
        }
    }
    
    /**
     * Aggiorna la qualità grafica
     * @param {string} quality - Livello di qualità ('low', 'medium', 'high')
     */
    updateGraphicsQuality(quality) {
        const qualitySettings = this.config.PERFORMANCE.QUALITY_LEVELS[quality.toUpperCase()];
        if (!qualitySettings) return;
        
        // Aggiorna la distanza di rendering
        this.updateRenderDistance(qualitySettings.render_distance);
        
        // Aggiorna la qualità delle ombre
        if (this.config.RENDERER.SHADOW_MAP_ENABLED) {
            this.sunLight.shadow.mapSize.width = qualitySettings.shadow_quality;
            this.sunLight.shadow.mapSize.height = qualitySettings.shadow_quality;
            this.sunLight.shadow.map?.dispose();
            this.sunLight.shadow.map = null;
        }
        
        // Aggiorna altre impostazioni di qualità
        // TODO: Implementare altre impostazioni di qualità
    }
    
    /**
     * Verifica se il gioco è in esecuzione
     * @returns {boolean} True se il gioco è in esecuzione
     */
    isRunning() {
        return this.running;
    }
    
    /**
     * Verifica se il gioco è in pausa
     * @returns {boolean} True se il gioco è in pausa
     */
    isPaused() {
        return this.paused;
    }
}