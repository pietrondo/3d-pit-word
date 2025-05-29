# 3D Pit Word

Un gioco 3D di costruzione e esplorazione basato su voxel, sviluppato con Three.js e tecnologie web moderne.

## 🎮 Caratteristiche

- **Mondo 3D Voxel**: Esplora un mondo infinito generato proceduralmente
- **Costruzione e Distruzione**: Piazza e rompi blocchi per creare le tue strutture
- **Multiplayer**: Gioca con altri giocatori in tempo reale
- **Fisica Realistica**: Sistema fisico completo con Cannon.js
- **Audio Spaziale**: Effetti sonori 3D immersivi
- **Interfaccia Moderna**: UI responsive e intuitiva
- **Performance Ottimizzate**: Rendering efficiente e gestione della memoria

## 🚀 Installazione

### Prerequisiti

- Node.js (versione 16 o superiore)
- npm o yarn

### Setup del Progetto

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd 3d-pit-word
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Avvia il server di sviluppo**
   ```bash
   npm run dev
   ```

4. **Apri il gioco**
   - Apri il browser e vai su `http://localhost:3000`

### Modalità Multiplayer

Per giocare in multiplayer:

1. **Avvia il server di gioco**
   ```bash
   npm run server
   ```

2. **Avvia il client**
   ```bash
   npm run dev
   ```

3. **Connettiti**
   - Il server sarà disponibile su `http://localhost:3001`
   - Il client su `http://localhost:3000`

## 🎯 Controlli

### Movimento
- **W, A, S, D**: Movimento
- **Spazio**: Salto / Volo su
- **Shift**: Accovacciamento / Volo giù
- **Ctrl**: Corsa
- **F**: Modalità volo

### Interazione
- **Click Sinistro**: Rompi blocco
- **Click Destro**: Piazza blocco
- **Rotella Mouse**: Cambia blocco selezionato
- **1-9**: Selezione rapida hotbar
- **E**: Inventario
- **T**: Chat (multiplayer)
- **Esc**: Menu principale

### Debug
- **F3**: Pannello debug
- **F11**: Schermo intero

## 🏗️ Architettura

### Struttura del Progetto

```
3d-pit-word/
├── src/
│   ├── js/
│   │   ├── core/           # Classi principali del gioco
│   │   ├── world/          # Gestione del mondo voxel
│   │   ├── player/         # Logica del giocatore
│   │   ├── input/          # Gestione input
│   │   ├── ui/             # Interfaccia utente
│   │   ├── audio/          # Sistema audio
│   │   ├── network/        # Multiplayer
│   │   └── config/         # Configurazioni
│   ├── styles/             # CSS
│   └── index.html          # HTML principale
├── public/
│   ├── textures/           # Texture dei blocchi
│   ├── models/             # Modelli 3D
│   └── audio/              # File audio
├── docs/                   # Documentazione
├── server.js               # Server multiplayer
├── vite.config.js          # Configurazione Vite
└── package.json
```

### Componenti Principali

#### Core
- **Game**: Classe principale che gestisce il ciclo di gioco
- **AssetManager**: Caricamento e gestione delle risorse

#### World
- **VoxelWorld**: Gestione del mondo voxel
- **Chunk**: Rappresentazione di sezioni del mondo
- **TerrainGenerator**: Generazione procedurale del terreno

#### Player
- **Player**: Logica del giocatore, movimento e interazioni

#### Systems
- **InputManager**: Gestione centralizzata degli input
- **UIManager**: Interfaccia utente
- **AudioManager**: Sistema audio 3D
- **NetworkManager**: Comunicazioni multiplayer

## 🔧 Configurazione

Il gioco può essere configurato modificando il file `src/js/config/config.js`:

```javascript
export const CONFIG = {
    GAME: {
        NAME: '3D Pit Word',
        VERSION: '1.0.0'
    },
    RENDERER: {
        ANTIALIAS: true,
        SHADOWS: true,
        FOG: true
    },
    WORLD: {
        CHUNK_SIZE: 16,
        RENDER_DISTANCE: 8,
        GENERATION_DISTANCE: 10
    },
    // ... altre configurazioni
};
```

## 🎨 Personalizzazione

### Aggiungere Nuovi Blocchi

1. **Crea la texture** in `public/textures/blocks/`
2. **Aggiungi il tipo di blocco** in `config.js`:
   ```javascript
   BLOCK_TYPES: {
       // ... blocchi esistenti
       NUOVO_BLOCCO: {
           id: 8,
           name: 'nuovo_blocco',
           texture: 'nuovo_blocco.svg',
           solid: true,
           transparent: false
       }
   }
   ```

