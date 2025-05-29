/**
 * 3D Pit Word - Stats Monitor
 * 
 * Monitora e visualizza statistiche di performance del gioco.
 * Basato su stats.js ma personalizzato per le esigenze del progetto.
 */

export class Stats {
    /**
     * Costruttore dello Stats monitor
     * @param {Object} options - Opzioni di configurazione
     */
    constructor(options = {}) {
        this.options = {
            position: options.position || 'top-left',
            updateInterval: options.updateInterval || 100,
            maxSamples: options.maxSamples || 100,
            showMemory: options.showMemory !== false,
            showRender: options.showRender !== false,
            showCustom: options.showCustom !== false
        };
        
        // Contatori
        this.fps = 0;
        this.frameTime = 0;
        this.memory = { used: 0, total: 0 };
        this.renderStats = {
            triangles: 0,
            drawCalls: 0,
            textures: 0
        };
        this.customStats = new Map();
        
        // Cronologie per grafici
        this.fpsHistory = [];
        this.frameTimeHistory = [];
        this.memoryHistory = [];
        
        // Timing
        this.lastUpdate = performance.now();
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        
        // DOM
        this.dom = null;
        this.panels = new Map();
        this.currentPanel = 'fps';
        
        this.createDOM();
        this.setupEventListeners();
        
        console.log('Stats monitor initialized');
    }
    
    /**
     * Crea l'interfaccia DOM
     * @private
     */
    createDOM() {
        // Container principale
        this.dom = document.createElement('div');
        this.dom.className = 'stats-monitor';
        this.dom.style.cssText = this.getContainerCSS();
        
        // Pannello FPS
        this.createPanel('fps', 'FPS', '#00ff00', '#002200');
        
        // Pannello Frame Time
        this.createPanel('frameTime', 'MS', '#ffff00', '#222200');
        
        // Pannello Memory (se abilitato)
        if (this.options.showMemory) {
            this.createPanel('memory', 'MB', '#ff00ff', '#220022');
        }
        
        // Pannello Render (se abilitato)
        if (this.options.showRender) {
            this.createPanel('render', 'TRI', '#00ffff', '#002222');
        }
        
        // Mostra il pannello FPS di default
        this.showPanel('fps');
    }
    
    /**
     * Crea un singolo pannello
     * @param {string} id - ID del pannello
     * @param {string} label - Etichetta del pannello
     * @param {string} foreground - Colore del testo
     * @param {string} background - Colore di sfondo
     * @private
     */
    createPanel(id, label, foreground, background) {
        const panel = {
            dom: document.createElement('div'),
            canvas: document.createElement('canvas'),
            context: null,
            label,
            foreground,
            background,
            min: Infinity,
            max: 0,
            current: 0,
            history: []
        };
        
        // Configura il DOM del pannello
        panel.dom.style.cssText = this.getPanelCSS();
        panel.dom.addEventListener('click', () => this.nextPanel());
        
        // Configura il canvas
        panel.canvas.width = 80;
        panel.canvas.height = 48;
        panel.canvas.style.cssText = 'width:80px;height:48px;display:block;';
        panel.context = panel.canvas.getContext('2d');
        panel.context.font = 'bold 9px Helvetica,Arial,sans-serif';
        panel.context.textBaseline = 'top';
        
        panel.dom.appendChild(panel.canvas);
        this.dom.appendChild(panel.dom);
        
        this.panels.set(id, panel);
    }
    
