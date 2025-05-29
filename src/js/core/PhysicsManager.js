/**
 * 3D Pit Word - Physics Manager
 * 
 * Gestisce il sistema fisico del gioco utilizzando Cannon.js.
 * Sincronizza gli oggetti Three.js con i corpi fisici.
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CONFIG } from '../config/config.js';

export class PhysicsManager {
    /**
     * Costruttore del PhysicsManager
     * @param {Object} config - Configurazione della fisica
     */
    constructor(config = CONFIG.PHYSICS) {
        this.config = config;
        
        // Mondo fisico
        this.world = new CANNON.World();
        this.initWorld();
        
        // Mappatura tra oggetti Three.js e corpi Cannon.js
        this.meshToBody = new Map();
        this.bodyToMesh = new Map();
        
        // Materiali fisici
        this.materials = new Map();
        this.initMaterials();
        
        // Performance tracking
        this.lastStepTime = 0;
        this.accumulator = 0;
        this.maxSubSteps = config.MAX_SUB_STEPS || 3;
        this.fixedTimeStep = config.TIME_STEP || 1/60;
        
        console.log('PhysicsManager initialized');
    }
    
    /**
     * Inizializza il mondo fisico
     * @private
     */
    initWorld() {
        // Imposta la gravità
        this.world.gravity.set(0, this.config.GRAVITY, 0);
        
        // Configura il solver
        this.world.solver.iterations = this.config.SOLVER_ITERATIONS || 10;
        this.world.solver.tolerance = this.config.SOLVER_TOLERANCE || 0.1;
        
        // Configura il broadphase per performance migliori
        this.world.broadphase = new CANNON.NaiveBroadphase();
        
        // Abilita il sleep per oggetti fermi
        this.world.allowSleep = true;
        
        console.log('Physics world initialized');
    }
    
    /**
     * Inizializza i materiali fisici
     * @private
     */
    initMaterials() {
        // Materiale del giocatore
        const playerMaterial = new CANNON.Material('player');
        this.materials.set('player', playerMaterial);
        
        // Materiale del terreno
        const groundMaterial = new CANNON.Material('ground');
        this.materials.set('ground', groundMaterial);
        
        // Materiale dei blocchi
        const blockMaterial = new CANNON.Material('block');
        this.materials.set('block', blockMaterial);
        
        // Materiale dell'acqua
        const waterMaterial = new CANNON.Material('water');
        this.materials.set('water', waterMaterial);
        
        // Configura le interazioni tra materiali
        this.setupMaterialInteractions();
    }
    
    /**
     * Configura le interazioni tra materiali
     * @private
     */
    setupMaterialInteractions() {
        const playerMaterial = this.materials.get('player');
        const groundMaterial = this.materials.get('ground');
        const blockMaterial = this.materials.get('block');
        const waterMaterial = this.materials.get('water');
        
        // Giocatore - Terreno
        const playerGroundContact = new CANNON.ContactMaterial(
            playerMaterial,
            groundMaterial,
            {
                friction: this.config.FRICTION,
                restitution: this.config.RESTITUTION
            }
        );
        this.world.addContactMaterial(playerGroundContact);
        
        // Giocatore - Blocchi
        const playerBlockContact = new CANNON.ContactMaterial(
            playerMaterial,
            blockMaterial,
            {
                friction: this.config.FRICTION,
                restitution: this.config.RESTITUTION * 0.5
            }
        );
        this.world.addContactMaterial(playerBlockContact);
        
        // Giocatore - Acqua (meno attrito)
        const playerWaterContact = new CANNON.ContactMaterial(
            playerMaterial,
            waterMaterial,
            {
                friction: this.config.FRICTION * 0.1,
                restitution: 0
            }
        );
        this.world.addContactMaterial(playerWaterContact);
        
        // Blocchi - Blocchi
        const blockBlockContact = new CANNON.ContactMaterial(
            blockMaterial,
            blockMaterial,
            {
                friction: this.config.FRICTION * 1.5,
                restitution: this.config.RESTITUTION * 0.3
            }
        );
        this.world.addContactMaterial(blockBlockContact);
    }
    
    /**
     * Crea un corpo fisico per un oggetto Three.js
     * @param {THREE.Object3D} mesh - Oggetto Three.js
     * @param {Object} options - Opzioni per il corpo fisico
     * @returns {CANNON.Body} Corpo fisico creato
     */
    createBody(mesh, options = {}) {
        const {
            type = 'box',
            mass = 0,
            material = 'ground',
            size = null,
            position = null,
            rotation = null
        } = options;
        
        // Crea la forma del corpo
        let shape;
        switch (type) {
            case 'box':
                const boxSize = size || this.getBoxSizeFromMesh(mesh);
                shape = new CANNON.Box(new CANNON.Vec3(
                    boxSize.x / 2,
                    boxSize.y / 2,
                    boxSize.z / 2
                ));
                break;
                
            case 'sphere':
                const radius = size?.radius || this.getSphereRadiusFromMesh(mesh);
                shape = new CANNON.Sphere(radius);
                break;
                
            case 'cylinder':
                const cylinderRadius = size?.radius || 0.5;
                const cylinderHeight = size?.height || 1;
                shape = new CANNON.Cylinder(
                    cylinderRadius,
                    cylinderRadius,
                    cylinderHeight,
                    8
                );
                break;
                
            case 'plane':
                shape = new CANNON.Plane();
                break;
                
            default:
                console.warn(`Unknown body type: ${type}`);
                shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        }
        
        // Crea il corpo
        const body = new CANNON.Body({ mass });
        body.addShape(shape);
        
        // Imposta il materiale
        if (this.materials.has(material)) {
            body.material = this.materials.get(material);
        }
        
        // Imposta posizione e rotazione
        if (position) {
            body.position.set(position.x, position.y, position.z);
        } else {
            body.position.copy(mesh.position);
        }
        
        if (rotation) {
            body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(rotation.axis.x, rotation.axis.y, rotation.axis.z),
                rotation.angle
            );
        } else if (mesh.quaternion) {
            body.quaternion.set(
                mesh.quaternion.x,
                mesh.quaternion.y,
                mesh.quaternion.z,
                mesh.quaternion.w
            );
        }
        
        // Aggiungi al mondo
        this.world.addBody(body);
        
        // Crea la mappatura
        this.meshToBody.set(mesh, body);
        this.bodyToMesh.set(body, mesh);
        
        return body;
    }
    
    /**
     * Rimuove un corpo fisico
     * @param {THREE.Object3D|CANNON.Body} object - Oggetto o corpo da rimuovere
     */
    removeBody(object) {
        let body, mesh;
        
        if (object instanceof CANNON.Body) {
            body = object;
            mesh = this.bodyToMesh.get(body);
        } else {
            mesh = object;
            body = this.meshToBody.get(mesh);
        }
        
        if (body) {
            this.world.removeBody(body);
            this.meshToBody.delete(mesh);
            this.bodyToMesh.delete(body);
        }
    }
    
    /**
     * Ottiene il corpo fisico associato a un mesh
     * @param {THREE.Object3D} mesh - Oggetto Three.js
     * @returns {CANNON.Body|null} Corpo fisico o null
     */
    getBody(mesh) {
        return this.meshToBody.get(mesh) || null;
    }
    
    /**
     * Ottiene il mesh associato a un corpo fisico
     * @param {CANNON.Body} body - Corpo fisico
     * @returns {THREE.Object3D|null} Oggetto Three.js o null
     */
    getMesh(body) {
        return this.bodyToMesh.get(body) || null;
    }
    
    /**
     * Aggiorna la simulazione fisica
     * @param {number} deltaTime - Tempo trascorso dall'ultimo frame
     */
    update(deltaTime) {
        // Usa un timestep fisso per stabilità
        this.accumulator += deltaTime;
        
        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
            this.world.step(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
            steps++;
        }
        
        // Sincronizza le posizioni dei mesh con i corpi fisici
        this.syncMeshes();
    }
    
    /**
     * Sincronizza le posizioni dei mesh Three.js con i corpi Cannon.js
     * @private
     */
    syncMeshes() {
        for (const [mesh, body] of this.meshToBody) {
            // Sincronizza posizione
            mesh.position.copy(body.position);
            
            // Sincronizza rotazione
            mesh.quaternion.copy(body.quaternion);
        }
    }
    
    /**
     * Esegue un raycast nel mondo fisico
     * @param {THREE.Vector3} from - Punto di partenza
     * @param {THREE.Vector3} to - Punto di arrivo
     * @param {Object} options - Opzioni per il raycast
     * @returns {Object|null} Risultato del raycast o null
     */
    raycast(from, to, options = {}) {
        const raycastResult = new CANNON.RaycastResult();
        
        this.world.raycastClosest(
            new CANNON.Vec3(from.x, from.y, from.z),
            new CANNON.Vec3(to.x, to.y, to.z),
            options,
            raycastResult
        );
        
        if (raycastResult.hasHit) {
            return {
                body: raycastResult.body,
                mesh: this.bodyToMesh.get(raycastResult.body),
                point: new THREE.Vector3().copy(raycastResult.hitPointWorld),
                normal: new THREE.Vector3().copy(raycastResult.hitNormalWorld),
                distance: raycastResult.distance
            };
        }
        
        return null;
    }
    
    /**
     * Applica una forza a un corpo
     * @param {THREE.Object3D|CANNON.Body} object - Oggetto o corpo
     * @param {THREE.Vector3} force - Forza da applicare
     * @param {THREE.Vector3} point - Punto di applicazione (opzionale)
     */
    applyForce(object, force, point = null) {
        const body = object instanceof CANNON.Body ? object : this.getBody(object);
        
        if (body) {
            const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
            
            if (point) {
                const cannonPoint = new CANNON.Vec3(point.x, point.y, point.z);
                body.applyForce(cannonForce, cannonPoint);
            } else {
                body.applyForce(cannonForce);
            }
        }
    }
    
    /**
     * Applica un impulso a un corpo
     * @param {THREE.Object3D|CANNON.Body} object - Oggetto o corpo
     * @param {THREE.Vector3} impulse - Impulso da applicare
     * @param {THREE.Vector3} point - Punto di applicazione (opzionale)
     */
    applyImpulse(object, impulse, point = null) {
        const body = object instanceof CANNON.Body ? object : this.getBody(object);
        
        if (body) {
            const cannonImpulse = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
            
            if (point) {
                const cannonPoint = new CANNON.Vec3(point.x, point.y, point.z);
                body.applyImpulse(cannonImpulse, cannonPoint);
            } else {
                body.applyImpulse(cannonImpulse);
            }
        }
    }
    
    /**
     * Calcola la dimensione di un box da un mesh Three.js
     * @param {THREE.Object3D} mesh - Oggetto Three.js
     * @returns {THREE.Vector3} Dimensioni del box
     * @private
     */
    getBoxSizeFromMesh(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size;
    }
    
    /**
     * Calcola il raggio di una sfera da un mesh Three.js
     * @param {THREE.Object3D} mesh - Oggetto Three.js
     * @returns {number} Raggio della sfera
     * @private
     */
    getSphereRadiusFromMesh(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return Math.max(size.x, size.y, size.z) / 2;
    }
    
    /**
     * Ottiene statistiche del sistema fisico
     * @returns {Object} Statistiche
     */
    getStats() {
        return {
            bodies: this.world.bodies.length,
            contacts: this.world.contacts.length,
            materials: this.materials.size,
            mappings: this.meshToBody.size
        };
    }
    
    /**
     * Pulisce le risorse del PhysicsManager
     */
    dispose() {
        console.log('Disposing physics manager...');
        
        // Rimuovi tutti i corpi
        const bodies = [...this.world.bodies];
        bodies.forEach(body => this.world.removeBody(body));
        
        // Pulisci le mappature
        this.meshToBody.clear();
        this.bodyToMesh.clear();
        
        // Pulisci i materiali
        this.materials.clear();
        
        console.log('PhysicsManager disposed');
    }
}