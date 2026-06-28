# ✦ Claude AI Assistant para Phoenix Code

🇺🇸 [English](README.md) | 🇲🇽 **Español**

**Autor:** Erik Dávila
**Versión:** 2.5.7
**Requiere:** Phoenix Code Desktop + Claude Code CLI instalado

---

## ¿Qué es esto?

Una extensión que integra **Claude AI** directamente en Phoenix Code. Puedes chatear con Claude, pedirle que edite archivos de tu proyecto, hacer operaciones de git con IA, todo sin salir del editor y sin configurar nada extra.

---

## Requisitos previos

Antes de usar la extensión necesitas tener instalado el **Claude Code CLI**:

```bash
npm install -g @anthropic-ai/claude-code
```

Luego autentícate con tu cuenta de Anthropic:

```bash
claude
```

Sigue los pasos en pantalla para iniciar sesión. Solo necesitas hacerlo una vez.

---

## Instalación

Busca **"Claude AI Assistant"** en el Extension Manager de Phoenix Code e instálalo con un clic.

> **Desarrolladores:** Para probar cambios locales, usa **Debug → Load Project As Extension** seleccionando la carpeta del repositorio.

---

## Cómo abrir el panel

Tienes tres formas de abrir y cerrar el panel de Claude:

| Método | Acción |
|--------|--------|
| `Ctrl + Shift + C` | Abrir / Cerrar panel |
| Ícono **✦** en la barra lateral derecha | Abrir / Cerrar panel |
| Menú **Edit → Claude: Abrir panel** | Abrir panel |

---

## Los tres modos del panel

El panel tiene tres pestañas en la parte superior: **Chat**, **Editar** y **Git**. Cada una tiene un propósito distinto.

---

### 💬 Modo Chat

El modo por defecto. Sirve para conversar con Claude sobre tu código o proyecto.

**¿Qué puedes hacer?**
- Hacer preguntas sobre tu código
- Pedir que genere nuevo código o archivos
- Pedir explicaciones, sugerencias o análisis
- Claude recuerda toda la conversación de la sesión actual

**Botones rápidos disponibles:**

| Botón | Qué hace |
|-------|----------|
| **Explicar código seleccionado** | Selecciona código en el editor → Claude lo explica en detalle |
| **Refactorizar código seleccionado** | Selecciona código → Claude lo mejora y explica los cambios |
| **Buscar y corregir errores** | Selecciona código → Claude detecta bugs y muestra el código corregido |
| **Revisar todo el proyecto** | Claude lee todos los archivos del proyecto y da un análisis general |
| **Generar documentación** | Selecciona código → Claude genera JSDoc o comentarios según el lenguaje |

**Cómo adjuntar código:**
1. Selecciona el código que quieres en el editor
2. Haz clic en **"Adjuntar selección"**
3. Escribe tu pregunta y presiona **Enter**

Claude recibirá tu pregunta junto con el código adjunto como contexto.

**Atajos en modo Chat:**

| Atajo | Acción |
|-------|--------|
| `Enter` | Enviar mensaje |
| `Shift + Enter` | Salto de línea en el mensaje |
| `Ctrl + Shift + E` | Explicar código seleccionado (abre panel automáticamente) |
| `Ctrl + Alt + R` | Refactorizar código seleccionado |
| `Ctrl + Shift + B` | Buscar y corregir errores en selección |

**Botón "Nueva":** Limpia el historial y empieza una conversación nueva desde cero.

**Selector de idioma:** Haz clic en el botón **⋮** (esquina superior derecha del panel) → **Idioma** para elegir entre 31 idiomas disponibles. La selección se guarda automáticamente. Si nunca lo cambias, la extensión usa el idioma configurado en Phoenix Code; si ese idioma no está disponible, usa inglés por defecto.

---

### ✏️ Modo Editar

Sirve para que Claude **modifique un archivo** de tu proyecto. Antes de escribir al disco, te muestra una **vista previa del diff** (líneas añadidas en verde, eliminadas en rojo) para que apruebes o canceles los cambios.

