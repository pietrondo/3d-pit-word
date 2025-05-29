/**
 * 3D Pit Word - Asset Manager
 * 
 * Gestisce il caricamento e la cache di tutte le risorse del gioco:
 * texture, modelli 3D, suoni, shader, ecc.
 */

import * as THREE from 'three';

export class AssetManager {
    /**
     * Costruttore dell'AssetManager
     * @param {Function} progressCallback - Callback per il progresso del caricamento
     */
    constructor(progressCallback = null) {
        this.progressCallback = progressCallback;
        
        // Cache delle risorse
        this.textures = new Map();
        this.models = new Map();
        this.sounds = new Map();
        this.shaders = new Map();
        
        // Loader di Three.js
        this.textureLoader = new THREE.TextureLoader();
        this.audioLoader = new THREE.AudioLoader();
        
        // Audio context
        this.audioListener = new THREE.AudioListener();
        this.audioContext = null;
        
        // Stato del caricamento
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.isLoading = false;
        
        // Coda delle risorse da caricare
        this.textureQueue = [];
        this.modelQueue = [];
        this.soundQueue = [];
        this.shaderQueue = [];
        
        console.log('AssetManager initialized');
    }
    
    /**
     * Registra le texture da caricare
     * @param {Array} textures - Array di oggetti texture {id, url, options}
     */
    registerTextures(textures) {
        this.textureQueue.push(...textures);
        this.totalAssets += textures.length;
    }
    
    /**
     * Registra i modelli 3D da caricare
     * @param {Array} models - Array di oggetti modello {id, url, type}
     */
    registerModels(models) {
        this.modelQueue.push(...models);
        this.totalAssets += models.length;
    }
    
    /**
     * Registra i suoni da caricare
     * @param {Array} sounds - Array di oggetti suono {id, url, options}
     */
    registerSounds(sounds) {
        this.soundQueue.push(...sounds);
        this.totalAssets += sounds.length;
    }
    
    /**
     * Registra gli shader da caricare
     * @param {Array} shaders - Array di oggetti shader {id, vertexUrl, fragmentUrl}
     */
    registerShaders(shaders) {
        this.shaderQueue.push(...shaders);
        this.totalAssets += shaders.length * 2; // Vertex + Fragment
    }
    
    /**
     * Carica tutte le risorse registrate
     * @returns {Promise} Promise che si risolve quando tutte le risorse sono caricate
     */
    async loadAll() {
        if (this.isLoading) {
            throw new Error('Asset loading already in progress');
        }
        
        this.isLoading = true;
        this.loadedAssets = 0;
        
        try {
            console.log(`Loading ${this.totalAssets} assets...`);
            
            // Carica le texture
            await this._loadTextures();
            
            // Carica i modelli
            await this._loadModels();
            
            // Carica i suoni
            await this._loadSounds();
            
            // Carica gli shader
            await this._loadShaders();
            
            console.log('All assets loaded successfully');
            
        } catch (error) {
            console.error('Error loading assets:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Carica le texture
     * @private
     */
    async _loadTextures() {
        const promises = this.textureQueue.map(async (textureData) => {
            try {
                const texture = await this._loadTexture(textureData.url, textureData.options);
                this.textures.set(textureData.id, texture);
                this._updateProgress('texture', textureData.id);
            } catch (error) {
                console.error(`Failed to load texture ${textureData.id}:`, error);
                // Crea una texture di fallback
                const fallbackTexture = this._createFallbackTexture();
                this.textures.set(textureData.id, fallbackTexture);
                this._updateProgress('texture', textureData.id);
            }
        });
        
        await Promise.all(promises);
    }
    
    /**
     * Carica una singola texture
     * @param {string} url - URL della texture
     * @param {Object} options - Opzioni della texture
     * @returns {Promise<THREE.Texture>} Promise che si risolve con la texture
     * @private
     */
    _loadTexture(url, options = {}) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    // Applica le opzioni
                    if (options.wrapS) texture.wrapS = THREE[options.wrapS];
                    if (options.wrapT) texture.wrapT = THREE[options.wrapT];
                    if (options.magFilter) texture.magFilter = THREE[options.magFilter];
                    if (options.minFilter) texture.minFilter = THREE[options.minFilter];
                    if (options.flipY !== undefined) texture.flipY = options.flipY;
                    
                    // Imposta il filtro per i pixel art
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }
    
    /**
     * Carica i modelli 3D
     * @private
     */
    async _loadModels() {
        // Per ora, i modelli sono vuoti
        // TODO: Implementare il caricamento dei modelli quando necessario
        for (const modelData of this.modelQueue) {
            this.models.set(modelData.id, null);
            this._updateProgress('model', modelData.id);
        }
    }
    
    /**
     * Carica i suoni
     * @private
     */
    async _loadSounds() {
        // Inizializza l'audio context se necessario
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('Audio context not supported:', error);
                // Salta il caricamento dei suoni
                for (const soundData of this.soundQueue) {
                    this.sounds.set(soundData.id, null);
                    this._updateProgress('sound', soundData.id);
                }
                return;
            }
        }
        
        const promises = this.soundQueue.map(async (soundData) => {
            try {
                const audioBuffer = await this._loadSound(soundData.url);
                this.sounds.set(soundData.id, audioBuffer);
                this._updateProgress('sound', soundData.id);
            } catch (error) {
                console.error(`Failed to load sound ${soundData.id}:`, error);
                this.sounds.set(soundData.id, null);
                this._updateProgress('sound', soundData.id);
            }
        });
        
        await Promise.all(promises);
    }
    
