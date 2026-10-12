// ============================================================
// MÓDULO GARANTÍAS
// ============================================================
import { store } from '../core/store.js';
import { utils } from '../core/utils.js';
import { router } from '../core/router.js';

let garSub = 'activas';
let garAreaFiltro = 'Todas';

// ============================================================
// DERIVAR ESTADO DE GARANTÍA DESDE LA ORDEN
// ============================================================
function derivarEstadoGarantia(orden) {
    if (!orden.garantia_dias || orden.garantia_dias === 0) return null;

    // Si la orden está cerrada definitivamente
    if (['garantia_terminada', 'solucionado', 'entregado', 'cancelada'].includes(orden.estado)) {
        return 'finalizada';
    }

    // Si no tiene fecha de fin, es activa por defecto
    if (!orden.fecha_fin_garantia) return 'activa';

    const hoy = new Date();
    const fin = new Date(orden.fecha_fin_garantia);

    if (fin < hoy) return 'vencida';
    return 'activa';
}

function getEstadoColor(estado) {
    const colors = {
        'activa': '#00e676',
        'vencida': '#ff5252',
        'finalizada': '#22d3ee',
    };
    return colors[estado] || '#7c7ca8';
}

function getEstadoLabel(estado) {
    const labels = {
        'activa': 'Activa',
        'vencida': 'Vencida',
        'finalizada': 'Finalizada',
    };
    return labels[estado] || estado;
}

// ============================================================
// DÍAS RESTANTES O VENCIDOS
// ============================================================
function getDiasRestantes(fechaFin) {
    if (!fechaFin) return null;
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
    return diff;
}

function formatearDias(dias) {
    if (dias === null) return '-';
    if (dias > 0) return `${dias} día${dias === 1 ? '' : 's'} restante${dias === 1 ? '' : 's'}`;
    if (dias === 0) return 'Vence hoy';
    return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
}

// ============================================================
// RENDERIZAR FILTRO DE ÁREAS
// ============================================================
export function rGAreas() {
    const container = document.getElementById('garAreaPills');
    if (!container) return;

    const areas = ['Todas', ...(store.areas || [])];

    container.innerHTML = areas.map(a => {
        return `<button class="pi${a === garAreaFiltro ? ' active' : ''}" 
                onclick="window.dispatchEvent(new CustomEvent('garantias:setArea', { detail: '${a}' }))">${a}</button>`;
    }).join('');
}

// ============================================================
// RENDERIZAR LISTA
// ============================================================
export async function rG() {
    if (!store._initialized) {
        await store.init();
    }

    // Filtrar solo órdenes con garantía
    const todasLasGarantias = store.getOrdenes().filter(o => o.garantia_dias && o.garantia_dias > 0);

    // Calcular stats
    const stats = {
        total: todasLasGarantias.length,
        activas: 0,
        vencidas: 0,
        finalizadas: 0,
    };

    todasLasGarantias.forEach(o => {
        const estado = derivarEstadoGarantia(o);
        if (estado === 'activa') stats.activas++;
        else if (estado === 'vencida') stats.vencidas++;
        else if (estado === 'finalizada') stats.finalizadas++;
    });

    const elTotal = document.getElementById('garTotal');
    const elAct = document.getElementById('garActivas');
    const elVen = document.getElementById('garVencidas');
    const elFin = document.getElementById('garFinalizadas');
    if (elTotal) elTotal.textContent = stats.total;
    if (elAct) elAct.textContent = stats.activas;
    if (elVen) elVen.textContent = stats.vencidas;
    if (elFin) elFin.textContent = stats.finalizadas;

    // Filtrar por tab
    let filtradas = todasLasGarantias;
    if (garSub === 'activas') {
        filtradas = filtradas.filter(o => derivarEstadoGarantia(o) === 'activa');
    } else if (garSub === 'vencidas') {
        filtradas = filtradas.filter(o => derivarEstadoGarantia(o) === 'vencida');
    } else if (garSub === 'finalizadas') {
        filtradas = filtradas.filter(o => derivarEstadoGarantia(o) === 'finalizada');
    }

    // Filtro por área
    if (garAreaFiltro !== 'Todas') {
        filtradas = filtradas.filter(o => (o.area_nombre || '') === garAreaFiltro);
    }

    // Filtro por búsqueda
    const searchInput = document.getElementById('garSrch');
    const s = (searchInput ? searchInput.value : '').toLowerCase();
    if (s) {
        filtradas = filtradas.filter(o => {
            return (
                (o.codigo || '').toLowerCase().includes(s) ||
                (o.cliente_nombre || '').toLowerCase().includes(s) ||
                (o.equipo_tipo || '').toLowerCase().includes(s) ||
                (o.equipo_marca || '').toLowerCase().includes(s) ||
                (o.equipo_modelo || '').toLowerCase().includes(s)
            );
        });
    }

    // Ordenar: primero las que vencen antes
    filtradas = filtradas.slice().sort((a, b) => {
        const fa = a.fecha_fin_garantia ? new Date(a.fecha_fin_garantia) : new Date(0);
        const fb = b.fecha_fin_garantia ? new Date(b.fecha_fin_garantia) : new Date(0);
        return fa - fb;
    });

    renderGarantiasList(filtradas);
}

