#!/usr/bin/env python3
"""
Genera los iconos de Livora Stream a partir de la marca: la letra L.

Ninguna letra usa una fuente: se dibujan como geometría, así el logo se ve igual
en cualquier máquina y se puede regenerar en cualquier tamaño. Está soportada
también la A por si la marca vuelve a cambiar: basta con tocar LETTER.

    python3 scripts/generate-icons.py

Requiere Pillow:  pip install pillow
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"

# Letra de la marca. "L" de Livora; "A" queda disponible por si vuelve.
LETTER = "L"

# Degradado de marca: verde neón -> lima, el mismo de theme/index.ts
BRAND_START = (0, 230, 118)
BRAND_END = (168, 255, 62)

# La letra va en tinta oscura, no en blanco: sobre un neón tan claro el blanco
# no llega ni a 2:1 de contraste. Es el mismo `colors.onPrimary` de la app.
INK = (4, 22, 13)

# Se dibuja a 4x y se reduce: así los bordes diagonales quedan suaves sin
# depender del antialiasing de Pillow, que no lo aplica a los polígonos.
SUPERSAMPLE = 4


def gradient(size: int) -> Image.Image:
    """Degradado diagonal de esquina a esquina."""
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    assert pixels is not None
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            pixels[x, y] = tuple(
                round(start + (end - start) * t) for start, end in zip(BRAND_START, BRAND_END)
            )
    return image


def _box(size: int, scale: float, ratio: float) -> tuple[float, ...]:
    """Caja de la letra centrada en el lienzo: (left, top, right, bottom, stroke)."""
    height = size * scale
    width = height * ratio
    left = (size - width) / 2
    top = (size - height) / 2
    return left, top, left + width, top + height, height * 0.235


# --------------------------------------------------------------------------- L


def _mask_l(size: int, scale: float) -> Image.Image:
    """
    La L es un solo polígono: el asta vertical y el pie horizontal.

    Sin huecos ni recortes, así que se dibuja de una pasada.
    """
    big = size * SUPERSAMPLE
    left, top, right, bottom, stroke = _box(big, scale, ratio=0.64)
    foot = stroke * 0.92

    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).polygon(
        [
            (left, top),
            (left + stroke, top),
            (left + stroke, bottom - foot),
            (right, bottom - foot),
            (right, bottom),
            (left, bottom),
        ],
        fill=255,
    )
    return mask.resize((size, size), Image.LANCZOS)


def _svg_l(size: int, scale: float) -> tuple[str, str]:
    left, top, right, bottom, stroke = _box(size, scale, ratio=0.64)
    foot = stroke * 0.92
    points = [
        (left, top),
        (left + stroke, top),
        (left + stroke, bottom - foot),
        (right, bottom - foot),
        (right, bottom),
        (left, bottom),
    ]
    return _polygon_path(points), "nonzero"


# --------------------------------------------------------------------------- A


def _mask_a(size: int, scale: float) -> Image.Image:
    """
    Máscara de la letra A, compuesta con álgebra de conjuntos:

        A = triángulo exterior - (triángulo interior - franja del travesaño)

    Restar la franja al triángulo interior deja el ojo de la A por encima y el
    hueco entre las patas por debajo, que es justo lo que hay que vaciar. Como
    todo se recorta contra el triángulo exterior, el travesaño nunca sobresale
    de las patas por mucho que se ensanche.
    """
    big = size * SUPERSAMPLE
    left, top, right, bottom, stroke = _box(big, scale, ratio=0.86)
    center = big / 2

    outer = Image.new("L", (big, big), 0)
    ImageDraw.Draw(outer).polygon([(center, top), (right, bottom), (left, bottom)], fill=255)

    inner = Image.new("L", (big, big), 0)
    ImageDraw.Draw(inner).polygon(
        [
            (center, top + stroke * 1.15),
            (right - stroke, bottom + 1),
            (left + stroke, bottom + 1),
        ],
        fill=255,
    )

    band = Image.new("L", (big, big), 0)
    ImageDraw.Draw(band).rectangle(
        [(0, bottom - stroke * 1.65), (big, bottom - stroke * 0.87)], fill=255
    )

    mask = ImageChops.subtract(outer, ImageChops.subtract(inner, band))
    return mask.resize((size, size), Image.LANCZOS)


def _svg_a(size: int, scale: float) -> tuple[str, str]:
    left, top, right, bottom, stroke = _box(size, scale, ratio=0.86)
    center = size / 2
    inner_top = top + stroke * 1.15
    inner_left, inner_right = left + stroke, right - stroke
    bar_top = bottom - stroke * 1.65
    bar_bottom = bar_top + stroke * 0.78

    def inner_x(y: float, base_x: float) -> float:
        """Punto del borde interior de una pata a la altura `y`."""
        return center + (base_x - center) * (y - inner_top) / (bottom - inner_top)

    outline = _polygon_path([
        (center, top),
        (right, bottom),
        (inner_right, bottom),
        (inner_x(bar_bottom, inner_right), bar_bottom),
        (inner_x(bar_bottom, inner_left), bar_bottom),
        (inner_left, bottom),
        (left, bottom),
    ])
    counter = _polygon_path([
        (center, inner_top),
        (inner_x(bar_top, inner_right), bar_top),
        (inner_x(bar_top, inner_left), bar_top),
    ])
    return f"{outline} {counter}", "evenodd"


# --------------------------------------------------------------------- comunes

MASKS = {"L": _mask_l, "A": _mask_a}
SVGS = {"L": _svg_l, "A": _svg_a}


def _n(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _polygon_path(points: list[tuple[float, float]]) -> str:
    head, *rest = points
    steps = [f"M {_n(head[0])} {_n(head[1])}"]
    steps += [f"L {_n(x)} {_n(y)}" for x, y in rest]
    return " ".join(steps + ["Z"])


def letter_mask(size: int, scale: float, letter: str = LETTER) -> Image.Image:
    """Máscara en blanco y negro con la letra centrada, ocupando `scale` del lienzo."""
    return MASKS[letter](size, scale)


def letter_svg(size: int = 1024, scale: float = 0.56, letter: str = LETTER) -> str:
    """
    La misma letra como trazado vectorial, para usos donde un PNG se queda corto
    (web, tiendas, material impreso).

    Sale de las mismas fórmulas que la máscara, así que el SVG y los PNG no
    pueden desincronizarse al retocar el logo.
    """
    path, fill_rule = SVGS[letter](size, scale)
    start = "#%02X%02X%02X" % BRAND_START
    end = "#%02X%02X%02X" % BRAND_END
    ink = "#%02X%02X%02X" % INK

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="Livora Stream">
  <defs>
    <linearGradient id="livora" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{start}"/>
      <stop offset="1" stop-color="{end}"/>
    </linearGradient>
  </defs>
  <rect width="{size}" height="{size}" rx="{_n(size * 0.225)}" fill="url(#livora)"/>
  <path d="{path}" fill="{ink}" fill-rule="{fill_rule}"/>
</svg>
"""


