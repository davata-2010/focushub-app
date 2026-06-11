# 🏁 Retro Kart GP

Juego de carreras retro en 2D inspirado en Mario Kart, hecho con HTML, CSS y
JavaScript puro sobre `<canvas>`. Sin dependencias ni build: abre
`index.html` y a correr.

## Cómo jugar

| Acción | Tecla |
| --- | --- |
| Acelerar | `↑` / `W` |
| Frenar / marcha atrás | `↓` / `S` |
| Girar | `←` `→` / `A` `D` |
| Usar objeto | `ESPACIO` |
| Derrape (mini-turbo al soltar) | `SHIFT` |
| Empezar / reiniciar | `ENTER` |

En móvil aparecen botones táctiles automáticamente.

## Características

- Circuito con curvas, chicane y línea de meta a cuadros
- 3 vueltas contra 3 rivales con IA (con "goma elástica")
- Objetos: 🍄 champiñón (turbo), 🍌 plátano (trampa) y caparazón teledirigido
- Cajas de objetos `?` y flechas de turbo en la pista
- Derrape con mini-turbo, trompos, colisiones entre karts
- HUD con vuelta, posición, cronómetro, objeto y velocímetro
- Efectos de sonido con WebAudio (sin archivos de audio)

## Ejecutar en local

Basta con abrir `index.html` en el navegador, o servirlo:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
