import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from '../config/config.js';

/**
 * Player class handles player movement, physics, and interactions
 */
export class Player {
    constructor(scene, world, camera) {
        this.scene = scene;
        this.world = world; // Physics world
        this.camera = camera;
        
        // Player state
        this.position = new THREE.Vector3(0, 50, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        
        // Movement settings
        this.speed = CONFIG.PLAYER.MOVE_SPEED;
        this.jumpSpeed = CONFIG.PLAYER.JUMP_SPEED;
        this.mouseSensitivity = CONFIG.PLAYER.MOUSE_SENSITIVITY;
        
        // Player state flags
        this.isOnGround = false;
        this.isJumping = false;
        this.isRunning = false;
        this.isCrouching = false;
        this.isFlying = CONFIG.PLAYER.CAN_FLY;
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            crouch: false,
            run: false
        };
        
        // Mouse state
        this.mouseMovement = { x: 0, y: 0 };
        this.isPointerLocked = false;
        
        // Physics body
        this.body = null;
        this.initPhysics();
        
        // Player inventory and interaction
        this.selectedBlockType = 'dirt';
        this.inventory = new Map();
        this.initInventory();
        
        // Interaction
        this.reach = CONFIG.PLAYER.REACH;
        this.raycaster = new THREE.Raycaster();
        
        // Event listeners
        this.setupEventListeners();
        
        console.log('Player initialized');
    }
    
    /**
     * Initialize physics body
     */
    initPhysics() {
        // Create player physics body (capsule-like)
        const shape = new CANNON.Cylinder(
            CONFIG.PLAYER.RADIUS,
            CONFIG.PLAYER.RADIUS,
            CONFIG.PLAYER.HEIGHT,
            8
        );
        
        this.body = new CANNON.Body({
            mass: CONFIG.PLAYER.MASS,
            shape: shape,
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            material: new CANNON.Material({
                friction: 0.1,
                restitution: 0.0
            })
        });
        
        // Prevent body from rotating
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
        
        // Add to physics world
        this.world.addBody(this.body);
        
        // Ground detection
        this.setupGroundDetection();
    }
    
    /**
     * Setup ground detection for jumping
     */
    setupGroundDetection() {
        this.body.addEventListener('collide', (event) => {
            const contact = event.contact;
            const other = event.target === this.body ? event.body : event.target;
            
            // Check if collision is below the player
            if (contact.ri.y < -CONFIG.PLAYER.HEIGHT / 2 + 0.1) {
                this.isOnGround = true;
            }
        });
    }
    
    /**
     * Initialize player inventory
     */
    initInventory() {
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        blockTypes.forEach(blockType => {
            this.inventory.set(blockType, 64); // Start with 64 of each block type
        });
    }
    
    /**
     * Setup event listeners for input
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse events
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('mousedown', (event) => this.onMouseDown(event));
        document.addEventListener('mouseup', (event) => this.onMouseUp(event));
        document.addEventListener('wheel', (event) => this.onMouseWheel(event));
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());
        
        // Request pointer lock on canvas click
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('click', () => {
                canvas.requestPointerLock();
            });
        }
    }
    
    /**
     * Handle keydown events
     */
    onKeyDown(event) {
        switch (event.code) {
            case CONFIG.CONTROLS.MOVE_FORWARD:
                this.keys.forward = true;
                break;
            case CONFIG.CONTROLS.MOVE_BACKWARD:
                this.keys.backward = true;
                break;
            case CONFIG.CONTROLS.MOVE_LEFT:
                this.keys.left = true;
                break;
            case CONFIG.CONTROLS.MOVE_RIGHT:
                this.keys.right = true;
                break;
            case CONFIG.CONTROLS.JUMP:
                this.keys.jump = true;
                break;
            case CONFIG.CONTROLS.CROUCH:
                this.keys.crouch = true;
                this.isCrouching = true;
                break;
            case CONFIG.CONTROLS.RUN:
                this.keys.run = true;
                this.isRunning = true;
                break;
            case 'KeyF':
                this.toggleFly();
                break;
            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
            case 'Digit5':
            case 'Digit6':
            case 'Digit7':
            case 'Digit8':
            case 'Digit9':
                this.selectHotbarSlot(parseInt(event.code.slice(-1)) - 1);
                break;
        }
    }
    
    /**
     * Handle keyup events
     */
    onKeyUp(event) {
        switch (event.code) {
            case CONFIG.CONTROLS.MOVE_FORWARD:
                this.keys.forward = false;
                break;
            case CONFIG.CONTROLS.MOVE_BACKWARD:
                this.keys.backward = false;
                break;
            case CONFIG.CONTROLS.MOVE_LEFT:
                this.keys.left = false;
                break;
            case CONFIG.CONTROLS.MOVE_RIGHT:
                this.keys.right = false;
                break;
            case CONFIG.CONTROLS.JUMP:
                this.keys.jump = false;
                break;
            case CONFIG.CONTROLS.CROUCH:
                this.keys.crouch = false;
                this.isCrouching = false;
                break;
            case CONFIG.CONTROLS.RUN:
                this.keys.run = false;
                this.isRunning = false;
                break;
        }
    }
    
