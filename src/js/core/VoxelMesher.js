/**
 * VoxelMesher.js - Sistema di meshing per voxel
 * 
 * Implementa algoritmi di meshing ottimizzati per convertire
 * i dati voxel in mesh Three.js renderizzabili.
 * 
 * Features:
 * - Greedy Meshing per ridurre il numero di facce
 * - Face Culling per nascondere facce interne
 * - Supporto multi-materiale
 * - Ottimizzazioni per performance
 * 
 * @author Pietro
 * @version 0.1.0-alpha
 */

import * as THREE from 'three';

/**
 * Classe per la generazione di mesh da dati voxel
 */
export class VoxelMesher {
    constructor(config = {}) {
        this.config = {
            voxelSize: config.voxelSize || 1,
            enableGreedyMeshing: config.enableGreedyMeshing !== false,
            enableFaceCulling: config.enableFaceCulling !== false,
            generateUVs: config.generateUVs !== false,
            generateNormals: config.generateNormals !== false,
            ...config
        };
        
        // Cache per geometrie riutilizzabili
        this.geometryCache = new Map();
        
        // Definizioni delle facce dei cubi
        this.faceDefinitions = this.createFaceDefinitions();
        
        console.log('VoxelMesher initialized with config:', this.config);
    }
    
    /**
     * Crea le definizioni delle facce per i cubi voxel
     */
    createFaceDefinitions() {
        const size = this.config.voxelSize;
        const half = size / 2;
        
        return {
            // Faccia superiore (Y+)
            top: {
                vertices: [
                    [-half, half, -half], [half, half, -half], [half, half, half],
                    [-half, half, -half], [half, half, half], [-half, half, half]
                ],
                normal: [0, 1, 0],
                uvs: [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]
            },
            // Faccia inferiore (Y-)
            bottom: {
                vertices: [
                    [-half, -half, half], [half, -half, half], [half, -half, -half],
                    [-half, -half, half], [half, -half, -half], [-half, -half, -half]
                ],
                normal: [0, -1, 0],
                uvs: [[0, 1], [1, 1], [1, 0], [0, 1], [1, 0], [0, 0]]
            },
            // Faccia nord (Z-)
            north: {
                vertices: [
                    [-half, -half, -half], [half, -half, -half], [half, half, -half],
                    [-half, -half, -half], [half, half, -half], [-half, half, -half]
                ],
                normal: [0, 0, -1],
                uvs: [[1, 1], [0, 1], [0, 0], [1, 1], [0, 0], [1, 0]]
            },
            // Faccia sud (Z+)
            south: {
                vertices: [
                    [half, -half, half], [-half, -half, half], [-half, half, half],
                    [half, -half, half], [-half, half, half], [half, half, half]
                ],
                normal: [0, 0, 1],
                uvs: [[0, 1], [1, 1], [1, 0], [0, 1], [1, 0], [0, 0]]
            },
            // Faccia est (X+)
            east: {
                vertices: [
                    [half, -half, -half], [half, -half, half], [half, half, half],
                    [half, -half, -half], [half, half, half], [half, half, -half]
                ],
                normal: [1, 0, 0],
                uvs: [[0, 1], [1, 1], [1, 0], [0, 1], [1, 0], [0, 0]]
            },
            // Faccia ovest (X-)
            west: {
                vertices: [
                    [-half, -half, half], [-half, -half, -half], [-half, half, -half],
                    [-half, -half, half], [-half, half, -half], [-half, half, half]
                ],
                normal: [-1, 0, 0],
                uvs: [[0, 1], [1, 1], [1, 0], [0, 1], [1, 0], [0, 0]]
            }
        };
    }
    
