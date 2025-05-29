/**
 * Chunk.js - Gestione chunk per il sistema voxel
 * 
 * Ogni chunk rappresenta una sezione del mondo contenente voxel.
 * Ottimizzato per performance con gestione efficiente dei dati.
 * 
 * @author Pietro
 * @version 0.1.0-alpha
 */

import * as THREE from 'three';

/**
 * Classe che rappresenta un chunk di voxel
 * Gestisce i dati voxel e le operazioni su di essi
 */
export class Chunk {
    constructor(x, z, size = 16) {
        this.x = x;
        this.z = z;
        this.size = size;
        
        // Array 3D per i dati voxel [x][y][z]
        this.voxels = this.createVoxelArray();
        
        // Mesh Three.js per il rendering
        this.mesh = null;
        
        // Flag per indicare se il chunk necessita di aggiornamento mesh
        this.needsUpdate = true;
        
        // Metadati
        this.generated = false;
        this.loaded = false;
        this.lastAccess = Date.now();
        
        // Statistiche
        this.voxelCount = 0;
        this.solidVoxelCount = 0;
        
        console.log(`Chunk created at (${x}, ${z}) with size ${size}`);
    }
    
    /**
     * Crea l'array 3D per i voxel
     * @returns {Array} Array 3D inizializzato
     */
    createVoxelArray() {
        const array = [];
        
        for (let x = 0; x < this.size; x++) {
            array[x] = [];
            for (let y = 0; y < this.size; y++) {
                array[x][y] = [];
                for (let z = 0; z < this.size; z++) {
                    array[x][y][z] = null; // null = aria, string = tipo voxel
                }
            }
        }
        
        return array;
    }
    
    /**
     * Imposta un voxel alla posizione specificata
     * @param {number} x - Coordinata X locale al chunk
     * @param {number} y - Coordinata Y
     * @param {number} z - Coordinata Z locale al chunk
     * @param {string|null} voxelType - Tipo di voxel o null per aria
     */
    setVoxel(x, y, z, voxelType) {
        if (!this.isValidPosition(x, y, z)) {
            console.warn(`Invalid voxel position: (${x}, ${y}, ${z})`);
            return false;
        }
        
        const oldVoxel = this.voxels[x][y][z];
        this.voxels[x][y][z] = voxelType;
        
        // Aggiorna contatori
        if (oldVoxel === null && voxelType !== null) {
            this.solidVoxelCount++;
        } else if (oldVoxel !== null && voxelType === null) {
            this.solidVoxelCount--;
        }
        
        // Segna per aggiornamento mesh
        this.needsUpdate = true;
        this.lastAccess = Date.now();
        
        return true;
    }
    
    /**
     * Ottieni il tipo di voxel alla posizione specificata
     * @param {number} x - Coordinata X locale al chunk
     * @param {number} y - Coordinata Y
     * @param {number} z - Coordinata Z locale al chunk
     * @returns {string|null} Tipo di voxel o null per aria
     */
    getVoxel(x, y, z) {
        if (!this.isValidPosition(x, y, z)) {
            return null; // Fuori dai limiti = aria
        }
        
        this.lastAccess = Date.now();
        return this.voxels[x][y][z];
    }
    
    /**
     * Verifica se la posizione è valida nel chunk
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    isValidPosition(x, y, z) {
        return x >= 0 && x < this.size &&
               y >= 0 && y < this.size &&
               z >= 0 && z < this.size;
    }
    
    /**
     * Verifica se un voxel è solido (non aria)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    isSolid(x, y, z) {
        const voxel = this.getVoxel(x, y, z);
        return voxel !== null && voxel !== undefined;
    }
    
    /**
     * Verifica se una faccia del voxel è esposta (visibile)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} face - 'top', 'bottom', 'north', 'south', 'east', 'west'
     * @returns {boolean}
     */
    isFaceExposed(x, y, z, face) {
        if (!this.isSolid(x, y, z)) {
            return false;
        }
        
        const offsets = {
            top: [0, 1, 0],
            bottom: [0, -1, 0],
            north: [0, 0, -1],
            south: [0, 0, 1],
            east: [1, 0, 0],
            west: [-1, 0, 0]
        };
        
        const [dx, dy, dz] = offsets[face];
        const neighborX = x + dx;
        const neighborY = y + dy;
        const neighborZ = z + dz;
        
        // Se il vicino è fuori dal chunk, considera esposto
        // (sarà gestito dal chunk adiacente)
        if (!this.isValidPosition(neighborX, neighborY, neighborZ)) {
            return true;
        }
        
        // La faccia è esposta se il vicino non è solido
        return !this.isSolid(neighborX, neighborY, neighborZ);
    }
    
