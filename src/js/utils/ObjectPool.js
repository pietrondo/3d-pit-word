/**
 * ObjectPool.js - Sistema di pooling per ottimizzazione memoria
 * 
 * Implementa un object pool per riutilizzare oggetti costosi da creare,
 * riducendo il garbage collection e migliorando le performance.
 * 
 * @author Pietro
 * @version 0.1.0-alpha
 */

/**
 * Classe per il pooling di oggetti
 * Riutilizza oggetti invece di crearli e distruggerli continuamente
 */
export class ObjectPool {
    constructor(createFn, resetFn = null, initialSize = 10) {
        this.createFn = createFn;      // Funzione per creare nuovi oggetti
        this.resetFn = resetFn;        // Funzione per resettare oggetti (opzionale)
        this.pool = [];                // Pool di oggetti disponibili
        this.used = new Set();         // Oggetti attualmente in uso
        this.totalCreated = 0;         // Contatore oggetti creati
        this.totalReused = 0;          // Contatore riutilizzi
        
        // Pre-popola il pool
        this.preallocate(initialSize);
        
        console.log(`ObjectPool created with initial size: ${initialSize}`);
    }
    
    /**
     * Pre-alloca oggetti nel pool
     * @param {number} count - Numero di oggetti da pre-allocare
     */
    preallocate(count) {
        for (let i = 0; i < count; i++) {
            const obj = this.createFn();
            this.pool.push(obj);
            this.totalCreated++;
        }
    }
    
    /**
     * Ottieni un oggetto dal pool
     * @returns {*} Oggetto dal pool o nuovo oggetto
     */
    acquire() {
        let obj;
        
        if (this.pool.length > 0) {
            // Riutilizza oggetto esistente
            obj = this.pool.pop();
            this.totalReused++;
        } else {
            // Crea nuovo oggetto se il pool è vuoto
            obj = this.createFn();
            this.totalCreated++;
        }
        
        // Resetta l'oggetto se necessario
        if (this.resetFn) {
            this.resetFn(obj);
        }
        
        // Traccia l'oggetto come in uso
        this.used.add(obj);
        
        return obj;
    }
    
    /**
     * Restituisci un oggetto al pool
     * @param {*} obj - Oggetto da restituire
     */
    release(obj) {
        if (!obj) {
            console.warn('Attempting to release null/undefined object');
            return;
        }
        
        if (!this.used.has(obj)) {
            console.warn('Attempting to release object not acquired from this pool');
            return;
        }
        
        // Rimuovi dalla lista degli oggetti in uso
        this.used.delete(obj);
        
        // Restituisci al pool
        this.pool.push(obj);
    }
    
    /**
     * Rilascia tutti gli oggetti in uso (forzato)
     * Utile per cleanup o reset completo
     */
    releaseAll() {
        this.used.forEach(obj => {
            this.pool.push(obj);
        });
        this.used.clear();
        
        console.log('All objects released back to pool');
    }
    
    /**
     * Ridimensiona il pool
     * @param {number} newSize - Nuova dimensione target
     */
    resize(newSize) {
        const currentSize = this.pool.length;
        
        if (newSize > currentSize) {
            // Aggiungi oggetti
            const toAdd = newSize - currentSize;
            this.preallocate(toAdd);
        } else if (newSize < currentSize) {
            // Rimuovi oggetti in eccesso
            const toRemove = currentSize - newSize;
            for (let i = 0; i < toRemove && this.pool.length > 0; i++) {
                const obj = this.pool.pop();
                // Cleanup dell'oggetto se necessario
                if (obj && typeof obj.dispose === 'function') {
                    obj.dispose();
                }
            }
        }
        
        console.log(`Pool resized to ${this.pool.length} objects`);
    }
    
    /**
     * Pulisci il pool e rilascia tutte le risorse
     */
    dispose() {
        // Rilascia tutti gli oggetti in uso
        this.releaseAll();
        
        // Cleanup di tutti gli oggetti nel pool
        this.pool.forEach(obj => {
            if (obj && typeof obj.dispose === 'function') {
                obj.dispose();
            }
        });
        
        // Svuota il pool
        this.pool.length = 0;
        this.used.clear();
        
        console.log('ObjectPool disposed');
    }
    
    /**
     * Ottieni statistiche del pool
     * @returns {Object} Statistiche
     */
    getStats() {
        return {
            available: this.pool.length,
            inUse: this.used.size,
            totalCreated: this.totalCreated,
            totalReused: this.totalReused,
            reuseRatio: this.totalCreated > 0 ? this.totalReused / this.totalCreated : 0,
            efficiency: this.totalReused / (this.totalCreated + this.totalReused)
        };
    }
    
