// ============================================================
// MÓDULO FINANZAS
// ============================================================
import { store } from '../core/store.js';
import { utils } from '../core/utils.js';
import { router } from '../core/router.js';

let finSub = 'resumen';
let pgDesde = null;
let pgHasta = null;
let pgTecnicoId = null;

// ============================================================
// HELPER: formato YYYY-MM-DD para input date
// ============================================================
function toDateInput(d) {
    const date = d instanceof Date ? d : new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ============================================================
// INICIALIZAR FILTROS DE FECHA
// ============================================================
function initFechaFiltros() {
    const hoy = toDateInput(new Date());
    const desdeInput = document.getElementById('pgDesde');
    const hastaInput = document.getElementById('pgHasta');
    if (desdeInput && !desdeInput.value) desdeInput.value = hoy;
    if (hastaInput && !hastaInput.value) hastaInput.value = hoy;
    pgDesde = desdeInput ? desdeInput.value : hoy;
    pgHasta = hastaInput ? hastaInput.value : hoy;
}

// ============================================================
// RESUMEN GENERAL (placeholder)
// ============================================================
function renderResumenGeneral() {
    console.log('📊 Resumen general renderizado');
}

// ============================================================
// RENDER: PAGOS A TÉCNICOS
// ============================================================
async function rPG() {
    await store.init();

    const desdeInput = document.getElementById('pgDesde');
    const hastaInput = document.getElementById('pgHasta');
    pgDesde = desdeInput ? desdeInput.value : toDateInput(new Date());
    pgHasta = hastaInput ? hastaInput.value : toDateInput(new Date());

    const list = document.getElementById('pgList');
    if (!list) return;

    const detalleEl = document.getElementById('pgDetalle');
    if (detalleEl) {
        detalleEl.style.display = 'none';
        detalleEl.innerHTML = '';
    }
    pgTecnicoId = null;

    list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-dim);">
        <i class="fas fa-spinner fa-spin"></i> Cargando...
    </div>`;

    try {
        const { api } = await import('../core/api.js');
        const data = await api.getResumenPagos(pgDesde, pgHasta);

        const selectorContainer = document.getElementById('pgSelectorContainer');
        const selectEl = document.getElementById('pgTecnicoSel');

        if (data.puede_ver_todos || data.es_jefe_area) {
            selectorContainer.style.display = 'block';
            const opciones = ['<option value="">Todos</option>'];
            (data.tecnicos || []).forEach(t => {
                const nombre = t.tecnico_nombre + (t.area_nombre ? ` (${t.area_nombre})` : '');
                opciones.push(`<option value="${t.tecnico_id}">${nombre}</option>`);
            });
            selectEl.innerHTML = opciones.join('');
        } else {
            selectorContainer.style.display = 'none';
        }

        if (!data.tecnicos || !data.tecnicos.length) {
            list.innerHTML = `<div class="es" style="padding:40px 20px;">
                <i class="fas fa-users" style="font-size:40px;opacity:0.4;margin-bottom:12px;display:block;"></i>
                <p style="font-size:13px;color:#e6e6f4;font-weight:600;">No hay técnicos para mostrar</p>
                <p style="font-size:11px;color:#7c7ca8;margin-top:4px;">Prueba con otro rango de fechas</p>
            </div>`;
            return;
        }

        list.innerHTML = data.tecnicos.map(t => {
            const netoColor = t.neto >= 0 ? 'var(--green)' : 'var(--red)';
            const netoAbs = Math.abs(t.neto).toFixed(2);
            const netoSigno = t.neto < 0 ? '-' : '';
            const areaBadge = t.area_nombre
                ? `<div style="font-size:9px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px;">${t.area_nombre}</div>`
                : '';

            return `<div class="oi" style="cursor:pointer; border-left:3px solid ${netoColor};" onclick="window.pgVerDetalle(${t.tecnico_id})">
                <div class="ot">
                    <div class="oid">${t.tecnico_nombre}</div>
                    <div class="os" style="background:${netoColor}20;color:${netoColor};">
                        ${netoSigno}$${netoAbs}
                    </div>
                </div>
                ${areaBadge}
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11px;">
                    <span style="color:var(--green);">
                        <i class="fas fa-plus-circle"></i> +$${t.pagos_normales.toFixed(2)}
                    </span>
                    <span style="color:var(--red);">
                        <i class="fas fa-minus-circle"></i> -$${Math.abs(t.penalizaciones).toFixed(2)}
                    </span>
                    <span style="color:var(--text-dim);">
                        ${t.total_ordenes} orden${t.total_ordenes === 1 ? '' : 'es'}
                    </span>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error('❌ Error al cargar pagos:', err);
        list.innerHTML = `<div class="es" style="padding:40px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size:40px;opacity:0.4;margin-bottom:12px;display:block;color:var(--red);"></i>
            <p style="font-size:13px;color:var(--red);font-weight:600;">Error al cargar</p>
            <p style="font-size:11px;color:var(--text-dim);margin-top:4px;">${err.message}</p>
        </div>`;
    }
}

window.rPG = rPG;