window.rG = rG;

function renderGarantiasList(ordenes) {
    const list = document.getElementById('garList');
    if (!list) return;

    if (!ordenes.length) {
        list.innerHTML = `
            <div class="es" style="padding:40px 20px;">
                <i class="fas fa-shield-alt" style="font-size:40px;opacity:0.4;margin-bottom:12px;display:block;"></i>
                <p style="font-size:13px;color:#e6e6f4;font-weight:600;">No hay garantías</p>
                <p style="font-size:11px;color:#7c7ca8;margin-top:4px;">Las garantías se generan al cerrar una orden con días de garantía</p>
            </div>
        `;
        return;
    }

    list.innerHTML = ordenes.map(o => {
        const estado = derivarEstadoGarantia(o);
        const estadoColor = getEstadoColor(estado);
        const estadoLabel = getEstadoLabel(estado);
        const clienteNombre = o.cliente_nombre || 'Sin cliente';
        const equipo = [o.equipo_marca, o.equipo_modelo].filter(Boolean).join(' ') || o.equipo_tipo || 'Sin equipo';
        const dias = getDiasRestantes(o.fecha_fin_garantia);
        const diasTexto = formatearDias(dias);
        const fechaFin = o.fecha_fin_garantia ? new Date(o.fecha_fin_garantia).toLocaleDateString('es-ES') : '-';
        const vecesReabierta = o.veces_reabierta || 0;

        return `<div class="oi" onclick="window.verOrden('${o.id}')" style="border-left-color:${estadoColor};">
            <div class="ot">
                <div class="oid">${o.codigo || 'OS-???'}</div>
                <div class="os" style="background:${estadoColor}20;color:${estadoColor};">${estadoLabel}</div>
            </div>
            <div class="ocl">${clienteNombre}</div>
            <div class="osv">${equipo}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <div class="odt">
                    <i class="far fa-calendar"></i> ${fechaFin}
                    ${vecesReabierta > 0 ? `<span style="margin-left:6px;color:var(--amber);font-weight:600;">↻ ${vecesReabierta}</span>` : ''}
                </div>
                <div style="font-size:10px;font-weight:700;color:${estadoColor};">${diasTexto}</div>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// TABS
// ============================================================
function setupTabs() {
    const container = document.getElementById('garSN');
    if (!container) return;

    container.addEventListener('click', function(e) {
        const tb = e.target.closest('.st');
        if (!tb) return;
        e.stopPropagation();

        const newSub = tb.dataset.s;
        if (newSub === garSub) return;

        garSub = newSub;
        container.querySelectorAll('.st').forEach(t => t.classList.remove('active'));
        tb.classList.add('active');
        rG();
    });

    window.addEventListener('garantias:setArea', e => {
        garAreaFiltro = e.detail;
        rGAreas();
        rG();
    });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
export function initGarantias() {
    (async () => {
        await store.init();
        rGAreas();
        await rG();
        setupTabs();
        router.updateFAB();
        console.log('✅ Módulo Garantías inicializado');
    })();
}

export default {
    init: initGarantias,
    rG,
};