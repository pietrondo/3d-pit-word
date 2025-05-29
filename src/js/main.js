/**
 * 3D Pit Word - Main Entry Point
 * 
 * Questo file è il punto di ingresso principale del gioco.
 * Gestisce l'inizializzazione, il caricamento delle risorse e l'avvio del loop di gioco.
 */

import { Game } from './core/Game.js';
import { AssetManager } from './core/AssetManager.js';
import { UIManager } from './ui/UIManager.js';
import { DebugManager } from './utils/DebugManager.js';
import { CONFIG } from './config/config.js';

// Variabili globali
let game;
let assetManager;
let uiManager;
let debugManager;

// Elementi DOM
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingText = document.getElementById('loading-text');
const gameContainer = document.getElementById('game-container');
const menuSystem = document.getElementById('menu-system');
const errorDisplay = document.getElementById('error-display');
const errorMessage = document.getElementById('error-message');

/**
 * Inizializza il gioco
 */
async function init() {
    try {
        console.log('Inizializzazione 3D Pit Word...');
        
        // Inizializza i manager
        debugManager = new DebugManager();
        assetManager = new AssetManager(updateLoadingProgress);
        uiManager = new UIManager();
        
        // Carica le risorse essenziali
        await loadEssentialAssets();
        
        // Inizializza il gioco
        game = new Game({
            assetManager,
            uiManager,
            debugManager,
            config: CONFIG
        });
        
        // Inizializza gli eventi UI
        setupUIEvents();
        
        // Mostra il menu principale
        showMainMenu();
        
        console.log('Inizializzazione completata!');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        showError('Si è verificato un errore durante l\'inizializzazione del gioco: ' + error.message);
    }
}

/**
 * Carica le risorse essenziali per il gioco
 */
async function loadEssentialAssets() {
    updateLoadingText('Caricamento risorse...');
    
    try {
        // Registra le risorse da caricare
        assetManager.registerTextures([
            { id: 'dirt', url: '/textures/blocks/dirt.png' },
            { id: 'grass_top', url: '/textures/blocks/grass_top.png' },
            { id: 'grass_side', url: '/textures/blocks/grass_side.png' },
            { id: 'stone', url: '/textures/blocks/stone.png' },
            { id: 'wood', url: '/textures/blocks/wood.png' },
            { id: 'leaves', url: '/textures/blocks/leaves.png' },
        ]);
        
        assetManager.registerModels([
            // I modelli verranno aggiunti in seguito
        ]);
        
        assetManager.registerSounds([
            { id: 'background', url: '/sounds/background.mp3' },
            { id: 'dig', url: '/sounds/dig.mp3' },
            { id: 'place', url: '/sounds/place.mp3' },
        ]);
        
        // Avvia il caricamento
        await assetManager.loadAll();
        
    } catch (error) {
        console.error('Errore durante il caricamento delle risorse:', error);
        throw new Error('Impossibile caricare le risorse necessarie');
    }
}

/**
 * Aggiorna la barra di caricamento
 * @param {number} progress - Progresso da 0 a 1
 * @param {string} assetType - Tipo di risorsa in caricamento
 * @param {string} assetId - ID della risorsa in caricamento
 */
function updateLoadingProgress(progress, assetType, assetId) {
    const percentage = Math.floor(progress * 100);
    loadingProgress.style.width = `${percentage}%`;
    
    if (assetType && assetId) {
        updateLoadingText(`Caricamento ${assetType}: ${assetId} (${percentage}%)`);
    } else {
        updateLoadingText(`Caricamento: ${percentage}%`);
    }
}

/**
 * Aggiorna il testo di caricamento
 * @param {string} text - Testo da mostrare
 */
function updateLoadingText(text) {
    loadingText.textContent = text;
}

/**
 * Configura gli eventi dell'interfaccia utente
 */
function setupUIEvents() {
    // Pulsanti del menu principale
    document.getElementById('btn-play').addEventListener('click', startGame);
    document.getElementById('btn-settings').addEventListener('click', showSettingsMenu);
    document.getElementById('btn-about').addEventListener('click', showAboutMenu);
    
    // Pulsanti del menu impostazioni
    document.getElementById('btn-back-settings').addEventListener('click', showMainMenu);
    
    // Slider e select delle impostazioni
    const renderDistanceSlider = document.getElementById('render-distance');
    const renderDistanceValue = document.getElementById('render-distance-value');
    renderDistanceSlider.addEventListener('input', () => {
        renderDistanceValue.textContent = renderDistanceSlider.value;
        if (game) {
            game.updateRenderDistance(parseInt(renderDistanceSlider.value));
        }
    });
    
    const audioVolumeSlider = document.getElementById('audio-volume');
    const audioVolumeValue = document.getElementById('audio-volume-value');
    audioVolumeSlider.addEventListener('input', () => {
        const volume = audioVolumeSlider.value;
        audioVolumeValue.textContent = `${volume}%`;
        if (assetManager) {
            assetManager.setGlobalVolume(volume / 100);
        }
    });
    
    const graphicsQualitySelect = document.getElementById('graphics-quality');
    graphicsQualitySelect.addEventListener('change', () => {
        if (game) {
            game.updateGraphicsQuality(graphicsQualitySelect.value);
        }
    });
    
    // Pulsante di ricarica in caso di errore
    document.getElementById('btn-reload').addEventListener('click', () => {
        window.location.reload();
    });
    
    // Tasto ESC per aprire il menu
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (game && game.isRunning()) {
                pauseGame();
            }
        }
    });
}

/**
 * Mostra il menu principale
 */
function showMainMenu() {
    hideAllMenus();
    menuSystem.classList.remove('hidden');
    document.getElementById('main-menu').classList.add('active');
}

/**
 * Mostra il menu delle impostazioni
 */
function showSettingsMenu() {
    hideAllMenus();
    document.getElementById('settings-menu').classList.add('active');
}

/**
 * Mostra il menu delle informazioni
 */
function showAboutMenu() {
    // Da implementare
}

/**
 * Nasconde tutti i menu
 */
function hideAllMenus() {
    const menus = document.querySelectorAll('.menu');
    menus.forEach(menu => menu.classList.remove('active'));
}

/**
 * Avvia il gioco
 */
function startGame() {
    try {
        // Nascondi il menu e mostra il gioco
        menuSystem.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        // Avvia il gioco
        game.start();
        
        // Blocca il puntatore per il controllo della camera
        document.getElementById('game-canvas').requestPointerLock();
        
    } catch (error) {
        console.error('Errore durante l\'avvio del gioco:', error);
        showError('Si è verificato un errore durante l\'avvio del gioco: ' + error.message);
    }
}

/**
 * Mette in pausa il gioco
 */
function pauseGame() {
    if (game) {
        game.pause();
    }
    showMainMenu();
}

/**
 * Mostra un messaggio di errore
 * @param {string} message - Messaggio di errore
 */
function showError(message) {
    errorMessage.textContent = message;
    errorDisplay.classList.remove('hidden');
}

// Avvia l'inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Nascondi il contenitore di gioco e il menu durante il caricamento
    gameContainer.classList.add('hidden');
    menuSystem.classList.add('hidden');
    
    // Inizializza il gioco
    init();
});

// Gestione degli errori globali
window.addEventListener('error', (event) => {
    console.error('Errore globale:', event.error);
    showError('Si è verificato un errore: ' + event.error.message);
});