    /**
     * Handle mouse movement
     */
    onMouseMove(event) {
        if (!this.isPointerLocked) return;
        
        this.mouseMovement.x = event.movementX || 0;
        this.mouseMovement.y = event.movementY || 0;
        
        // Apply mouse sensitivity
        const sensitivity = this.mouseSensitivity * 0.001;
        
        // Update camera rotation
        this.rotation.y -= this.mouseMovement.x * sensitivity;
        this.rotation.x -= this.mouseMovement.y * sensitivity;
        
        // Clamp vertical rotation
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
        
        // Apply rotation to camera
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rotation.y;
        this.camera.rotation.x = this.rotation.x;
    }
    
    /**
     * Handle mouse button events
     */
    onMouseDown(event) {
        if (!this.isPointerLocked) return;
        
        event.preventDefault();
        
        if (event.button === 0) { // Left click - break block
            this.breakBlock();
        } else if (event.button === 2) { // Right click - place block
            this.placeBlock();
        }
    }
    
    onMouseUp(event) {
        // Handle mouse up if needed
    }
    
    /**
     * Handle mouse wheel for hotbar selection
     */
    onMouseWheel(event) {
        event.preventDefault();
        
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        const currentIndex = blockTypes.indexOf(this.selectedBlockType);
        let newIndex;
        
        if (event.deltaY > 0) {
            newIndex = (currentIndex + 1) % blockTypes.length;
        } else {
            newIndex = (currentIndex - 1 + blockTypes.length) % blockTypes.length;
        }
        
        this.selectedBlockType = blockTypes[newIndex];
        this.updateHotbarUI();
    }
    
    /**
     * Handle pointer lock changes
     */
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement !== null;
        