    /**
     * Ottieni tutti i voxel solidi nel chunk
     * @returns {Array} Array di oggetti {x, y, z, type}
     */
    getSolidVoxels() {
        const solidVoxels = [];
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    const voxelType = this.voxels[x][y][z];
                    if (voxelType !== null) {
                        solidVoxels.push({ x, y, z, type: voxelType });
                    }
                }
            }
        }
        
        return solidVoxels;
    }
    
    /**
     * Ottieni le facce esposte per il meshing
     * @returns {Array} Array di facce esposte
     */
    getExposedFaces() {
        const exposedFaces = [];
        const faces = ['top', 'bottom', 'north', 'south', 'east', 'west'];
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    if (this.isSolid(x, y, z)) {
                        const voxelType = this.getVoxel(x, y, z);
                        
                        faces.forEach(face => {
                            if (this.isFaceExposed(x, y, z, face)) {
                                exposedFaces.push({
                                    x, y, z,
                                    face,
                                    type: voxelType
                                });
                            }
                        });
                    }
                }
            }
        }
        
        return exposedFaces;
    }
    
    /**
     * Riempie il chunk con un pattern di test
     */
    fillTestPattern() {
        // Pattern semplice per test
        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                // Altezza variabile
                const height = Math.floor(Math.random() * 8) + 2;
                
                for (let y = 0; y < height && y < this.size; y++) {
                    let voxelType;
                    
                    if (y === 0) {
                        voxelType = 'stone'; // Bedrock
                    } else if (y === height - 1) {
                        voxelType = 'grass'; // Superficie
                    } else {
                        voxelType = 'dirt'; // Sottosuolo
                    }
                    
                    this.setVoxel(x, y, z, voxelType);
                }
            }
        }
        
        this.generated = true;
        console.log(`Test pattern generated for chunk (${this.x}, ${this.z})`);
    }
    
    /**
     * Svuota il chunk (rimuovi tutti i voxel)
     */
    clear() {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    this.voxels[x][y][z] = null;
                }
            }
        }
        
        this.solidVoxelCount = 0;
        this.needsUpdate = true;
        this.generated = false;
        
        console.log(`Chunk (${this.x}, ${this.z}) cleared`);
    }
    
    /**
     * Ottieni il numero totale di voxel nel chunk
     * @returns {number}
     */
    getVoxelCount() {
        return this.size * this.size * this.size;
    }
    
    /**
     * Ottieni il numero di voxel solidi
     * @returns {number}
     */
    getSolidVoxelCount() {
        return this.solidVoxelCount;
    }
    
    /**
     * Verifica se il chunk è vuoto
     * @returns {boolean}
     */
    isEmpty() {
        return this.solidVoxelCount === 0;
    }
    
    /**
     * Ottieni le coordinate mondo del chunk
     * @param {number} voxelSize - Dimensione di un voxel
     * @returns {Object} {x, z} coordinate mondo
     */
    getWorldPosition(voxelSize = 1) {
        return {
            x: this.x * this.size * voxelSize,
            z: this.z * this.size * voxelSize
        };
    }
    
    /**
     * Serializza il chunk per il salvataggio
     * @returns {Object} Dati serializzati
     */
    serialize() {
        const data = {
            x: this.x,
            z: this.z,
            size: this.size,
            generated: this.generated,
            voxels: []
        };
        
        // Salva solo i voxel solidi per efficienza
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    const voxelType = this.voxels[x][y][z];
                    if (voxelType !== null) {
                        data.voxels.push({ x, y, z, type: voxelType });
                    }
                }
            }
        }
        
        return data;
    }
    
    /**
     * Deserializza i dati del chunk
     * @param {Object} data - Dati serializzati
     */
    deserialize(data) {
        this.clear();
        
        this.x = data.x;
        this.z = data.z;
        this.size = data.size;
        this.generated = data.generated;
        
        // Ripristina i voxel
        data.voxels.forEach(voxel => {
            this.setVoxel(voxel.x, voxel.y, voxel.z, voxel.type);
        });
        
        console.log(`Chunk (${this.x}, ${this.z}) deserialized with ${data.voxels.length} voxels`);
    }
    
    /**
     * Ottieni informazioni di debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            position: { x: this.x, z: this.z },
            size: this.size,
            voxelCount: this.getVoxelCount(),
            solidVoxelCount: this.getSolidVoxelCount(),
            isEmpty: this.isEmpty(),
            generated: this.generated,
            loaded: this.loaded,
            needsUpdate: this.needsUpdate,
            lastAccess: this.lastAccess,
            hasMesh: this.mesh !== null
        };
    }
    
    /**
     * Cleanup risorse
     */
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(mat => mat.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }
        
        this.voxels = null;
        console.log(`Chunk (${this.x}, ${this.z}) disposed`);
    }
}