    /**
     * Carica un singolo suono
     * @param {string} url - URL del suono
     * @returns {Promise<AudioBuffer>} Promise che si risolve con l'AudioBuffer
     * @private
     */
    _loadSound(url) {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(
                url,
                resolve,
                undefined,
                reject
            );
        });
    }
    
    /**
     * Carica gli shader
     * @private
     */
    async _loadShaders() {
        // Per ora, gli shader sono vuoti
        // TODO: Implementare il caricamento degli shader quando necessario
        for (const shaderData of this.shaderQueue) {
            this.shaders.set(shaderData.id, null);
            this._updateProgress('shader', shaderData.id);
            this._updateProgress('shader', shaderData.id + '_fragment');
        }
    }
    
    /**
     * Crea una texture di fallback
     * @returns {THREE.Texture} Texture di fallback
     * @private
     */
    _createFallbackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        
        const context = canvas.getContext('2d');
        context.fillStyle = '#ff00ff'; // Magenta per indicare texture mancante
        context.fillRect(0, 0, 16, 16);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return texture;
    }
    
    /**
     * Aggiorna il progresso del caricamento
     * @param {string} assetType - Tipo di risorsa
     * @param {string} assetId - ID della risorsa
     * @private
     */
    _updateProgress(assetType, assetId) {
        this.loadedAssets++;
        const progress = this.loadedAssets / this.totalAssets;
        
        if (this.progressCallback) {
            this.progressCallback(progress, assetType, assetId);
        }
    }
    
    /**
     * Ottiene una texture dalla cache
     * @param {string} id - ID della texture
     * @returns {THREE.Texture|null} Texture o null se non trovata
     */
    getTexture(id) {
        return this.textures.get(id) || null;
    }
    
    /**
     * Ottiene un modello dalla cache
     * @param {string} id - ID del modello
     * @returns {Object|null} Modello o null se non trovato
     */
    getModel(id) {
        return this.models.get(id) || null;
    }
    
    /**
     * Ottiene un suono dalla cache
     * @param {string} id - ID del suono
     * @returns {AudioBuffer|null} AudioBuffer o null se non trovato
     */
    getSound(id) {
        return this.sounds.get(id) || null;
    }
    
    /**
     * Ottiene uno shader dalla cache
     * @param {string} id - ID dello shader
     * @returns {Object|null} Shader o null se non trovato
     */
    getShader(id) {
        return this.shaders.get(id) || null;
    }
    
    /**
     * Crea un audio source da un suono
     * @param {string} soundId - ID del suono
     * @param {THREE.Object3D} object - Oggetto a cui collegare l'audio (opzionale)
     * @returns {THREE.Audio|THREE.PositionalAudio|null} Audio source o null
     */
    createAudioSource(soundId, object = null) {
        const audioBuffer = this.getSound(soundId);
        if (!audioBuffer) return null;
        
        let audio;
        if (object) {
            audio = new THREE.PositionalAudio(this.audioListener);
            object.add(audio);
        } else {
            audio = new THREE.Audio(this.audioListener);
        }
        
        audio.setBuffer(audioBuffer);
        return audio;
    }
    
    /**
     * Imposta il volume globale dell'audio
     * @param {number} volume - Volume da 0 a 1
     */
    setGlobalVolume(volume) {
        this.audioListener.setMasterVolume(volume);
    }
    
    /**
     * Rilascia tutte le risorse
     */
    dispose() {
        // Rilascia le texture
        for (const texture of this.textures.values()) {
            if (texture) texture.dispose();
        }
        
        // Rilascia i modelli
        for (const model of this.models.values()) {
            if (model && model.dispose) model.dispose();
        }
        
        // Pulisci le cache
        this.textures.clear();
        this.models.clear();
        this.sounds.clear();
        this.shaders.clear();
        
        console.log('AssetManager disposed');
    }
}