    /**
     * Configura gli event listener
     * @private
     */
    setupEventListeners() {
        // Click per cambiare pannello
        this.dom.addEventListener('click', (e) => {
            e.preventDefault();
            this.nextPanel();
        });
        
        // Doppio click per reset
        this.dom.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.reset();
        });
    }
    
    /**
     * Aggiorna le statistiche
     */
    update() {
        const now = performance.now();
        
        // Calcola FPS
        this.frameCount++;
        if (now >= this.lastUpdate + this.options.updateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastUpdate));
            this.frameCount = 0;
            this.lastUpdate = now;
        }
        
        // Calcola frame time
        this.frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Aggiorna memory (se supportato)
        if (this.options.showMemory && performance.memory) {
            this.memory.used = Math.round(performance.memory.usedJSHeapSize / 1048576);
            this.memory.total = Math.round(performance.memory.totalJSHeapSize / 1048576);
        }
        
        // Aggiorna i pannelli
        this.updatePanel('fps', this.fps, 0, 100);
        this.updatePanel('frameTime', this.frameTime, 0, 50);
        
        if (this.options.showMemory) {
            this.updatePanel('memory', this.memory.used, 0, this.memory.total);
        }
        
        if (this.options.showRender) {
            this.updatePanel('render', this.renderStats.triangles, 0, 100000);
        }
        
        // Aggiorna statistiche custom
        for (const [key, value] of this.customStats) {
            if (this.panels.has(key)) {
                this.updatePanel(key, value.current, value.min, value.max);
            }
        }
    }
    
    /**
     * Aggiorna un pannello specifico
     * @param {string} id - ID del pannello
     * @param {number} value - Valore corrente
     * @param {number} min - Valore minimo
     * @param {number} max - Valore massimo
     * @private
     */
    updatePanel(id, value, min, max) {
        const panel = this.panels.get(id);
        if (!panel) return;
        
        panel.current = value;
        panel.min = Math.min(panel.min, value);
        panel.max = Math.max(panel.max, value);
        
        // Aggiungi alla cronologia
        panel.history.push(value);
        if (panel.history.length > this.options.maxSamples) {
            panel.history.shift();
        }
        
        // Ridisegna solo se è il pannello corrente
        if (id === this.currentPanel) {
            this.drawPanel(panel, min, max);
        }
    }
    
    /**
     * Disegna un pannello
     * @param {Object} panel - Pannello da disegnare
     * @param {number} min - Valore minimo
     * @param {number} max - Valore massimo
     * @private
     */
    drawPanel(panel, min, max) {
        const ctx = panel.context;
        const canvas = panel.canvas;
        
        // Pulisci il canvas
        ctx.fillStyle = panel.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Disegna il grafico
        ctx.fillStyle = panel.foreground;
        const barWidth = canvas.width / panel.history.length;
        
        for (let i = 0; i < panel.history.length; i++) {
            const value = panel.history[i];
            const normalizedValue = (value - min) / (max - min);
            const barHeight = normalizedValue * (canvas.height - 16);
            
            ctx.fillRect(
                i * barWidth,
                canvas.height - barHeight,
                barWidth - 1,
                barHeight
            );
        }
        
        // Disegna il testo
        ctx.fillStyle = panel.foreground;
        ctx.fillText(
            `${panel.label}: ${Math.round(panel.current)} (${Math.round(panel.min)}-${Math.round(panel.max)})`,
            2,
            2
        );
    }
    
    /**
     * Mostra un pannello specifico
     * @param {string} id - ID del pannello
     */
    showPanel(id) {
        if (!this.panels.has(id)) return;
        
        // Nascondi tutti i pannelli
        for (const panel of this.panels.values()) {
            panel.dom.style.display = 'none';
        }
        
        // Mostra il pannello richiesto
        const panel = this.panels.get(id);
        panel.dom.style.display = 'block';
        this.currentPanel = id;
    }
    
    /**
     * Passa al pannello successivo
     */
    nextPanel() {
        const panelIds = Array.from(this.panels.keys());
        const currentIndex = panelIds.indexOf(this.currentPanel);
        const nextIndex = (currentIndex + 1) % panelIds.length;
        this.showPanel(panelIds[nextIndex]);
    }
    
    /**
     * Aggiorna le statistiche di rendering
     * @param {Object} stats - Statistiche di rendering
     */
    updateRenderStats(stats) {
        this.renderStats = {
            triangles: stats.triangles || 0,
            drawCalls: stats.drawCalls || 0,
            textures: stats.textures || 0
        };
    }
    
    /**
     * Aggiunge una statistica personalizzata
     * @param {string} key - Chiave della statistica
     * @param {string} label - Etichetta da visualizzare
     * @param {string} color - Colore del grafico
     */
    addCustomStat(key, label, color = '#ffffff') {
        this.customStats.set(key, {
            current: 0,
            min: 0,
            max: 100,
            label
        });
        
        if (this.options.showCustom) {
            this.createPanel(key, label, color, '#222222');
        }
    }
    
    /**
     * Aggiorna una statistica personalizzata
     * @param {string} key - Chiave della statistica
     * @param {number} value - Valore
     * @param {number} min - Valore minimo (opzionale)
     * @param {number} max - Valore massimo (opzionale)
     */
    updateCustomStat(key, value, min = null, max = null) {
        const stat = this.customStats.get(key);
        if (!stat) return;
        
        stat.current = value;
        if (min !== null) stat.min = min;
        if (max !== null) stat.max = max;
    }
    
    /**
     * Reset delle statistiche
     */
    reset() {
        for (const panel of this.panels.values()) {
            panel.min = Infinity;
            panel.max = 0;
            panel.history = [];
        }
        
        this.fpsHistory = [];
        this.frameTimeHistory = [];
        this.memoryHistory = [];
        
        console.log('Stats reset');
    }
    
    /**
     * Ottiene le statistiche correnti
     * @returns {Object} Statistiche
     */
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            memory: this.memory,
            render: this.renderStats,
            custom: Object.fromEntries(this.customStats)
        };
    }
    
    /**
     * CSS per il container principale
     * @returns {string} CSS
     * @private
     */
    getContainerCSS() {
        const position = this.options.position;
        let positionCSS = '';
        
        switch (position) {
            case 'top-left':
                positionCSS = 'top:0;left:0;';
                break;
            case 'top-right':
                positionCSS = 'top:0;right:0;';
                break;
            case 'bottom-left':
                positionCSS = 'bottom:0;left:0;';
                break;
            case 'bottom-right':
                positionCSS = 'bottom:0;right:0;';
                break;
            default:
                positionCSS = 'top:0;left:0;';
        }
        
        return `position:fixed;${positionCSS}z-index:10000;opacity:0.9;cursor:pointer;`;
    }
    
    /**
     * CSS per i pannelli
     * @returns {string} CSS
     * @private
     */
    getPanelCSS() {
        return 'padding:0;margin:0;background:#000;border:1px solid #444;font-family:Helvetica,Arial,sans-serif;font-size:9px;line-height:15px;color:#fff;';
    }
    
    /**
     * Mostra/nasconde il monitor
     * @param {boolean} visible - Visibilità
     */
    setVisible(visible) {
        this.dom.style.display = visible ? 'block' : 'none';
    }
    
    /**
     * Pulisce le risorse
     */
    dispose() {
        if (this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
        }
        
        this.panels.clear();
        this.customStats.clear();
        
        console.log('Stats monitor disposed');
    }
}