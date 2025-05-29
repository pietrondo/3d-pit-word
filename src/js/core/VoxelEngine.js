/**
 * VoxelEngine.js - Core del motore voxel per 3D Pit Word
 * 
 * Implementa il sistema di gestione voxel basato su chunk con ottimizzazioni
 * per performance seguendo le best practices identificate nella ricerca.
 * 
 * Features:
 * - Chunk-based world management
 * - Greedy meshing per ottimizzazione
 * - InstancedMesh per performance
 * - Raycasting per interazione
 * 
 * @author Pietro
 * @version 0.1.0-alpha
 */

import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { VoxelMesher } from './VoxelMesher.js';
import { ObjectPool } from '../utils/ObjectPool.js';

/**
 * Classe principale del motore voxel
 * Gestisce chunk, rendering e interazioni
 */
export class VoxelEngine {
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Configurazione
        this.config = {
            chunkSize: options.chunkSize || 16,
            renderDistance: options.renderDistance || 8,
            voxelSize: options.voxelSize || 1,
            maxChunks: options.maxChunks || 100,
            ...options
        };
        
        // Gestione chunk
        this.chunks = new Map();
        this.loadedChunks = new Set();
        this.chunkQueue = [];
        
        // Sistemi di ottimizzazione
        this.meshPool = new ObjectPool(() => new THREE.Mesh());
        this.geometryPool = new ObjectPool(() => new THREE.BufferGeometry());
        this.mesher = new VoxelMesher(this.config);
        
        // Raycasting per interazione
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Materiali voxel
        this.materials = this.createMaterials();
        
        // Performance tracking
        this.stats = {
            chunksLoaded: 0,
            voxelsRendered: 0,
            meshesGenerated: 0,
            lastFrameTime: 0
        };
        
