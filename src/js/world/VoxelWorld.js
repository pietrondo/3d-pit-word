import * as THREE from 'three';
import { CONFIG } from '../config/config.js';
import { Chunk } from './Chunk.js';
import { TerrainGenerator } from './TerrainGenerator.js';

/**
 * VoxelWorld manages the entire voxel-based world
 * Handles chunk loading/unloading, world generation, and block operations
 */
export class VoxelWorld {
    constructor(scene, assetManager) {
        this.scene = scene;
        this.assetManager = assetManager;
        
        // World data
        this.chunks = new Map(); // Map<string, Chunk>
        this.loadedChunks = new Set();
        this.chunkLoadQueue = [];
        this.chunkUnloadQueue = [];
        
        // Terrain generation
        this.terrainGenerator = new TerrainGenerator();
        
        // World settings
        this.chunkSize = CONFIG.WORLD.CHUNK_SIZE;
        this.worldHeight = CONFIG.WORLD.WORLD_HEIGHT;
        this.renderDistance = CONFIG.WORLD.RENDER_DISTANCE;
        
        // Performance tracking
        this.chunksGenerated = 0;
        this.chunksLoaded = 0;
        this.chunksUnloaded = 0;
        
        // Player position for chunk management
        this.playerPosition = new THREE.Vector3();
        this.lastPlayerChunk = { x: 0, z: 0 };
        
        // Materials cache
        this.blockMaterials = new Map();
        this.initializeMaterials();
        
        // Raycaster for block interaction
        this.raycaster = new THREE.Raycaster();
        
        console.log('VoxelWorld initialized');
    }
    
    /**
     * Initialize block materials from textures
     */
    initializeMaterials() {
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        
        blockTypes.forEach(blockType => {
            const blockConfig = CONFIG.BLOCKS.TYPES[blockType];
            const texturePath = `${CONFIG.PATHS.TEXTURES}/blocks/${blockConfig.texture}`;
            
            try {
                const texture = this.assetManager.getTexture(texturePath);
                if (texture) {
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    
                    const material = new THREE.MeshLambertMaterial({
                        map: texture,
                        transparent: blockConfig.transparent || false,
                        opacity: blockConfig.opacity || 1.0
                    });
                    
                    this.blockMaterials.set(blockType, material);
                }
            } catch (error) {
                console.warn(`Failed to load texture for block ${blockType}:`, error);
                // Create fallback material
                const fallbackMaterial = new THREE.MeshLambertMaterial({
                    color: blockConfig.color || 0x888888
                });
                this.blockMaterials.set(blockType, fallbackMaterial);
            }
        });
        
        console.log(`Initialized ${this.blockMaterials.size} block materials`);
    }
    
    /**
     * Update world based on player position
     */
    update(playerPosition) {
        this.playerPosition.copy(playerPosition);
        
        const currentChunk = this.worldToChunk(playerPosition.x, playerPosition.z);
        
        // Check if player moved to a different chunk
        if (currentChunk.x !== this.lastPlayerChunk.x || currentChunk.z !== this.lastPlayerChunk.z) {
            this.updateChunkLoading(currentChunk);
            this.lastPlayerChunk = currentChunk;
        }
        
        // Process chunk loading/unloading queues
        this.processChunkQueues();
    }
    
    /**
     * Update which chunks should be loaded based on player position
     */
    updateChunkLoading(playerChunk) {
        const chunksToLoad = new Set();
        const chunksToKeep = new Set();
        
        // Determine which chunks should be loaded
        for (let x = playerChunk.x - this.renderDistance; x <= playerChunk.x + this.renderDistance; x++) {
            for (let z = playerChunk.z - this.renderDistance; z <= playerChunk.z + this.renderDistance; z++) {
                const chunkKey = this.getChunkKey(x, z);
                const distance = Math.sqrt((x - playerChunk.x) ** 2 + (z - playerChunk.z) ** 2);
                
                if (distance <= this.renderDistance) {
                    chunksToLoad.add(chunkKey);
                    chunksToKeep.add(chunkKey);
                }
            }
        }
        
        // Queue chunks for loading
        chunksToLoad.forEach(chunkKey => {
            if (!this.loadedChunks.has(chunkKey) && !this.chunkLoadQueue.includes(chunkKey)) {
                this.chunkLoadQueue.push(chunkKey);
            }
        });
        
        // Queue chunks for unloading
        this.loadedChunks.forEach(chunkKey => {
            if (!chunksToKeep.has(chunkKey) && !this.chunkUnloadQueue.includes(chunkKey)) {
                this.chunkUnloadQueue.push(chunkKey);
            }
        });
    }
    