**¿Cómo usarlo?**
1. Abre el archivo que quieres editar en el editor
2. Cambia a la pestaña **Editar**
3. Escribe la instrucción en lenguaje natural, por ejemplo:
   - *"agrega validación al campo email"*
   - *"convierte las funciones a async/await"*
   - *"agrega comentarios JSDoc a todas las funciones"*
   - *"refactoriza este archivo para que siga el patrón MVC"*
4. Presiona **Enter**

Claude genera el nuevo contenido y muestra el diff. Haz clic en **Aplicar** para escribir el archivo o **Cancelar** para descartarlo. Phoenix Code recarga el archivo automáticamente al aplicar.

**Atajo:**

| Atajo | Acción |
|-------|--------|
| `Ctrl + Shift + I` | Activar modo Editar (abre panel si está cerrado) |

---

### 🌿 Modo Git

Un panel dedicado para operaciones de git con ayuda de IA.

**Botones disponibles:**

| Botón | Qué hace |
|-------|----------|
| **Status** | Muestra el estado actual del repositorio (`git status`) |
| **Log** | Muestra los últimos 10 commits del proyecto |
| **Diff** | Muestra los cambios actuales no commiteados |
| **✦ Auto-commit** | Claude analiza tus cambios y genera automáticamente un mensaje de commit descriptivo, luego hace el commit |
| **Push** | Sube los cambios al repositorio remoto (`git push`) |

**Commit manual:**
1. Escribe el mensaje en el campo de texto
2. Haz clic en **Commit**

Claude hace `git add .` automáticamente antes de cada commit.

> 💡 **Auto-commit** es la función más útil: Claude lee el diff de tus cambios y genera un mensaje de commit claro y descriptivo en español sin que tengas que escribirlo tú.

---

## Resumen de todos los atajos

| Atajo | Acción |
|-------|--------|
| `Ctrl + Shift + C` | Abrir / Cerrar panel de Claude |
| `Ctrl + Shift + E` | Explicar código seleccionado |
| `Ctrl + Alt + R` | Refactorizar código seleccionado |
| `Ctrl + Shift + B` | Buscar y corregir errores |
| `Ctrl + Shift + I` | Activar modo Editar |
| `Enter` (en el chat) | Enviar mensaje |
| `Shift + Enter` (en el chat) | Salto de línea |

También disponibles en el menú **Edit** de Phoenix Code.

---

## Preguntas frecuentes

**¿Necesito API Key?**
No. La extensión usa el **Claude Code CLI** que se autentica con tu cuenta de Anthropic (la misma que usas en claude.ai o VS Code).

**¿Funciona sin internet?**
No, Claude necesita conectarse a los servidores de Anthropic para responder.

**¿Claude puede ver todos mis archivos?**
Sí, cuando usas el botón "Revisar todo el proyecto" o haces preguntas sobre el proyecto, Claude lee los archivos del directorio abierto en Phoenix Code. Ignora `node_modules`, `.git`, imágenes y archivos binarios.

**¿Cómo sabe Claude en qué proyecto estoy?**
Detecta automáticamente la carpeta abierta en Phoenix Code con **File → Open Folder**. La barra superior del panel muestra el nombre del proyecto y el archivo activo.

**¿La conversación se guarda entre sesiones?**
No, el historial existe solo mientras Phoenix Code está abierto. Al reiniciar o presionar "Nueva" el historial se limpia.

**¿Funciona en la versión web de Phoenix Code?**
No, requiere la **versión Desktop** (app de escritorio) porque necesita acceso a Node.js para ejecutar el CLI de Claude.

---

## Estructura de archivos

```
claude-for-phcode/
├── main.js          ← Panel del editor (interfaz)
├── package.json     ← Configuración de la extensión
├── lang/            ← Traducciones (31 idiomas)
│   ├── en.js
│   ├── es.js
│   └── ...
└── node/
    ├── index.js     ← Backend Node.js (Claude CLI, archivos, git)
    └── package.json
```

---

*Desarrollado por **Erik Dávila***