### Modificare la Generazione del Terreno

Modifica `src/js/world/TerrainGenerator.js` per cambiare come viene generato il mondo.

## 🌐 Multiplayer

Il gioco supporta il multiplayer tramite WebSocket:

- **Server**: Node.js con Socket.IO
- **Sincronizzazione**: Posizioni giocatori, modifiche blocchi, chat
- **Scalabilità**: Supporta fino a 50 giocatori simultanei

### API Server

- `GET /api/status`: Stato del server
- WebSocket events per comunicazione in tempo reale

## 📊 Performance

### Ottimizzazioni Implementate

- **Frustum Culling**: Rendering solo degli oggetti visibili
- **Level of Detail (LOD)**: Dettaglio variabile in base alla distanza
- **Chunk Loading**: Caricamento dinamico delle sezioni del mondo
- **Object Pooling**: Riutilizzo degli oggetti per ridurre il garbage collection
- **Texture Atlasing**: Combinazione delle texture per ridurre le draw call

### Monitoraggio

- Pannello debug con statistiche in tempo reale
- Contatore FPS
- Utilizzo memoria
- Statistiche di rete (multiplayer)

## 🧪 Testing

```bash
# Esegui i test
npm test

# Test con coverage
npm run test:coverage

# Test in modalità watch
npm run test:watch
```

## 📦 Build e Deploy

### Build di Produzione

```bash
npm run build
```

I file ottimizzati saranno generati nella cartella `dist/`.

### Deploy

1. **Build del progetto**
2. **Upload dei file** su un server web
3. **Configurazione del server** per servire i file statici
4. **Avvio del server multiplayer** (opzionale)

## 🐛 Debug

### Strumenti di Debug

- **Pannello Debug**: Premi F3 per visualizzare informazioni dettagliate
- **Console Browser**: Messaggi di log dettagliati
- **Performance Monitor**: Statistiche in tempo reale

### Problemi Comuni

1. **Performance Basse**
   - Riduci la distanza di rendering
   - Disabilita le ombre
   - Riduci la qualità delle texture

2. **Problemi di Connessione Multiplayer**
   - Verifica che il server sia in esecuzione
   - Controlla la configurazione del firewall
   - Verifica l'URL del server

3. **Texture Mancanti**
   - Verifica che i file SVG siano nella cartella corretta
   - Controlla la console per errori di caricamento

## 🎯 Stato del Progetto

**Versione Attuale**: 0.1.0-alpha

**In Sviluppo**:
- [ ] Engine voxel base
- [ ] Sistema di rendering ottimizzato
- [ ] Controlli di movimento
- [ ] Generazione mondo procedurale

Per dettagli completi, consulta [Status.md](Status.md)

## 🛠️ Installazione e Sviluppo

### Prerequisiti
- Node.js 18+
- npm o yarn
- Browser moderno con supporto WebGL

### Setup Locale
```bash
# Clona il repository
git clone https://github.com/tuousername/3d-pit-word.git
cd 3d-pit-word

# Installa dipendenze
npm install

# Avvia server di sviluppo
npm run dev

# Apri http://localhost:3000
```

## 📋 Roadmap

### Fase 1: Fondamenta (Q1 2024)
- [x] Setup progetto e documentazione
- [ ] Engine voxel base
- [ ] Sistema di rendering
- [ ] Controlli base

### Fase 2: Gameplay Core (Q2 2024)
- [ ] Piazzamento/rimozione blocchi
- [ ] Inventario e crafting
- [ ] Generazione mondo
- [ ] Sistema di salvataggio

### Fase 3: Contenuti (Q3 2024)
- [ ] Nemici e combattimento
- [ ] Dungeon procedurali
- [ ] NPC e villaggi
- [ ] Sistema di quest

### Fase 4: Multiplayer (Q4 2024)
- [ ] Server dedicato
- [ ] Sincronizzazione mondo
- [ ] Chat e comunicazione
- [ ] Modalità cooperative

## 🤝 Contribuire

Il progetto è attualmente in fase di sviluppo iniziale. Contributi, suggerimenti e feedback sono benvenuti!

### Come Contribuire
1. Fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'feat: Add AmazingFeature'`)
4. Push del branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori dettagli.

## 📞 Contatti

- **Sviluppatore**: Pietro
- **Email**: [tua-email@example.com]
- **GitHub**: [https://github.com/tuousername]

---

⭐ Se ti piace il progetto, lascia una stella su GitHub!

*Ultimo aggiornamento: Gennaio 2024*