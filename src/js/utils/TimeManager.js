/**
 * 3D Pit Word - Time Manager
 * 
 * Gestisce il tempo di gioco, inclusi delta time, FPS, e cicli giorno/notte.
 */

export class TimeManager {
    /**
     * Costruttore del TimeManager
     */
    constructor() {
        // Tempo di sistema
        this.startTime = performance.now();
        this.currentTime = this.startTime;
        this.lastTime = this.startTime;
        this.deltaTime = 0;
        this.elapsedTime = 0;
        
        // FPS tracking
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateInterval = 1000; // Aggiorna FPS ogni secondo
        this.lastFpsUpdate = this.startTime;
        this.fpsHistory = [];
        this.maxFpsHistory = 60; // Mantieni 60 campioni
        
        // Tempo di gioco
        this.gameTime = 0;
        this.gameSpeed = 1.0; // Moltiplicatore velocità gioco
        this.isPaused = false;
        
        // Ciclo giorno/notte
        this.dayDuration = 20 * 60 * 1000; // 20 minuti in millisecondi
        this.currentDayTime = 0; // 0-1 (0 = mezzanotte, 0.5 = mezzogiorno)
        this.dayCount = 0;
        
        // Performance monitoring
        this.frameTimeHistory = [];
        this.maxFrameTimeHistory = 120;
        this.averageFrameTime = 0;
        this.maxFrameTime = 0;
        this.minFrameTime = Infinity;
        
        console.log('TimeManager initialized');
    }
    
    /**
     * Aggiorna il time manager (chiamato ogni frame)
     */
    update() {
        // Aggiorna i tempi
        this.lastTime = this.currentTime;
        this.currentTime = performance.now();
        this.deltaTime = (this.currentTime - this.lastTime) / 1000; // Converti in secondi
        this.elapsedTime = (this.currentTime - this.startTime) / 1000;
        
        // Limita il delta time per evitare salti temporali
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS
        
        // Aggiorna il tempo di gioco se non in pausa
        if (!this.isPaused) {
            this.gameTime += this.deltaTime * this.gameSpeed;
            this.updateDayNightCycle();
        }
        
        // Aggiorna FPS
        this.updateFPS();
        
        // Aggiorna statistiche performance
        this.updatePerformanceStats();
    }
    
    /**
     * Aggiorna il calcolo degli FPS
     * @private
     */
    updateFPS() {
        this.frameCount++;
        
        if (this.currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (this.currentTime - this.lastFpsUpdate));
            
            // Aggiungi alla cronologia FPS
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > this.maxFpsHistory) {
                this.fpsHistory.shift();
            }
            
