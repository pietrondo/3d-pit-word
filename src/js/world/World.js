/**
 * 3D Pit Word - World Manager
 * 
 * Gestisce il mondo di gioco, inclusi chunk, generazione del terreno,
 * fisica e interazioni con i blocchi.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from '../config/config.js';
import { VoxelWorld } from './VoxelWorld.js';
import { TerrainGenerator } from './TerrainGenerator.js';

export class World {
    /**
     * Costruttore del World
     * @param {Game} game - Riferimento al gioco principale
     */
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.assetManager = game.assetManager;
        
        // Mondo voxel
        this.voxelWorld = new VoxelWorld(this.scene, this.assetManager);
        
        // Mondo fisico
        this.physicsWorld = new CANNON.World();
        this.initPhysics();
        
        // Generatore del terreno
        this.terrainGenerator = new TerrainGenerator();
        
        // Stato del mondo
        this.isLoaded = false;
        this.seed = Math.random() * 1000000;
        
        // Performance tracking
        this.lastUpdate = 0;
        this.updateInterval = 1000 / 60; // 60 FPS
        
        console.log('World initialized with seed:', this.seed);
    }
    
    /**
     * Inizializza il mondo fisico
     * @private
     */
    initPhysics() {
        // Configura la gravità
        this.physicsWorld.gravity.set(0, CONFIG.PHYSICS.GRAVITY, 0);
        
        // Configura il solver
        this.physicsWorld.defaultContactMaterial.friction = CONFIG.PHYSICS.FRICTION;
        this.physicsWorld.defaultContactMaterial.restitution = CONFIG.PHYSICS.RESTITUTION;
        
        // Configura il broadphase per performance migliori
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
        
        console.log('Physics world initialized');
    }
    
    /**
     * Carica il mondo iniziale
     * @param {THREE.Vector3} playerPosition - Posizione iniziale del giocatore
     */
    async load(playerPosition) {
        try {
            console.log('Loading world around player position:', playerPosition);
            
            // Genera i chunk iniziali attorno al giocatore
            await this.voxelWorld.loadChunksAroundPosition(playerPosition);
            
            this.isLoaded = true;
            console.log('World loaded successfully');
            
        } catch (error) {
            console.error('Error loading world:', error);
            throw error;
        }
    }
    
    /**
     * Aggiorna il mondo
     * @param {number} deltaTime - Tempo trascorso dall'ultimo frame
     * @param {THREE.Vector3} playerPosition - Posizione attuale del giocatore
     */
    update(deltaTime, playerPosition) {
        const now = performance.now();
        
        // Limita gli aggiornamenti per performance
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }
        
        // Aggiorna il mondo fisico
        this.physicsWorld.step(deltaTime);
        
        // Aggiorna il mondo voxel
        this.voxelWorld.update(playerPosition);
        
        this.lastUpdate = now;
    }
    
    /**
     * Ottiene il blocco alle coordinate del mondo
     * @param {number} x - Coordinata X del mondo
     * @param {number} y - Coordinata Y del mondo
     * @param {number} z - Coordinata Z del mondo
     * @returns {string|null} Tipo di blocco o null se non trovato
     */
    getBlock(x, y, z) {
        return this.voxelWorld.getBlock(x, y, z);
    }
    
    /**
     * Imposta un blocco alle coordinate del mondo
     * @param {number} x - Coordinata X del mondo
     * @param {number} y - Coordinata Y del mondo
     * @param {number} z - Coordinata Z del mondo
     * @param {string} blockType - Tipo di blocco da piazzare
     * @returns {boolean} True se il blocco è stato piazzato con successo
     */
    setBlock(x, y, z, blockType) {
        return this.voxelWorld.setBlock(x, y, z, blockType);
    }
    
    /**
     * Rimuove un blocco alle coordinate del mondo
     * @param {number} x - Coordinata X del mondo
     * @param {number} y - Coordinata Y del mondo
     * @param {number} z - Coordinata Z del mondo
     * @returns {boolean} True se il blocco è stato rimosso con successo
     */
    removeBlock(x, y, z) {
        return this.voxelWorld.setBlock(x, y, z, 'air');
    }
    
    /**
     * Esegue un raycast nel mondo per trovare blocchi
     * @param {THREE.Vector3} origin - Punto di origine del ray
     * @param {THREE.Vector3} direction - Direzione del ray
     * @param {number} maxDistance - Distanza massima del ray
     * @returns {Object|null} Informazioni sul blocco colpito o null
     */
    raycast(origin, direction, maxDistance = 10) {
        return this.voxelWorld.raycast(origin, direction, maxDistance);
    }
    
    /**
     * Ottiene l'altezza del terreno a una posizione X,Z
     * @param {number} x - Coordinata X
     * @param {number} z - Coordinata Z
     * @returns {number} Altezza del terreno
     */
    getTerrainHeight(x, z) {
        return this.terrainGenerator.getHeight(x, z);
    }
    
    /**
     * Ottiene il bioma a una posizione X,Z
     * @param {number} x - Coordinata X
     * @param {number} z - Coordinata Z
     * @returns {Object} Informazioni sul bioma
     */
    getBiome(x, z) {
        return this.terrainGenerator.getBiome(x, z);
    }
    
    /**
     * Aggiunge un corpo fisico al mondo
     * @param {CANNON.Body} body - Corpo fisico da aggiungere
     */
    addPhysicsBody(body) {
        this.physicsWorld.addBody(body);
    }
    
    /**
     * Rimuove un corpo fisico dal mondo
     * @param {CANNON.Body} body - Corpo fisico da rimuovere
     */
    removePhysicsBody(body) {
        this.physicsWorld.removeBody(body);
    }
    
    /**
     * Ottiene statistiche del mondo per il debug
     * @returns {Object} Statistiche del mondo
     */
    getStats() {
        return {
            chunksLoaded: this.voxelWorld.chunksLoaded,
            chunksGenerated: this.voxelWorld.chunksGenerated,
            physicsBodies: this.physicsWorld.bodies.length,
            seed: this.seed,
            isLoaded: this.isLoaded
        };
    }
    
    /**
     * Pulisce le risorse del mondo
     */
    dispose() {
        console.log('Disposing world resources...');
        
        // Pulisci il mondo voxel
        if (this.voxelWorld) {
            this.voxelWorld.dispose();
        }
        
        // Pulisci il mondo fisico
        this.physicsWorld.bodies.forEach(body => {
            this.physicsWorld.removeBody(body);
        });
        
        console.log('World disposed');
    }
}