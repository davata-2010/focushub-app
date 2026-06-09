# FocusHub

**Centro de productividad "todo en uno"** — un dashboard minimalista con modo oscuro
por defecto que reúne un temporizador **Pomodoro**, un **tablero Kanban** con
arrastrar y soltar, y un **tracker de hábitos**. Todo tu estado se guarda de forma
local y persistente en el navegador (IndexedDB), sin cuentas ni servidores.

![Stack](https://img.shields.io/badge/Vite-React%2BTS-646CFF) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8) ![Zustand](https://img.shields.io/badge/State-Zustand-443E38)

## ✨ Características

- **⏱️ Pomodoro preciso** — temporizador basado en _timestamp_ (sin drift), con
  modos Enfoque / Descanso corto / Descanso largo, ciclo automático configurable,
  contador de sesiones y notificación + sonido al terminar cada fase.
- **🗂️ Tablero Kanban** — 3 columnas (Por hacer · En progreso · Hecho) con
  `@dnd-kit`: reordena dentro de una columna o mueve entre columnas, con
  actualización instantánea del estado global. Tarjetas con prioridad, fecha
  límite, etiquetas y edición en línea.
- **✅ Hábitos diarios** — checkbox para registrar el día de hoy, con racha
  (_streak_) y progreso de los últimos 7 días.
- **🎨 UI profesional** — diseño tipo dashboard, tipografía Inter, modo
  oscuro/claro con toggle, totalmente responsive (de móvil a escritorio).
- **💾 Persistencia automática** — el estado se guarda en IndexedDB con
  `localforage` mediante el middleware `persist` de Zustand.

## 🧱 Stack técnico

| Área            | Tecnología                                         |
| --------------- | -------------------------------------------------- |
| Framework       | Vite + React + TypeScript                          |
| Estilos         | Tailwind CSS v4 (`@tailwindcss/vite`)              |
| Estado global   | Zustand (+ middleware `persist`)                   |
| Persistencia    | localforage (IndexedDB)                            |
| Drag & Drop     | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Iconos / Fuente | lucide-react · Inter (`@fontsource/inter`)         |

## 🚀 Puesta en marcha

```bash
npm install      # instala dependencias
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # compila y valida tipos para producción
npm run preview  # sirve el build de producción
npm run lint     # ejecuta ESLint
```

## 📁 Estructura

```
src/
  types/                 Tipos de dominio (Task, Habit, Pomodoro…)
  store/useStore.ts      Store de Zustand + persistencia en IndexedDB
  lib/                   Utilidades (fechas/racha, reloj, notificaciones)
  components/
    layout/              AppShell, Sidebar, CommandCenter
    pomodoro/            Motor del temporizador, panel y ajustes
    kanban/              Tablero, columnas, tarjetas y formularios
    habits/              Tracker de hábitos
    ui/                  Primitivas reutilizables (IconButton)
```

## 📝 Notas

- El temporizador deriva el tiempo restante de un _timestamp_ objetivo, por lo que
  se mantiene exacto aunque la pestaña pase a segundo plano.
- Al primer arranque se cargan datos de ejemplo para mostrar la interfaz; puedes
  borrarlos y crear los tuyos. Todo queda guardado en tu navegador.
