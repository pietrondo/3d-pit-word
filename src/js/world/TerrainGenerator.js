import { CONFIG } from '../config/config.js';

/**
 * TerrainGenerator creates procedural terrain using noise functions
 * Generates different biomes and terrain features
 */
export class TerrainGenerator {
    constructor(seed = null) {
        this.seed = seed || Math.floor(Math.random() * 1000000);
        this.noiseScale = CONFIG.WORLD.TERRAIN.NOISE_SCALE;
        this.heightScale = CONFIG.WORLD.TERRAIN.HEIGHT_SCALE;
        this.seaLevel = CONFIG.WORLD.TERRAIN.SEA_LEVEL;
        
        // Biome settings
        this.biomes = CONFIG.WORLD.BIOMES;
        
        console.log(`TerrainGenerator initialized with seed: ${this.seed}`);
    }
    
    /**
     * Generate a chunk of terrain data
     */
    generateChunk(chunkX, chunkZ, chunkSize, chunkHeight) {
        const chunkData = new Array(chunkSize);
        
        // Initialize 3D array
        for (let x = 0; x < chunkSize; x++) {
            chunkData[x] = new Array(chunkHeight);
            for (let y = 0; y < chunkHeight; y++) {
                chunkData[x][y] = new Array(chunkSize).fill('air');
            }
        }
        
        // Generate terrain for each column
        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                
                // Generate height and biome for this position
                const terrainInfo = this.generateTerrainColumn(worldX, worldZ);
                const height = Math.floor(terrainInfo.height);
                const biome = terrainInfo.biome;
                
                // Fill column with blocks
                this.fillTerrainColumn(chunkData, x, z, height, biome, chunkHeight);
                
                // Add features (trees, ores, etc.)
                this.addFeatures(chunkData, x, z, worldX, worldZ, height, biome, chunkHeight);
            }
        }
        
        return chunkData;
    }
    
    /**
     * Generate terrain information for a single column
     */
    generateTerrainColumn(worldX, worldZ) {
        // Base height using multiple octaves of noise
        const baseHeight = this.generateHeight(worldX, worldZ);
        
        // Determine biome
        const biome = this.determineBiome(worldX, worldZ);
        
        // Apply biome-specific height modifications
        const biomeConfig = this.biomes[biome];
        const finalHeight = baseHeight * biomeConfig.heightMultiplier + biomeConfig.heightOffset;
        
        return {
            height: Math.max(1, finalHeight),
            biome: biome
        };
    }
    
    /**
     * Generate base height using noise
     */
    generateHeight(x, z) {
        // Multiple octaves for more interesting terrain
        let height = 0;
        let amplitude = 1;
        let frequency = this.noiseScale;
        
        // Add multiple octaves
        for (let i = 0; i < 4; i++) {
            height += this.noise2D(x * frequency, z * frequency) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        // Normalize and scale
        height = (height + 1) * 0.5; // Convert from [-1,1] to [0,1]
        return this.seaLevel + height * this.heightScale;
    }
    
    /**
     * Determine biome based on temperature and humidity
     */
    determineBiome(x, z) {
        const temperature = this.noise2D(x * 0.01, z * 0.01);
        const humidity = this.noise2D(x * 0.01 + 1000, z * 0.01 + 1000);
        
        // Simple biome determination
        if (temperature > 0.3) {
            if (humidity > 0.2) {
                return 'forest';
            } else {
                return 'desert';
            }
        } else {
            if (humidity > 0.0) {
                return 'plains';
            } else {
                return 'mountains';
            }
        }
    }
    
    /**
     * Fill a terrain column with appropriate blocks
     */
    fillTerrainColumn(chunkData, x, z, height, biome, chunkHeight) {
        const biomeConfig = this.biomes[biome];
        
        for (let y = 0; y < Math.min(height, chunkHeight); y++) {
            let blockType;
            
            if (y === height - 1) {
                // Surface block
                blockType = biomeConfig.surfaceBlock;
            } else if (y >= height - 4) {
                // Sub-surface blocks
                blockType = biomeConfig.subSurfaceBlock;
            } else {
                // Deep blocks
                blockType = biomeConfig.deepBlock;
            }
            
            chunkData[x][y][z] = blockType;
        }
        
        // Add bedrock at the bottom
        if (chunkHeight > 0) {
            chunkData[x][0][z] = 'stone';
        }
    }
    
    /**
     * Add terrain features like trees, ores, etc.
     */
    addFeatures(chunkData, x, z, worldX, worldZ, height, biome, chunkHeight) {
        const biomeConfig = this.biomes[biome];
        
        // Trees
        if (biomeConfig.treeChance > 0 && this.random(worldX, worldZ, 'tree') < biomeConfig.treeChance) {
            this.generateTree(chunkData, x, z, height, chunkHeight);
        }
        
        // Ores
        this.generateOres(chunkData, x, z, worldX, worldZ, chunkHeight);
        
        // Grass and flowers
        if (biome === 'plains' || biome === 'forest') {
            if (height < chunkHeight && this.random(worldX, worldZ, 'grass') < 0.3) {
                // Add grass on top of surface block
                if (chunkData[x][height][z] === 'air') {
                    // Could add grass blocks here if we had them
                }
            }
        }
    }
    
    /**
     * Generate a simple tree
     */
    generateTree(chunkData, x, z, groundHeight, chunkHeight) {
        const treeHeight = 4 + Math.floor(this.random(x, z, 'treeheight') * 3);
        const trunkHeight = Math.floor(treeHeight * 0.7);
        
        // Generate trunk
        for (let y = groundHeight; y < Math.min(groundHeight + trunkHeight, chunkHeight); y++) {
            if (x >= 0 && x < chunkData.length && z >= 0 && z < chunkData[0][0].length) {
                chunkData[x][y][z] = 'wood';
            }
        }
        
        // Generate leaves
        const leavesY = groundHeight + trunkHeight;
        const leavesRadius = 2;
        
        for (let dx = -leavesRadius; dx <= leavesRadius; dx++) {
            for (let dz = -leavesRadius; dz <= leavesRadius; dz++) {
                for (let dy = 0; dy < 3; dy++) {
                    const leafX = x + dx;
                    const leafZ = z + dz;
                    const leafY = leavesY + dy;
                    
                    if (leafX >= 0 && leafX < chunkData.length &&
                        leafZ >= 0 && leafZ < chunkData[0][0].length &&
                        leafY < chunkHeight) {
                        
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        if (distance <= leavesRadius && this.random(leafX, leafZ, 'leaves') > 0.3) {
                            if (chunkData[leafX][leafY][leafZ] === 'air') {
                                chunkData[leafX][leafY][leafZ] = 'leaves';
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Generate ore deposits
     */
    generateOres(chunkData, x, z, worldX, worldZ, chunkHeight) {
        // Stone ore (common)
        for (let y = 1; y < chunkHeight * 0.8; y++) {
            if (chunkData[x][y][z] === 'stone' || chunkData[x][y][z] === 'dirt') {
                if (this.random(worldX, worldZ, `ore_${y}`) < 0.02) {
                    // Could add different ore types based on depth
                    // For now, just keep as stone
                }
            }
        }
    }
    
    /**
     * Simple 2D noise function (simplified Perlin-like noise)
     */
    noise2D(x, y) {
        // Simple hash-based noise
        const hash = this.hash2D(Math.floor(x), Math.floor(y));
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        
        // Get corner values
        const a = this.hash2D(Math.floor(x), Math.floor(y));
        const b = this.hash2D(Math.floor(x) + 1, Math.floor(y));
        const c = this.hash2D(Math.floor(x), Math.floor(y) + 1);
        const d = this.hash2D(Math.floor(x) + 1, Math.floor(y) + 1);
        
        // Smooth interpolation
        const u = this.smoothstep(fx);
        const v = this.smoothstep(fy);
        
        // Bilinear interpolation
        const i1 = this.lerp(a, b, u);
        const i2 = this.lerp(c, d, u);
        
        return this.lerp(i1, i2, v);
    }
    
    /**
     * Hash function for 2D coordinates
     */
    hash2D(x, y) {
        let hash = (x * 374761393 + y * 668265263 + this.seed) % 2147483647;
        hash = (hash ^ (hash >> 13)) * 1274126177;
        hash = hash ^ (hash >> 16);
        return (hash % 2000000) / 1000000 - 1; // Return value between -1 and 1
    }
    
    /**
     * Pseudo-random number generator
     */
    random(x, z, salt = '') {
        const saltHash = this.stringHash(salt);
        const hash = (x * 374761393 + z * 668265263 + this.seed + saltHash) % 2147483647;
        return Math.abs(hash) / 2147483647;
    }
    
    /**
     * Hash a string to a number
     */
    stringHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }
    
    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    /**
     * Smooth step function for better interpolation
     */
    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }
    
    /**
     * Generate height map for a chunk (useful for preview)
     */
    generateHeightMap(chunkX, chunkZ, chunkSize) {
        const heightMap = new Array(chunkSize);
        
        for (let x = 0; x < chunkSize; x++) {
            heightMap[x] = new Array(chunkSize);
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                
                const terrainInfo = this.generateTerrainColumn(worldX, worldZ);
                heightMap[x][z] = {
                    height: terrainInfo.height,
                    biome: terrainInfo.biome
                };
            }
        }
        
        return heightMap;
    }
    
    /**
     * Get biome at specific coordinates
     */
    getBiomeAt(x, z) {
        return this.determineBiome(x, z);
    }
    
    /**
     * Get height at specific coordinates
     */
    getHeightAt(x, z) {
        return this.generateTerrainColumn(x, z).height;
    }
    
    /**
     * Check if position is suitable for structure placement
     */
    canPlaceStructure(x, z, width, depth) {
        const centerHeight = this.getHeightAt(x, z);
        const tolerance = 2; // Allow some height variation
        
        // Check if area is relatively flat
        for (let dx = -Math.floor(width/2); dx <= Math.floor(width/2); dx++) {
            for (let dz = -Math.floor(depth/2); dz <= Math.floor(depth/2); dz++) {
                const height = this.getHeightAt(x + dx, z + dz);
                if (Math.abs(height - centerHeight) > tolerance) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Generate structure placement positions for a chunk
     */
    generateStructurePlacements(chunkX, chunkZ, chunkSize, structureType) {
        const placements = [];
        const spacing = 32; // Minimum spacing between structures
        
        // Check a few potential positions in the chunk
        for (let attempts = 0; attempts < 5; attempts++) {
            const x = chunkX * chunkSize + Math.floor(this.random(chunkX, chunkZ, `struct_x_${attempts}`) * chunkSize);
            const z = chunkZ * chunkSize + Math.floor(this.random(chunkX, chunkZ, `struct_z_${attempts}`) * chunkSize);
            
            if (this.canPlaceStructure(x, z, 8, 8)) {
                const biome = this.getBiomeAt(x, z);
                const height = this.getHeightAt(x, z);
                
                placements.push({
                    x: x,
                    y: Math.floor(height),
                    z: z,
                    biome: biome,
                    type: structureType
                });
            }
        }
        
        return placements;
    }
    
    /**
     * Get terrain statistics
     */
    getStats() {
        return {
            seed: this.seed,
            noiseScale: this.noiseScale,
            heightScale: this.heightScale,
            seaLevel: this.seaLevel,
            biomes: Object.keys(this.biomes)
        };
    }
    
    /**
     * Set new seed and regenerate
     */
    setSeed(newSeed) {
        this.seed = newSeed;
        console.log(`TerrainGenerator seed changed to: ${this.seed}`);
    }
}