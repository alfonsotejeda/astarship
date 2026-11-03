using System;

namespace Ejercicio12;

/// <summary>
/// Decorador de visitante: toma el cerrojo de la cuenta visitada, delega en el
/// visitante envuelto y lo libera. Separa el control de concurrencia de la logica
/// de negocio, de modo que ningun visitante concreto sabe de cerrojos.
///
/// Como el cerrojo es por cuenta, dos cuentas distintas no se estorban.
/// </summary>
public sealed class VisitanteTransaccional<R> : IVisitanteOperacion<R>
{
    private readonly IVisitanteOperacion<R> _interno;

    public VisitanteTransaccional(IVisitanteOperacion<R> interno) => _interno = interno;

    public R VisitAhorro(CuentaAhorro c) => BajoCerrojo(c, () => _interno.VisitAhorro(c));

    public R VisitCorriente(CuentaCorriente c) => BajoCerrojo(c, () => _interno.VisitCorriente(c));

    public R VisitInversion(CuentaInversion c) => BajoCerrojo(c, () => _interno.VisitInversion(c));

    public R VisitEmpresarial(CuentaEmpresarial c) =>
        BajoCerrojo(c, () => _interno.VisitEmpresarial(c));

    /// <summary>El decorador tambien delega la combinacion: no la decide el.</summary>
    public R Combinar(R acumulado, R siguiente) => _interno.Combinar(acumulado, siguiente);

    public R Neutro() => _interno.Neutro();

    /// <summary>
    /// lock de C# es Monitor.Enter/Exit con try/finally, y es reentrante como el
    /// ReentrantLock de Java: un visitante decorado puede anidar visitas a la misma
    /// cuenta sin bloquearse a si mismo.
    /// </summary>
    private static R BajoCerrojo(Cuenta c, Func<R> accion)
    {
        lock (c.Cerrojo)
        {
            return accion();
        }
    }
}
