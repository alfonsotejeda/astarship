/**
 * Elemento de la estructura visitada. Su interfaz NO crece cuando se agregan
 * operaciones: esa es la propiedad que justifica el patron.
 */
public interface ElementoContable {

    <R> R accept(VisitanteOperacion<R> v);
}
