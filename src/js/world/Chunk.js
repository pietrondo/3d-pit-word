import * as THREE from 'three';

/**
 * Chunk represents a section of the voxel world
 * Contains block data and manages its 3D mesh representation
 */
export class Chunk {
    constructor(x, z, size, height) {
        this.x = x; // Chunk X coordinate
        this.z = z; // Chunk Z coordinate
        this.size = size; // Chunk size (width and depth)
        this.height = height; // Chunk height
        
        // Block data - 3D array [x][y][z]
        this.blocks = new Array(size);
        for (let x = 0; x < size; x++) {
            this.blocks[x] = new Array(height);
            for (let y = 0; y < height; y++) {
                this.blocks[x][y] = new Array(size).fill('air');
            }
        }
        
        // 3D mesh representation
        this.mesh = null;
        
        // Chunk state
        this.isDirty = false; // Needs mesh regeneration
        this.isGenerated = false; // Has terrain data
        this.isLoaded = false; // Is in scene
        
        // Metadata
        this.createdAt = Date.now();
        this.lastAccessed = Date.now();
        this.blockCount = 0; // Number of non-air blocks
        
        console.log(`Chunk created at (${x}, ${z})`);
    }
    
    /**
     * Get block type at local coordinates
     */
    getBlock(x, y, z) {
        // Bounds checking
        if (x < 0 || x >= this.size || 
            y < 0 || y >= this.height || 
            z < 0 || z >= this.size) {
            return null; // Out of bounds
        }
        
        this.lastAccessed = Date.now();
        return this.blocks[x][y][z];
    }
    
    /**
     * Set block type at local coordinates
     */
    setBlock(x, y, z, blockType) {
        // Bounds checking
        if (x < 0 || x >= this.size || 
            y < 0 || y >= this.height || 
            z < 0 || z >= this.size) {
            return false;
        }
        
        const oldBlock = this.blocks[x][y][z];
        this.blocks[x][y][z] = blockType;
        
        // Update block count
        if (oldBlock === 'air' && blockType !== 'air') {
            this.blockCount++;
        } else if (oldBlock !== 'air' && blockType === 'air') {
            this.blockCount--;
        }
        
        // Mark as dirty for mesh regeneration
        this.isDirty = true;
        this.lastAccessed = Date.now();
        
        return true;
    }
    