        console.log('VoxelEngine initialized with config:', this.config);
    }
    
    /**
     * Crea i materiali per i diversi tipi di voxel
     */
    createMaterials() {
        const materials = new Map();
        
        // Materiale base per voxel
        const baseMaterial = new THREE.MeshLambertMaterial({
            color: 0x00ff00,
            transparent: false,
            side: THREE.FrontSide
        });
        
        materials.set('grass', baseMaterial);
        materials.set('stone', new THREE.MeshLambertMaterial({ color: 0x888888 }));
        materials.set('dirt', new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
        
        return materials;
    }
    
    /**
     * Aggiorna il motore voxel
     * @param {number} deltaTime - Tempo trascorso dall'ultimo frame
     * @param {THREE.Vector3} playerPosition - Posizione del giocatore
     */
    update(deltaTime, playerPosition) {
        this.stats.lastFrameTime = deltaTime;
        
        // Aggiorna chunk basandosi sulla posizione del giocatore
        this.updateChunks(playerPosition);
        
        // Processa la coda di generazione chunk
        this.processChunkQueue();
        
        // Aggiorna statistiche
        this.updateStats();
    }
    
    /**
     * Aggiorna i chunk basandosi sulla posizione del giocatore
     * @param {THREE.Vector3} playerPosition
     */
    updateChunks(playerPosition) {
        const playerChunk = this.worldToChunk(playerPosition);
        const renderDistance = this.config.renderDistance;
        
        // Trova chunk da caricare
        const chunksToLoad = [];
        for (let x = playerChunk.x - renderDistance; x <= playerChunk.x + renderDistance; x++) {
            for (let z = playerChunk.z - renderDistance; z <= playerChunk.z + renderDistance; z++) {
                const chunkKey = `${x},${z}`;
                if (!this.chunks.has(chunkKey)) {
                    chunksToLoad.push({ x, z, key: chunkKey });
                }
            }
        }
        
        // Aggiungi alla coda di caricamento
        chunksToLoad.forEach(chunk => {
            if (!this.chunkQueue.find(c => c.key === chunk.key)) {
                this.chunkQueue.push(chunk);
            }
        });
        
        // Rimuovi chunk troppo lontani
        this.unloadDistantChunks(playerChunk, renderDistance);
    }
    
    /**
     * Processa la coda di generazione chunk
     */
    processChunkQueue() {
        const maxChunksPerFrame = 1; // Limita per evitare lag
        let processed = 0;
        
        while (this.chunkQueue.length > 0 && processed < maxChunksPerFrame) {
            const chunkData = this.chunkQueue.shift();
            this.loadChunk(chunkData.x, chunkData.z);
            processed++;
        }
    }
    
    /**
     * Carica un chunk
     * @param {number} x - Coordinata X del chunk
     * @param {number} z - Coordinata Z del chunk
     */
    loadChunk(x, z) {
        const chunkKey = `${x},${z}`;
        
        if (this.chunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }
        
        // Crea nuovo chunk
        const chunk = new Chunk(x, z, this.config.chunkSize);
        
        // Genera dati voxel (placeholder - da sostituire con generazione procedurale)
        this.generateChunkData(chunk);
        
        // Genera mesh
        const mesh = this.mesher.generateMesh(chunk, this.materials);
        if (mesh) {
            mesh.position.set(
                x * this.config.chunkSize * this.config.voxelSize,
                0,
                z * this.config.chunkSize * this.config.voxelSize
            );
            
            this.scene.add(mesh);
            chunk.mesh = mesh;
        }
        
        this.chunks.set(chunkKey, chunk);
        this.loadedChunks.add(chunkKey);
        this.stats.chunksLoaded++;
        
        console.log(`Chunk loaded: ${chunkKey}`);
        return chunk;
    }
    
    /**
     * Genera dati voxel per un chunk (placeholder)
     * @param {Chunk} chunk
     */
    generateChunkData(chunk) {
        const size = this.config.chunkSize;
        
        // Generazione semplice per test
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                // Altezza base del terreno
                const height = Math.floor(Math.random() * 4) + 2;
                
                for (let y = 0; y < height; y++) {
                    const voxelType = y === height - 1 ? 'grass' : 'dirt';
                    chunk.setVoxel(x, y, z, voxelType);
                }
            }
        }
    }
    
    /**
     * Rimuove chunk troppo lontani
     * @param {Object} playerChunk
     * @param {number} renderDistance
     */
    unloadDistantChunks(playerChunk, renderDistance) {
        const chunksToUnload = [];
        
        this.chunks.forEach((chunk, key) => {
            const [x, z] = key.split(',').map(Number);
            const distance = Math.max(
                Math.abs(x - playerChunk.x),
                Math.abs(z - playerChunk.z)
            );
            
            if (distance > renderDistance + 2) {
                chunksToUnload.push(key);
            }
        });
        
        chunksToUnload.forEach(key => this.unloadChunk(key));
    }
    
    /**
     * Scarica un chunk
     * @param {string} chunkKey
     */
    unloadChunk(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return;
        
        // Rimuovi mesh dalla scena
        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            
            // Restituisci oggetti al pool
            if (chunk.mesh.geometry) {
                chunk.mesh.geometry.dispose();
            }
            this.meshPool.release(chunk.mesh);
        }
        
        this.chunks.delete(chunkKey);
        this.loadedChunks.delete(chunkKey);
        this.stats.chunksLoaded--;
        
        console.log(`Chunk unloaded: ${chunkKey}`);
    }
    
    /**
     * Converte coordinate mondo in coordinate chunk
     * @param {THREE.Vector3} worldPos
     * @returns {Object}
     */
    worldToChunk(worldPos) {
        const chunkSize = this.config.chunkSize * this.config.voxelSize;
        return {
            x: Math.floor(worldPos.x / chunkSize),
            z: Math.floor(worldPos.z / chunkSize)
        };
    }
    
    /**
     * Raycasting per interazione con voxel
     * @param {THREE.Camera} camera
     * @param {THREE.Vector2} mousePos - Posizione mouse normalizzata (-1 a 1)
     * @returns {Object|null} Informazioni sul voxel colpito
     */
    raycast(camera, mousePos) {
        this.raycaster.setFromCamera(mousePos, camera);
        
        const meshes = [];
        this.chunks.forEach(chunk => {
            if (chunk.mesh) {
                meshes.push(chunk.mesh);
            }
        });
        
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const worldPos = intersection.point;
            
            // Converti in coordinate voxel
            const voxelPos = this.worldToVoxel(worldPos, intersection.face.normal);
            
            return {
                position: voxelPos,
                normal: intersection.face.normal,
                distance: intersection.distance,
                chunk: this.getChunkAt(worldPos)
            };
        }
        
        return null;
    }
    
    /**
     * Converte coordinate mondo in coordinate voxel
     * @param {THREE.Vector3} worldPos
     * @param {THREE.Vector3} normal
     * @returns {THREE.Vector3}
     */
    worldToVoxel(worldPos, normal) {
        const voxelSize = this.config.voxelSize;
        
        // Aggiusta la posizione basandosi sulla normale per il piazzamento
        const adjustedPos = worldPos.clone().sub(normal.clone().multiplyScalar(0.1));
        
        return new THREE.Vector3(
            Math.floor(adjustedPos.x / voxelSize),
            Math.floor(adjustedPos.y / voxelSize),
            Math.floor(adjustedPos.z / voxelSize)
        );
    }
    
    /**
     * Ottieni chunk alla posizione specificata
     * @param {THREE.Vector3} worldPos
     * @returns {Chunk|null}
     */
    getChunkAt(worldPos) {
        const chunkCoords = this.worldToChunk(worldPos);
        const chunkKey = `${chunkCoords.x},${chunkCoords.z}`;
        return this.chunks.get(chunkKey) || null;
    }
    
    /**
     * Aggiorna statistiche
     */
    updateStats() {
        this.stats.voxelsRendered = 0;
        this.chunks.forEach(chunk => {
            if (chunk.mesh && chunk.mesh.visible) {
                this.stats.voxelsRendered += chunk.getVoxelCount();
            }
        });
    }
    
    /**
     * Ottieni statistiche performance
     * @returns {Object}
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Cleanup risorse
     */
    dispose() {
        // Rimuovi tutti i chunk
        this.chunks.forEach((chunk, key) => {
            this.unloadChunk(key);
        });
        
        // Cleanup pool
        this.meshPool.dispose();
        this.geometryPool.dispose();
        
        // Cleanup materiali
        this.materials.forEach(material => {
            material.dispose();
        });
        
        console.log('VoxelEngine disposed');
    }
}