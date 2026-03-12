<div align="center">
  <img src="assets/img/logomandalas192.png" alt="Mand△L@s" width="120" />

# Mand△L@s

**An interactive desktop-first mandala creator built as a PWA, featuring radial symmetry, layers, Studio, gallery, and local export tools.**

<p>
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-0ea5e9?style=for-the-badge">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla%20JS-no%20frameworks-f7df1e?style=for-the-badge&logo=javascript&logoColor=000">
  <img alt="Local First" src="https://img.shields.io/badge/local--first-100%25%20browser-8b5cf6?style=for-the-badge">
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge">
</p>

**Mand△L@s** is a Progressive Web App built in vanilla JavaScript for **drawing, saving, animating, exporting, and organizing mandalas** directly in the browser, with no backend dependency.

</div>

---

## ✨ What is Mand△L@s

Mand△L@s is part of the **OptimeFlow(s)** ecosystem and is designed as a **desktop-first** creative tool for working with symmetrical compositions, layers, animation, and visual publishing.

The app allows you to:

- draw mandalas with **advanced radial symmetry**
- work with **independent layers**
- save artworks in a **local gallery**
- build compositions and animations in **Studio**
- export to **PNG, SVG, PDF, and video**
- generate a **multi-page PDF book** from selected artworks

All of this runs **100% in the browser**.

---

## 🚀 Main features

### Canvas
- Configurable radial symmetry from **1 to 64 sectors**
- Symmetry modes:
  - dihedral mirror
  - inverse mirror
  - alternating even/odd sectors
- Center management:
  - fixed center
  - manual selection of one or multiple centers
  - anchored centers
- Visual grid and center labeling
- Drawing tools:
  - brush
  - line
  - eraser
  - long-press eyedropper
- Available tip shapes:
  - round
  - square
  - soft / airbrush
  - dot stamp
  - geometric stamp
  - petal stamp
- Available stroke styles:
  - solid
  - dashed
  - dotted
  - dash-dot
  - long dash
  - pulse
- Configurable outline for new strokes
- Light, dark, or vector background
- Visual color history
- Quick style presets:
  - Neon
  - Original
  - Watercolor
  - Shadow
  - Fire

### Layers
- Create new layers
- Per-layer visibility
- Active layer selection
- Manual reordering
- Drag & drop reordering
- Per-layer fill and outline color editing
- Outline merging within a layer
- Per-layer rotation:
  - enable/disable
  - speed
  - direction

### Studio
- Dedicated composition and animation viewer
- Global speed control
- Play, pause, and stop animation
- Audio import to accompany animation
- Import saved mandalas from the gallery
- Per-artwork scaling on import
- Panel for moving imported groups
- Viewer export

### Gallery
- Local artwork saving with thumbnail
- Multi-selection
- Manual ordering
- Metadata per artwork:
  - date
  - author
  - notes
- Individual export from gallery
- Selection preparation for PDF book creation

### Book Builder
- **Multi-page PDF** generation
- Formats:
  - A4
  - A5
  - 6×9" (KDP-style)
- Output options:
  - alternate black background pages
  - show image title
  - show notes
  - use saved background color
- Title typography customization

### PWA
- Installable as an application
- `manifest.webmanifest`
- `service worker`
- direct access to:
  - Canvas
  - Studio
  - Gallery

---

## 🧩 App sections

### 1. Canvas
This is the main creation area. Here you draw the mandala using radial symmetry, layers, brushes, and configurable centers.

### 2. Studio
A composition and animation workspace. It lets you import saved artworks, move groups, play rotations, and export the visual result.

### 3. Gallery
A local storage and organization area. From here you can review artworks, add metadata, select multiple items, and generate a PDF book.

---

## 📦 Available exports

### From Canvas
- PNG (high quality)
- SVG
- PDF A4
- PDF A5
- PDF 6×9"
- 20 s video clip

### From Studio
- PNG (high quality)
- PDF A3
- PDF A4
- PDF A5
- PDF Kindle / 6×9"
- 20 s video

> Video export depends on browser support for `MediaRecorder` and `captureStream`.

---

## ⌨️ Keyboard shortcuts

- `Ctrl/Cmd + Z` → Undo
- `Ctrl/Cmd + Shift + Z` → Redo
- `Ctrl/Cmd + C` → Save
- `Ctrl/Cmd + X` → Export
- `Ctrl/Cmd + B` → Brush
- `Ctrl/Cmd + V` → Line
- `+` → Increase brush size
- `-` → Decrease brush size

