"""Problema 2 — Analisis de productos en inventario.

Modelo: S : P -> N es la funcion de stock y D la relacion de demanda.
El predicado de suficiencia  Suf(p,q) == S(p) >= q  (con S(p)=0 si p no esta
registrado) parte a D en dos conjuntos disjuntos D+ y D-. Se reporta |D-|,
cuya correccion se demuestra por induccion sobre el tamano de la demanda.
"""


def stock_de(stock, producto):
    """Extension total de S: un producto sin registro tiene stock nulo."""
    return stock.get(producto, 0)  #@lookup


def analizar_inventario(stock, demanda):
    """Devuelve (resultados, faltantes) donde faltantes = |D-|."""
    resultados = []  #@init_res
    faltantes = 0  #@init_cnt
    for producto, cantidad in demanda:  #@loop
        disponible = stock_de(stock, producto)  #@get
        suficiente = disponible >= cantidad  #@pred
        resultados.append((producto, cantidad, disponible, suficiente))  #@append
        if not suficiente:  #@branch
            faltantes += 1  #@incr
    return resultados, faltantes  #@return


def _parsear(texto):
    """'manzanas:10, peras:5' -> [('manzanas', 10), ('peras', 5)]"""
    pares = []
    for trozo in texto.split(","):
        if ":" not in trozo:
            continue
        nombre, valor = trozo.split(":", 1)
        pares.append((nombre.strip(), int(valor.strip())))
    return pares


if __name__ == "__main__":
    stock = dict(_parsear(input("Inventario (producto:cantidad, ...): ")))
    demanda = _parsear(input("Demanda (producto:cantidad, ...): "))
    resultados, faltantes = analizar_inventario(stock, demanda)
    for producto, cantidad, disponible, suficiente in resultados:
        estado = "OK" if suficiente else "INSUFICIENTE"
        print(f"{producto}: demanda={cantidad} disponible={disponible} -> {estado}")
    print("Productos con faltante:", faltantes)
