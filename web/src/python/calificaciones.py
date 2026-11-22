"""Problema 1 — Clasificacion de estudiantes por calificaciones.

Modelo: f : [0,100] -> R = {A, B, C, D, F}, definida por una particion del
dominio en cinco intervalos disjuntos y exhaustivos. El resultado es el mapa
r |-> |G_r|, que cumple la invariante de conservacion:  sum_r |G_r| = |G|.
"""

RANGOS = [
    ("A", 90, 100),
    ("B", 80, 89),
    ("C", 70, 79),
    ("D", 60, 69),
    ("F", 0, 59),
]


def rango_de(nota):
    """Evalua f(nota). Exactamente un intervalo la contiene."""
    for etiqueta, minimo, maximo in RANGOS:  #@scan
        if minimo <= nota <= maximo:  #@test
            return etiqueta  #@hit
    raise ValueError(f"Calificacion fuera del dominio [0,100]: {nota}")  #@error


def clasificar(notas):
    """Devuelve el diccionario rango -> cantidad de estudiantes."""
    conteo = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}  #@init
    for nota in notas:  #@loop
        r = rango_de(nota)  #@call
        conteo[r] += 1  #@incr
    return conteo  #@return


def verificar_invariante(notas, conteo):
    """sum_r |G_r| = |G|  <=>  la particion no pierde ni duplica estudiantes."""
    return sum(conteo.values()) == len(notas)  #@check


if __name__ == "__main__":
    entrada = input("Calificaciones separadas por coma: ")
    notas = [float(x) for x in entrada.split(",") if x.strip()]
    resultado = clasificar(notas)
    print("Conteo por rango:", resultado)
    print("Suma de conteos:", sum(resultado.values()), "| n =", len(notas))
    print("Invariante cumplida:", verificar_invariante(notas, resultado))