    /**
     * Set entire chunk data from generated terrain
     */
    setData(chunkData) {
        this.blockCount = 0;
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    const blockType = chunkData[x][y][z] || 'air';
                    this.blocks[x][y][z] = blockType;
                    
                    if (blockType !== 'air') {
                        this.blockCount++;
                    }
                }
            }
        }
        
        this.isGenerated = true;
        this.isDirty = true;
        this.lastAccessed = Date.now();
        
        console.log(`Chunk (${this.x}, ${this.z}) data set with ${this.blockCount} blocks`);
    }
    
    /**
     * Get chunk data as 3D array
     */
    getData() {
        this.lastAccessed = Date.now();
        return this.blocks;
    }
    
    /**
     * Set the 3D mesh for this chunk
     */
    setMesh(mesh) {
        this.mesh = mesh;
        this.isDirty = false;
        this.isLoaded = true;
        
        // Set mesh position
        if (mesh) {
            mesh.position.set(
                this.x * this.size,
                0,
                this.z * this.size
            );
            
            // Add chunk reference to mesh for identification
            mesh.userData.chunk = this;
        }
    }
    
    /**
     * Get the 3D mesh for this chunk
     */
    getMesh() {
        this.lastAccessed = Date.now();
        return this.mesh;
    }
    
    /**
     * Check if chunk has any non-air blocks
     */
    isEmpty() {
        return this.blockCount === 0;
    }
    
    /**
     * Check if chunk needs mesh regeneration
     */
    needsUpdate() {
        return this.isDirty;
    }
    
    /**
     * Get block at world coordinates (if within this chunk)
     */
    getBlockAtWorld(worldX, worldY, worldZ) {
        const localX = worldX - (this.x * this.size);
        const localZ = worldZ - (this.z * this.size);
        
        return this.getBlock(localX, worldY, localZ);
    }
    
    /**
     * Set block at world coordinates (if within this chunk)
     */
    setBlockAtWorld(worldX, worldY, worldZ, blockType) {
        const localX = worldX - (this.x * this.size);
        const localZ = worldZ - (this.z * this.size);
        
        return this.setBlock(localX, worldY, localZ, blockType);
    }
    
    /**
     * Get all blocks of a specific type
     */
    getBlocksOfType(blockType) {
        const blocks = [];
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    if (this.blocks[x][y][z] === blockType) {
                        blocks.push({
                            local: { x, y, z },
                            world: {
                                x: x + this.x * this.size,
                                y: y,
                                z: z + this.z * this.size
                            }
                        });
                    }
                }
            }
        }
        
        return blocks;
    }
    
    /**
     * Replace all blocks of one type with another
     */
    replaceBlocks(fromType, toType) {
        let replacedCount = 0;
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    if (this.blocks[x][y][z] === fromType) {
                        this.blocks[x][y][z] = toType;
                        replacedCount++;
                        
                        // Update block count
                        if (fromType === 'air' && toType !== 'air') {
                            this.blockCount++;
                        } else if (fromType !== 'air' && toType === 'air') {
                            this.blockCount--;
                        }
                    }
                }
            }
        }
        
        if (replacedCount > 0) {
            this.isDirty = true;
            this.lastAccessed = Date.now();
        }
        
        return replacedCount;
    }
    
    /**
     * Fill a region with a specific block type
     */
    fillRegion(startX, startY, startZ, endX, endY, endZ, blockType) {
        const minX = Math.max(0, Math.min(startX, endX));
        const maxX = Math.min(this.size - 1, Math.max(startX, endX));
        const minY = Math.max(0, Math.min(startY, endY));
        const maxY = Math.min(this.height - 1, Math.max(startY, endY));
        const minZ = Math.max(0, Math.min(startZ, endZ));
        const maxZ = Math.min(this.size - 1, Math.max(startZ, endZ));
        
        let filledCount = 0;
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const oldBlock = this.blocks[x][y][z];
                    this.blocks[x][y][z] = blockType;
                    filledCount++;
                    
                    // Update block count
                    if (oldBlock === 'air' && blockType !== 'air') {
                        this.blockCount++;
                    } else if (oldBlock !== 'air' && blockType === 'air') {
                        this.blockCount--;
                    }
                }
            }
        }
        
        if (filledCount > 0) {
            this.isDirty = true;
            this.lastAccessed = Date.now();
        }
        
        return filledCount;
    }
    
    /**
     * Get the highest non-air block at given X,Z coordinates
     */
    getHeightAt(x, z) {
        if (x < 0 || x >= this.size || z < 0 || z >= this.size) {
            return -1;
        }
        
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.blocks[x][y][z] !== 'air') {
                return y;
            }
        }
        
        return -1; // No blocks found
    }
    
    /**
     * Check if a position is solid (not air)
     */
    isSolid(x, y, z) {
        const block = this.getBlock(x, y, z);
        return block !== null && block !== 'air';
    }
    
    /**
     * Get chunk bounds in world coordinates
     */
    getBounds() {
        return {
            min: {
                x: this.x * this.size,
                y: 0,
                z: this.z * this.size
            },
            max: {
                x: (this.x + 1) * this.size - 1,
                y: this.height - 1,
                z: (this.z + 1) * this.size - 1
            }
        };
    }
    
    /**
     * Check if world coordinates are within this chunk
     */
    containsWorldPosition(worldX, worldY, worldZ) {
        const bounds = this.getBounds();
        return worldX >= bounds.min.x && worldX <= bounds.max.x &&
               worldY >= bounds.min.y && worldY <= bounds.max.y &&
               worldZ >= bounds.min.z && worldZ <= bounds.max.z;
    }
    
    /**
     * Get chunk statistics
     */
    getStats() {
        const totalBlocks = this.size * this.height * this.size;
        const airBlocks = totalBlocks - this.blockCount;
        
        return {
            position: { x: this.x, z: this.z },
            size: { width: this.size, height: this.height, depth: this.size },
            blocks: {
                total: totalBlocks,
                solid: this.blockCount,
                air: airBlocks,
                density: this.blockCount / totalBlocks
            },
            state: {
                isGenerated: this.isGenerated,
                isLoaded: this.isLoaded,
                isDirty: this.isDirty,
                isEmpty: this.isEmpty()
            },
            timing: {
                createdAt: this.createdAt,
                lastAccessed: this.lastAccessed,
                age: Date.now() - this.createdAt
            }
        };
    }
    
    /**
     * Serialize chunk data for saving
     */
    serialize() {
        return {
            x: this.x,
            z: this.z,
            size: this.size,
            height: this.height,
            blocks: this.blocks,
            blockCount: this.blockCount,
            isGenerated: this.isGenerated,
            createdAt: this.createdAt
        };
    }
    
    /**
     * Deserialize chunk data from saved data
     */
    static deserialize(data) {
        const chunk = new Chunk(data.x, data.z, data.size, data.height);
        chunk.blocks = data.blocks;
        chunk.blockCount = data.blockCount || 0;
        chunk.isGenerated = data.isGenerated || false;
        chunk.createdAt = data.createdAt || Date.now();
        chunk.isDirty = true; // Need to regenerate mesh
        
        return chunk;
    }
    
    /**
     * Clone this chunk
     */
    clone() {
        const cloned = new Chunk(this.x, this.z, this.size, this.height);
        
        // Deep copy blocks array
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    cloned.blocks[x][y][z] = this.blocks[x][y][z];
                }
            }
        }
        
        cloned.blockCount = this.blockCount;
        cloned.isGenerated = this.isGenerated;
        cloned.isDirty = true; // Need to generate new mesh
        
        return cloned;
    }
    
    /**
     * Dispose of chunk resources
     */
    dispose() {
        // Dispose mesh if it exists
        if (this.mesh) {
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }
        
        // Clear block data
        this.blocks = null;
        this.isLoaded = false;
        
        console.log(`Chunk (${this.x}, ${this.z}) disposed`);
    }
}