def rounded_mask(size: int, radius_ratio: float = 0.225) -> Image.Image:
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (big - 1, big - 1)], radius=int(big * radius_ratio), fill=255
    )
    return mask.resize((size, size), Image.LANCZOS)


def tile(size: int, letter_scale: float, rounded: bool) -> Image.Image:
    """Baldosa de marca: degradado (recortado o no) con la letra en tinta encima."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(gradient(size).convert("RGBA"), (0, 0), rounded_mask(size) if rounded else None)

    if letter_scale > 0:
        canvas = Image.alpha_composite(canvas, _flat(size, INK, letter_scale))
    return canvas


def _flat(size: int, color: tuple[int, int, int], letter_scale: float) -> Image.Image:
    """La letra en un color plano sobre fondo transparente."""
    solid = Image.new("RGBA", (size, size), (*color, 255))
    empty = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    return Image.composite(solid, empty, letter_mask(size, letter_scale))


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)

    outputs = {
        # Icono principal: a sangre, el sistema le aplica su propia máscara.
        "icon.png": tile(1024, letter_scale=0.56, rounded=False),
        # Splash: baldosa redondeada sobre el fondo negro de la app.
        "splash-icon.png": tile(1024, letter_scale=0.50, rounded=True),
        "favicon.png": tile(96, letter_scale=0.54, rounded=True),
        # Marca dentro de la app (login, cabeceras): el mismo dibujo que el icono.
        "logo-mark.png": tile(512, letter_scale=0.50, rounded=True),
        # Android adaptativo: la capa de frente respeta la zona segura (66%).
        "android-icon-background.png": tile(1024, letter_scale=0.0, rounded=False),
        "android-icon-foreground.png": _flat(1024, INK, 0.38),
        # La capa monocroma la recolorea el sistema: solo importa su silueta.
        "android-icon-monochrome.png": _flat(1024, (255, 255, 255), 0.38),
    }

    for name, image in outputs.items():
        image.save(ASSETS / name)
        print(f"escrito assets/{name} ({image.width}x{image.height})")

    (ASSETS / "logo.svg").write_text(letter_svg())
    print("escrito assets/logo.svg (vectorial)")


if __name__ == "__main__":
    main()
