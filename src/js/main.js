/**
 * main.js - Entry point per 3D Pit Word
 * 
 * Inizializza Three.js e gestisce il loop di rendering principale.
 * Punto di ingresso dell'applicazione con setup della scena 3D e VoxelEngine.
 * 
 * @author Pietro
 * @version 0.1.0-alpha
 */

import * as THREE from 'three';
import { VoxelEngine } from './core/VoxelEngine.js';

// Variabili globali
let scene, camera, renderer, voxelEngine;
let clock = new THREE.Clock();
let controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
};

// Performance monitoring
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

/**
 * Inizializza il gioco
 */
async function init() {
    try {
        console.log('Inizializzazione 3D Pit Word...');
        
        // Setup Three.js base
        setupThreeJS();
        
        // Inizializza VoxelEngine
        voxelEngine = new VoxelEngine(scene);
        
        // Setup controlli
        setupControls();
        
        // Setup UI debug
        setupDebugUI();
        
        // Genera mondo di test
        generateTestWorld();
        
        // Avvia il loop di rendering
        animate();
        
        console.log('Inizializzazione completata!');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Errore: ${error.message}</div>`;
    }
}

/**
 * Setup Three.js base
 */
function setupThreeJS() {
    // Scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 10);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Luci
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Resize handler
    window.addEventListener('resize', onWindowResize);
}

/**
 * Setup controlli
 */
function setupControls() {
    // Controlli tastiera
    document.addEventListener('keydown', (event) => {
        switch(event.code) {
            case 'KeyW': controls.forward = true; break;
            case 'KeyS': controls.backward = true; break;
            case 'KeyA': controls.left = true; break;
            case 'KeyD': controls.right = true; break;
            case 'Space': controls.up = true; event.preventDefault(); break;
            case 'ShiftLeft': controls.down = true; break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        switch(event.code) {
            case 'KeyW': controls.forward = false; break;
            case 'KeyS': controls.backward = false; break;
            case 'KeyA': controls.left = false; break;
            case 'KeyD': controls.right = false; break;
            case 'Space': controls.up = false; break;
            case 'ShiftLeft': controls.down = false; break;
        }
    });
    
    // Controlli mouse
    let isPointerLocked = false;
    
    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    document.addEventListener('mousemove', (event) => {
        if (isPointerLocked) {
            const sensitivity = 0.002;
            camera.rotation.y -= event.movementX * sensitivity;
            camera.rotation.x -= event.movementY * sensitivity;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
        }
    });
}

/**
 * Setup UI debug
 */
function setupDebugUI() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-info';
    debugDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 1000;
    `;
    document.body.appendChild(debugDiv);
}

/**
 * Genera mondo di test
 */
function generateTestWorld() {
    // Genera alcuni chunk di test
    for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
            const chunk = voxelEngine.getOrCreateChunk(x, 0, z);
            
            // Genera terreno semplice
            for (let cx = 0; cx < 16; cx++) {
                for (let cz = 0; cz < 16; cz++) {
                    const height = Math.floor(Math.random() * 4) + 2;
                    for (let cy = 0; cy < height; cy++) {
                        chunk.setVoxel(cx, cy, cz, cy === height - 1 ? 2 : 1); // Grass top o dirt
                    }
                }
            }
            
            voxelEngine.updateChunkMesh(chunk);
        }
    }
}

/**
 * Update controlli camera
 */
function updateControls() {
    const speed = 0.1;
    const direction = new THREE.Vector3();
    
    if (controls.forward) direction.z -= 1;
    if (controls.backward) direction.z += 1;
    if (controls.left) direction.x -= 1;
    if (controls.right) direction.x += 1;
    if (controls.up) direction.y += 1;
    if (controls.down) direction.y -= 1;
    
    direction.normalize();
    direction.multiplyScalar(speed);
    
    // Applica rotazione camera alla direzione
    direction.applyQuaternion(camera.quaternion);
    camera.position.add(direction);
}

/**
 * Update performance stats
 */
function updatePerformanceStats() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        const debugDiv = document.getElementById('debug-info');
        if (debugDiv) {
            debugDiv.innerHTML = `
                FPS: ${fps}<br>
                Position: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}<br>
                Chunks: ${voxelEngine ? voxelEngine.chunks.size : 0}<br>
                Triangles: ${renderer.info.render.triangles}
            `;
        }
    }
}

/**
 * Resize handler
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Loop di rendering principale
 */
function animate() {
    requestAnimationFrame(animate);
    
    updateControls();
    updatePerformanceStats();
    
    renderer.render(scene, camera);
}

// Avvia l'inizializzazione quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}