---

## 🌍 Languages

The interface includes support for:

- Spanish
- English
- Portuguese (Brazil)
- French
- German
- Italian
- Korean
- Simplified Chinese
- Japanese

UI texts are loaded from the `lang/` folder.

---

## 🛠️ Technical stack

- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- **Canvas 2D**
- **PWA**
  - `manifest.webmanifest`
  - `service worker`
- **Hash router** for internal navigation
- **LocalStorage** for local persistence
- **MediaRecorder** for video export
- Modular architecture with no framework

---

## 🗂️ Project structure

```text
.
├── index.html
├── app.js
├── router.js
├── galeria.js
├── studio.js
├── export.js
├── i18n.js
├── desktop-guard.js
├── styles.css
├── shell-optime.css
├── sw.js
├── manifest.webmanifest
├── LICENSE
├── lang/
│   ├── es.json
│   ├── en.json
│   ├── pt-br.json
│   ├── fr.json
│   ├── it.json
│   └── ...
└── assets/
    └── img/
        ├── logo.png
        ├── logomandalas192.png
        ├── logomandalas512.png
        └── ...
```

---

## ▶️ Local run

It does not require a build step or external dependencies. It is a static app.

### Option 1: with Python
```bash
python -m http.server 8080
```

### Option 2: with Node
```bash
npx serve .
```

Then open:

```text
http://localhost:8080
```

---

## 🌐 Deployment

Mand△L@s can be deployed as a static site on services such as:

- Vercel
- Netlify
- GitHub Pages
- any HTTPS static hosting provider

### Important note
The app is prepared to register the `service worker` in **HTTPS environments**.  
During local development it works perfectly as a web application, but the full PWA experience is intended for secure production deployment.

---

## 🖥️ Recommended experience

Mand△L@s is primarily designed for **desktop** use.

The app includes a specific notice for **mobile and tablet** devices, since the recommended experience is with:

- keyboard
- mouse or trackpad
- a wide screen

---

## 🔒 Privacy and data

Mand△L@s follows a **local-first** approach:

- it runs **100% in the browser**
- it does not require a backend to function
- it does not send your artworks to a server
- it stores settings, gallery data, and state in **LocalStorage**
- it does not rely on tracking cookies

---

## 🧠 General architecture

The project is split into clear modules:

- `app.js`  
  Core application logic, global state, canvas drawing, floating panels, base export, and overall integration.

- `router.js`  
  Internal hash-based navigation between **Canvas**, **Studio**, and **Gallery**.

- `galeria.js`  
  Saved artwork management, multi-selection, metadata handling, and book builder.

- `studio.js`  
  Composition, import, animation, and export for the Studio viewer.

- `export.js`  
  Video export and related utilities.

- `i18n.js` + `lang/`  
  Internationalization and language pack loading.

- `desktop-guard.js`  
  Desktop-oriented warning for mobile/tablet devices.

- `sw.js`  
  Cache and PWA behavior.

---

## 🎨 Project philosophy

Mand△L@s aims to combine:

- visual creativity
- ease of use
- technical control over drawing
- frictionless local workflow
- editorial and audiovisual output from a single interface

---

## 📄 License

This project is distributed under the **MIT** license.  
See the [`LICENSE`](LICENSE) file for details.

---

## 👤 Author

**Andrés Calvo Espinosa**  
**OptimeFlow(s)**
 ORCID: https://orcid.org/0009-0005-4079-7418 
 Zenodo DOI: 10.5281/zenodo.18983778

---

## 💡 Summary

**Mand△L@s** is a creative PWA for **drawing, organizing, animating, and publishing mandalas** directly from the browser, with a lightweight, modular architecture focused on privacy, portability, and local visual production.


<div align="center">
  <img src="assets/img/logomandalas192.png" alt="Mand△L@s" width="120" />


# Mand△L@s

**Creador interactivo de mandalas como PWA, orientado a escritorio, con simetría radial, capas, Studio, galería y exportación local.**
<p>
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-0ea5e9?style=for-the-badge">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla%20JS-no%20frameworks-f7df1e?style=for-the-badge&logo=javascript&logoColor=000">
  <img alt="Local First" src="https://img.shields.io/badge/local--first-100%25%20browser-8b5cf6?style=for-the-badge">
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge">
</p>