    /**
     * Genera mesh per un chunk
     * @param {Chunk} chunk - Chunk da processare
     * @param {Map} materials - Mappa dei materiali per tipo voxel
     * @returns {THREE.Mesh|null} Mesh generata
     */
    generateMesh(chunk, materials) {
        if (chunk.isEmpty()) {
            return null;
        }
        
        const geometry = this.config.enableGreedyMeshing ?
            this.generateGreedyMesh(chunk) :
            this.generateSimpleMesh(chunk);
        
        if (!geometry || geometry.attributes.position.count === 0) {
            return null;
        }
        
        // Usa il primo materiale disponibile per ora
        // TODO: Implementare supporto multi-materiale
        const material = materials.get('grass') || new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Aggiungi metadati
        mesh.userData = {
            chunkX: chunk.x,
            chunkZ: chunk.z,
            voxelCount: chunk.getSolidVoxelCount()
        };
        
        return mesh;
    }
    
    /**
     * Genera mesh semplice (una faccia per ogni lato esposto)
     * @param {Chunk} chunk
     * @returns {THREE.BufferGeometry}
     */
    generateSimpleMesh(chunk) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        let vertexIndex = 0;
        
        const exposedFaces = chunk.getExposedFaces();
        
        exposedFaces.forEach(faceData => {
            const { x, y, z, face } = faceData;
            const faceDefinition = this.faceDefinitions[face];
            
            if (!faceDefinition) return;
            
            // Aggiungi vertici per questa faccia
            faceDefinition.vertices.forEach(vertex => {
                vertices.push(
                    x * this.config.voxelSize + vertex[0],
                    y * this.config.voxelSize + vertex[1],
                    z * this.config.voxelSize + vertex[2]
                );
            });
            
            // Aggiungi normali
            for (let i = 0; i < 6; i++) {
                normals.push(...faceDefinition.normal);
            }
            
            // Aggiungi UV coordinates
            if (this.config.generateUVs) {
                faceDefinition.uvs.forEach(uv => {
                    uvs.push(uv[0], uv[1]);
                });
            }
            
            // Aggiungi indici per i triangoli
            for (let i = 0; i < 6; i++) {
                indices.push(vertexIndex + i);
            }
            
            vertexIndex += 6;
        });
        
        // Crea geometria
        const geometry = new THREE.BufferGeometry();
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        if (this.config.generateNormals && normals.length > 0) {
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        }
        
        if (this.config.generateUVs && uvs.length > 0) {
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        }
        
        geometry.setIndex(indices);
        
        // Calcola normali se non generate manualmente
        if (!this.config.generateNormals) {
            geometry.computeVertexNormals();
        }
        
