/**
 * 3D Pit Word - Configuration
 * 
 * File di configurazione principale del gioco.
 * Contiene tutte le impostazioni e costanti utilizzate nel gioco.
 */

export const CONFIG = {
    // Informazioni del gioco
    GAME: {
        NAME: '3D Pit Word',
        VERSION: '0.1.0-alpha',
        DEBUG: true
    },
    
    // Impostazioni del renderer
    RENDERER: {
        ANTIALIAS: true,
        ALPHA: false,
        POWER_PREFERENCE: 'high-performance',
        SHADOW_MAP_ENABLED: true,
        SHADOW_MAP_TYPE: 'PCFSoftShadowMap', // THREE.PCFSoftShadowMap
        SHADOW_MAP_SIZE: 2048,
        TONE_MAPPING: 'ACESFilmicToneMapping', // THREE.ACESFilmicToneMapping
        TONE_MAPPING_EXPOSURE: 1.0
    },
    
    // Impostazioni della camera
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        INITIAL_POSITION: { x: 0, y: 50, z: 0 },
        MOUSE_SENSITIVITY: 0.002,
        MOVEMENT_SPEED: 10,
        SPRINT_MULTIPLIER: 2,
        JUMP_FORCE: 15
    },
    
    // Impostazioni del mondo voxel
    WORLD: {
        CHUNK_SIZE: 16,
        CHUNK_HEIGHT: 256,
        RENDER_DISTANCE: 8,
        WORLD_HEIGHT: 256,
        SEA_LEVEL: 64,
        BEDROCK_LEVEL: 5,
        
        // Generazione del terreno
        TERRAIN: {
            SCALE: 0.01,
            OCTAVES: 4,
            PERSISTENCE: 0.5,
            LACUNARITY: 2.0,
            HEIGHT_MULTIPLIER: 50,
            HEIGHT_OFFSET: 64
        },
        
        // Biomi
        BIOMES: {
            PLAINS: {
                id: 'plains',
                name: 'Pianure',
                color: 0x7CB342,
                temperature: 0.8,
                humidity: 0.4
            },
            FOREST: {
                id: 'forest',
                name: 'Foresta',
                color: 0x388E3C,
                temperature: 0.7,
                humidity: 0.8
            },
            DESERT: {
                id: 'desert',
                name: 'Deserto',
                color: 0xFFC107,
                temperature: 1.0,
                humidity: 0.1
            },
            MOUNTAINS: {
                id: 'mountains',
                name: 'Montagne',
                color: 0x795548,
                temperature: 0.3,
                humidity: 0.5
            }
        }
    },
    
    // Tipi di blocchi
    BLOCKS: {
        AIR: { id: 0, name: 'Air', transparent: true, solid: false },
        DIRT: { id: 1, name: 'Dirt', texture: 'dirt', hardness: 1 },
        GRASS: { id: 2, name: 'Grass', textures: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, hardness: 1 },
        STONE: { id: 3, name: 'Stone', texture: 'stone', hardness: 3 },
        WOOD: { id: 4, name: 'Wood', texture: 'wood', hardness: 2 },
        LEAVES: { id: 5, name: 'Leaves', texture: 'leaves', transparent: true, hardness: 0.5 },
        SAND: { id: 6, name: 'Sand', texture: 'sand', hardness: 1 },
        WATER: { id: 7, name: 'Water', transparent: true, solid: false, liquid: true },
        COBBLESTONE: { id: 8, name: 'Cobblestone', texture: 'cobblestone', hardness: 4 },
        BEDROCK: { id: 9, name: 'Bedrock', texture: 'bedrock', hardness: -1 } // Indistruttibile
    },
    
    // Impostazioni della fisica
    PHYSICS: {
        GRAVITY: -30,
        PLAYER_MASS: 1,
        FRICTION: 0.8,
        RESTITUTION: 0.3,
        TIME_STEP: 1/60,
        MAX_SUB_STEPS: 3
    },
    
    // Impostazioni del giocatore
    PLAYER: {
        HEIGHT: 1.8,
        WIDTH: 0.6,
        REACH_DISTANCE: 5,
        INVENTORY_SIZE: 36,
        HOTBAR_SIZE: 9,
        HEALTH: 100,
        HUNGER: 100
    },
    
    // Impostazioni dell'illuminazione
    LIGHTING: {
        AMBIENT_INTENSITY: 0.3,
        AMBIENT_COLOR: 0x404040,
        
        SUN: {
            INTENSITY: 1.0,
            COLOR: 0xffffff,
            POSITION: { x: 100, y: 100, z: 50 },
            CAST_SHADOW: true
        },
        
        MOON: {
            INTENSITY: 0.2,
            COLOR: 0x8888ff,
            POSITION: { x: -100, y: 100, z: -50 },
            CAST_SHADOW: false
        }
    },
    
    // Impostazioni dell'audio
    AUDIO: {
        MASTER_VOLUME: 0.5,
        MUSIC_VOLUME: 0.3,
        SFX_VOLUME: 0.7,
        AMBIENT_VOLUME: 0.4,
        
        // Distanze per l'audio 3D
        REF_DISTANCE: 1,
        MAX_DISTANCE: 50,
        ROLLOFF_FACTOR: 1
    },
    
    // Impostazioni delle performance
    PERFORMANCE: {
        TARGET_FPS: 60,
        MAX_TRIANGLES: 1000000,
        LOD_ENABLED: true,
        FRUSTUM_CULLING: true,
        OCCLUSION_CULLING: false,
        
        // Livelli di qualità
        QUALITY_LEVELS: {
            LOW: {
                render_distance: 4,
                shadow_quality: 512,
                texture_quality: 0.5,
                particle_density: 0.3
            },
            MEDIUM: {
                render_distance: 8,
                shadow_quality: 1024,
                texture_quality: 1.0,
                particle_density: 0.6
            },
            HIGH: {
                render_distance: 12,
                shadow_quality: 2048,
                texture_quality: 1.0,
                particle_density: 1.0
            }
        }
    },
    
    // Controlli
    CONTROLS: {
        MOVE_FORWARD: 'KeyW',
        MOVE_BACKWARD: 'KeyS',
        MOVE_LEFT: 'KeyA',
        MOVE_RIGHT: 'KeyD',
        JUMP: 'Space',
        SPRINT: 'ShiftLeft',
        CROUCH: 'ControlLeft',
        INVENTORY: 'KeyE',
        CHAT: 'KeyT',
        DEBUG: 'F3',
        FULLSCREEN: 'F11',
        
        // Hotbar
        HOTBAR_1: 'Digit1',
        HOTBAR_2: 'Digit2',
        HOTBAR_3: 'Digit3',
        HOTBAR_4: 'Digit4',
        HOTBAR_5: 'Digit5',
        HOTBAR_6: 'Digit6',
        HOTBAR_7: 'Digit7',
        HOTBAR_8: 'Digit8',
        HOTBAR_9: 'Digit9'
    },
    
    // Impostazioni del multiplayer
    MULTIPLAYER: {
        ENABLED: false,
        SERVER_URL: 'ws://localhost:3001',
        MAX_PLAYERS: 10,
        TICK_RATE: 20,
        INTERPOLATION: true,
        PREDICTION: true
    },
    
    // Impostazioni dell'interfaccia utente
    UI: {
        SHOW_FPS: true,
        SHOW_COORDINATES: true,
        SHOW_DEBUG_INFO: false,
        CROSSHAIR_SIZE: 24,
        HOTBAR_SCALE: 1.0,
        CHAT_MAX_MESSAGES: 100,
        CHAT_FADE_TIME: 5000
    },
    
    // Percorsi delle risorse
    PATHS: {
        TEXTURES: '/textures/',
        MODELS: '/models/',
        SOUNDS: '/sounds/',
        SHADERS: '/shaders/'
    },
    
    // Impostazioni di debug
    DEBUG: {
        SHOW_WIREFRAME: false,
        SHOW_CHUNK_BORDERS: false,
        SHOW_COLLISION_BOXES: false,
        SHOW_PERFORMANCE_STATS: true,
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        ENABLE_STATS: true
    }
};

// Funzioni di utilità per la configurazione
export const ConfigUtils = {
    /**
     * Ottiene un valore di configurazione usando la notazione dot
     * @param {string} path - Percorso della configurazione (es. 'WORLD.CHUNK_SIZE')
     * @returns {*} Valore della configurazione
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], CONFIG);
    },
    
    /**
     * Imposta un valore di configurazione
     * @param {string} path - Percorso della configurazione
     * @param {*} value - Nuovo valore
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], CONFIG);
        target[lastKey] = value;
    },
    
    /**
     * Carica la configurazione dal localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('3d-pit-word-config');
            if (saved) {
                const savedConfig = JSON.parse(saved);
                Object.assign(CONFIG, savedConfig);
            }
        } catch (error) {
            console.warn('Impossibile caricare la configurazione salvata:', error);
        }
    },
    
    /**
     * Salva la configurazione nel localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('3d-pit-word-config', JSON.stringify(CONFIG));
        } catch (error) {
            console.warn('Impossibile salvare la configurazione:', error);
        }
    }
};

// Carica la configurazione salvata all'avvio
ConfigUtils.loadFromStorage();