#!/usr/bin/env python3
"""Prueba de Demostracion III — Matematica Discreta (FUN-03), Universidad CENFOTEC.

Script unico y autocontenido con los tres problemas de la consigna:

  1. Clasificacion de estudiantes por calificaciones  (particion del dominio)
  2. Analisis de productos en inventario              (induccion matematica)
  3. Juego de secuencias numericas                    (principio del palomar)

Uso:  python3 demostracion3.py
Sin dependencias externas: solo la biblioteca estandar de Python 3.
"""

import sys


# ---------------------------------------------------------------------------
# Problema 1 — Clasificacion de estudiantes por calificaciones
#
# f : [0,100] -> R = {A, B, C, D, F} queda bien definida porque
#   [0,100] = [0,59] U [60,69] U [70,79] U [80,89] U [90,100]
# es una particion: los intervalos son disjuntos dos a dos y su union cubre
# todo el dominio, asi que cada nota tiene exactamente una imagen.
# Invariante verificable:  sum_r |G_r| = |G|.
# ---------------------------------------------------------------------------

RANGOS = [
    ("A", 90, 100),
    ("B", 80, 89),
    ("C", 70, 79),
    ("D", 60, 69),
    ("F", 0, 59),
]


def rango_de(nota):
    """Evalua f(nota). Exactamente un intervalo de RANGOS la contiene."""
    for etiqueta, minimo, maximo in RANGOS:
        if minimo <= nota <= maximo:
            return etiqueta
    raise ValueError(f"Calificacion fuera del dominio [0,100]: {nota}")


def clasificar(notas):
    """Devuelve el diccionario rango -> cantidad de estudiantes. O(n)."""
    conteo = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for nota in notas:
        r = rango_de(nota)
        conteo[r] += 1
    return conteo


def verificar_invariante(notas, conteo):
    """sum_r |G_r| = |G|: la particion no pierde ni duplica estudiantes."""
    return sum(conteo.values()) == len(notas)


# ---------------------------------------------------------------------------
# Problema 2 — Analisis de productos en inventario
#
# S : P -> N es el stock; D la relacion de demanda. Con la extension total
# S(p) = 0 para p no registrado, el predicado  Suf(p,q) == S(p) >= q  parte D
# en D+ (satisfecha) y D- (insuficiente), disjuntos y con D = D+ U D-.
#
# Correccion por induccion sobre k = cantidad de demandas procesadas:
#   Base (k=0): faltantes = 0 = |D- interseccion vacio|.
#   Paso: si tras k demandas faltantes = |D- entre las primeras k|, al
#   procesar la demanda k+1 el contador sube 1 exactamente cuando la nueva
#   demanda pertenece a D-, preservando la igualdad para k+1.
# Luego al terminar, faltantes = |D-|.
# ---------------------------------------------------------------------------


def stock_de(stock, producto):
    """Extension total de S: un producto sin registro tiene stock nulo."""
    return stock.get(producto, 0)


def analizar_inventario(stock, demanda):
    """Devuelve (resultados, faltantes) donde faltantes = |D-|. O(n)."""
    resultados = []
    faltantes = 0
    for producto, cantidad in demanda:
        disponible = stock_de(stock, producto)
        suficiente = disponible >= cantidad
        resultados.append((producto, cantidad, disponible, suficiente))
        if not suficiente:
            faltantes += 1
    return resultados, faltantes


# ---------------------------------------------------------------------------
# Problema 3 — Juego de secuencias numericas (principio del palomar)
#
# Sea L = (x_1, ..., x_n) y V el conjunto de valores distintos de L.
# La funcion f : {1..n} -> V, f(i) = x_i, no puede ser inyectiva si n > |V|
# (principio del palomar), de modo que  n > |V|  <=>  hay un duplicado.
# La contrapositiva da el caso unico: si f es inyectiva entonces n = |V|.
# El conjunto `vistos` materializa los nidos ya ocupados: tiempo O(n), lo que
# evita la comparacion por pares O(n^2).
# ---------------------------------------------------------------------------