            this.frameCount = 0;
            this.lastFpsUpdate = this.currentTime;
        }
    }
    
    /**
     * Aggiorna le statistiche delle performance
     * @private
     */
    updatePerformanceStats() {
        const frameTime = this.deltaTime * 1000; // Converti in millisecondi
        
        // Aggiorna min/max frame time
        this.maxFrameTime = Math.max(this.maxFrameTime, frameTime);
        this.minFrameTime = Math.min(this.minFrameTime, frameTime);
        
        // Aggiungi alla cronologia frame time
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
            this.frameTimeHistory.shift();
        }
        
        // Calcola frame time medio
        if (this.frameTimeHistory.length > 0) {
            this.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        }
    }
    
    /**
     * Aggiorna il ciclo giorno/notte
     * @private
     */
    updateDayNightCycle() {
        const dayProgress = (this.gameTime * 1000) % this.dayDuration;
        this.currentDayTime = dayProgress / this.dayDuration;
        
        // Conta i giorni passati
        const newDayCount = Math.floor((this.gameTime * 1000) / this.dayDuration);
        if (newDayCount > this.dayCount) {
            this.dayCount = newDayCount;
            console.log(`Day ${this.dayCount + 1} started`);
        }
    }
    
    /**
     * Ottiene il delta time corrente
     * @returns {number} Delta time in secondi
     */
    getDeltaTime() {
        return this.deltaTime;
    }
    
    /**
     * Ottiene il tempo trascorso dall'inizio
     * @returns {number} Tempo trascorso in secondi
     */
    getElapsedTime() {
        return this.elapsedTime;
    }
    
    /**
     * Ottiene il tempo di gioco
     * @returns {number} Tempo di gioco in secondi
     */
    getGameTime() {
        return this.gameTime;
    }
    
    /**
     * Ottiene gli FPS correnti
     * @returns {number} FPS
     */
    getFPS() {
        return this.fps;
    }
    
    /**
     * Ottiene gli FPS medi
     * @returns {number} FPS medi
     */
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 0;
        return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    }
    
    /**
     * Ottiene il frame time medio
     * @returns {number} Frame time medio in millisecondi
     */
    getAverageFrameTime() {
        return this.averageFrameTime;
    }
    
    /**
     * Ottiene il frame time massimo
     * @returns {number} Frame time massimo in millisecondi
     */
    getMaxFrameTime() {
        return this.maxFrameTime;
    }
    
    /**
     * Ottiene il frame time minimo
     * @returns {number} Frame time minimo in millisecondi
     */
    getMinFrameTime() {
        return this.minFrameTime;
    }
    
    /**
     * Ottiene il tempo del giorno corrente (0-1)
     * @returns {number} Tempo del giorno
     */
    getDayTime() {
        return this.currentDayTime;
    }
    
    /**
     * Ottiene il numero del giorno corrente
     * @returns {number} Numero del giorno
     */
    getDayCount() {
        return this.dayCount;
    }
    
    /**
     * Verifica se è giorno
     * @returns {boolean} True se è giorno
     */
    isDay() {
        return this.currentDayTime >= 0.25 && this.currentDayTime < 0.75;
    }
    
    /**
     * Verifica se è notte
     * @returns {boolean} True se è notte
     */
    isNight() {
        return !this.isDay();
    }
    
    /**
     * Ottiene l'intensità della luce solare (0-1)
     * @returns {number} Intensità della luce
     */
    getSunLightIntensity() {
        if (this.isNight()) {
            return 0.1; // Luce lunare minima
        }
        
        // Calcola l'intensità basata sull'ora del giorno
        const dayProgress = (this.currentDayTime - 0.25) / 0.5; // 0-1 durante il giorno
        return 0.1 + 0.9 * Math.sin(dayProgress * Math.PI); // Curva sinusoidale
    }
    
    /**
     * Ottiene il colore della luce solare
     * @returns {Object} Colore RGB
     */
    getSunLightColor() {
        if (this.isNight()) {
            return { r: 0.2, g: 0.2, b: 0.4 }; // Blu notturno
        }
        
        const dayProgress = (this.currentDayTime - 0.25) / 0.5;
        
        if (dayProgress < 0.1 || dayProgress > 0.9) {
            // Alba/tramonto - colori caldi
            return { r: 1.0, g: 0.7, b: 0.4 };
        } else {
            // Giorno - luce bianca
            return { r: 1.0, g: 1.0, b: 0.9 };
        }
    }
    
    /**
     * Mette in pausa il tempo di gioco
     */
    pause() {
        this.isPaused = true;
        console.log('Game time paused');
    }
    
    /**
     * Riprende il tempo di gioco
     */
    resume() {
        this.isPaused = false;
        console.log('Game time resumed');
    }
    
    /**
     * Verifica se il gioco è in pausa
     * @returns {boolean} True se in pausa
     */
    isPausedState() {
        return this.isPaused;
    }
    
    /**
     * Imposta la velocità del gioco
     * @param {number} speed - Moltiplicatore velocità (1.0 = normale)
     */
    setGameSpeed(speed) {
        this.gameSpeed = Math.max(0, speed);
        console.log(`Game speed set to ${this.gameSpeed}x`);
    }
    
    /**
     * Ottiene la velocità del gioco
     * @returns {number} Velocità del gioco
     */
    getGameSpeed() {
        return this.gameSpeed;
    }
    
    /**
     * Imposta il tempo del giorno
     * @param {number} time - Tempo del giorno (0-1)
     */
    setDayTime(time) {
        this.currentDayTime = Math.max(0, Math.min(1, time));
        this.gameTime = (this.dayCount * this.dayDuration + this.currentDayTime * this.dayDuration) / 1000;
    }
    
    /**
     * Imposta la durata del giorno
     * @param {number} duration - Durata in millisecondi
     */
    setDayDuration(duration) {
        this.dayDuration = Math.max(1000, duration); // Minimo 1 secondo
    }
    
    /**
     * Formatta il tempo di gioco in stringa leggibile
     * @returns {string} Tempo formattato
     */
    formatGameTime() {
        const hours = Math.floor(this.gameTime / 3600);
        const minutes = Math.floor((this.gameTime % 3600) / 60);
        const seconds = Math.floor(this.gameTime % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Formatta il tempo del giorno in stringa leggibile
     * @returns {string} Tempo del giorno formattato
     */
    formatDayTime() {
        const totalMinutes = this.currentDayTime * 24 * 60; // Minuti in un giorno di 24 ore
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    /**
     * Ottiene statistiche complete del time manager
     * @returns {Object} Statistiche
     */
    getStats() {
        return {
            fps: this.fps,
            averageFPS: this.getAverageFPS(),
            frameTime: {
                current: this.deltaTime * 1000,
                average: this.averageFrameTime,
                min: this.minFrameTime,
                max: this.maxFrameTime
            },
            gameTime: {
                elapsed: this.gameTime,
                formatted: this.formatGameTime(),
                dayTime: this.currentDayTime,
                dayTimeFormatted: this.formatDayTime(),
                dayCount: this.dayCount,
                isDay: this.isDay(),
                isPaused: this.isPaused,
                speed: this.gameSpeed
            },
            performance: {
                elapsedTime: this.elapsedTime,
                frameCount: this.frameCount + (this.fpsHistory.length * this.fpsUpdateInterval / 1000 * this.getAverageFPS())
            }
        };
    }
    
    /**
     * Reset delle statistiche performance
     */
    resetStats() {
        this.fpsHistory = [];
        this.frameTimeHistory = [];
        this.maxFrameTime = 0;
        this.minFrameTime = Infinity;
        this.frameCount = 0;
        this.lastFpsUpdate = this.currentTime;
        
        console.log('TimeManager stats reset');
    }
}