    /**
     * Process chunk loading and unloading queues
     */
    processChunkQueues() {
        const maxOperationsPerFrame = CONFIG.PERFORMANCE.MAX_CHUNK_OPERATIONS_PER_FRAME;
        let operations = 0;
        
        // Process unloading first to free memory
        while (this.chunkUnloadQueue.length > 0 && operations < maxOperationsPerFrame) {
            const chunkKey = this.chunkUnloadQueue.shift();
            this.unloadChunk(chunkKey);
            operations++;
        }
        
        // Process loading
        while (this.chunkLoadQueue.length > 0 && operations < maxOperationsPerFrame) {
            const chunkKey = this.chunkLoadQueue.shift();
            this.loadChunk(chunkKey);
            operations++;
        }
    }
    
    /**
     * Load a chunk
     */
    loadChunk(chunkKey) {
        if (this.loadedChunks.has(chunkKey)) {
            return;
        }
        
        const { x, z } = this.parseChunkKey(chunkKey);
        
        try {
            // Generate chunk data
            const chunkData = this.terrainGenerator.generateChunk(x, z, this.chunkSize, this.worldHeight);
            
            // Create chunk object
            const chunk = new Chunk(x, z, this.chunkSize, this.worldHeight);
            chunk.setData(chunkData);
            
            // Generate mesh
            const mesh = this.generateChunkMesh(chunk);
            if (mesh) {
                this.scene.add(mesh);
                chunk.setMesh(mesh);
            }
            
            // Store chunk
            this.chunks.set(chunkKey, chunk);
            this.loadedChunks.add(chunkKey);
            
            this.chunksLoaded++;
            this.chunksGenerated++;
            
        } catch (error) {
            console.error(`Failed to load chunk ${chunkKey}:`, error);
        }
    }
    
    /**
     * Unload a chunk
     */
    unloadChunk(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) {
            return;
        }
        
        // Remove mesh from scene
        const mesh = chunk.getMesh();
        if (mesh) {
            this.scene.remove(mesh);
            
            // Dispose geometry and materials
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => material.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        }
        
        // Remove from collections
        this.chunks.delete(chunkKey);
        this.loadedChunks.delete(chunkKey);
        