**Mand△L@s** es una aplicación web progresiva construida en JavaScript vanilla para **dibujar, guardar, animar, exportar y organizar mandalas** directamente en el navegador, sin depender de backend.

</div>

---

## ✨ Qué es Mand△L@s

Mand△L@s forma parte del ecosistema **OptimeFlow(s)** y está pensada como una herramienta creativa **desktop-first** para trabajar con composiciones simétricas, capas, animación y publicación visual.

La app permite:

- dibujar mandalas con **simetría radial avanzada**
- trabajar con **capas independientes**
- guardar obras en una **galería local**
- montar composiciones y animaciones en **Studio**
- exportar en **PNG, SVG, PDF y vídeo**
- generar un **libro PDF multipágina** a partir de obras seleccionadas

Todo ello **100% en el navegador**.

---

## 🚀 Características principales

### Lienzo
- Simetría radial configurable de **1 a 64 sectores**
- Modos de simetría:
  - espejo diédrico
  - espejo inverso
  - alternancia de sectores par/impar
- Gestión de centros:
  - centro fijo
  - selección manual de uno o varios centros
  - centros anclados
- Rejilla visual y etiquetado de centros
- Herramientas de dibujo:
  - pincel
  - línea
  - borrador
  - cuentagotas por pulsación prolongada
- Puntas disponibles:
  - redondo
  - cuadrado
  - suave / airbrush
  - sello de punto
  - sello geométrico
  - sello de pétalo
- Trazados disponibles:
  - sólido
  - discontinuo
  - punteado
  - guión-punto
  - guión largo
  - pulso
- Contorno configurable para nuevos trazos
- Fondo claro, oscuro o vectorial
- Historial visual de colores
- Presets rápidos de estilo:
  - Neón
  - Original
  - Acuarela
  - Sombra
  - Fuego

### Capas
- Creación de nuevas capas
- Visibilidad por capa
- Selección de capa activa
- Reordenado manual
- Reordenado por drag & drop
- Edición de color de relleno y contorno por capa
- Unión de contornos dentro de una capa
- Rotación individual por capa:
  - activar/desactivar
  - velocidad
  - dirección

### Studio
- Visor dedicado para composición y animación
- Control de velocidad global
- Reproducir, pausar y detener animación
- Importación de audio para acompañar la animación
- Importación de mandalas guardados desde la galería
- Escalado de importación por obra
- Panel para mover grupos importados
- Exportación del visor

### Galería
- Guardado local de obras con miniatura
- Selección múltiple
- Orden manual
- Metadatos por obra:
  - fecha
  - autor
  - notas
- Exportación individual desde galería
- Preparación de selecciones para libro PDF

### Creador de libro
- Generación de **PDF multipágina**
- Formatos:
  - A4
  - A5
  - 6×9" (estilo KDP)
- Opciones de salida:
  - intercalar fondo negro
  - mostrar título de imagen
  - mostrar notas
  - usar color de fondo guardado
- Personalización tipográfica del título

### PWA
- Instalable como aplicación
- `manifest.webmanifest`
- `service worker`
- acceso directo a:
  - Lienzo
  - Studio
  - Galería

---

## 🧩 Secciones de la app

### 1. Lienzo
Es el núcleo de creación. Aquí dibujas el mandala usando simetría radial, capas, pinceles y centros configurables.

### 2. Studio
Espacio de composición y animación. Permite importar obras guardadas, mover grupos, reproducir rotaciones y exportar el resultado visual.

### 3. Galería
Zona de almacenamiento local y organización. Desde aquí puedes revisar obras, añadir metadatos, seleccionar varias y generar un libro PDF.

---

## 📦 Exportaciones disponibles

### Desde Lienzo
- PNG (alta calidad)
- SVG
- PDF A4
- PDF A5
- PDF 6×9"
- Clip de vídeo de 20 s

### Desde Studio
- PNG (alta calidad)
- PDF A3
- PDF A4
- PDF A5
- PDF Kindle / 6×9"
- Vídeo de 20 s

> La exportación de vídeo depende del soporte del navegador para `MediaRecorder` y `captureStream`.

---

## ⌨️ Atajos de teclado

- `Ctrl/Cmd + Z` → Deshacer
- `Ctrl/Cmd + Shift + Z` → Rehacer
- `Ctrl/Cmd + C` → Guardar
- `Ctrl/Cmd + X` → Exportar
- `Ctrl/Cmd + B` → Pincel
- `Ctrl/Cmd + V` → Línea
- `+` → Aumentar tamaño del pincel
- `-` → Reducir tamaño del pincel