def encontrar_duplicados(numeros):
    """Devuelve (hay_duplicados, duplicados_o_mensaje)."""
    vistos = set()
    duplicados = []
    for x in numeros:
        if x in vistos:
            if x not in duplicados:
                duplicados.append(x)
        vistos.add(x)
    if not duplicados:
        return False, "Todos los numeros de la lista son unicos."
    return True, duplicados


def palomar(numeros):
    """Comprueba el enunciado del palomar sobre la entrada concreta."""
    n = len(numeros)
    v = len(set(numeros))
    return n, v, n > v


# ---------------------------------------------------------------------------
# Entrada / salida por consola
# ---------------------------------------------------------------------------


def _a_numero(texto):
    """Convierte a int cuando el valor es entero, para no imprimir '.0'."""
    valor = float(texto)
    return int(valor) if valor.is_integer() else valor


def pedir_numeros(mensaje):
    """Lee una lista de numeros separados por coma, reintentando si falla."""
    while True:
        crudo = input(mensaje)
        try:
            valores = [_a_numero(x) for x in crudo.split(",") if x.strip()]
        except ValueError:
            print("  Entrada invalida: usa solo numeros separados por coma.\n")
            continue
        if not valores:
            print("  La lista no puede estar vacia.\n")
            continue
        return valores


def pedir_pares(mensaje):
    """Lee pares 'nombre:cantidad' separados por coma."""
    while True:
        crudo = input(mensaje)
        pares = []
        valido = True
        for trozo in crudo.split(","):
            if not trozo.strip():
                continue
            if ":" not in trozo:
                valido = False
                break
            nombre, valor = trozo.split(":", 1)
            try:
                pares.append((nombre.strip(), int(valor.strip())))
            except ValueError:
                valido = False
                break
        if not valido or not pares:
            print("  Formato invalido. Ejemplo: manzanas:10, peras:5\n")
            continue
        return pares


def correr_problema_1():
    print("\n--- Problema 1: clasificacion por calificaciones ---")
    notas = pedir_numeros("Calificaciones separadas por coma: ")
    try:
        conteo = clasificar(notas)
    except ValueError as error:
        print(f"  {error}")
        return
    print("\nConteo por rango:")
    for etiqueta, _, _ in RANGOS:
        print(f"  {etiqueta}: {conteo[etiqueta]}")
    print(f"\nSuma de conteos = {sum(conteo.values())}  |  n = {len(notas)}")
    print(f"Invariante sum_r |G_r| = |G|: {verificar_invariante(notas, conteo)}")


def correr_problema_2():
    print("\n--- Problema 2: analisis de inventario ---")
    stock = dict(pedir_pares("Inventario (producto:cantidad, ...): "))
    demanda = pedir_pares("Demanda (producto:cantidad, ...): ")
    resultados, faltantes = analizar_inventario(stock, demanda)
    print()
    for producto, cantidad, disponible, suficiente in resultados:
        estado = "OK" if suficiente else "INSUFICIENTE"
        print(f"  {producto}: demanda={cantidad} disponible={disponible} -> {estado}")
    print(f"\nProductos con faltante |D-| = {faltantes}")


def correr_problema_3():
    print("\n--- Problema 3: secuencias numericas (palomar) ---")
    numeros = pedir_numeros("Numeros separados por coma: ")
    hay, salida = encontrar_duplicados(numeros)
    n, v, excede = palomar(numeros)
    print()
    if hay:
        print(f"  Duplicados: {salida}")
    else:
        print(f"  {salida}")
    print(f"\n  n = {n}, |V| = {v}  ->  n > |V| es {excede}")


MENU = """
=============================================
 Prueba de Demostracion III — Matematica Discreta
=============================================
 1) Clasificacion de estudiantes por calificaciones
 2) Analisis de productos en inventario
 3) Juego de secuencias numericas (duplicados)
 0) Salir
"""


def main():
    while True:
        print(MENU)
        opcion = input("Elige una opcion: ").strip()
        if opcion == "1":
            correr_problema_1()
        elif opcion == "2":
            correr_problema_2()
        elif opcion == "3":
            correr_problema_3()
        elif opcion == "0":
            print("Hasta luego.")
            return
        else:
            print("  Opcion no valida.")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nInterrumpido.")
        sys.exit(130)
