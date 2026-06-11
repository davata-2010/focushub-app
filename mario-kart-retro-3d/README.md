# 🏁 Retro Kart GP 3D

Versión 3D del juego de carreras estilo Mario Kart, con Three.js (vendorizado,
sin CDN ni build): cámara detrás del kart, circuito 3D con asfalto y arcenes,
arco de meta, árboles, montañas, nubes, minimapa y sonido de motor.

Misma lógica de carrera que la versión 2D: 3 vueltas contra 3 rivales con IA,
objetos (🍄 turbo, 🍌 plátano, 🐢 caparazón teledirigido), cajas `?`, flechas
de turbo, derrape con mini-turbo y colisiones.

## Controles

| Acción | Tecla |
| --- | --- |
| Acelerar | `↑` / `W` |
| Frenar / marcha atrás | `↓` / `S` |
| Girar | `←` `→` / `A` `D` |
| Usar objeto | `ESPACIO` |
| Derrape (mini-turbo al soltar) | `SHIFT` |
| Empezar / reiniciar | `ENTER` |

En móvil aparecen botones táctiles automáticamente.

## Ejecutar

Sirve la carpeta con cualquier servidor estático y abre `index.html`:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