---

## 🌍 Idiomas

La interfaz incluye soporte para:

- Español
- Inglés
- Portugués (Brasil)
- Francés
- Alemán
- Italiano
- Coreano
- Chino simplificado
- Japonés

Los textos UI se cargan desde la carpeta `lang/`.

---

## 🛠️ Stack técnico

- **HTML5**
- **CSS3**
- **JavaScript vanilla**
- **Canvas 2D**
- **PWA**
  - `manifest.webmanifest`
  - `service worker`
- **Hash router** para navegación interna
- **LocalStorage** para persistencia local
- **MediaRecorder** para exportación de vídeo
- Arquitectura modular sin framework

---

## 🗂️ Estructura del proyecto

```text
.
├── index.html
├── app.js
├── router.js
├── galeria.js
├── studio.js
├── export.js
├── i18n.js
├── desktop-guard.js
├── styles.css
├── shell-optime.css
├── sw.js
├── manifest.webmanifest
├── LICENSE
├── lang/
│   ├── es.json
│   ├── en.json
│   ├── pt-br.json
│   ├── fr.json
│   ├── it.json
│   └── ...
└── assets/
    └── img/
        ├── logo.png
        ├── logomandalas192.png
        ├── logomandalas512.png
        └── ...
```

---

## ▶️ Ejecución local

No necesita build ni dependencias externas. Es una app estática.

### Opción 1: con Python
```bash
python -m http.server 8080
```

### Opción 2: con Node
```bash
npx serve .
```

Después abre:

```text
http://localhost:8080
```

---

## 🌐 Despliegue

Mand△L@s puede desplegarse como sitio estático en servicios como:

- Vercel
- Netlify
- GitHub Pages
- cualquier hosting HTTPS para archivos estáticos

### Nota importante
La app está preparada para registrar el `service worker` en **entornos HTTPS**.  
En desarrollo local puede funcionar perfectamente como aplicación web, pero la experiencia PWA completa está pensada para despliegue seguro en producción.

---

## 🖥️ Experiencia recomendada

Mand△L@s está diseñada principalmente para **escritorio**.

La app incluye un aviso específico para **móvil y tablet**, ya que la experiencia recomendada es con:

- teclado
- ratón o trackpad
- pantalla amplia

---

## 🔒 Privacidad y datos

Mand△L@s sigue un enfoque **local-first**:

- se ejecuta **100% en el navegador**
- no necesita backend para funcionar
- no envía tus obras a un servidor
- guarda configuración, galería y estado en **LocalStorage**
- no depende de cookies de seguimiento

---

## 🧠 Arquitectura general

El proyecto se divide en módulos claros:

- `app.js`  
  Núcleo de la app, estado global, dibujo en lienzo, paneles flotantes, exportación base e integración general.

- `router.js`  
  Navegación interna por hash entre **Lienzo**, **Studio** y **Galería**.

- `galeria.js`  
  Gestión de obras guardadas, selección múltiple, metadatos y creador de libro.

- `studio.js`  
  Composición, importación, animación y exportación del visor Studio.

- `export.js`  
  Exportación de vídeo y utilidades relacionadas.

- `i18n.js` + `lang/`  
  Internacionalización y carga de textos por idioma.

- `desktop-guard.js`  
  Aviso de uso orientado a escritorio en móvil/tablet.

- `sw.js`  
  Caché y comportamiento PWA.

---

## 🎨 Filosofía del proyecto

Mand△L@s busca combinar:

- creatividad visual
- simplicidad de uso
- control técnico del dibujo
- trabajo local sin fricción
- salida editorial y audiovisual desde una única interfaz

---

## 📄 Licencia

Este proyecto se distribuye bajo licencia **MIT**.  
Consulta el archivo [`LICENSE`](LICENSE).

---

## 👤 Autor

**Andrés Calvo Espinosa**  
**OptimeFlow(s)**
ORCID:  https://orcid.org/0009-0005-4079-7418
Zenodo DOI: 10.5281/zenodo.18983778

---

## 💡 Resumen

**Mand△L@s** es una PWA creativa para **dibujar, organizar, animar y publicar mandalas** desde el navegador, con una arquitectura ligera, modular y enfocada en privacidad, portabilidad y producción visual local.