// ============================================================
// VER DETALLE DE UN TÉCNICO
// ============================================================
window.pgVerDetalle = async function(tecnicoId) {
    pgTecnicoId = tecnicoId;

    const selectEl = document.getElementById('pgTecnicoSel');
    if (selectEl) selectEl.value = String(tecnicoId);

    const detalleEl = document.getElementById('pgDetalle');
    if (!detalleEl) return;

    detalleEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-dim);">
        <i class="fas fa-spinner fa-spin"></i> Cargando detalle...
    </div>`;
    detalleEl.style.display = 'block';

    try {
        const { api } = await import('../core/api.js');
        const data = await api.getResumenPagos(pgDesde, pgHasta, tecnicoId);

        // 🔥 FIX: buscar el técnico correcto por id (no tomar el primero)
        const tecnico = (data.tecnicos || []).find(t => String(t.tecnico_id) === String(tecnicoId));

        if (!tecnico) {
            detalleEl.innerHTML = '<p style="color:var(--red); padding:12px;">No encontrado</p>';
            return;
        }

        const detalle = data.detalle || [];
        const netoColor = tecnico.neto >= 0 ? 'var(--green)' : 'var(--red)';

        let detalleHtml = '';
        if (!detalle.length) {
            detalleHtml = `<p style="text-align:center; color:var(--text-dim); padding:20px;">Sin movimientos en este período</p>`;
        } else {
            detalleHtml = detalle.map(d => {
                const esPen = d.tipo === 'penalizacion';
                const esVenta = d.tipo === 'comision_venta';
                const color = esPen ? 'var(--red)' : (esVenta ? 'var(--cyan)' : 'var(--green)');
                const signo = esPen ? '' : '+';
                const icono = esPen ? 'fa-minus-circle' : (esVenta ? 'fa-shopping-cart' : 'fa-check-circle');
                const fecha = new Date(d.fecha).toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });

                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:12px; color:var(--text); font-weight:600;">
                            <i class="fas ${icono}" style="color:${color}; margin-right:4px;"></i>
                            ${d.orden_codigo || (esPen ? 'Penalización' : 'Pago')}
                        </div>
                        <div style="font-size:10px; color:var(--text-dim);">${fecha}${d.notas ? ' · ' + d.notas : ''}</div>
                    </div>
                    <div style="font-size:13px; font-weight:800; color:${color}; margin-left:8px;">
                        ${signo}$${Math.abs(d.monto_final).toFixed(2)}
                    </div>
                </div>`;
            }).join('');
        }

        detalleEl.innerHTML = `
            <div style="background:var(--surface-2); border-radius:10px; padding:12px; margin-top:12px; border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div>
                        <p style="font-size:12px; color:var(--text); font-weight:700;">${tecnico.tecnico_nombre}</p>
                        <p style="font-size:10px; color:var(--text-dim);">${tecnico.area_nombre || ''}</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="font-size:9px; color:var(--text-dim); text-transform:uppercase;">Neto del período</p>
                        <p style="font-size:18px; font-weight:900; color:${netoColor};">$${tecnico.neto.toFixed(2)}</p>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid var(--border); font-size:11px;">
                    <span style="color:var(--green);">+ Pagos: $${tecnico.pagos_normales.toFixed(2)}</span>
                    <span style="color:var(--red);">- Penalizaciones: $${Math.abs(tecnico.penalizaciones).toFixed(2)}</span>
                </div>
                <div style="margin-top:12px;">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; font-weight:700; margin-bottom:8px;">Movimientos</p>
                    ${detalleHtml}
                </div>
                <button class="bp" style="background:var(--surface); margin-top:12px;" onclick="window.pgCerrarDetalle()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        `;
    } catch (err) {
        console.error('❌ Error al cargar detalle:', err);
        detalleEl.innerHTML = `<p style="color:var(--red); padding:12px;">Error: ${err.message}</p>`;
    }
};

window.pgCerrarDetalle = function() {
    const detalleEl = document.getElementById('pgDetalle');
    if (detalleEl) {
        detalleEl.style.display = 'none';
        detalleEl.innerHTML = '';
    }
    pgTecnicoId = null;
    const selectEl = document.getElementById('pgTecnicoSel');
    if (selectEl) selectEl.value = '';
};

window.rPGDetalle = function() {
    const selectEl = document.getElementById('pgTecnicoSel');
    if (!selectEl) return;
    const id = selectEl.value;
    if (id) {
        window.pgVerDetalle(parseInt(id));
    } else {
        window.pgCerrarDetalle();
    }
};

// ============================================================
// TABS
// ============================================================
function setupTabs() {
    const container = document.getElementById('finSN');
    if (!container) return;

    container.addEventListener('click', function(e) {
        const tb = e.target.closest('.st');
        if (!tb) return;
        e.stopPropagation();

        const newSub = tb.dataset.s;
        if (newSub === finSub) return;

        finSub = newSub;
        container.querySelectorAll('.st').forEach(t => t.classList.remove('active'));
        tb.classList.add('active');

        const viewResumen = document.getElementById('finViewResumen');
        const viewPagos = document.getElementById('finViewPagos');

        if (newSub === 'resumen') {
            viewResumen.style.display = 'block';
            viewPagos.style.display = 'none';
            renderResumenGeneral();
        } else if (newSub === 'pagos') {
            viewResumen.style.display = 'none';
            viewPagos.style.display = 'block';
            rPG();
        }
    });
}

// ============================================================
// INICIALIZACIÓN
// 🔥 FIX: resetea el estado del tab cada vez que se entra al módulo
// ============================================================
export function initFinanzas() {
    (async () => {
        await store.init();

        // 🔥 Resetear estado del tab cada vez que se entra
        finSub = 'resumen';

        const viewResumen = document.getElementById('finViewResumen');
        const viewPagos = document.getElementById('finViewPagos');
        if (viewResumen) viewResumen.style.display = 'block';
        if (viewPagos) viewPagos.style.display = 'none';

        const container = document.getElementById('finSN');
        if (container) {
            container.querySelectorAll('.st').forEach(t => {
                t.classList.toggle('active', t.dataset.s === 'resumen');
            });
        }

        pgTecnicoId = null;

        initFechaFiltros();
        setupTabs();
        renderResumenGeneral();
        router.updateFAB();
        console.log('✅ Módulo Finanzas inicializado');
    })();
}

export default {
    init: initFinanzas,
    rPG,
};