        this.chunksUnloaded++;
    }
    
    /**
     * Generate mesh for a chunk
     */
    generateChunkMesh(chunk) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const materialGroups = new Map();
        
        let vertexIndex = 0;
        
        // Iterate through all blocks in the chunk
        for (let x = 0; x < chunk.size; x++) {
            for (let y = 0; y < chunk.height; y++) {
                for (let z = 0; z < chunk.size; z++) {
                    const blockType = chunk.getBlock(x, y, z);
                    if (blockType === 'air') continue;
                    
                    // Check each face of the block
                    const faces = [
                        { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, // top
                        { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // bottom
                        { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]] }, // right
                        { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] }, // left
                        { dir: [0, 0, 1], corners: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]] }, // front
                        { dir: [0, 0, -1], corners: [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]] }  // back
                    ];
                    
                    faces.forEach(face => {
                        const [dx, dy, dz] = face.dir;
                        const neighborX = x + dx;
                        const neighborY = y + dy;
                        const neighborZ = z + dz;
                        
                        // Check if face should be rendered (no solid neighbor)
                        const neighbor = chunk.getBlock(neighborX, neighborY, neighborZ);
                        if (neighbor !== 'air' && neighbor !== null) return;
                        
                        // Add face vertices
                        const faceVertices = face.corners.map(corner => [
                            x + corner[0] + chunk.x * chunk.size,
                            y + corner[1],
                            z + corner[2] + chunk.z * chunk.size
                        ]);
                        
                        faceVertices.forEach(vertex => {
                            vertices.push(...vertex);
                            normals.push(...face.dir);
                        });
                        
                        // Add UVs
                        uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
                        
                        // Add indices
                        const baseIndex = vertexIndex;
                        indices.push(
                            baseIndex, baseIndex + 1, baseIndex + 2,
                            baseIndex, baseIndex + 2, baseIndex + 3
                        );
                        
                        // Track material groups
                        if (!materialGroups.has(blockType)) {
                            materialGroups.set(blockType, []);
                        }
                        materialGroups.get(blockType).push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
                        
                        vertexIndex += 4;
                    });
                }
            }
        }
        
        if (vertices.length === 0) {
            return null;
        }
        
        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Create materials array
        const materials = [];
        const groups = [];
        let indexOffset = 0;
        
        materialGroups.forEach((faceIndices, blockType) => {
            const material = this.blockMaterials.get(blockType) || this.blockMaterials.get('dirt');
            materials.push(material);
            
            groups.push({
                start: indexOffset,
                count: faceIndices.length,
                materialIndex: materials.length - 1
            });
            
            indexOffset += faceIndices.length;
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, materials);
        
        // Set material groups
        groups.forEach(group => {
            geometry.addGroup(group.start, group.count, group.materialIndex);
        });
        
        return mesh;
    }
    
    /**
     * Get block at world coordinates
     */
    getBlock(worldX, worldY, worldZ) {
        const chunkCoords = this.worldToChunk(worldX, worldZ);
        const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.z);
        const chunk = this.chunks.get(chunkKey);
        
        if (!chunk) {
            return null;
        }
        
        const localX = worldX - chunkCoords.x * this.chunkSize;
        const localZ = worldZ - chunkCoords.z * this.chunkSize;
        
        return chunk.getBlock(localX, worldY, localZ);
    }
    
    /**
     * Set block at world coordinates
     */
    setBlock(worldX, worldY, worldZ, blockType) {
        const chunkCoords = this.worldToChunk(worldX, worldZ);
        const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.z);
        const chunk = this.chunks.get(chunkKey);
        
        if (!chunk) {
            return false;
        }
        
        const localX = worldX - chunkCoords.x * this.chunkSize;
        const localZ = worldZ - chunkCoords.z * this.chunkSize;
        
        const success = chunk.setBlock(localX, worldY, localZ, blockType);
        
        if (success) {
            // Regenerate chunk mesh
            this.regenerateChunkMesh(chunkKey);
        }
        
        return success;
    }
    
    /**
     * Regenerate mesh for a specific chunk
     */
    regenerateChunkMesh(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return;
        
        // Remove old mesh
        const oldMesh = chunk.getMesh();
        if (oldMesh) {
            this.scene.remove(oldMesh);
            if (oldMesh.geometry) oldMesh.geometry.dispose();
        }
        
        // Generate new mesh
        const newMesh = this.generateChunkMesh(chunk);
        if (newMesh) {
            this.scene.add(newMesh);
            chunk.setMesh(newMesh);
        }
    }
    
    /**
     * Raycast to find block intersection
     */
    raycastBlocks(camera, mousePosition) {
        this.raycaster.setFromCamera(mousePosition, camera);
        
        const intersects = [];
        this.chunks.forEach(chunk => {
            const mesh = chunk.getMesh();
            if (mesh) {
                const chunkIntersects = this.raycaster.intersectObject(mesh);
                intersects.push(...chunkIntersects);
            }
        });
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const point = intersection.point;
            const normal = intersection.face.normal;
            
            // Calculate block coordinates
            const blockX = Math.floor(point.x);
            const blockY = Math.floor(point.y);
            const blockZ = Math.floor(point.z);
            
            // Calculate adjacent block coordinates for placement
            const adjacentX = blockX + Math.round(normal.x);
            const adjacentY = blockY + Math.round(normal.y);
            const adjacentZ = blockZ + Math.round(normal.z);
            
            return {
                hit: true,
                position: { x: blockX, y: blockY, z: blockZ },
                adjacent: { x: adjacentX, y: adjacentY, z: adjacentZ },
                distance: intersection.distance,
                normal: normal
            };
        }
        
        return { hit: false };
    }
    
    /**
     * Convert world coordinates to chunk coordinates
     */
    worldToChunk(worldX, worldZ) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            z: Math.floor(worldZ / this.chunkSize)
        };
    }
    
    /**
     * Generate chunk key from coordinates
     */
    getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }
    
    /**
     * Parse chunk key to coordinates
     */
    parseChunkKey(chunkKey) {
        const [x, z] = chunkKey.split(',').map(Number);
        return { x, z };
    }
    
    /**
     * Get world statistics
     */
    getStats() {
        return {
            chunksLoaded: this.loadedChunks.size,
            chunksGenerated: this.chunksGenerated,
            chunksInMemory: this.chunks.size,
            chunkLoadQueue: this.chunkLoadQueue.length,
            chunkUnloadQueue: this.chunkUnloadQueue.length,
            totalChunksLoaded: this.chunksLoaded,
            totalChunksUnloaded: this.chunksUnloaded
        };
    }
    
    /**
     * Cleanup resources
     */
    dispose() {
        // Unload all chunks
        const chunkKeys = Array.from(this.chunks.keys());
        chunkKeys.forEach(chunkKey => {
            this.unloadChunk(chunkKey);
        });
        
        // Dispose materials
        this.blockMaterials.forEach(material => {
            material.dispose();
        });
        this.blockMaterials.clear();
        
        console.log('VoxelWorld disposed');
    }
}