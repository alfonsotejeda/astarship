/**
 * Experimento controlado del inciso (d): una quinta operacion.
 *
 * Esta clase se agrega en un commit propio para que la metrica sea verificable con
 * git show --stat: un archivo nuevo, cero archivos modificados. La misma operacion
 * escrita como metodo de los elementos habria tocado cinco archivos: las cuatro
 * cuentas y su interfaz comun.
 */
public final class ExportarCsvVisitor implements VisitanteOperacion<String> {

    @Override
    public String visitAhorro(CuentaAhorro c) {
        return linea(c, "retiros=" + c.retirosDelMes());
    }

    @Override
    public String visitCorriente(CuentaCorriente c) {
        return linea(c, "sobregiro=" + Dinero.f(c.lineaSobregiro()));
    }

    @Override
    public String visitInversion(CuentaInversion c) {
        return linea(c, "penalizaciones=" + Dinero.f(c.penalizacionesAcumuladas()));
    }

    @Override
    public String visitEmpresarial(CuentaEmpresarial c) {
        return linea(c, "doble-firma=" + c.autorizacionSecundaria());
    }

    /** Sobre un grupo, concatena las lineas de sus hojas. */
    @Override
    public String combinar(String acumulado, String siguiente) {
        return acumulado + System.lineSeparator() + siguiente;
    }

    private static String linea(Cuenta c, String propio) {
        return String.join(";", c.id(), c.etiqueta(), Dinero.f(c.saldo()), propio);
    }
}
