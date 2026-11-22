"""Problema 3 — Juego de secuencias numericas (principio del palomar).

Sea L = (x_1, ..., x_n) la lista y V el conjunto de valores distintos.
La funcion f : {1..n} -> V, f(i) = x_i, no puede ser inyectiva si n > |V|
(principio del palomar), de modo que  n > |V|  <=>  existe un duplicado.
El conjunto `vistos` materializa los nidos ya ocupados: tiempo O(n).
"""


def encontrar_duplicados(numeros):
    """Devuelve (hay_duplicados, duplicados_o_mensaje)."""
    vistos = set()  #@init_seen
    duplicados = []  #@init_dup
    for x in numeros:  #@loop
        if x in vistos:  #@test
            if x not in duplicados:  #@dedup
                duplicados.append(x)  #@add_dup
        vistos.add(x)  #@add_seen
    if not duplicados:  #@final
        return False, "Todos los numeros de la lista son unicos."  #@unique
    return True, duplicados  #@found


def palomar(numeros):
    """Comprueba el enunciado del palomar sobre la entrada concreta."""
    n = len(numeros)  #@n
    v = len(set(numeros))  #@v
    return n, v, n > v  #@compare


if __name__ == "__main__":
    entrada = input("Numeros separados por coma: ")
    numeros = [int(x) for x in entrada.split(",") if x.strip()]
    hay, salida = encontrar_duplicados(numeros)
    n, v, excede = palomar(numeros)
    if hay:
        print("Duplicados:", salida)
    else:
        print(salida)
    print(f"n = {n}, |V| = {v}  ->  n > |V| es {excede}")
