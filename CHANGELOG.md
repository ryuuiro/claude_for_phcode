# Changelog
All notable changes to this project will be documented in this file.

## [2.5.5] - 2026-06-26
### Added
- Soporte multilingüe completo: 31 idiomas disponibles (bg, cs, da, de, el, en, es, fa, fi, fr, gl, hr, hu, id, it, ja, ko, nb, nl, pl, pt-br, ro, ru, sk, sl, sr, sv, tr, uk, zh-cn, zh-tw)
- Módulo de traducción con carga perezosa (lazy loading) por idioma para minimizar el impacto en el arranque
- Menú de selección de idioma en el panel (botón ⋮ → Idioma / Language)
- Detección automática del idioma según la configuración regional de Phoenix Code
- Persistencia del idioma seleccionado en `localStorage`
- Todos los textos del frontend y del backend (prompts a Claude, mensajes de error, etiquetas) son ahora completamente traducibles por idioma

## [2.5.4] - 2026-06-23
### Fixed
- Removido npmInstall para evitar error de instalación desde el marketplace

## [2.5.3] - 2026-06-23
### Fixed
- Agregado package-lock.json para correcta instalación desde el marketplace

## [2.5.2] - 2026-06-23
### Fixed
- Nombre del paquete corregido al nombre definitivo (claude-for-phcode)

## [2.5.1] - 2026-06-23
### Changed
- Enviar mensaje ahora es solo Enter (antes requería Ctrl+Enter)

## [2.5.0] - 2026-06-20
### Added
- Contador de tiempo en vivo mientras Claude procesa
- Botón Cancelar para abortar la respuesta en cualquier momento
- Indicador visual de estado con ícono ✦
### Fixed
- Sin límite de timeout — Claude puede tardar lo que necesite en proyectos grandes

---

## [2.0.0] - 2026-05-10
### Changed
- Arquitectura completamente reescrita: eliminado el bridge server externo (Node.js HTTP server)
- Migración a NodeConnector API nativa de Phoenix Code
- Ya no requiere abrir `iniciar-bridge.bat` manualmente — todo arranca automáticamente con Phoenix Code
### Added
- Detección automática del proyecto abierto en Phoenix Code (sin escribir rutas)
- Modo Edit: Claude edita archivos directamente en disco
- Modo Git: operaciones git con mensajes de commit generados por IA
- Memoria de conversación por sesión (últimos 20 mensajes)
- Lectura de archivos del proyecto (hasta 60 archivos, ignora node_modules, binarios, etc.)
- Compatibilidad con rutas Tauri en Windows (`/tauri/C/Users/...`)
### Fixed
- Compatibilidad total con RequireJS de Phoenix Code (eliminado ES6: sin `const/let/async/await`)
- HTML inlinado en `main.js` (el loader `text!` no está disponible en extensiones de Phoenix Code)

---

## [1.0.0] - 2026-04-15
### Added
- Primera versión funcional con bridge server HTTP externo en Node.js (puerto 39491)
- Panel lateral de chat en Phoenix Code
- Integración con Claude Code CLI usando sesión autenticada (sin API key manual)
- Modos: Chat, Explicar código, Refactorizar, Buscar bugs, Generar docs
- Atajos de teclado: `Ctrl+Shift+C`, `Ctrl+Shift+E`, `Ctrl+Shift+R`, `Ctrl+Shift+B`, `Ctrl+Shift+D`
- Script `iniciar-bridge.bat` para Windows
