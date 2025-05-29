import * as THREE from 'three';
import { CONFIG } from '../config/config.js';

/**
 * AudioManager handles all audio functionality including sound effects, music, and spatial audio
 */
export class AudioManager {
    constructor() {
        // Audio context and listener
        this.audioContext = null;
        this.listener = new THREE.AudioListener();
        
        // Audio loader
        this.audioLoader = new THREE.AudioLoader();
        
        // Audio storage
        this.sounds = new Map();
        this.music = new Map();
        this.ambientSounds = new Map();
        
        // Current playing audio
        this.currentMusic = null;
        this.currentAmbient = null;
        
        // Volume settings
        this.masterVolume = CONFIG.AUDIO.MASTER_VOLUME;
        this.musicVolume = CONFIG.AUDIO.MUSIC_VOLUME;
        this.sfxVolume = CONFIG.AUDIO.SFX_VOLUME;
        this.ambientVolume = CONFIG.AUDIO.AMBIENT_VOLUME;
        
        // Audio state
        this.isEnabled = CONFIG.AUDIO.ENABLED;
        this.isMuted = false;
        
        // Sound pools for frequently used sounds
        this.soundPools = new Map();
        
        // Initialize audio system
        this.initialize();
        
        console.log('AudioManager initialized');
    }
    
    /**
     * Initialize audio system
     */
    async initialize() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load audio settings from localStorage
            this.loadSettings();
            
            // Preload essential sounds
            await this.preloadSounds();
            