        if (this.isPointerLocked) {
            console.log('Pointer locked');
        } else {
            console.log('Pointer unlocked');
        }
    }
    
    onPointerLockError() {
        console.error('Pointer lock error');
    }
    
    /**
     * Update player physics and movement
     */
    update(deltaTime, voxelWorld) {
        this.handleMovement(deltaTime);
        this.updatePosition();
        this.updateCamera();
        this.checkGroundCollision();
        
        // Reset ground state (will be set by collision detection)
        this.isOnGround = false;
    }
    
    /**
     * Handle player movement
     */
    handleMovement(deltaTime) {
        const moveVector = new THREE.Vector3();
        
        // Calculate movement direction
        if (this.keys.forward) moveVector.z -= 1;
        if (this.keys.backward) moveVector.z += 1;
        if (this.keys.left) moveVector.x -= 1;
        if (this.keys.right) moveVector.x += 1;
        
        // Normalize movement vector
        if (moveVector.length() > 0) {
            moveVector.normalize();
        }
        
        // Apply rotation to movement
        moveVector.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        // Calculate speed
        let currentSpeed = this.speed;
        if (this.isRunning) currentSpeed *= CONFIG.PLAYER.RUN_MULTIPLIER;
        if (this.isCrouching) currentSpeed *= CONFIG.PLAYER.CROUCH_MULTIPLIER;
        
        // Apply movement to physics body
        if (this.isFlying) {
            // Flying mode
            this.body.velocity.x = moveVector.x * currentSpeed;
            this.body.velocity.z = moveVector.z * currentSpeed;
            
            if (this.keys.jump) {
                this.body.velocity.y = currentSpeed;
            } else if (this.keys.crouch) {
                this.body.velocity.y = -currentSpeed;
            } else {
                this.body.velocity.y = 0;
            }
        } else {
            // Normal movement
            this.body.velocity.x = moveVector.x * currentSpeed;
            this.body.velocity.z = moveVector.z * currentSpeed;
            
            // Jumping
            if (this.keys.jump && this.isOnGround && !this.isJumping) {
                this.body.velocity.y = this.jumpSpeed;
                this.isJumping = true;
                this.isOnGround = false;
            }
        }
    }
    
    /**
     * Update player position from physics body
     */
    updatePosition() {
        this.position.copy(this.body.position);
    }
    
    /**
     * Update camera position
     */
    updateCamera() {
        const eyeHeight = this.isCrouching ? CONFIG.PLAYER.EYE_HEIGHT * 0.7 : CONFIG.PLAYER.EYE_HEIGHT;
        this.camera.position.set(
            this.position.x,
            this.position.y + eyeHeight,
            this.position.z
        );
    }
    
    /**
     * Check ground collision for jump reset
     */
    checkGroundCollision() {
        if (this.isOnGround && this.isJumping) {
            this.isJumping = false;
        }
    }
    
    /**
     * Break block at crosshair
     */
    breakBlock() {
        const intersection = this.raycastBlocks();
        if (intersection.hit) {
            const { x, y, z } = intersection.position;
            const blockType = intersection.blockType;
            
            // Add block to inventory
            const currentCount = this.inventory.get(blockType) || 0;
            this.inventory.set(blockType, currentCount + 1);
            
            // Remove block from world
            // This would be handled by the voxel world
            console.log(`Broke ${blockType} at (${x}, ${y}, ${z})`);
        }
    }
    
    /**
     * Place block at crosshair
     */
    placeBlock() {
        const intersection = this.raycastBlocks();
        if (intersection.hit) {
            const { x, y, z } = intersection.adjacent;
            
            // Check if player has blocks in inventory
            const currentCount = this.inventory.get(this.selectedBlockType) || 0;
            if (currentCount > 0) {
                // Remove block from inventory
                this.inventory.set(this.selectedBlockType, currentCount - 1);
                
                // Place block in world
                // This would be handled by the voxel world
                console.log(`Placed ${this.selectedBlockType} at (${x}, ${y}, ${z})`);
            }
        }
    }
    
    /**
     * Raycast to find block at crosshair
     */
    raycastBlocks() {
        // This would use the voxel world's raycast method
        // For now, return a mock result
        return {
            hit: false,
            position: { x: 0, y: 0, z: 0 },
            adjacent: { x: 0, y: 0, z: 0 },
            blockType: 'dirt',
            distance: 0
        };
    }
    
    /**
     * Toggle flying mode
     */
    toggleFly() {
        this.isFlying = !this.isFlying;
        
        if (this.isFlying) {
            this.body.type = CANNON.Body.KINEMATIC;
            console.log('Flying mode enabled');
        } else {
            this.body.type = CANNON.Body.DYNAMIC;
            console.log('Flying mode disabled');
        }
    }
    
    /**
     * Select hotbar slot
     */
    selectHotbarSlot(slot) {
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        if (slot >= 0 && slot < blockTypes.length) {
            this.selectedBlockType = blockTypes[slot];
            this.updateHotbarUI();
        }
    }
    
    /**
     * Update hotbar UI
     */
    updateHotbarUI() {
        // Update UI to show selected block
        const hotbarSlots = document.querySelectorAll('.hotbar-slot');
        const blockTypes = Object.keys(CONFIG.BLOCKS.TYPES);
        const selectedIndex = blockTypes.indexOf(this.selectedBlockType);
        
        hotbarSlots.forEach((slot, index) => {
            slot.classList.toggle('selected', index === selectedIndex);
        });
    }
    
    /**
     * Get player statistics
     */
    getStats() {
        return {
            position: {
                x: Math.round(this.position.x * 100) / 100,
                y: Math.round(this.position.y * 100) / 100,
                z: Math.round(this.position.z * 100) / 100
            },
            velocity: {
                x: Math.round(this.body.velocity.x * 100) / 100,
                y: Math.round(this.body.velocity.y * 100) / 100,
                z: Math.round(this.body.velocity.z * 100) / 100
            },
            rotation: {
                x: Math.round(this.rotation.x * 180 / Math.PI),
                y: Math.round(this.rotation.y * 180 / Math.PI)
            },
            state: {
                isOnGround: this.isOnGround,
                isJumping: this.isJumping,
                isRunning: this.isRunning,
                isCrouching: this.isCrouching,
                isFlying: this.isFlying
            },
            selectedBlock: this.selectedBlockType,
            inventoryCount: this.inventory.get(this.selectedBlockType) || 0
        };
    }
    
    /**
     * Set player position
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.body.position.set(x, y, z);
        this.updateCamera();
    }
    
    /**
     * Get inventory contents
     */
    getInventory() {
        return new Map(this.inventory);
    }
    
    /**
     * Add items to inventory
     */
    addToInventory(blockType, count = 1) {
        const currentCount = this.inventory.get(blockType) || 0;
        this.inventory.set(blockType, currentCount + count);
    }
    
    /**
     * Remove items from inventory
     */
    removeFromInventory(blockType, count = 1) {
        const currentCount = this.inventory.get(blockType) || 0;
        const newCount = Math.max(0, currentCount - count);
        this.inventory.set(blockType, newCount);
        return currentCount - newCount; // Return actual amount removed
    }
    
    /**
     * Dispose of player resources
     */
    dispose() {
        // Remove physics body
        if (this.body) {
            this.world.removeBody(this.body);
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('wheel', this.onMouseWheel);
        
        console.log('Player disposed');
    }
}