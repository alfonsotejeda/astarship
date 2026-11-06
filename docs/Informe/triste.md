**Por qué A\* no es el candidato correcto para este problema**

1. **La red es pequeña.** Un destino turístico tiene decenas o cientos de atracciones. Dijkstra la recorre entera en microsegundos, así que explorar menos nodos no se nota y no cambia el cumplimiento de RNF-01.

2. **La consulta es de uno a varios, no de uno a uno.** El endpoint busca alternativas, es decir, varios candidatos desde un mismo origen. A\* resuelve un origen y un destino, así que habría que lanzarlo una vez por candidato. Una sola expansión de Dijkstra desde el origen da el tiempo a todos los candidatos a la vez.

3. **La ventaja de A\* depende de una heurística fuerte.** Haversine dividido entre la velocidad máxima es una cota admisible, pero suele ser floja cuando las rutas tienen rodeos, esperas o transbordos. Cuanto más floja, menos nodos descarta.

4. **Con peso por costo, A\* no aporta nada.** No hay relación geométrica entre distancia y costo, así que h = 0 y A\* se comporta como Dijkstra. En uno de los dos criterios del sistema la diferencia desaparece.

5. **Dijkstra cubre ambos criterios con el mismo código.** Funciona igual con tiempo y con costo, y admite un corte por presupuesto de tiempo (la ventana del horario). Eso encaja directamente con lo que pide el endpoint.

6. **La complejidad es la misma en el peor caso.** Ambos son O((V + E) log V). A\* solo mejora en la práctica y en grafos grandes.

7. **A\* añade supuestos que hay que mantener.** Necesita coordenadas correctas, una velocidad máxima bien calculada (al menos la mayor velocidad implícita en cualquier arista) y pesos no negativos. Si alguno falla, puede devolver un camino no óptimo. Dijkstra solo exige pesos no negativos.

**Cuándo sí tendría sentido mantenerlo:**

- Está pedido en RF-33, así que hay que implementarlo.
- Sirve para demostrar el patrón Strategy de RNF-05, ya que el algoritmo es intercambiable.
- Tendría ventaja real si la red creciera mucho y las consultas fueran de punto a punto, por ejemplo calcular la ruta concreta hasta la alternativa que el turista elija.

**Mi recomendación:** usar Dijkstra con corte por tiempo para la búsqueda de alternativas y dejar A\* como estrategia intercambiable para rutas punto a punto. Si te preguntan en la defensa, la respuesta honesta es que A\* se justifica por el requisito y por el diseño extensible, no por rendimiento.