            console.log('Audio system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
            this.isEnabled = false;
        }
    }
    
    /**
     * Preload essential game sounds
     */
    async preloadSounds() {
        const soundsToLoad = [
            // Block sounds
            { name: 'block_break_dirt', path: `${CONFIG.PATHS.AUDIO}/blocks/dirt_break.ogg`, pool: 5 },
            { name: 'block_break_stone', path: `${CONFIG.PATHS.AUDIO}/blocks/stone_break.ogg`, pool: 5 },
            { name: 'block_break_wood', path: `${CONFIG.PATHS.AUDIO}/blocks/wood_break.ogg`, pool: 5 },
            { name: 'block_place', path: `${CONFIG.PATHS.AUDIO}/blocks/place.ogg`, pool: 5 },
            
            // Player sounds
            { name: 'footstep_grass', path: `${CONFIG.PATHS.AUDIO}/player/footstep_grass.ogg`, pool: 4 },
            { name: 'footstep_stone', path: `${CONFIG.PATHS.AUDIO}/player/footstep_stone.ogg`, pool: 4 },
            { name: 'footstep_dirt', path: `${CONFIG.PATHS.AUDIO}/player/footstep_dirt.ogg`, pool: 4 },
            { name: 'jump', path: `${CONFIG.PATHS.AUDIO}/player/jump.ogg`, pool: 2 },
            { name: 'land', path: `${CONFIG.PATHS.AUDIO}/player/land.ogg`, pool: 2 },
            
            // UI sounds
            { name: 'ui_click', path: `${CONFIG.PATHS.AUDIO}/ui/click.ogg`, pool: 3 },
            { name: 'ui_hover', path: `${CONFIG.PATHS.AUDIO}/ui/hover.ogg`, pool: 2 },
            { name: 'inventory_open', path: `${CONFIG.PATHS.AUDIO}/ui/inventory_open.ogg`, pool: 1 },
            { name: 'inventory_close', path: `${CONFIG.PATHS.AUDIO}/ui/inventory_close.ogg`, pool: 1 },
            
            // Ambient sounds
            { name: 'wind', path: `${CONFIG.PATHS.AUDIO}/ambient/wind.ogg`, pool: 1 },
            { name: 'birds', path: `${CONFIG.PATHS.AUDIO}/ambient/birds.ogg`, pool: 1 },
            
            // Music
            { name: 'menu_music', path: `${CONFIG.PATHS.AUDIO}/music/menu.ogg`, pool: 1 },
            { name: 'game_music_1', path: `${CONFIG.PATHS.AUDIO}/music/game_1.ogg`, pool: 1 },
            { name: 'game_music_2', path: `${CONFIG.PATHS.AUDIO}/music/game_2.ogg`, pool: 1 }
        ];
        
        // Create placeholder audio files (since we don't have actual audio files)
        for (const sound of soundsToLoad) {
            try {
                // Create a simple tone as placeholder
                const audioBuffer = this.createPlaceholderSound(sound.name);
                
                if (sound.pool > 1) {
                    // Create sound pool
                    this.createSoundPool(sound.name, audioBuffer, sound.pool);
                } else {
                    // Single sound
                    this.sounds.set(sound.name, audioBuffer);
                }
                
                console.log(`Loaded sound: ${sound.name}`);
            } catch (error) {
                console.warn(`Failed to load sound: ${sound.name}`, error);
            }
        }
    }
    
    /**
     * Create placeholder sound (since we don't have actual audio files)
     */
    createPlaceholderSound(name) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.5; // 0.5 seconds
        const frameCount = sampleRate * duration;
        
        const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate different tones based on sound name
        let frequency = 440; // Default A note
        
        if (name.includes('break')) {
            frequency = 200 + Math.random() * 200; // Lower frequencies for breaking
        } else if (name.includes('place')) {
            frequency = 400 + Math.random() * 200; // Mid frequencies for placing
        } else if (name.includes('footstep')) {
            frequency = 100 + Math.random() * 100; // Low frequencies for footsteps
        } else if (name.includes('ui')) {
            frequency = 800 + Math.random() * 400; // Higher frequencies for UI
        }
        
        // Generate tone with envelope
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 3); // Exponential decay
            channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.1;
        }
        
        return audioBuffer;
    }
    
    /**
     * Create sound pool for frequently used sounds
     */
    createSoundPool(name, audioBuffer, poolSize) {
        const pool = [];
        
        for (let i = 0; i < poolSize; i++) {
            const audio = new THREE.Audio(this.listener);
            audio.setBuffer(audioBuffer);
            audio.setVolume(this.sfxVolume * this.masterVolume);
            pool.push({
                audio: audio,
                isPlaying: false
            });
        }
        
        this.soundPools.set(name, pool);
    }
    
    /**
     * Load audio file
     */
    async loadAudio(name, path) {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(
                path,
                (audioBuffer) => {
                    this.sounds.set(name, audioBuffer);
                    resolve(audioBuffer);
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.error(`Failed to load audio: ${path}`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Play sound effect
     */
    playSound(name, options = {}) {
        if (!this.isEnabled || this.isMuted) return null;
        
        const {
            volume = 1.0,
            pitch = 1.0,
            position = null,
            loop = false,
            delay = 0
        } = options;
        
        // Try to get from sound pool first
        if (this.soundPools.has(name)) {
            return this.playSoundFromPool(name, options);
        }
        
        // Get sound buffer
        const audioBuffer = this.sounds.get(name);
        if (!audioBuffer) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }
        
        // Create audio object
        const audio = position ? 
            new THREE.PositionalAudio(this.listener) : 
            new THREE.Audio(this.listener);
        
        audio.setBuffer(audioBuffer);
        audio.setVolume(volume * this.sfxVolume * this.masterVolume);
        audio.setPlaybackRate(pitch);
        audio.setLoop(loop);
        
        // Set position for spatial audio
        if (position && audio.panner) {
            audio.position.copy(position);
            audio.panner.refDistance = 10;
            audio.panner.rolloffFactor = 1;
        }
        
        // Play with delay
        if (delay > 0) {
            setTimeout(() => {
                audio.play();
            }, delay * 1000);
        } else {
            audio.play();
        }
        
        return audio;
    }
    
    /**
     * Play sound from pool
     */
    playSoundFromPool(name, options = {}) {
        const pool = this.soundPools.get(name);
        if (!pool) return null;
        
        // Find available sound in pool
        let availableSound = pool.find(item => !item.isPlaying);
        
        if (!availableSound) {
            // All sounds in pool are playing, use the first one
            availableSound = pool[0];
            availableSound.audio.stop();
        }
        
        const audio = availableSound.audio;
        const {
            volume = 1.0,
            pitch = 1.0,
            position = null,
            loop = false,
            delay = 0
        } = options;
        
        // Configure audio
        audio.setVolume(volume * this.sfxVolume * this.masterVolume);
        audio.setPlaybackRate(pitch);
        audio.setLoop(loop);
        
        // Set position for spatial audio
        if (position && audio.panner) {
            audio.position.copy(position);
        }
        
        // Mark as playing
        availableSound.isPlaying = true;
        
        // Set up end callback
        const onEnded = () => {
            availableSound.isPlaying = false;
            audio.source.removeEventListener('ended', onEnded);
        };
        
        // Play with delay
        if (delay > 0) {
            setTimeout(() => {
                audio.play();
                if (audio.source) {
                    audio.source.addEventListener('ended', onEnded);
                }
            }, delay * 1000);
        } else {
            audio.play();
            if (audio.source) {
                audio.source.addEventListener('ended', onEnded);
            }
        }
        
        return audio;
    }
    
    /**
     * Play music
     */
    playMusic(name, options = {}) {
        if (!this.isEnabled) return null;
        
        const {
            volume = 1.0,
            loop = true,
            fadeIn = 2.0,
            fadeOut = 2.0
        } = options;
        
        // Stop current music
        if (this.currentMusic) {
            this.stopMusic(fadeOut);
        }
        
        // Get music buffer
        const audioBuffer = this.sounds.get(name);
        if (!audioBuffer) {
            console.warn(`Music not found: ${name}`);
            return null;
        }
        
        // Create music audio
        const music = new THREE.Audio(this.listener);
        music.setBuffer(audioBuffer);
        music.setVolume(0); // Start at 0 for fade in
        music.setLoop(loop);
        
        music.play();
        
        // Fade in
        this.fadeAudio(music, 0, volume * this.musicVolume * this.masterVolume, fadeIn);
        
        this.currentMusic = music;
        return music;
    }
    
    /**
     * Stop music
     */
    stopMusic(fadeTime = 2.0) {
        if (!this.currentMusic) return;
        
        if (fadeTime > 0) {
            this.fadeAudio(this.currentMusic, this.currentMusic.getVolume(), 0, fadeTime, () => {
                this.currentMusic.stop();
                this.currentMusic = null;
            });
        } else {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }
    
    /**
     * Play ambient sound
     */
    playAmbient(name, options = {}) {
        if (!this.isEnabled) return null;
        
        const {
            volume = 1.0,
            loop = true,
            fadeIn = 3.0
        } = options;
        
        // Stop current ambient
        if (this.currentAmbient) {
            this.stopAmbient();
        }
        
        // Get ambient buffer
        const audioBuffer = this.sounds.get(name);
        if (!audioBuffer) {
            console.warn(`Ambient sound not found: ${name}`);
            return null;
        }
        
        // Create ambient audio
        const ambient = new THREE.Audio(this.listener);
        ambient.setBuffer(audioBuffer);
        ambient.setVolume(0); // Start at 0 for fade in
        ambient.setLoop(loop);
        
        ambient.play();
        
        // Fade in
        this.fadeAudio(ambient, 0, volume * this.ambientVolume * this.masterVolume, fadeIn);
        
        this.currentAmbient = ambient;
        return ambient;
    }
    
    /**
     * Stop ambient sound
     */
    stopAmbient(fadeTime = 3.0) {
        if (!this.currentAmbient) return;
        
        if (fadeTime > 0) {
            this.fadeAudio(this.currentAmbient, this.currentAmbient.getVolume(), 0, fadeTime, () => {
                this.currentAmbient.stop();
                this.currentAmbient = null;
            });
        } else {
            this.currentAmbient.stop();
            this.currentAmbient = null;
        }
    }
    
    /**
     * Fade audio volume
     */
    fadeAudio(audio, fromVolume, toVolume, duration, callback = null) {
        const startTime = Date.now();
        const volumeDiff = toVolume - fromVolume;
        
        const fade = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentVolume = fromVolume + (volumeDiff * progress);
            audio.setVolume(currentVolume);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else if (callback) {
                callback();
            }
        };
        
        fade();
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveSettings();
    }
    
    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
        }
        this.saveSettings();
    }
    
    /**
     * Set SFX volume
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateSfxVolumes();
        this.saveSettings();
    }
    
    /**
     * Set ambient volume
     */
    setAmbientVolume(volume) {
        this.ambientVolume = Math.max(0, Math.min(1, volume));
        if (this.currentAmbient) {
            this.currentAmbient.setVolume(this.ambientVolume * this.masterVolume);
        }
        this.saveSettings();
    }
    
    /**
     * Update all volumes
     */
    updateAllVolumes() {
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
        }
        
        if (this.currentAmbient) {
            this.currentAmbient.setVolume(this.ambientVolume * this.masterVolume);
        }
        
        this.updateSfxVolumes();
    }
    
    /**
     * Update SFX volumes
     */
    updateSfxVolumes() {
        for (const pool of this.soundPools.values()) {
            pool.forEach(item => {
                item.audio.setVolume(this.sfxVolume * this.masterVolume);
            });
        }
    }
    
    /**
     * Mute/unmute audio
     */
    setMuted(muted) {
        this.isMuted = muted;
        
        if (muted) {
            if (this.currentMusic) this.currentMusic.setVolume(0);
            if (this.currentAmbient) this.currentAmbient.setVolume(0);
        } else {
            this.updateAllVolumes();
        }
        
        this.saveSettings();
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.setMuted(!this.isMuted);
    }
    
    /**
     * Enable/disable audio
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.stopMusic(0);
            this.stopAmbient(0);
        }
        
        this.saveSettings();
    }
    
    /**
     * Add audio listener to camera
     */
    addListenerToCamera(camera) {
        camera.add(this.listener);
    }
    
    /**
     * Play block break sound
     */
    playBlockBreak(blockType, position = null) {
        const soundName = `block_break_${blockType}`;
        const fallbackSound = 'block_break_dirt';
        
        this.playSound(soundName, {
            volume: 0.8 + Math.random() * 0.4,
            pitch: 0.8 + Math.random() * 0.4,
            position: position
        }) || this.playSound(fallbackSound, {
            volume: 0.8 + Math.random() * 0.4,
            pitch: 0.8 + Math.random() * 0.4,
            position: position
        });
    }
    
    /**
     * Play block place sound
     */
    playBlockPlace(position = null) {
        this.playSound('block_place', {
            volume: 0.6 + Math.random() * 0.3,
            pitch: 0.9 + Math.random() * 0.2,
            position: position
        });
    }
    
    /**
     * Play footstep sound
     */
    playFootstep(blockType, position = null) {
        const soundName = `footstep_${blockType}`;
        const fallbackSound = 'footstep_dirt';
        
        this.playSound(soundName, {
            volume: 0.3 + Math.random() * 0.2,
            pitch: 0.9 + Math.random() * 0.2,
            position: position
        }) || this.playSound(fallbackSound, {
            volume: 0.3 + Math.random() * 0.2,
            pitch: 0.9 + Math.random() * 0.2,
            position: position
        });
    }
    
    /**
     * Play UI sound
     */
    playUISound(type) {
        const soundName = `ui_${type}`;
        this.playSound(soundName, {
            volume: 0.5
        });
    }
    
    /**
     * Save audio settings
     */
    saveSettings() {
        const settings = {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            ambientVolume: this.ambientVolume,
            isEnabled: this.isEnabled,
            isMuted: this.isMuted
        };
        
        localStorage.setItem('audioSettings', JSON.stringify(settings));
    }
    
    /**
     * Load audio settings
     */
    loadSettings() {
        const saved = localStorage.getItem('audioSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                
                this.masterVolume = settings.masterVolume ?? this.masterVolume;
                this.musicVolume = settings.musicVolume ?? this.musicVolume;
                this.sfxVolume = settings.sfxVolume ?? this.sfxVolume;
                this.ambientVolume = settings.ambientVolume ?? this.ambientVolume;
                this.isEnabled = settings.isEnabled ?? this.isEnabled;
                this.isMuted = settings.isMuted ?? this.isMuted;
                
                console.log('Audio settings loaded');
            } catch (error) {
                console.error('Failed to load audio settings:', error);
            }
        }
    }
    
    /**
     * Get audio statistics
     */
    getStats() {
        return {
            isEnabled: this.isEnabled,
            isMuted: this.isMuted,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            ambientVolume: this.ambientVolume,
            soundsLoaded: this.sounds.size,
            soundPoolsActive: this.soundPools.size,
            currentMusic: this.currentMusic ? 'playing' : 'none',
            currentAmbient: this.currentAmbient ? 'playing' : 'none'
        };
    }
    
    /**
     * Dispose of audio manager
     */
    dispose() {
        // Stop all audio
        this.stopMusic(0);
        this.stopAmbient(0);
        
        // Clear sound pools
        for (const pool of this.soundPools.values()) {
            pool.forEach(item => {
                if (item.audio.isPlaying) {
                    item.audio.stop();
                }
            });
        }
        
        // Clear maps
        this.sounds.clear();
        this.music.clear();
        this.ambientSounds.clear();
        this.soundPools.clear();
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        console.log('AudioManager disposed');
    }
}