        return geometry;
    }
    
    /**
     * Genera mesh con greedy meshing (ottimizzato)
     * @param {Chunk} chunk
     * @returns {THREE.BufferGeometry}
     */
    generateGreedyMesh(chunk) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        let vertexIndex = 0;
        
        // Processa ogni direzione separatamente
        const directions = [
            { name: 'top', axis: 1, dir: 1 },
            { name: 'bottom', axis: 1, dir: -1 },
            { name: 'north', axis: 2, dir: -1 },
            { name: 'south', axis: 2, dir: 1 },
            { name: 'east', axis: 0, dir: 1 },
            { name: 'west', axis: 0, dir: -1 }
        ];
        
        directions.forEach(direction => {
            const quads = this.generateGreedyQuads(chunk, direction);
            
            quads.forEach(quad => {
                const quadVertices = this.createQuadVertices(quad, direction);
                const faceDefinition = this.faceDefinitions[direction.name];
                
                // Aggiungi vertici
                quadVertices.forEach(vertex => {
                    vertices.push(vertex.x, vertex.y, vertex.z);
                });
                
                // Aggiungi normali
                for (let i = 0; i < 4; i++) {
                    normals.push(...faceDefinition.normal);
                }
                
                // Aggiungi UV (scalate per la dimensione del quad)
                if (this.config.generateUVs) {
                    const scaleU = quad.width;
                    const scaleV = quad.height;
                    
                    uvs.push(0, 0);
                    uvs.push(scaleU, 0);
                    uvs.push(scaleU, scaleV);
                    uvs.push(0, scaleV);
                }
                
                // Aggiungi indici per due triangoli
                indices.push(
                    vertexIndex, vertexIndex + 1, vertexIndex + 2,
                    vertexIndex, vertexIndex + 2, vertexIndex + 3
                );
                
                vertexIndex += 4;
            });
        });
        
        // Crea geometria
        const geometry = new THREE.BufferGeometry();
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        if (this.config.generateNormals && normals.length > 0) {
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        }
        
        if (this.config.generateUVs && uvs.length > 0) {
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        }
        
        geometry.setIndex(indices);
        
        if (!this.config.generateNormals) {
            geometry.computeVertexNormals();
        }
        
        return geometry;
    }
    
    /**
     * Genera quad ottimizzati per una direzione usando greedy meshing
     * @param {Chunk} chunk
     * @param {Object} direction
     * @returns {Array} Array di quad
     */
    generateGreedyQuads(chunk, direction) {
        const quads = [];
        const size = chunk.size;
        const visited = new Set();
        
        // Determina gli assi basandosi sulla direzione
        const axes = this.getAxesForDirection(direction.axis);
        const [u, v, w] = axes;
        
        // Scansiona il piano
        for (let wPos = 0; wPos < size; wPos++) {
            for (let vPos = 0; vPos < size; vPos++) {
                for (let uPos = 0; uPos < size; uPos++) {
                    const pos = this.createPosition(uPos, vPos, wPos, direction.axis);
                    const key = `${pos.x},${pos.y},${pos.z},${direction.name}`;
                    
                    if (visited.has(key)) continue;
                    
                    // Verifica se questa faccia dovrebbe essere renderizzata
                    if (!this.shouldRenderFace(chunk, pos.x, pos.y, pos.z, direction)) {
                        continue;
                    }
                    
                    // Trova il quad più grande possibile
                    const quad = this.findLargestQuad(chunk, pos, direction, visited);
                    if (quad) {
                        quads.push(quad);
                    }
                }
            }
        }
        
        return quads;
    }
    
    /**
     * Trova il quad più grande possibile partendo da una posizione
     * @param {Chunk} chunk
     * @param {Object} startPos
     * @param {Object} direction
     * @param {Set} visited
     * @returns {Object|null} Quad trovato
     */
    findLargestQuad(chunk, startPos, direction, visited) {
        const voxelType = chunk.getVoxel(startPos.x, startPos.y, startPos.z);
        if (!voxelType) return null;
        
        let width = 1;
        let height = 1;
        
        // Espandi in larghezza
        const axes = this.getAxesForDirection(direction.axis);
        const [uAxis, vAxis] = axes;
        
        // Trova larghezza massima
        while (this.canExpandQuad(chunk, startPos, direction, width, 1, voxelType)) {
            width++;
        }
        
        // Trova altezza massima
        while (this.canExpandQuad(chunk, startPos, direction, width, height, voxelType)) {
            height++;
        }
        
        // Segna come visitati
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const pos = this.getQuadPosition(startPos, direction, w, h);
                const key = `${pos.x},${pos.y},${pos.z},${direction.name}`;
                visited.add(key);
            }
        }
        
        return {
            x: startPos.x,
            y: startPos.y,
            z: startPos.z,
            width,
            height,
            type: voxelType,
            direction: direction.name
        };
    }
    
    /**
     * Verifica se un quad può essere espanso
     * @param {Chunk} chunk
     * @param {Object} startPos
     * @param {Object} direction
     * @param {number} width
     * @param {number} height
     * @param {string} voxelType
     * @returns {boolean}
     */
    canExpandQuad(chunk, startPos, direction, width, height, voxelType) {
        // Verifica tutti i voxel nel quad espanso
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const pos = this.getQuadPosition(startPos, direction, w, h);
                
                // Verifica limiti
                if (!chunk.isValidPosition(pos.x, pos.y, pos.z)) {
                    return false;
                }
                
                // Verifica tipo voxel
                if (chunk.getVoxel(pos.x, pos.y, pos.z) !== voxelType) {
                    return false;
                }
                
                // Verifica se la faccia dovrebbe essere renderizzata
                if (!this.shouldRenderFace(chunk, pos.x, pos.y, pos.z, direction)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Ottieni la posizione di un punto nel quad
     * @param {Object} startPos
     * @param {Object} direction
     * @param {number} u
     * @param {number} v
     * @returns {Object}
     */
    getQuadPosition(startPos, direction, u, v) {
        const pos = { x: startPos.x, y: startPos.y, z: startPos.z };
        
        switch (direction.axis) {
            case 0: // X axis
                pos.y += v;
                pos.z += u;
                break;
            case 1: // Y axis
                pos.x += u;
                pos.z += v;
                break;
            case 2: // Z axis
                pos.x += u;
                pos.y += v;
                break;
        }
        
        return pos;
    }
    
    /**
     * Verifica se una faccia dovrebbe essere renderizzata
     * @param {Chunk} chunk
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {Object} direction
     * @returns {boolean}
     */
    shouldRenderFace(chunk, x, y, z, direction) {
        if (!chunk.isSolid(x, y, z)) {
            return false;
        }
        
        return chunk.isFaceExposed(x, y, z, direction.name);
    }
    
    /**
     * Crea vertici per un quad
     * @param {Object} quad
     * @param {Object} direction
     * @returns {Array} Array di vertici
     */
    createQuadVertices(quad, direction) {
        const size = this.config.voxelSize;
        const vertices = [];
        
        const x = quad.x * size;
        const y = quad.y * size;
        const z = quad.z * size;
        const w = quad.width * size;
        const h = quad.height * size;
        
        switch (direction.name) {
            case 'top':
                vertices.push(
                    { x: x, y: y + size, z: z },
                    { x: x + w, y: y + size, z: z },
                    { x: x + w, y: y + size, z: z + h },
                    { x: x, y: y + size, z: z + h }
                );
                break;
            case 'bottom':
                vertices.push(
                    { x: x, y: y, z: z + h },
                    { x: x + w, y: y, z: z + h },
                    { x: x + w, y: y, z: z },
                    { x: x, y: y, z: z }
                );
                break;
            case 'north':
                vertices.push(
                    { x: x, y: y, z: z },
                    { x: x + w, y: y, z: z },
                    { x: x + w, y: y + h, z: z },
                    { x: x, y: y + h, z: z }
                );
                break;
            case 'south':
                vertices.push(
                    { x: x + w, y: y, z: z + size },
                    { x: x, y: y, z: z + size },
                    { x: x, y: y + h, z: z + size },
                    { x: x + w, y: y + h, z: z + size }
                );
                break;
            case 'east':
                vertices.push(
                    { x: x + size, y: y, z: z },
                    { x: x + size, y: y, z: z + w },
                    { x: x + size, y: y + h, z: z + w },
                    { x: x + size, y: y + h, z: z }
                );
                break;
            case 'west':
                vertices.push(
                    { x: x, y: y, z: z + w },
                    { x: x, y: y, z: z },
                    { x: x, y: y + h, z: z },
                    { x: x, y: y + h, z: z + w }
                );
                break;
        }
        
        return vertices;
    }
    
    /**
     * Ottieni gli assi per una direzione
     * @param {number} axis
     * @returns {Array}
     */
    getAxesForDirection(axis) {
        switch (axis) {
            case 0: return [1, 2, 0]; // X: Y, Z, X
            case 1: return [0, 2, 1]; // Y: X, Z, Y
            case 2: return [0, 1, 2]; // Z: X, Y, Z
            default: return [0, 1, 2];
        }
    }
    
    /**
     * Crea posizione basandosi su assi
     * @param {number} u
     * @param {number} v
     * @param {number} w
     * @param {number} axis
     * @returns {Object}
     */
    createPosition(u, v, w, axis) {
        switch (axis) {
            case 0: return { x: w, y: u, z: v };
            case 1: return { x: u, y: w, z: v };
            case 2: return { x: u, y: v, z: w };
            default: return { x: u, y: v, z: w };
        }
    }
    
    /**
     * Cleanup cache
     */
    clearCache() {
        this.geometryCache.clear();
    }
    
    /**
     * Ottieni statistiche
     * @returns {Object}
     */
    getStats() {
        return {
            cacheSize: this.geometryCache.size,
            greedyMeshingEnabled: this.config.enableGreedyMeshing,
            faceCullingEnabled: this.config.enableFaceCulling
        };
    }
}