    /**
     * Verifica la salute del pool
     * @returns {Object} Report di salute
     */
    getHealthReport() {
        const stats = this.getStats();
        const total = stats.available + stats.inUse;
        
        return {
            ...stats,
            total,
            utilizationRate: total > 0 ? stats.inUse / total : 0,
            memoryEfficiency: stats.efficiency,
            recommendations: this.getRecommendations(stats)
        };
    }
    
    /**
     * Genera raccomandazioni basate sulle statistiche
     * @param {Object} stats
     * @returns {Array} Array di raccomandazioni
     */
    getRecommendations(stats) {
        const recommendations = [];
        
        // Pool troppo piccolo
        if (stats.available === 0 && stats.inUse > 0) {
            recommendations.push('Consider increasing pool size - no objects available');
        }
        
        // Pool troppo grande
        if (stats.available > stats.inUse * 3 && stats.available > 10) {
            recommendations.push('Consider reducing pool size - too many unused objects');
        }
        
        // Bassa efficienza di riutilizzo
        if (stats.efficiency < 0.5 && stats.totalCreated > 20) {
            recommendations.push('Low reuse efficiency - objects may not be properly released');
        }
        
        // Alta creazione di oggetti
        if (stats.totalCreated > stats.totalReused * 2) {
            recommendations.push('High object creation rate - consider pre-allocating more objects');
        }
        
        return recommendations;
    }
    
    /**
     * Debug: stampa informazioni dettagliate
     */
    debug() {
        const stats = this.getStats();
        const health = this.getHealthReport();
        
        console.group('ObjectPool Debug Info');
        console.log('Statistics:', stats);
        console.log('Health Report:', health);
        console.log('Pool Contents:', this.pool.length, 'objects');
        console.log('Used Objects:', Array.from(this.used));
        console.groupEnd();
    }
}

/**
 * Pool specializzato per geometrie Three.js
 */
export class GeometryPool extends ObjectPool {
    constructor(geometryType = 'BufferGeometry', initialSize = 5) {
        const createFn = () => {
            switch (geometryType) {
                case 'BufferGeometry':
                    return new THREE.BufferGeometry();
                case 'BoxGeometry':
                    return new THREE.BoxGeometry();
                case 'PlaneGeometry':
                    return new THREE.PlaneGeometry();
                default:
                    return new THREE.BufferGeometry();
            }
        };
        
        const resetFn = (geometry) => {
            // Pulisci attributi esistenti
            const attributes = Object.keys(geometry.attributes);
            attributes.forEach(key => {
                geometry.deleteAttribute(key);
            });
            
            // Reset indici
            geometry.setIndex(null);
            
            // Reset bounding box/sphere
            geometry.boundingBox = null;
            geometry.boundingSphere = null;
        };
        
        super(createFn, resetFn, initialSize);
        this.geometryType = geometryType;
    }
    
    /**
     * Override dispose per cleanup specifico delle geometrie
     */
    dispose() {
        // Cleanup geometrie
        this.pool.forEach(geometry => {
            if (geometry && typeof geometry.dispose === 'function') {
                geometry.dispose();
            }
        });
        
        this.used.forEach(geometry => {
            if (geometry && typeof geometry.dispose === 'function') {
                geometry.dispose();
            }
        });
        
        super.dispose();
    }
}

/**
 * Pool specializzato per mesh Three.js
 */
export class MeshPool extends ObjectPool {
    constructor(initialSize = 5) {
        const createFn = () => {
            return new THREE.Mesh();
        };
        
        const resetFn = (mesh) => {
            // Reset trasformazioni
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
            mesh.scale.set(1, 1, 1);
            
            // Reset visibilità
            mesh.visible = true;
            
            // Reset materiale e geometria (saranno assegnati dopo)
            mesh.geometry = null;
            mesh.material = null;
            
            // Reset userData
            mesh.userData = {};
            
            // Reset shadow
            mesh.castShadow = false;
            mesh.receiveShadow = false;
        };
        
        super(createFn, resetFn, initialSize);
    }
}

/**
 * Factory per creare pool specializzati
 */
export class PoolFactory {
    static createGeometryPool(type = 'BufferGeometry', size = 5) {
        return new GeometryPool(type, size);
    }
    
    static createMeshPool(size = 5) {
        return new MeshPool(size);
    }
    
    static createGenericPool(createFn, resetFn = null, size = 10) {
        return new ObjectPool(createFn, resetFn, size);
    }
}