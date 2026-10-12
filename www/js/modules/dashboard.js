// ============================================================
// MÓDULO DASHBOARD - ACTUALIZA LOS CONTADORES Y ESTADÍSTICAS
// ============================================================
import { store } from '../core/store.js';

// Utilidad: obtener nombre del mes actual en texto (opcional)
function getMesActual() {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return meses[new Date().getMonth()];
}

// Utilidad: filtrar transacciones del mes actual
function transaccionesDelMes(tx) {
    const now = new Date();
    const mesActual = now.getMonth();
    const anioActual = now.getFullYear();
    return tx.filter(t => {
        const partes = (t.dt || '').split('-');
        if (partes.length >= 2) {
            const anio = parseInt(partes[0]);
            const mes = parseInt(partes[1]) - 1;
            return anio === anioActual && mes === mesActual;
        }
        return false;
    });
}

// Actualizar todos los contadores del dashboard
export async function initDashboard() {
    await store.init();

    // ============================================================
    // 1. PRODUCTOS (Inventario)
    // ============================================================
    const productos = store.getProductosActivos();
    const totalProductos = productos.length;
    const bajoStock = productos.filter(p => p.q <= p.mn).length;

    // IDs en la tarjeta de inventario
    const hpTotal = document.getElementById('hpTotal');
    const hpLow = document.getElementById('hpLow');
    if (hpTotal) hpTotal.textContent = totalProductos;
    if (hpLow) hpLow.textContent = bajoStock;

    // IDs en el resumen general
    const resProductos = document.getElementById('resProductos');
    if (resProductos) resProductos.textContent = totalProductos;

    // ============================================================
    // 2. ÓRDENES
    // ============================================================
    const ordenes = store.getOrdenes();
    const ordenesActivas = ordenes.filter(o => o.st === 'activa').length;
    const ordenesProceso = ordenes.filter(o => o.st === 'en_proceso').length;

    const oActivas = document.getElementById('oActivas');
    const oProceso = document.getElementById('oProceso');
    const resOrdenes = document.getElementById('resOrdenes');
    if (oActivas) oActivas.textContent = ordenesActivas;
    if (oProceso) oProceso.textContent = ordenesProceso;
    if (resOrdenes) resOrdenes.textContent = ordenesActivas + ordenesProceso;

    // Badge en la barra de navegación inferior
    const oBdg = document.getElementById('oBdg');
    if (oBdg) oBdg.textContent = ordenesActivas + ordenesProceso;

    // ============================================================
    // 3. FINANZAS (del mes actual)
    // ============================================================
    const transacciones = store.getTransacciones();
    const txMes = transaccionesDelMes(transacciones);

    let ingresosMes = 0;
    let gastosMes = 0;
    txMes.forEach(t => {
        if (t.t === 'income') ingresosMes += t.a || 0;
        else if (t.t === 'expense') gastosMes += t.a || 0;
    });
    const utilidadMes = ingresosMes - gastosMes;

    // IDs en la tarjeta de finanzas
    const fIngresos = document.getElementById('fIngresos');
    const fGastos = document.getElementById('fGastos');
    if (fIngresos) fIngresos.textContent = '$' + ingresosMes.toLocaleString();
    if (fGastos) fGastos.textContent = '$' + gastosMes.toLocaleString();

    // IDs en el resumen general
    const resIngresos = document.getElementById('resIngresos');
    const resUtilidad = document.getElementById('resUtilidad');
    if (resIngresos) resIngresos.textContent = ingresosMes.toLocaleString();
    if (resUtilidad) resUtilidad.textContent = utilidadMes.toLocaleString();

    // ============================================================
    // 4. GARANTÍAS
    // ============================================================
    const garantias = store.getGarantias();
    // Recalcular el estado de cada garantía según la fecha actual
    const hoy = new Date();
    let garantiasActivas = 0;
    let garantiasVencidas = 0;
    garantias.forEach(g => {
        const fin = new Date(g.fechaFin);
        if (g.estado === 'finalizada') return;
        if (fin < hoy) {
            garantiasVencidas++;
        } else {
            garantiasActivas++;
        }
    });

    const gActivas = document.getElementById('gActivas');
    const gVencidas = document.getElementById('gVencidas');
    if (gActivas) gActivas.textContent = garantiasActivas;
    if (gVencidas) gVencidas.textContent = garantiasVencidas;

    // Badge en la barra de navegación inferior
    const gBdg = document.getElementById('gBdg');
    if (gBdg) gBdg.textContent = garantiasActivas + garantiasVencidas;

    console.log('✅ Dashboard actualizado:', {
        productos: totalProductos,
        bajoStock,
        ordenesActivas,
        ordenesProceso,
        ingresosMes,
        gastosMes,
        utilidadMes,
        garantiasActivas,
        garantiasVencidas
    });
}

export default {
    init: initDashboard
};