// ============================================================
// MÓDULO ÓRDENES DE SERVICIO
// ============================================================
import { store } from '../core/store.js';
import { utils } from '../core/utils.js';
import { router } from '../core/router.js';

let oSub = 'todas';
let oAreaFiltro = 'Todas';

// 🔥 Solo DEF no maneja garantía (VENTA sí maneja)
const TIPOS_SIN_GARANTIA = ['DEF'];

// ============================================================
// HELPER: VALIDAR UUID (mismo formato que el backend)
// ============================================================
function esUuidValido(val) {
    return typeof val === 'string' && val.length === 36 && val.includes('-');
}

// ============================================================
// HELPER: REDONDEAR A 2 DECIMALES
// ============================================================
function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// ============================================================
// HELPERS DE ESTADO
// ============================================================
function getEstadoColor(estado) {
    const colors = {
        'pendiente_asignacion': '#7c7ca8',
        'pendiente_solucion': '#ffab00',
        'trabajo_en_ejecucion': '#448aff',
        'trabajo_terminado': '#00e676',
        'en_garantia': '#22d3ee',
        'garantia_terminada': '#00e676',
        'solucionado': '#00e676',
        'sin_solucion': '#ff5252',
        'entregado': '#00e676',
        'cancelada': '#4a4a72',
    };
    return colors[estado] || '#7c7ca8';
}

function getEstadoLabel(estado) {
    const labels = {
        'pendiente_asignacion': 'Pendiente asignación',
        'pendiente_solucion': 'Pendiente solución',
        'trabajo_en_ejecucion': 'En proceso',
        'trabajo_terminado': 'Terminado',
        'en_garantia': 'En garantía',
        'garantia_terminada': 'Gar. terminada',
        'solucionado': 'Solucionado',
        'sin_solucion': 'Sin solución',
        'entregado': 'Entregado',
        'cancelada': 'Cancelada',
    };
    return labels[estado] || estado;
}

function getTipoTrabajoLabel(tipo) {
    const labels = {
        'DEF': 'Solo defectación compleja',
        'MTTO': 'Mantenimiento',
        'REP': 'Reparación',
        'MODF': 'Modificación',
        'VENTA': 'Venta directa',
    };
    return labels[tipo] || tipo;
}

const ESTADOS_QUE_REQUIEREN_TECNICO = [
    'pendiente_solucion',
    'trabajo_en_ejecucion',
    'trabajo_terminado',
    'en_garantia',
    'garantia_terminada',
    'solucionado',
    'sin_solucion',
    'entregado',
];

// ============================================================
// RENDERIZAR FILTRO DE ÁREAS
// ============================================================
export function rOAreas() {
    const container = document.getElementById('oAreaPills');
    if (!container) return;

    const areas = ['Todas', ...(store.areas || [])];

    container.innerHTML = areas.map(a => {
        return `<button class="pi${a === oAreaFiltro ? ' active' : ''}" 
                onclick="window.dispatchEvent(new CustomEvent('ordenes:setArea', { detail: '${a}' }))">${a}</button>`;
    }).join('');
}

// ============================================================
// RENDERIZAR LISTA
// ============================================================
export async function rO() {
    if (!store._initialized) {
        await store.init();
    }

    const ordenes = store.getOrdenes();

    const stats = {
        total: ordenes.length,
        pendientes: ordenes.filter(o => o.estado === 'pendiente_asignacion' || o.estado === 'pendiente_solucion').length,
        en_proceso: ordenes.filter(o => o.estado === 'trabajo_en_ejecucion').length,
        garantia: ordenes.filter(o => o.estado === 'en_garantia').length,
    };

    const elTotal = document.getElementById('oTotal');
    const elPend = document.getElementById('oPendientes');
    const elProc = document.getElementById('oEnProceso');
    const elGar = document.getElementById('oGarantia');
    if (elTotal) elTotal.textContent = stats.total;
    if (elPend) elPend.textContent = stats.pendientes;
    if (elProc) elProc.textContent = stats.en_proceso;
    if (elGar) elGar.textContent = stats.garantia;

    let filtradas = ordenes;
    if (oSub === 'pendientes') {
        filtradas = ordenes.filter(o => o.estado === 'pendiente_asignacion' || o.estado === 'pendiente_solucion');
    } else if (oSub === 'en_proceso') {
        filtradas = ordenes.filter(o => o.estado === 'trabajo_en_ejecucion');
    } else if (oSub === 'garantia') {
        filtradas = ordenes.filter(o => o.estado === 'en_garantia' || o.estado === 'garantia_terminada');
    }

    if (oAreaFiltro !== 'Todas') {
        filtradas = filtradas.filter(o => (o.area_nombre || '') === oAreaFiltro);
    }

    const searchInput = document.getElementById('oSrch');
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

    filtradas = filtradas.slice().sort((a, b) => {
        const da = new Date(a.fecha_creacion || a.createdAt || 0);
        const db = new Date(b.fecha_creacion || b.createdAt || 0);
        return db - da;
    });

    renderOrdenesList(filtradas);
}

window.rO = rO;

function renderOrdenesList(ordenes) {
    const list = document.getElementById('oList');
    if (!list) return;

    if (!ordenes.length) {
        list.innerHTML = `
            <div class="es" style="padding:40px 20px;">
                <i class="fas fa-clipboard-list" style="font-size:40px;opacity:0.4;margin-bottom:12px;display:block;"></i>
                <p style="font-size:13px;color:#e6e6f4;font-weight:600;">No hay órdenes</p>
                <p style="font-size:11px;color:#7c7ca8;margin-top:4px;">Crea una nueva orden con el botón +</p>
            </div>
        `;
        return;
    }

    list.innerHTML = ordenes.map(o => {
        const estadoColor = getEstadoColor(o.estado);
        const estadoLabel = getEstadoLabel(o.estado);
        const clienteNombre = o.cliente_nombre || 'Sin cliente';
        const equipo = [o.equipo_marca, o.equipo_modelo].filter(Boolean).join(' ') || o.equipo_tipo || 'Sin equipo';
        const monto = parseFloat(o.is_ingreso || 0);
        const fecha = (o.fecha_creacion || '').substring(0, 10);
        const esVenta = o.tipo_trabajo === 'VENTA';
        const tipoIcon = esVenta ? '<i class="fas fa-shopping-cart" style="font-size:9px;color:var(--green);margin-left:4px;"></i>' : '';

        return `<div class="oi" onclick="window.verOrden('${o.id}')">
            <div class="ot">
                <div class="oid">${o.codigo || 'OS-???'} ${tipoIcon}</div>
                <div class="os" style="background:${estadoColor}20;color:${estadoColor};">${estadoLabel}</div>
            </div>
            <div class="ocl">${clienteNombre}</div>
            <div class="osv">${equipo}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                <div class="odt"><i class="far fa-calendar"></i> ${fecha}</div>
                <div style="font-size:12px;font-weight:800;color:var(--green);">$${monto.toFixed(2)}</div>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// VER DETALLE COMPLETO
// ============================================================
window.verOrden = async function(id) {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === id);
    if (!orden) {
        utils.showToast('Orden no encontrada');
        return;
    }

    const estadoColor = getEstadoColor(orden.estado);
    const estadoLabel = getEstadoLabel(orden.estado);
    const tipoLabel = getTipoTrabajoLabel(orden.tipo_trabajo);
    const clienteNombre = orden.cliente_nombre || 'Sin cliente';
    const clienteTel = orden.cliente_telefono || '';
    const sinGarantia = TIPOS_SIN_GARANTIA.includes(orden.tipo_trabajo);
    const esVenta = orden.tipo_trabajo === 'VENTA';
    const enGarantia = ['en_garantia', 'garantia_terminada'].includes(orden.estado);

    const puedeQuitarMateriales = orden.estado === 'trabajo_en_ejecucion';

    const materiales = orden.materiales || [];
    const materialesHtml = materiales.length
        ? materiales.map(m => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; color:var(--text); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.producto_nombre || 'Producto'}</div>
                    <div style="font-size:10px; color:var(--text-dim);">${parseFloat(m.cantidad).toFixed(2)} × $${parseFloat(m.costo_unitario).toFixed(4)}</div>
                </div>
                <div style="font-size:12px; font-weight:700; color:var(--green); margin-left:8px;">$${parseFloat(m.subtotal).toFixed(2)}</div>
                ${puedeQuitarMateriales ? `
                <button onclick="window.quitarMaterialOrden('${orden.id}', '${m.id}')" 
                        style="background:transparent; border:none; color:var(--red); cursor:pointer; padding:4px; margin-left:4px; font-size:14px;"
                        title="Quitar material">
                    <i class="fas fa-times-circle"></i>
                </button>` : ''}
            </div>
        `).join('')
        : '<p style="font-size:11px; color:var(--text-dim); text-align:center; padding:12px 0;">Sin materiales registrados</p>';

    const fmtDate = (d) => d ? new Date(d).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';

    let accionesHtml = '';

    const puedeAsignar = !orden.tecnico_id && !['entregado', 'cancelada', 'solucionado'].includes(orden.estado);
    const puedeAgregarMaterial = !!orden.tecnico_id && orden.estado === 'trabajo_en_ejecucion';
    const puedeCambiarEstado = !['entregado', 'cancelada', 'solucionado'].includes(orden.estado) && !enGarantia;
    const puedeCerrar = !!orden.tecnico_id && ['trabajo_en_ejecucion', 'trabajo_terminado'].includes(orden.estado);
    const puedeReabrir = !sinGarantia && ['en_garantia', 'garantia_terminada'].includes(orden.estado);

    const puedeResolverGarantia =
        !!orden.tecnico_id &&
        orden.estado === 'trabajo_en_ejecucion' &&
        (orden.veces_reabierta || 0) > 0;

    if (puedeAsignar) {
        accionesHtml += `
            <button class="bp" onclick="window.oOAsignar('${orden.id}')" style="background:var(--cyan); flex:1; min-width:100px;">
                <i class="fas fa-user-check"></i> Asignar técnico
            </button>
        `;
    }
    if (puedeAgregarMaterial && !esVenta) {
        accionesHtml += `
            <button class="bp" onclick="window.oOAddMaterial('${orden.id}')" style="background:var(--blue); flex:1; min-width:100px;">
                <i class="fas fa-plus-circle"></i> Agregar material
            </button>
        `;
    }
    if (puedeCambiarEstado) {
        accionesHtml += `
            <button class="bp" onclick="window.oOCambiarEstado('${orden.id}')" style="background:var(--purple); flex:1; min-width:100px;">
                <i class="fas fa-exchange-alt"></i> Cambiar estado
            </button>
        `;
    }
    if (puedeCerrar && !puedeResolverGarantia) {
        accionesHtml += `
            <button class="bp" onclick="window.oOCerrar('${orden.id}')" style="background:var(--green); flex:1; min-width:100px;">
                <i class="fas fa-check-circle"></i> Cerrar orden
            </button>
        `;
    }
    if (puedeResolverGarantia) {
        accionesHtml += `
            <button class="bp" onclick="window.oOResolverGarantia('${orden.id}')" style="background:var(--red); flex:1; min-width:100px;">
                <i class="fas fa-shield-alt"></i> Resolver garantía
            </button>
        `;
    }
    if (puedeReabrir) {
        accionesHtml += `
            <button class="bp" onclick="window.oOReabrir('${orden.id}')" style="background:var(--amber); flex:1; min-width:100px;">
                <i class="fas fa-redo"></i> Reabrir por garantía
            </button>
        `;
    }

    let avisoSinTecnico = '';
    if (!orden.tecnico_id && !['entregado', 'cancelada', 'solucionado'].includes(orden.estado)) {
        avisoSinTecnico = `
            <div style="margin-top:16px; padding:10px; background:var(--amber-bg); border:1px solid var(--amber); border-radius:10px;">
                <p style="font-size:11px; color:var(--amber); font-weight:600;">
                    <i class="fas fa-exclamation-triangle"></i> Esta orden no tiene técnico asignado
                </p>
                <p style="font-size:10px; color:var(--text-dim); margin-top:4px;">
                    Asigna un técnico para poder trabajar en ella.
                </p>
            </div>
        `;
    }

    let avisoGarantiaReabierta = '';
    if (puedeResolverGarantia) {
        avisoGarantiaReabierta = `
            <div style="margin-top:16px; padding:10px; background:var(--red-bg); border:1px solid var(--red); border-radius:10px;">
                <p style="font-size:11px; color:var(--red); font-weight:600;">
                    <i class="fas fa-shield-alt"></i> Esta orden fue reabierta por garantía
                </p>
                <p style="font-size:10px; color:var(--text-dim); margin-top:4px;">
                    Al terminar, usa "Resolver garantía" para declarar qué materiales se recuperaron y cuáles se perdieron.
                    No puedes cerrarla por el flujo normal.
                </p>
            </div>
        `;
    }

    let avisoEnGarantia = '';
    if (enGarantia) {
        avisoEnGarantia = `
            <div style="margin-top:16px; padding:10px; background:var(--green-bg); border:1px solid var(--green); border-radius:10px;">
                <p style="font-size:11px; color:var(--green); font-weight:600;">
                    <i class="fas fa-shield-alt"></i> Orden en garantía
                </p>
                <p style="font-size:10px; color:var(--text-dim); margin-top:4px;">
                    Si el cliente vuelve con un problema, usa "Reabrir por garantía".
                </p>
            </div>
        `;
    }

    const tecnicoDisplay = orden.tecnico_nombre
        || (orden.tecnico_id ? `Técnico #${orden.tecnico_id}` : 'Sin asignar');

    const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div>
                <p class="mt" style="margin-bottom:4px;"><i class="fas fa-clipboard-list"></i> ${orden.codigo || 'OS-???'}</p>
                <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">${tipoLabel}</div>
            </div>
            <div class="os" style="background:${estadoColor}20; color:${estadoColor}; font-size:9px;">${estadoLabel}</div>
        </div>

        ${avisoSinTecnico}
        ${avisoGarantiaReabierta}
        ${avisoEnGarantia}

        <div class="dr">
            <span class="dl">Cliente</span>
            <span class="dv">${clienteNombre}</span>
        </div>
        ${clienteTel ? `
        <div class="dr">
            <span class="dl">Teléfono</span>
            <span class="dv">${clienteTel}</span>
        </div>` : ''}

        ${!esVenta ? `
        <div class="dr">
            <span class="dl">Equipo</span>
            <span class="dv">${orden.equipo_tipo || 'Sin especificar'}</span>
        </div>
        ${orden.equipo_marca ? `
        <div class="dr">
            <span class="dl">Marca</span>
            <span class="dv">${orden.equipo_marca}</span>
        </div>` : ''}
        ${orden.equipo_modelo ? `
        <div class="dr">
            <span class="dl">Modelo</span>
            <span class="dv">${orden.equipo_modelo}</span>
        </div>` : ''}
        ` : ''}

        <div class="dr">
            <span class="dl">Área</span>
            <span class="dv">${orden.area_nombre || 'Sin asignar'}</span>
        </div>
        <div class="dr">
            <span class="dl">Técnico</span>
            <span class="dv">${tecnicoDisplay}</span>
        </div>
        ${orden.jefe_asigno_nombre ? `
        <div class="dr">
            <span class="dl">Asignado por</span>
            <span class="dv">${orden.jefe_asigno_nombre}</span>
        </div>` : ''}

        <div class="dr">
            <span class="dl">Creada</span>
            <span class="dv" style="font-size:11px;">${fmtDate(orden.fecha_creacion)}</span>
        </div>
        ${orden.fecha_inicio_trabajo ? `
        <div class="dr">
            <span class="dl">Iniciada</span>
            <span class="dv" style="font-size:11px;">${fmtDate(orden.fecha_inicio_trabajo)}</span>
        </div>` : ''}
        ${orden.fecha_fin_trabajo ? `
        <div class="dr">
            <span class="dl">Terminada</span>
            <span class="dv" style="font-size:11px;">${fmtDate(orden.fecha_fin_trabajo)}</span>
        </div>` : ''}
        ${orden.fecha_cierre ? `
        <div class="dr">
            <span class="dl">Cerrada</span>
            <span class="dv" style="font-size:11px;">${fmtDate(orden.fecha_cierre)}</span>
        </div>` : ''}

        ${orden.notas_cliente ? `
        <div style="margin-top:14px; padding:10px; background:var(--bg); border-radius:8px;">
            <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase; margin-bottom:4px;">Notas del cliente</div>
            <div style="font-size:12px; color:var(--text);">${orden.notas_cliente}</div>
        </div>` : ''}

        ${orden.notas_tecnico ? `
        <div style="margin-top:14px; padding:10px; background:var(--bg); border-radius:8px;">
            <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase; margin-bottom:4px;">Notas del técnico</div>
            <div style="font-size:12px; color:var(--text); white-space:pre-line;">${orden.notas_tecnico}</div>
        </div>` : ''}

        <div style="margin-top:16px;">
            <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; font-weight:700;">
                <i class="fas fa-boxes"></i> ${esVenta ? 'Producto vendido' : 'Materiales usados'}
            </p>
            <div style="background:var(--bg); border-radius:10px; padding:10px;">
                ${materialesHtml}
                ${materiales.length ? `
                <div style="display:flex; justify-content:space-between; padding:10px 0 0; border-top:1px solid var(--border); margin-top:8px;">
                    <span style="font-size:11px; color:var(--text-dim);">${esVenta ? 'Precio venta' : 'Subtotal (CTMU)'}</span>
                    <span style="font-size:13px; font-weight:800; color:var(--green);">$${parseFloat(orden.ctmu || 0).toFixed(2)}</span>
                </div>` : ''}
            </div>
        </div>

        <div style="margin-top:16px;">
            <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; font-weight:700;">
                <i class="fas fa-dollar-sign"></i> Costos y pagos
            </p>
            <div style="background:var(--bg); border-radius:10px; padding:10px;">
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Ingreso del servicio (IS)</span>
                    <span style="font-size:12px; font-weight:700; color:var(--text);">$${parseFloat(orden.is_ingreso || 0).toFixed(2)}</span>
                </div>
                ${!esVenta ? `
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Costo insumos (CIS)</span>
                    <span style="font-size:12px; font-weight:700; color:var(--text);">$${parseFloat(orden.cis || 0).toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Total material usado (TMU)</span>
                    <span style="font-size:12px; font-weight:700; color:var(--text);">${parseFloat(orden.tmu || 0).toFixed(2)} uds</span>
                </div>
                ` : ''}
                ${parseFloat(orden.penalizacion || 0) > 0 ? `
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Penalización</span>
                    <span style="font-size:12px; font-weight:700; color:var(--red);">-$${parseFloat(orden.penalizacion).toFixed(2)}</span>
                </div>` : ''}
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-top:1px solid var(--border); margin-top:4px; padding-top:8px;">
                    <span style="font-size:11px; color:var(--text); font-weight:600;">${esVenta ? 'Comisión del técnico' : 'Pago al técnico'}</span>
                    <span style="font-size:13px; font-weight:800; color:var(--green);">$${parseFloat(orden.pago_tecnico_final || orden.pago_tecnico_calculado || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>

        ${!sinGarantia && orden.garantia_dias > 0 ? `
        <div style="margin-top:16px;">
            <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; font-weight:700;">
                <i class="fas fa-shield-alt"></i> Garantía
            </p>
            <div style="background:var(--bg); border-radius:10px; padding:10px;">
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Días de garantía</span>
                    <span style="font-size:12px; font-weight:700; color:var(--cyan);">${orden.garantia_dias}</span>
                </div>
                ${orden.fecha_fin_garantia ? `
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Vence</span>
                    <span style="font-size:12px; font-weight:700; color:var(--text);">${fmtDate(orden.fecha_fin_garantia)}</span>
                </div>` : ''}
                ${orden.veces_reabierta > 0 ? `
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:11px; color:var(--text-dim);">Reabierta</span>
                    <span style="font-size:12px; font-weight:700; color:var(--amber);">${orden.veces_reabierta} vez/veces</span>
                </div>` : ''}
            </div>
        </div>` : ''}

        ${accionesHtml ? `
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">
            ${accionesHtml}
        </div>` : ''}
    `;

    utils.openModal(html);
};

// ============================================================
// ASIGNAR TÉCNICO
// 🔥 FIX: resolver área a UUID válido antes de pedir técnicos.
// ============================================================
window.oOAsignar = async function(ordenId) {
    await store.init();
    let orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    // 🔥 FIX: resolver el área a un UUID válido
    let areaId = orden.area;

    if (!areaId || !esUuidValido(areaId)) {
        // Intentar buscar el área por nombre en el store
        let areaObj = (store.getAreas() || []).find(a => a.nombre === orden.area_nombre);
        if (areaObj && esUuidValido(areaObj.id)) {
            areaId = areaObj.id;
        } else {
            // Forzar syncPull para obtener los UUIDs reales del backend
            utils.showToast('⏳ Actualizando áreas...');
            try {
                const { api } = await import('../core/api.js');
                const data = await api.syncPull();
                store.applyServerData(data);

                // Reintentar después del sync
                orden = store.getOrdenes().find(o => o.id === ordenId);
                areaObj = (store.getAreas() || []).find(a => a.nombre === orden.area_nombre);
                if (areaObj && esUuidValido(areaObj.id)) {
                    areaId = areaObj.id;
                    // Actualizar la orden local con el UUID del área
                    orden.area = areaId;
                    store.saveData();
                } else {
                    utils.showToast('❌ No se pudo obtener el área. Contacta al admin.');
                    return;
                }
            } catch (e) {
                console.error('Error al sincronizar áreas:', e);
                utils.showToast('❌ Sin conexión. Sincroniza primero para asignar técnicos');
                return;
            }
        }
    }

    let tecnicos = [];
    try {
        const { api } = await import('../core/api.js');
        tecnicos = await api.getTecnicos(areaId);
    } catch (e) {
        console.error('Error al cargar técnicos:', e);
        utils.showToast('❌ No se pudieron cargar los técnicos');
        return;
    }

    if (!tecnicos || !tecnicos.length) {
        utils.showToast('No hay técnicos en esta área');
        return;
    }

    const opciones = tecnicos.map(t => 
        `<option value="${t.id}">${t.nombre} (${t.rol === 'jefe_area' ? 'Jefe' : 'Técnico'})</option>`
    ).join('');

    const html = `
        <p class="mt"><i class="fas fa-user-check"></i> Asignar técnico</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong> — Área: <strong style="color:var(--blue);">${orden.area_nombre || orden.area}</strong>
        </p>

        <div style="margin:10px 0; padding:10px; background:var(--amber-bg); border:1px solid var(--amber); border-radius:8px;">
            <p style="font-size:10px; color:var(--amber); font-weight:600;">
                <i class="fas fa-info-circle"></i> El técnico debe cerrar su orden activa antes de tomar otra.
            </p>
        </div>

        <form id="asignarForm" onsubmit="window.guardarAsignacion(event, '${ordenId}')">
            <div class="fg_">
                <label>Técnico *</label>
                <select id="tecnicoId" required>
                    <option value="">Selecciona un técnico...</option>
                    ${opciones}
                </select>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <button type="submit" class="bp" style="background:var(--green); flex:2;">
                    <i class="fas fa-check"></i> Asignar
                </button>
            </div>
        </form>
    `;
    utils.openModal(html);
};

window.guardarAsignacion = async function(e, ordenId) {
    e.preventDefault();

    const selectEl = document.getElementById('tecnicoId');
    const tecnicoId = selectEl ? selectEl.value : '';
    if (!tecnicoId) {
        utils.showToast('Selecciona un técnico');
        return;
    }

    const optSel = selectEl.options[selectEl.selectedIndex];
    const tecnicoNombreLocal = optSel ? optSel.textContent.split(' (')[0].trim() : '';

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    try {
        const { api } = await import('../core/api.js');
        const result = await api.request('POST', `/api/ordenes/${ordenId}/asignar/`, {
            tecnico_id: tecnicoId,
        });

        if (result && result.id) {
            Object.assign(orden, {
                tecnico_id: result.tecnico_id,
                tecnico_nombre: result.tecnico_nombre || tecnicoNombreLocal,
                jefe_asigno_id: result.jefe_asigno_id,
                jefe_asigno_nombre: result.jefe_asigno_nombre || '',
                fecha_asignacion: result.fecha_asignacion,
                estado: result.estado,
                syncStatus: 'synced',
                version: result.version || orden.version,
            });
            store.saveData();
            window.sync?.emitState();

            rO();
            await window.verOrden(ordenId);
            utils.showToast('✅ Técnico asignado');
        }
    } catch (err) {
        if (err.message && err.message.includes('cerrar')) {
            utils.showToast('❌ ' + err.message);
        } else {
            console.warn('⚠️ Sin conexión o error, guardando local:', err);
            orden.tecnico_id = tecnicoId;
            orden.tecnico_nombre = tecnicoNombreLocal;
            orden.estado = 'pendiente_solucion';
            orden.fecha_asignacion = new Date().toISOString();
            orden.syncStatus = 'pending';
            orden.updatedAt = new Date().toISOString();
            orden.version = (orden.version || 1) + 1;
            store.saveData();
            window.sync?.emitState();
            rO();
            await window.verOrden(ordenId);
            utils.showToast('✅ Técnico asignado (offline)');
        }
    }
};

// ============================================================
// CAMBIAR ESTADO
// ============================================================
window.oOCambiarEstado = async function(ordenId) {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    const sinGarantia = TIPOS_SIN_GARANTIA.includes(orden.tipo_trabajo);

    const esReabierta = (orden.veces_reabierta || 0) > 0 && orden.estado === 'trabajo_en_ejecucion';

    let estados = [
        { v: 'pendiente_asignacion', l: 'Pendiente asignación' },
        { v: 'pendiente_solucion', l: 'Pendiente solución' },
        { v: 'trabajo_en_ejecucion', l: 'Trabajo en ejecución' },
        { v: 'trabajo_terminado', l: 'Trabajo terminado' },
        { v: 'solucionado', l: 'Solucionado' },
        { v: 'sin_solucion', l: 'Sin solución' },
        { v: 'entregado', l: 'Entregado' },
        { v: 'cancelada', l: 'Cancelada' },
    ];

    if (sinGarantia) {
        estados = estados.filter(e => e.v !== 'en_garantia' && e.v !== 'garantia_terminada');
    }

    // 🔥 Si está en garantía, solo permitir garantia_terminada y cancelada
    if (['en_garantia', 'garantia_terminada'].includes(orden.estado)) {
        estados = estados.filter(e => ['garantia_terminada', 'cancelada'].includes(e.v));
    }

    // 🔥 Si fue reabierta, quitar trabajo_terminado
    if (esReabierta) {
        estados = estados.filter(e => e.v !== 'trabajo_terminado');
    }

    const opciones = estados.map(es => 
        `<option value="${es.v}" ${es.v === orden.estado ? 'selected' : ''}>${es.l}</option>`
    ).join('');

    const avisoSinTecnico = !orden.tecnico_id
        ? `<div style="margin:10px 0; padding:10px; background:var(--amber-bg); border:1px solid var(--amber); border-radius:8px;">
              <p style="font-size:10px; color:var(--amber); font-weight:600;">
                  <i class="fas fa-info-circle"></i> Esta orden no tiene técnico. Solo puedes usar "Pendiente asignación" o "Cancelada".
              </p>
           </div>`
        : '';

    const avisoSinGarantia = sinGarantia
        ? `<div style="margin:10px 0; padding:10px; background:var(--surface-2); border:1px solid var(--border); border-radius:8px;">
              <p style="font-size:10px; color:var(--text-dim); font-weight:600;">
                  <i class="fas fa-info-circle"></i> Este tipo de trabajo no maneja garantía.
              </p>
           </div>`
        : '';

    const avisoEnGarantia = ['en_garantia', 'garantia_terminada'].includes(orden.estado)
        ? `<div style="margin:10px 0; padding:10px; background:var(--green-bg); border:1px solid var(--green); border-radius:8px;">
              <p style="font-size:10px; color:var(--green); font-weight:600;">
                  <i class="fas fa-shield-alt"></i> Esta orden está en garantía. Solo puedes marcarla como "Gar. terminada" o cancelarla.
              </p>
           </div>`
        : '';

    const avisoReabierta = esReabierta
        ? `<div style="margin:10px 0; padding:10px; background:var(--red-bg); border:1px solid var(--red); border-radius:8px;">
              <p style="font-size:10px; color:var(--red); font-weight:600;">
                  <i class="fas fa-shield-alt"></i> Orden reabierta por garantía. Debes usar "Resolver garantía" para cerrar el ciclo.
              </p>
           </div>`
        : '';

    const html = `
        <p class="mt"><i class="fas fa-exchange-alt"></i> Cambiar estado</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong>
        </p>

        ${avisoSinTecnico}
        ${avisoSinGarantia}
        ${avisoEnGarantia}
        ${avisoReabierta}

        <form id="estadoForm" onsubmit="window.guardarEstado(event, '${ordenId}')">
            <div class="fg_">
                <label>Nuevo estado *</label>
                <select id="nuevoEstado" required>
                    ${opciones}
                </select>
            </div>

            <div class="fg_">
                <label>Notas (opcional)</label>
                <textarea id="estadoNotas" rows="2" placeholder="Motivo del cambio..."></textarea>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <button type="submit" class="bp" style="background:var(--blue); flex:2;">
                    <i class="fas fa-check"></i> Cambiar
                </button>
            </div>
        </form>
    `;
    utils.openModal(html);
};

window.guardarEstado = async function(e, ordenId) {
    e.preventDefault();

    const nuevoEstado = document.getElementById('nuevoEstado').value;
    const notas = document.getElementById('estadoNotas').value.trim();

    if (!nuevoEstado) return;

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    if (TIPOS_SIN_GARANTIA.includes(orden.tipo_trabajo) && 
        (nuevoEstado === 'en_garantia' || nuevoEstado === 'garantia_terminada')) {
        utils.showToast('❌ Este tipo de trabajo no maneja garantía');
        return;
    }

    if (['en_garantia', 'garantia_terminada'].includes(orden.estado) &&
        !['garantia_terminada', 'cancelada'].includes(nuevoEstado)) {
        utils.showToast('❌ Desde garantía solo puedes marcar "Gar. terminada" o cancelar');
        return;
    }

    if (nuevoEstado === 'trabajo_terminado' &&
        (orden.veces_reabierta || 0) > 0 &&
        orden.estado === 'trabajo_en_ejecucion') {
        utils.showToast('❌ Debes usar "Resolver garantía" para cerrar esta orden reabierta');
        return;
    }

    if (ESTADOS_QUE_REQUIEREN_TECNICO.includes(nuevoEstado) && !orden.tecnico_id) {
        utils.showToast('❌ Debes asignar un técnico antes de cambiar a este estado');
        return;
    }

    if (nuevoEstado === 'sin_solucion') {
        if (!orden.materiales || orden.materiales.length === 0) {
            if (!confirm('Esta orden no tiene materiales. ¿Marcar como sin solución de todas formas?')) {
                return;
            }
            orden.estado = 'sin_solucion';
            orden.fecha_cierre = new Date().toISOString();
            if (notas) {
                orden.notas_tecnico = (orden.notas_tecnico || '') + `\n[${new Date().toLocaleString()}] ${notas}`;
            }
            orden.syncStatus = 'pending';
            orden.updatedAt = new Date().toISOString();
            orden.version = (orden.version || 1) + 1;
            store.saveData();
            window.sync?.emitState();
            rO();
            await window.verOrden(ordenId);
            utils.showToast('✅ Orden marcada como sin solución');
            return;
        }
        window.oOResolverSinSolucion(ordenId, notas);
        return;
    }

    orden.estado = nuevoEstado;
    if (nuevoEstado === 'trabajo_en_ejecucion' && !orden.fecha_inicio_trabajo) {
        orden.fecha_inicio_trabajo = new Date().toISOString();
    }
    if (nuevoEstado === 'trabajo_terminado' && !orden.fecha_fin_trabajo) {
        orden.fecha_fin_trabajo = new Date().toISOString();
    }
    if (nuevoEstado === 'entregado') {
        orden.fecha_entrega = new Date().toISOString();
        orden.fecha_cierre = new Date().toISOString();
    }
    if (notas) {
        orden.notas_tecnico = (orden.notas_tecnico || '') + `\n[${new Date().toLocaleString()}] ${notas}`;
    }
    orden.syncStatus = 'pending';
    orden.updatedAt = new Date().toISOString();
    orden.version = (orden.version || 1) + 1;

    store.saveData();
    window.sync?.emitState();

    rO();
    await window.verOrden(ordenId);
    utils.showToast('✅ Estado actualizado');
};

// ============================================================
// AGREGAR MATERIAL
// ============================================================
window.oOAddMaterial = async function(ordenId) {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    if (!orden.tecnico_id) {
        utils.showToast('❌ Debes asignar un técnico antes de agregar materiales');
        return;
    }

    if (orden.estado !== 'trabajo_en_ejecucion') {
        utils.showToast('❌ Solo puedes agregar materiales en estado "Trabajo en ejecución"');
        return;
    }

    const productos = store.getProductosActivos();

    const opciones = productos.map(p => 
        `<option value="${p.id}">${p.n} (${p.area}) — $${p.cost.toFixed(2)} — Disp: ${p.q}</option>`
    ).join('');

    const html = `
        <p class="mt"><i class="fas fa-plus-circle"></i> Agregar material</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong>
        </p>

        <form id="addMaterialForm" onsubmit="window.guardarMaterialOrden(event, '${ordenId}')">
            <div class="fg_">
                <label>Producto *</label>
                <select id="matProductoId" required>
                    <option value="">Selecciona un producto...</option>
                    ${opciones}
                </select>
            </div>

            <div class="fg_">
                <label>Cantidad *</label>
                <input type="number" id="matCantidad" required min="0.01" step="0.01" value="1">
            </div>

            <div id="matInfo" style="margin-top:10px; padding:10px; background:var(--bg); border-radius:8px; font-size:12px; color:var(--text-dim); display:none;"></div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <button type="submit" class="bp" style="background:var(--blue); flex:2;">
                    <i class="fas fa-plus"></i> Agregar material
                </button>
            </div>
        </form>
    `;
    utils.openModal(html);

    setTimeout(() => {
        const select = document.getElementById('matProductoId');
        const info = document.getElementById('matInfo');
        if (select) {
            select.addEventListener('change', () => {
                const producto = productos.find(p => p.id === select.value);
                if (producto) {
                    info.style.display = 'block';
                    info.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <span>Stock disponible:</span>
                            <strong style="color:${producto.q > 0 ? 'var(--green)' : 'var(--red)'};">${producto.q} uds</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Costo unitario:</span>
                            <strong style="color:var(--text);">$${producto.cost.toFixed(4)}</strong>
                        </div>
                    `;
                } else {
                    info.style.display = 'none';
                }
            });
        }
    }, 100);
};

// ============================================================
// GUARDAR MATERIAL
// ============================================================
window.guardarMaterialOrden = async function(e, ordenId) {
    e.preventDefault();

    const productoId = document.getElementById('matProductoId').value;
    const cantidad = parseFloat(document.getElementById('matCantidad').value);

    if (!productoId || !cantidad || cantidad <= 0) {
        utils.showToast('Selecciona un producto y cantidad válida');
        return;
    }

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    const producto = store.getProductos().find(p => p.id === productoId);

    if (!orden || !producto) {
        utils.showToast('Datos no encontrados');
        return;
    }

    if (!orden.tecnico_id) {
        utils.showToast('❌ La orden debe tener un técnico asignado');
        return;
    }

    if (orden.estado !== 'trabajo_en_ejecucion') {
        utils.showToast('❌ Solo puedes agregar materiales en estado "Trabajo en ejecución"');
        return;
    }

    if (cantidad > producto.q) {
        utils.showToast(`Stock insuficiente (disponible: ${producto.q})`);
        return;
    }

    const costoUnitario = producto.cost;
    const subtotal = round2(costoUnitario * cantidad);

    const material = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'mat-' + Date.now() + '-' + Math.random(),
        producto_id: producto.id,
        producto_nombre: producto.n,
        cantidad: cantidad,
        costo_unitario: costoUnitario,
        subtotal: subtotal,
        createdAt: new Date().toISOString(),
    };

    if (!orden.materiales) orden.materiales = [];
    orden.materiales.push(material);

    producto.q -= cantidad;
    producto.updatedAt = new Date().toISOString();
    producto.version = (producto.version || 1) + 1;

    orden.tmu = orden.materiales.reduce((sum, m) => sum + parseFloat(m.cantidad), 0);
    orden.ctmu = round2(orden.materiales.reduce((sum, m) => sum + parseFloat(m.subtotal), 0));

    store.addMovimiento({
        t: 'salida',
        pi: producto.id,
        q: cantidad,
        pc: costoUnitario,
        dt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        r: `Uso en orden ${orden.codigo}`,
        ref: orden.codigo,
    });

    orden.updatedAt = new Date().toISOString();
    orden.version = (orden.version || 1) + 1;

    store.saveData();
    window.sync?.emitState();

    if (orden.syncStatus === 'synced') {
        try {
            const { api } = await import('../core/api.js');
            const result = await api.agregarMaterialOrden(ordenId, {
                id: material.id,
                producto_id: producto.id,
                cantidad: cantidad,
            });

            if (result && result.materiales) {
                orden.materiales = result.materiales.map(m => ({
                    id: m.id,
                    producto_id: m.producto_id,
                    producto_nombre: m.producto_nombre,
                    cantidad: parseFloat(m.cantidad),
                    costo_unitario: parseFloat(m.costo_unitario),
                    subtotal: parseFloat(m.subtotal),
                    createdAt: m.created_at || m.createdAt || new Date().toISOString(),
                }));
                orden.tmu = parseFloat(result.tmu) || 0;
                orden.ctmu = parseFloat(result.ctmu) || 0;
                orden.syncStatus = 'synced';
                producto.syncStatus = 'synced';
                store.saveData();
            }
        } catch (err) {
            console.error('❌ Error al agregar material en backend:', err);
            producto.syncStatus = 'pending';
            orden.syncStatus = 'pending';
            store.saveData();
            window.sync?.emitState();
        }
    } else {
        producto.syncStatus = 'pending';
        orden.syncStatus = 'pending';
        store.saveData();
        window.sync?.emitState();
    }

    rO();
    await window.verOrden(ordenId);

    utils.showToast(`✅ Material agregado: ${producto.n} × ${cantidad}`);
};

// ============================================================
// QUITAR MATERIAL
// ============================================================
window.quitarMaterialOrden = async function(ordenId, materialId) {
    if (!confirm('¿Quitar este material? Se devolverá al inventario.')) return;

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden || !orden.materiales) return;

    if (orden.estado !== 'trabajo_en_ejecucion') {
        utils.showToast('❌ Solo puedes quitar materiales en estado "Trabajo en ejecución"');
        return;
    }

    const idx = orden.materiales.findIndex(m => m.id === materialId);
    if (idx === -1) {
        utils.showToast('Material no encontrado');
        return;
    }

    const material = orden.materiales[idx];
    const producto = store.getProductos().find(p => p.id === material.producto_id);

    if (producto) {
        producto.q += parseFloat(material.cantidad);
        producto.updatedAt = new Date().toISOString();
        producto.version = (producto.version || 1) + 1;

        store.addMovimiento({
            t: 'entrada',
            pi: producto.id,
            q: parseFloat(material.cantidad),
            pc: parseFloat(material.costo_unitario),
            dt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            r: `Reverso de material de orden ${orden.codigo}`,
            ref: orden.codigo,
        });
    }

    orden.materiales.splice(idx, 1);

    orden.tmu = orden.materiales.reduce((sum, m) => sum + parseFloat(m.cantidad), 0);
    orden.ctmu = round2(orden.materiales.reduce((sum, m) => sum + parseFloat(m.subtotal), 0));
    orden.updatedAt = new Date().toISOString();
    orden.version = (orden.version || 1) + 1;

    store.saveData();
    window.sync?.emitState();

    if (orden.syncStatus === 'synced') {
        try {
            const { api } = await import('../core/api.js');
            const result = await api.quitarMaterialOrden(ordenId, materialId);

            if (result && result.materiales) {
                orden.materiales = result.materiales.map(m => ({
                    id: m.id,
                    producto_id: m.producto_id,
                    producto_nombre: m.producto_nombre,
                    cantidad: parseFloat(m.cantidad),
                    costo_unitario: parseFloat(m.costo_unitario),
                    subtotal: parseFloat(m.subtotal),
                    createdAt: m.created_at || m.createdAt || new Date().toISOString(),
                }));
                orden.tmu = parseFloat(result.tmu) || 0;
                orden.ctmu = parseFloat(result.ctmu) || 0;
                orden.syncStatus = 'synced';
                if (producto) producto.syncStatus = 'synced';
                store.saveData();
            }
        } catch (err) {
            console.error('❌ Error al quitar material en backend:', err);
            if (producto) producto.syncStatus = 'pending';
            orden.syncStatus = 'pending';
            store.saveData();
            window.sync?.emitState();
        }
    } else {
        if (producto) producto.syncStatus = 'pending';
        orden.syncStatus = 'pending';
        store.saveData();
        window.sync?.emitState();
    }

    window.verOrden(ordenId);
    utils.showToast('✅ Material devuelto al inventario');
};

// ============================================================
// CERRAR ORDEN
// ============================================================
window.oOCerrar = async function(ordenId) {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    if (!orden.tecnico_id) {
        utils.showToast('❌ Debes asignar un técnico antes de cerrar la orden');
        return;
    }

    if (!['trabajo_en_ejecucion', 'trabajo_terminado'].includes(orden.estado)) {
        utils.showToast('❌ Solo puedes cerrar una orden en estado "Trabajo en ejecución" o "Trabajo terminado"');
        return;
    }

    if ((orden.veces_reabierta || 0) > 0) {
        utils.showToast('❌ Esta orden fue reabierta por garantía. Usa "Resolver garantía"');
        return;
    }

    const cfg = store.getConfig() || {};
    let cisConfig = { DEF: 3, MTTO: 45, REP: 5, MODF: 25 };
    try {
        if (cfg.cis) cisConfig = JSON.parse(cfg.cis);
    } catch (e) {}

    const tipoTrabajo = orden.tipo_trabajo || 'REP';
    const cisAplicable = cisConfig[tipoTrabajo] || 0;
    const tmuActual = parseFloat(orden.tmu || 0);
    const ctmuActual = parseFloat(orden.ctmu || 0);
    const areaNombre = orden.area_nombre || 'Electricidad';
    const esBaterias = (areaNombre === 'Baterías');
    const sinGarantia = TIPOS_SIN_GARANTIA.includes(tipoTrabajo);

    const isSugerido = (tipoTrabajo === 'DEF') 
        ? parseFloat(cfg.defectacion_sola_monto || 15) 
        : 0;

    const garantiaHtml = !sinGarantia ? `
            <div class="fg_">
                <label>Días de garantía</label>
                <select id="cierreGarantia" onchange="window.actualizarPreviewCierre('${ordenId}')">
                    <option value="0">Sin garantía</option>
                    <option value="30" selected>30 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                    <option value="180">180 días</option>
                    <option value="365">1 año</option>
                </select>
            </div>
    ` : `
            <div style="margin:10px 0; padding:10px; background:var(--surface-2); border:1px solid var(--border); border-radius:8px;">
                <p style="font-size:11px; color:var(--text-dim); font-weight:600;">
                    <i class="fas fa-info-circle"></i> Este tipo de trabajo no maneja garantía.
                </p>
            </div>
            <input type="hidden" id="cierreGarantia" value="0">
    `;

    const html = `
        <p class="mt"><i class="fas fa-check-circle"></i> Cerrar orden</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong> — 
            Área: <strong style="color:var(--blue);">${areaNombre}</strong>
        </p>

        <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Material usado (TMU)</span>
                <strong style="color:var(--text);">${tmuActual.toFixed(2)} uds</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Costo material (CTMU)</span>
                <strong style="color:var(--text);">$${ctmuActual.toFixed(2)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Costo insumos (CIS)</span>
                <strong style="color:var(--amber);">$${cisAplicable.toFixed(2)}</strong>
            </div>
        </div>

        <form id="cerrarForm" onsubmit="window.guardarCierre(event, '${ordenId}')">

            <div class="fg_">
                <label>Ingreso del servicio (IS) * — lo que paga el cliente</label>
                <input type="number" id="cierreIS" required min="0" step="0.01" 
                       value="${isSugerido > 0 ? isSugerido.toFixed(2) : ''}"
                       placeholder="0.00" oninput="window.actualizarPreviewCierre('${ordenId}')">
            </div>

            ${garantiaHtml}

            <div id="previewCierre" style="margin:14px 0; padding:12px; background:var(--bg); border-radius:10px; border:1px solid var(--border); display:none;">
            </div>

            <div class="fg_">
                <label>Notas del técnico (opcional)</label>
                <textarea id="cierreNotas" rows="2" placeholder="Observaciones del trabajo..."></textarea>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <button type="submit" id="btnCerrarOrden" class="bp" style="background:var(--green); flex:2;">
                    <i class="fas fa-check"></i> Cerrar orden
                </button>
            </div>
        </form>
    `;
    utils.openModal(html);

    window._cierreData = {
        ordenId,
        areaNombre,
        esBaterias,
        tipoTrabajo,
        cisAplicable,
        tmuActual,
        ctmuActual,
        sinGarantia,
    };

    setTimeout(() => window.actualizarPreviewCierre(ordenId), 100);
};

window.actualizarPreviewCierre = function(ordenId) {
    const data = window._cierreData;
    if (!data) return;

    const isIngreso = parseFloat(document.getElementById('cierreIS')?.value) || 0;
    const previewEl = document.getElementById('previewCierre');
    const btnCerrar = document.getElementById('btnCerrarOrden');
    if (!previewEl) return;

    const setBtnState = (valid) => {
        if (!btnCerrar) return;
        btnCerrar.disabled = !valid;
        btnCerrar.style.opacity = valid ? '1' : '0.5';
        btnCerrar.style.cursor = valid ? 'pointer' : 'not-allowed';
    };

    if (isIngreso <= 0) {
        previewEl.style.display = 'none';
        setBtnState(false);
        return;
    }

    const { areaNombre, esBaterias, tipoTrabajo, cisAplicable, tmuActual, ctmuActual } = data;

    let pagoCalculado = 0;
    let formulaTexto = '';
    let cisbCalculado = 0;

    if (esBaterias) {
        if (tipoTrabajo === 'MTTO') {
            pagoCalculado = 0.255 * tmuActual;
            formulaTexto = `0.255 × TMU (${tmuActual.toFixed(2)})`;
        } else if (tipoTrabajo === 'MODF') {
            pagoCalculado = 0.16 * tmuActual;
            formulaTexto = `0.16 × TMU (${tmuActual.toFixed(2)})`;
        } else if (tipoTrabajo === 'REP') {
            cisbCalculado = round2(0.25 * tmuActual);
            pagoCalculado = Math.max(0, (isIngreso - ctmuActual - cisbCalculado) / 2);
            formulaTexto = `(IS - CTMU - CISB) / 2`;
        } else {
            pagoCalculado = 5;
            formulaTexto = `Pago base baterías`;
        }
    } else {
        if (['DEF', 'REP', 'MTTO', 'MODF'].includes(tipoTrabajo)) {
            pagoCalculado = Math.max(0, (isIngreso - ctmuActual - cisAplicable) / 2);
            formulaTexto = `(IS - CTMU - CIS) / 2`;
        } else {
            pagoCalculado = 0;
            formulaTexto = `Venta (comisión aparte)`;
        }
    }

    pagoCalculado = round2(pagoCalculado);

    const esVenta = tipoTrabajo === 'VENTA';
    const pagoEsCero = pagoCalculado <= 0;
    const bloqueadoPorPago = !esVenta && pagoEsCero;
    const costoRelevante = (esBaterias && tipoTrabajo === 'REP')
        ? (ctmuActual + cisbCalculado)
        : (ctmuActual + cisAplicable);

    setBtnState(!bloqueadoPorPago);

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
        <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; margin-bottom:8px; font-weight:700;">
            <i class="fas fa-calculator"></i> Vista previa del pago
        </p>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">Fórmula aplicada</span>
            <span style="color:var(--text); font-family:monospace; font-size:10px;">${formulaTexto}</span>
        </div>
        ${esBaterias && cisbCalculado > 0 ? `
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">CISB (0.25 × TMU)</span>
            <span style="color:var(--text);">$${cisbCalculado.toFixed(2)}</span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; padding:8px 0 0; border-top:1px solid var(--border); margin-top:8px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">Pago al técnico</span>
            <span style="font-size:16px; font-weight:900; color:${bloqueadoPorPago ? 'var(--red)' : 'var(--green)'};">$${pagoCalculado.toFixed(2)}</span>
        </div>
        ${bloqueadoPorPago ? `
        <div style="margin-top:12px; padding:10px; background:var(--red-bg); border:1px solid var(--red); border-radius:8px;">
            <p style="font-size:11px; color:var(--red); font-weight:600;">
                <i class="fas fa-exclamation-triangle"></i> No se puede cerrar la orden
            </p>
            <p style="font-size:10px; color:var(--text-dim); margin-top:3px;">
                El pago al técnico sería $0.00. El IS ($${isIngreso.toFixed(2)}) debe cubrir 
                el costo total ($${costoRelevante.toFixed(2)}).
            </p>
        </div>` : ''}
    `;
};

window.guardarCierre = async function(e, ordenId) {
    e.preventDefault();

    const data = window._cierreData || {};
    const isIngreso = parseFloat(document.getElementById('cierreIS').value);

    const garantiaDias = data.sinGarantia 
        ? 0 
        : (parseInt(document.getElementById('cierreGarantia')?.value) || 0);
    const notas = document.getElementById('cierreNotas').value.trim();

    if (isNaN(isIngreso) || isIngreso < 0) {
        utils.showToast('El IS es obligatorio');
        return;
    }

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    if (!orden.tecnico_id) {
        utils.showToast('❌ No se puede cerrar una orden sin técnico asignado');
        return;
    }

    if (!['trabajo_en_ejecucion', 'trabajo_terminado'].includes(orden.estado)) {
        utils.showToast('❌ Solo puedes cerrar una orden en estado "Trabajo en ejecución" o "Trabajo terminado"');
        return;
    }

    const { areaNombre, esBaterias, tipoTrabajo, cisAplicable, tmuActual, ctmuActual } = data;

    let pagoCalculado = 0;
    let cisbCalculado = 0;

    if (esBaterias) {
        if (tipoTrabajo === 'MTTO') pagoCalculado = 0.255 * tmuActual;
        else if (tipoTrabajo === 'MODF') pagoCalculado = 0.16 * tmuActual;
        else if (tipoTrabajo === 'REP') {
            cisbCalculado = round2(0.25 * tmuActual);
            pagoCalculado = Math.max(0, (isIngreso - ctmuActual - cisbCalculado) / 2);
        }
        else pagoCalculado = 5;
    } else {
        if (['DEF', 'REP', 'MTTO', 'MODF'].includes(tipoTrabajo)) {
            pagoCalculado = Math.max(0, (isIngreso - ctmuActual - cisAplicable) / 2);
        }
    }

    pagoCalculado = round2(pagoCalculado);
    cisbCalculado = round2(cisbCalculado);

    const esVenta = tipoTrabajo === 'VENTA';
    if (!esVenta && pagoCalculado <= 0) {
        const costoRelevante = (esBaterias && tipoTrabajo === 'REP')
            ? (ctmuActual + cisbCalculado)
            : (ctmuActual + cisAplicable);
        utils.showToast(
            `❌ El pago al técnico sería $0.00. El IS ($${isIngreso.toFixed(2)}) ` +
            `debe cubrir el costo total ($${costoRelevante.toFixed(2)}).`
        );
        return;
    }

    orden.is_ingreso = round2(isIngreso);
    orden.cis = round2(cisAplicable);
    orden.cisb = cisbCalculado;
    orden.pago_tecnico_calculado = pagoCalculado;
    orden.pago_tecnico_final = pagoCalculado;
    orden.fecha_cierre = new Date().toISOString();

    if (data.sinGarantia) {
        orden.garantia_dias = 0;
        orden.fecha_inicio_garantia = null;
        orden.fecha_fin_garantia = null;
        orden.estado = 'solucionado';
    } else if (garantiaDias > 0) {
        orden.garantia_dias = garantiaDias;
        orden.fecha_inicio_garantia = new Date().toISOString();
        const fin = new Date();
        fin.setDate(fin.getDate() + garantiaDias);
        orden.fecha_fin_garantia = fin.toISOString();
        orden.estado = 'en_garantia';
    } else {
        orden.garantia_dias = 0;
        orden.estado = 'solucionado';
    }

    if (notas) {
        orden.notas_tecnico = (orden.notas_tecnico || '') + `\n[Cierre ${new Date().toLocaleString()}] ${notas}`;
    }

    orden.syncStatus = 'pending';
    orden.updatedAt = new Date().toISOString();
    orden.version = (orden.version || 1) + 1;

    store.saveData();
    window.sync?.emitState();

    delete window._cierreData;

    try {
        const { api } = await import('../core/api.js');
        await api.request('POST', `/api/ordenes/${ordenId}/cerrar/`, {
            is_ingreso: round2(isIngreso),
            cis: round2(cisAplicable),
            cisb: cisbCalculado,
            tmu: tmuActual,
            ctmu: ctmuActual,
            pago_tecnico_final: pagoCalculado,
            garantia_dias: data.sinGarantia ? 0 : garantiaDias,
        });
        orden.syncStatus = 'synced';
        store.saveData();
    } catch (err) {
        console.warn('⚠️ Error al cerrar en backend, se sincronizará luego:', err);
    }

    rO();
    await window.verOrden(ordenId);

    utils.showToast(`✅ Orden cerrada. Pago al técnico: $${pagoCalculado.toFixed(2)}`);
};

// ============================================================
// REABRIR POR GARANTÍA
// ============================================================
window.oOReabrir = async function(ordenId) {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    if (TIPOS_SIN_GARANTIA.includes(orden.tipo_trabajo)) {
        utils.showToast('❌ Este tipo de trabajo no maneja garantía');
        return;
    }

    if (!['en_garantia', 'garantia_terminada'].includes(orden.estado)) {
        utils.showToast('Esta orden no está en garantía');
        return;
    }

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '-';
    const tecnicoAsignado = orden.tecnico_nombre 
        ? orden.tecnico_nombre 
        : (orden.tecnico_id ? 'Sí (el mismo técnico)' : 'No asignado');

    const html = `
        <p class="mt" style="color:var(--amber);"><i class="fas fa-redo"></i> Reabrir por garantía</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong>
        </p>

        <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Estado actual</span>
                <strong style="color:var(--cyan);">En garantía</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Garantía hasta</span>
                <strong style="color:var(--text);">${fmtDate(orden.fecha_fin_garantia)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Técnico original</span>
                <strong style="color:var(--text);">${tecnicoAsignado}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Reabierta antes</span>
                <strong style="color:var(--amber);">${orden.veces_reabierta || 0} vez/veces</strong>
            </div>
        </div>

        <div style="background:var(--green-bg); border:1px solid var(--green); border-radius:10px; padding:10px; margin-bottom:14px;">
            <p style="font-size:11px; color:var(--green); font-weight:600; margin-bottom:4px;">
                <i class="fas fa-info-circle"></i> Reapertura gratuita
            </p>
            <p style="font-size:11px; color:var(--text-dim);">
                Esta reapertura no tendrá costo para el cliente. La garantía se pausará y continuará por donde estaba.
            </p>
        </div>

        <form id="reabrirForm" onsubmit="window.guardarReapertura(event, '${ordenId}')">
            <div class="fg_">
                <label>Motivo de la reapertura *</label>
                <textarea id="reabrirMotivo" rows="3" required placeholder="Describe el problema que reporta el cliente..."></textarea>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <button type="submit" class="bp" style="background:var(--amber); flex:2;">
                    <i class="fas fa-redo"></i> Reabrir
                </button>
            </div>
        </form>
    `;
    utils.openModal(html);
};

window.guardarReapertura = async function(e, ordenId) {
    e.preventDefault();

    const motivo = document.getElementById('reabrirMotivo').value.trim();
    if (!motivo) {
        utils.showToast('El motivo es obligatorio');
        return;
    }

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    try {
        const { api } = await import('../core/api.js');
        await api.request('POST', `/api/ordenes/${ordenId}/reabrir_garantia/`, {
            motivo: motivo,
        });
    } catch (err) {
        console.warn('⚠️ Error al reabrir en backend:', err);
    }

    orden.estado = 'trabajo_en_ejecucion';
    orden.veces_reabierta = (orden.veces_reabierta || 0) + 1;

    if (!orden.pausas) orden.pausas = [];
    orden.pausas.push({
        id: crypto.randomUUID ? crypto.randomUUID() : 'pausa-' + Date.now(),
        inicio_pausa: new Date().toISOString(),
        fin_pausa: null,
        motivo: motivo,
    });

    orden.notas_tecnico = (orden.notas_tecnico || '') 
        + `\n[Reapertura ${new Date().toLocaleString()}] ${motivo}`;

    orden.syncStatus = 'pending';
    orden.updatedAt = new Date().toISOString();
    orden.version = (orden.version || 1) + 1;

    store.saveData();
    window.sync?.emitState();

    rO();
    await window.verOrden(ordenId);

    utils.showToast('✅ Orden reabierta por garantía');
};

// ============================================================
// RESOLVER GARANTÍA
// ============================================================
window.oOResolverGarantia = async function(ordenId) {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    const materiales = orden.materiales || [];

    const ultimaPausa = (orden.pausas || [])
        .filter(p => p.inicio_pausa)
        .sort((a, b) => new Date(b.inicio_pausa) - new Date(a.inicio_pausa))[0];
    const fechaCorte = ultimaPausa ? new Date(ultimaPausa.inicio_pausa) : null;

    const originales = [];
    const nuevos = [];
    materiales.forEach(m => {
        const mCreated = m.createdAt || m.created_at;
        if (fechaCorte && mCreated && new Date(mCreated) >= fechaCorte) {
            nuevos.push(m);
        } else {
            originales.push(m);
        }
    });

    const materialesHtml = originales.length
        ? originales.map(m => {
            const cant = parseFloat(m.cantidad);
            const costo = parseFloat(m.costo_unitario);
            const costoTotal = round2(cant * costo);

            return `
                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:8px; border:1px solid var(--border);"
                     data-gar-material-id="${m.id}"
                     data-cantidad="${cant}"
                     data-costo="${costo}">
                    <div style="margin-bottom:8px;">
                        <div style="font-size:12px; font-weight:600; color:var(--text);">${m.producto_nombre}</div>
                        <div style="font-size:10px; color:var(--text-dim); margin-top:2px;">
                            ${cant.toFixed(2)} uds × $${costo.toFixed(4)} = $${costoTotal.toFixed(2)}
                        </div>
                    </div>
                    <div style="background:var(--surface); border-radius:8px; padding:8px; border:1px solid var(--border);">
                        <label style="font-size:11px; color:var(--green); font-weight:600; display:block; margin-bottom:6px;">
                            <i class="fas fa-undo"></i> ¿Cuánto se devuelve al inventario?
                        </label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="number"
                                   class="gar-recuperable"
                                   data-material-id="${m.id}"
                                   data-cantidad-total="${cant}"
                                   data-costo-unitario="${costo}"
                                   min="0"
                                   max="${cant}"
                                   step="0.01"
                                   value="${cant}"
                                   oninput="window.actualizarPreviewGarantia()"
                                   style="flex:1; background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:8px; color:var(--text); font-size:14px; text-align:center; font-weight:700;">
                            <span style="font-size:11px; color:var(--text-faint); white-space:nowrap;">de ${cant}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span style="font-size:9px; color:var(--text-dim);">Se pierde:</span>
                            <span class="gar-perdida" style="color:var(--red); font-weight:700; font-size:11px;">$0.00</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : '<p style="font-size:11px; color:var(--text-dim); text-align:center; padding:12px;">Sin materiales originales</p>';

    const nuevosHtml = nuevos.length
        ? nuevos.map(m => {
            const cant = parseFloat(m.cantidad);
            const costo = parseFloat(m.costo_unitario);
            const subtotal = round2(cant * costo);
            return `
                <div style="background:var(--red-bg); border-radius:8px; padding:8px 10px; margin-bottom:6px; border:1px solid var(--red); display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:12px; color:var(--text); font-weight:600;">${m.producto_nombre}</div>
                        <div style="font-size:10px; color:var(--text-dim);">${cant} × $${costo.toFixed(2)} (100% perdido)</div>
                    </div>
                    <div style="font-size:12px; font-weight:700; color:var(--red);">$${subtotal.toFixed(2)}</div>
                </div>
            `;
        }).join('')
        : '<p style="font-size:11px; color:var(--text-dim); text-align:center; padding:8px;">Sin materiales nuevos</p>';

    const html = `
        <p class="mt" style="color:var(--red);"><i class="fas fa-shield-alt"></i> Resolver garantía</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong>
        </p>

        <div style="background:var(--amber-bg); border:1px solid var(--amber); border-radius:10px; padding:10px; margin-bottom:14px;">
            <p style="font-size:11px; color:var(--amber); font-weight:600; margin-bottom:4px;">
                <i class="fas fa-info-circle"></i> Cómo llenar
            </p>
            <p style="font-size:11px; color:var(--text-dim); line-height:1.5;">
                1. En cada material original, indica <strong style="color:var(--green);">cuánto vuelve al inventario</strong>. Lo que NO devuelvas se cuenta como pérdida.<br>
                2. Los materiales nuevos (usados durante la garantía) siempre se pierden completos.<br>
                3. Elige si la garantía quedó <strong>reparada</strong> o <strong>sin solución</strong>.
            </p>
        </div>

        <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; font-weight:700;">
            <i class="fas fa-boxes"></i> Materiales originales (define qué se devuelve)
        </p>
        <div style="max-height:280px; overflow-y:auto; margin-bottom:14px;">
            ${materialesHtml}
        </div>

        ${nuevos.length ? `
        <p style="font-size:10px; color:var(--red); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; font-weight:700;">
            <i class="fas fa-plus-circle"></i> Materiales nuevos (se pierden 100%)
        </p>
        <div style="margin-bottom:14px;">
            ${nuevosHtml}
        </div>` : ''}

        <div id="garPreview" style="padding:12px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border); margin-bottom:14px;"></div>

        <form id="resolverGarantiaForm" onsubmit="window.guardarResolucionGarantia(event, '${ordenId}')">
            <div class="fg_">
                <label>Tipo de resolución *</label>
                <select id="garTipoResolucion" required onchange="window.actualizarPreviewGarantia()">
                    <option value="reparado">Reparado (cliente se lleva el equipo, sigue en garantía)</option>
                    <option value="sin_solucion">Sin solución (devolver el IS al cliente + penalizar al técnico)</option>
                </select>
                <p style="font-size:10px; color:var(--text-dim); margin-top:4px;">
                    <i class="fas fa-info-circle"></i> Sin solución siempre penaliza al técnico (PTSB + CENR/2), aunque recuperes todo.
                </p>
            </div>

            <div class="fg_">
                <label>Notas (opcional)</label>
                <textarea id="garNotas" rows="2" placeholder="Detalles de la resolución..."></textarea>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Cancelar
                </button>
                <button type="submit" class="bp" style="background:var(--red); flex:2;">
                    <i class="fas fa-check"></i> Confirmar resolución
                </button>
            </div>
        </form>
    `;

    utils.openModal(html);

    window._garPTSB = parseFloat(orden.pago_tecnico_final || orden.pago_tecnico_calculado || 0);
    window._garIS = parseFloat(orden.is_ingreso || 0);
    window._garNuevosSubtotal = nuevos.reduce((sum, m) => sum + parseFloat(m.subtotal || 0), 0);

    setTimeout(() => window.actualizarPreviewGarantia(), 100);
};

// ============================================================
// PREVIEW DE RESOLUCIÓN DE GARANTÍA
// ============================================================
window.actualizarPreviewGarantia = function() {
    const previewEl = document.getElementById('garPreview');
    if (!previewEl) return;

    let cern = 0;

    document.querySelectorAll('.gar-recuperable').forEach(input => {
        const cantTotal = parseFloat(input.dataset.cantidadTotal) || 0;
        const costoUnit = parseFloat(input.dataset.costoUnitario) || 0;
        let cantRecup = parseFloat(input.value) || 0;

        if (cantRecup < 0) cantRecup = 0;
        if (cantRecup > cantTotal) {
            cantRecup = cantTotal;
            input.value = cantTotal;
        }

        const cantPerdida = cantTotal - cantRecup;
        const costoPerdido = cantPerdida * costoUnit;
        cern += costoPerdido;

        const contenedor = input.closest('[data-gar-material-id]');
        if (contenedor) {
            const spanPerdida = contenedor.querySelector('.gar-perdida');
            if (spanPerdida) {
                spanPerdida.textContent = '$' + costoPerdido.toFixed(2);
            }
        }
    });

    cern += window._garNuevosSubtotal || 0;

    cern = round2(cern);

    const ptsb = window._garPTSB || 0;
    const isOriginal = window._garIS || 0;

    const tipoRes = document.getElementById('garTipoResolucion')?.value || 'reparado';
    const devuelveIS = tipoRes === 'sin_solucion' ? isOriginal : 0;

    let pen = 0;
    if (tipoRes === 'sin_solucion') {
        pen = round2(ptsb + (cern / 2));
    } else {
        pen = cern > 0 ? round2(ptsb + (cern / 2)) : 0;
    }

    previewEl.innerHTML = `
        <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; margin-bottom:6px; font-weight:700;">
            <i class="fas fa-calculator"></i> Vista previa
        </p>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">PTSB (pago original técnico)</span>
            <span style="color:var(--text);">$${ptsb.toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">CENR (perdidos + nuevos)</span>
            <span style="color:var(--red);">$${cern.toFixed(2)}</span>
        </div>
        ${pen > 0 ? `
        <div style="display:flex; justify-content:space-between; padding:8px 0 0; border-top:1px solid var(--border); margin-top:8px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">Penalización (PTSB + CENR/2)</span>
            <span style="font-size:16px; font-weight:900; color:var(--red);">-$${pen.toFixed(2)}</span>
        </div>` : `
        <div style="margin-top:10px; padding:8px; background:var(--green-bg); border:1px solid var(--green); border-radius:8px;">
            <p style="font-size:11px; color:var(--green); font-weight:600;">
                <i class="fas fa-check-circle"></i> Sin penalización
            </p>
            <p style="font-size:10px; color:var(--text-dim); margin-top:2px;">
                No hay pérdidas ni materiales nuevos. Solo aplica en resolución "Reparado".
            </p>
        </div>`}
        ${devuelveIS > 0 ? `
        <div style="display:flex; justify-content:space-between; padding:8px 0 0; border-top:1px solid var(--border); margin-top:8px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">IS a devolver al cliente</span>
            <span style="font-size:14px; font-weight:900; color:var(--amber);">$${devuelveIS.toFixed(2)}</span>
        </div>` : ''}
    `;
};

// ============================================================
// GUARDAR RESOLUCIÓN DE GARANTÍA
// ============================================================
window.guardarResolucionGarantia = async function(e, ordenId) {
    e.preventDefault();

    const tipoResolucion = document.getElementById('garTipoResolucion').value;
    const notas = document.getElementById('garNotas').value.trim();

    if (!['reparado', 'sin_solucion'].includes(tipoResolucion)) {
        utils.showToast('Tipo de resolución inválido');
        return;
    }

    const materiales_recuperados = [];
    document.querySelectorAll('.gar-recuperable').forEach(input => {
        materiales_recuperados.push({
            material_id: input.dataset.materialId,
            cantidad_recuperada: parseFloat(input.value) || 0,
        });
    });

    if (tipoResolucion === 'sin_solucion') {
        if (!confirm('¿Confirmar SIN SOLUCIÓN? Se devolverá el IS al cliente y se penalizará al técnico.')) {
            return;
        }
    }

    try {
        const { api } = await import('../core/api.js');
        const result = await api.resolverGarantia(ordenId, {
            tipo_resolucion: tipoResolucion,
            materiales_recuperados,
        });

        if (result && result.orden) {
            utils.closeModal();
            const pen = result.pen || 0;
            const dev = result.is_devuelto || 0;
            let msg = pen > 0
                ? `✅ Garantía resuelta. Penalización: $${pen.toFixed(2)}`
                : `✅ Garantía resuelta. Sin penalización.`;
            if (dev > 0) {
                msg += ` — IS devuelto: $${dev.toFixed(2)}`;
            }
            utils.showToast(msg);

            await store.init();
            const ordenLocal = store.getOrdenes().find(o => o.id === ordenId);
            if (ordenLocal) {
                const serverOrden = result.orden;
                Object.assign(ordenLocal, {
                    estado: serverOrden.estado,
                    pago_tecnico_calculado: parseFloat(serverOrden.pago_tecnico_calculado) || 0,
                    pago_tecnico_final: parseFloat(serverOrden.pago_tecnico_final) || 0,
                    penalizacion: parseFloat(serverOrden.penalizacion) || 0,
                    is_ingreso: parseFloat(serverOrden.is_ingreso) || 0,
                    fecha_cierre: serverOrden.fecha_cierre,
                    notas_tecnico: serverOrden.notas_tecnico || '',
                    syncStatus: 'synced',
                    version: serverOrden.version || ordenLocal.version,
                });

                if (serverOrden.materiales) {
                    ordenLocal.materiales = serverOrden.materiales.map(m => ({
                        id: m.id,
                        producto_id: m.producto_id,
                        producto_nombre: m.producto_nombre,
                        cantidad: parseFloat(m.cantidad),
                        costo_unitario: parseFloat(m.costo_unitario),
                        subtotal: parseFloat(m.subtotal),
                        createdAt: m.created_at || m.createdAt || new Date().toISOString(),
                    }));
                }

                store.saveData();
                window.sync?.emitState();
            }

            try {
                const data = await api.syncPull();
                store.applyServerData(data);
            } catch (e) {}

            await rO();
            await window.verOrden(ordenId);
        }
    } catch (err) {
        console.error('❌ Error al resolver garantía:', err);
        utils.showToast('❌ ' + (err.message || 'Error al resolver garantía'));
    }
};

// ============================================================
// RESOLVER SIN SOLUCIÓN (flujo viejo, no garantía)
// ============================================================
window.oOResolverSinSolucion = async function(ordenId, notasPrevias = '') {
    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    const materiales = orden.materiales || [];
    if (!materiales.length) {
        utils.showToast('Sin materiales');
        return;
    }

    const materialesHtml = materiales.map((m, idx) => {
        const cant = parseFloat(m.cantidad);
        const costo = parseFloat(m.costo_unitario);
        const costoTotal = round2(cant * costo);

        return `
            <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:8px; border:1px solid var(--border);" data-material-id="${m.id}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:12px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis;">${m.producto_nombre}</div>
                        <div style="font-size:10px; color:var(--text-dim); margin-top:2px;">
                            ${cant.toFixed(2)} uds × $${costo.toFixed(4)} = $${costoTotal.toFixed(2)}
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <label style="font-size:10px; color:var(--text-dim); flex:1;">Recuperables:</label>
                    <input type="number" 
                           class="mat-recuperable" 
                           data-material-id="${m.id}"
                           data-cantidad-total="${cant}"
                           data-costo-unitario="${costo}"
                           min="0" 
                           max="${cant}" 
                           step="0.01" 
                           value="${cant}"
                           oninput="window.actualizarResumenSinSolucion()"
                           style="width:70px; background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:5px 8px; color:var(--text); font-size:12px; text-align:right;">
                    <span style="font-size:10px; color:var(--text-faint);">/ ${cant}</span>
                </div>
                <div style="font-size:9px; color:var(--text-faint); margin-top:6px; text-align:right;">
                    Pérdida estimada: <span class="mat-perdida" style="color:var(--red); font-weight:600;">$0.00</span>
                </div>
            </div>
        `;
    }).join('');

    const html = `
        <p class="mt" style="color:var(--red);"><i class="fas fa-exclamation-triangle"></i> Resolver sin solución</p>
        <p style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">
            Orden: <strong style="color:var(--text);">${orden.codigo}</strong>
        </p>

        <div style="background:var(--red-bg); border:1px solid var(--red); border-radius:10px; padding:10px; margin-bottom:14px;">
            <p style="font-size:11px; color:var(--red); font-weight:600; margin-bottom:4px;">
                <i class="fas fa-info-circle"></i> Atención
            </p>
            <p style="font-size:11px; color:var(--text-dim);">
                Los materiales no recuperables se sumarán como penalización al técnico. 
                Los recuperables se devolverán al stock.
            </p>
        </div>

        <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; font-weight:700;">
            <i class="fas fa-boxes"></i> Materiales usados
        </p>

        <div style="max-height:300px; overflow-y:auto;">
            ${materialesHtml}
        </div>

        <div style="margin-top:14px; padding:12px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Total recuperado</span>
                <span id="resTotalRecuperado" style="color:var(--green); font-weight:700;">$0.00</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px;">
                <span style="color:var(--text-dim);">Total perdido (penalización)</span>
                <span id="resTotalPerdido" style="color:var(--red); font-weight:700;">$0.00</span>
            </div>
        </div>

        <form id="sinSolucionForm" onsubmit="window.guardarSinSolucion(event, '${ordenId}')" style="margin-top:14px;">
            <div class="fg_">
                <label>Ingreso del servicio (IS) — lo que paga el cliente *</label>
                <input type="number" id="sinSolIS" required min="0" step="0.01" value="0" placeholder="0.00">
            </div>

            <div class="fg_">
                <label>Notas (opcional)</label>
                <textarea id="sinSolNotas" rows="2" placeholder="Explicación de por qué no se pudo resolver...">${notasPrevias || ''}</textarea>
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button type="button" class="bp" style="background:var(--surface-2); flex:1;"
                        onclick="window.verOrden('${ordenId}')">
                    <i class="fas fa-arrow-left"></i> Cancelar
                </button>
                <button type="submit" class="bp" style="background:var(--red); flex:2;">
                    <i class="fas fa-check"></i> Confirmar sin solución
                </button>
            </div>
        </form>
    `;

    utils.openModal(html);
    setTimeout(() => window.actualizarResumenSinSolucion(), 100);
};

window.actualizarResumenSinSolucion = function() {
    const inputs = document.querySelectorAll('.mat-recuperable');
    let totalRecuperado = 0;
    let totalPerdido = 0;

    inputs.forEach(input => {
        const cantTotal = parseFloat(input.dataset.cantidadTotal) || 0;
        const costoUnit = parseFloat(input.dataset.costoUnitario) || 0;
        let cantRecup = parseFloat(input.value) || 0;

        if (cantRecup < 0) cantRecup = 0;
        if (cantRecup > cantTotal) {
            cantRecup = cantTotal;
            input.value = cantTotal;
        }

        const cantPerdida = cantTotal - cantRecup;
        const costoRecuperado = cantRecup * costoUnit;
        const costoPerdido = cantPerdida * costoUnit;

        totalRecuperado += costoRecuperado;
        totalPerdido += costoPerdido;

        const contenedor = input.closest('[data-material-id]');
        if (contenedor) {
            const spanPerdida = contenedor.querySelector('.mat-perdida');
            if (spanPerdida) {
                spanPerdida.textContent = '$' + costoPerdido.toFixed(2);
            }
        }
    });

    const elRecup = document.getElementById('resTotalRecuperado');
    const elPerd = document.getElementById('resTotalPerdido');
    if (elRecup) elRecup.textContent = '$' + totalRecuperado.toFixed(2);
    if (elPerd) elPerd.textContent = '$' + totalPerdido.toFixed(2);
};

window.guardarSinSolucion = async function(e, ordenId) {
    e.preventDefault();

    const isIngreso = parseFloat(document.getElementById('sinSolIS').value) || 0;
    const notas = document.getElementById('sinSolNotas').value.trim();

    await store.init();
    const orden = store.getOrdenes().find(o => o.id === ordenId);
    if (!orden) return;

    const inputs = document.querySelectorAll('.mat-recuperable');
    const materialesResueltos = [];

    inputs.forEach(input => {
        const materialId = input.dataset.materialId;
        const cantRecup = parseFloat(input.value) || 0;
        materialesResueltos.push({
            material_id: materialId,
            cantidad_recuperada: cantRecup,
        });
    });

    try {
        const { api } = await import('../core/api.js');
        const result = await api.request('POST', `/api/ordenes/${ordenId}/cerrar_sin_solucion/`, {
            is_ingreso: isIngreso,
            materiales_resueltos: materialesResueltos,
        });

        if (result && result.orden) {
            const serverOrden = result.orden;
            
            orden.estado = serverOrden.estado;
            orden.is_ingreso = parseFloat(serverOrden.is_ingreso) || 0;
            orden.penalizacion = parseFloat(serverOrden.penalizacion) || 0;
            orden.pago_tecnico_calculado = parseFloat(serverOrden.pago_tecnico_calculado) || 0;
            orden.pago_tecnico_final = parseFloat(serverOrden.pago_tecnico_final) || 0;
            orden.fecha_cierre = serverOrden.fecha_cierre;
            orden.notas_tecnico = serverOrden.notas_tecnico || '';
            orden.syncStatus = 'synced';

            if (serverOrden.materiales) {
                orden.materiales = serverOrden.materiales.map(m => ({
                    id: m.id,
                    producto_id: m.producto_id,
                    producto_nombre: m.producto_nombre,
                    cantidad: parseFloat(m.cantidad),
                    costo_unitario: parseFloat(m.costo_unitario),
                    subtotal: parseFloat(m.subtotal),
                }));
            }

            store.saveData();
            window.sync?.emitState();

            try {
                const data = await api.syncPull();
                store.applyServerData(data);
            } catch (e) {}

            rO();
            await window.verOrden(ordenId);

            const pen = result.penalizacion || 0;
            utils.showToast(`✅ Sin solución. Penalización: $${pen.toFixed(2)}`);
        }
    } catch (err) {
        console.error('❌ Error al cerrar sin solución:', err);
        utils.showToast('❌ Error al guardar: ' + err.message);
    }
};

// ============================================================
// NUEVA ORDEN
// ============================================================
export function oONew() {
    (async () => {
        await store.init();

        const areaOpts = (store.areas || []).map(a => 
            `<option value="${a}">${a}</option>`
        ).join('');

        const html = `
            <p class="mt"><i class="fas fa-clipboard-list"></i> Nueva Orden de Servicio</p>
            <form id="newOrdenForm" onsubmit="window.guardarNuevaOrden(event)">

                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; font-weight:700;">
                        <i class="fas fa-user" style="color:var(--blue);"></i> Cliente
                    </p>

                    <div class="fg_">
                        <label>Buscar cliente existente</label>
                        <input type="text" id="oClienteBuscar" placeholder="Escribe para buscar..." autocomplete="off" oninput="window.buscarCliente()">
                        <div id="oClienteResultados" style="display:none; background:var(--surface); border:1px solid var(--border); border-radius:8px; margin-top:4px; max-height:150px; overflow-y:auto;"></div>
                    </div>

                    <input type="hidden" id="oClienteId" value="">

                    <div class="fr">
                        <div class="fg_">
                            <label>Nombre del cliente *</label>
                            <input type="text" id="oClienteNombre" required placeholder="Nombre completo">
                        </div>
                        <div class="fg_">
                            <label>Teléfono *</label>
                            <input type="text" id="oClienteTelefono" required placeholder="+53 5555-5555">
                        </div>
                    </div>
                </div>

                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; font-weight:700;">
                        <i class="fas fa-tools" style="color:var(--amber);"></i> Equipo
                    </p>

                    <div class="fg_">
                        <label>Tipo de equipo *</label>
                        <input type="text" id="oEquipoTipo" required placeholder="Ej: TV, Laptop, Nevera...">
                    </div>

                    <div class="fr">
                        <div class="fg_">
                            <label>Marca</label>
                            <input type="text" id="oEquipoMarca" placeholder="Samsung, LG...">
                        </div>
                        <div class="fg_">
                            <label>Modelo</label>
                            <input type="text" id="oEquipoModelo" placeholder="Modelo">
                        </div>
                    </div>
                </div>

                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; font-weight:700;">
                        <i class="fas fa-wrench" style="color:var(--green);"></i> Trabajo a realizar
                    </p>

                    <div class="fg_">
                        <label>Área *</label>
                        <select id="oArea" required>${areaOpts}</select>
                    </div>

                    <div class="fg_">
                        <label>Tipo de trabajo *</label>
                        <select id="oTipoTrabajo" required>
                            <option value="DEF">Solo defectación compleja (con cobro)</option>
                            <option value="REP">Reparación</option>
                            <option value="MTTO">Mantenimiento</option>
                            <option value="MODF">Modificación</option>
                        </select>
                        <p style="font-size:10px; color:var(--text-dim); margin-top:4px;">
                            <i class="fas fa-info-circle"></i> Para vender un producto, usa "Venta directa" en el menú del botón +.
                        </p>
                    </div>

                    <div class="fg_">
                        <label>Notas del cliente</label>
                        <textarea id="oNotasCliente" rows="3" placeholder="Descripción del problema, observaciones..."></textarea>
                    </div>
                </div>

                <button type="submit" class="bp" style="background:var(--green);">
                    <i class="fas fa-plus-circle"></i> Crear orden
                </button>
            </form>
        `;
        utils.openModal(html);
    })();
}
window.oONew = oONew;

// ============================================================
// BUSCADOR DE CLIENTES
// ============================================================
window.buscarCliente = function() {
    const input = document.getElementById('oClienteBuscar');
    const contenedor = document.getElementById('oClienteResultados');
    const query = (input?.value || '').trim().toLowerCase();

    if (query.length < 2) {
        if (contenedor) contenedor.style.display = 'none';
        return;
    }

    const clientes = store.getClientes().filter(c => {
        if (c.deletedAt) return false;
        return (
            (c.nombre || '').toLowerCase().includes(query) ||
            (c.telefono || '').toLowerCase().includes(query)
        );
    }).slice(0, 10);

    if (!clientes.length) {
        contenedor.innerHTML = `<div style="padding:10px; font-size:11px; color:var(--text-dim);">No hay coincidencias. Se creará un cliente nuevo.</div>`;
        contenedor.style.display = 'block';
        return;
    }

    contenedor.innerHTML = clientes.map(c => `
        <div style="padding:8px 10px; border-bottom:1px solid var(--border); cursor:pointer;"
             onclick="window.seleccionarCliente('${c.id}')">
            <div style="font-size:12px; font-weight:600; color:var(--text);">${c.nombre}</div>
            <div style="font-size:10px; color:var(--text-dim);">${c.telefono || 'Sin teléfono'}</div>
        </div>
    `).join('');
    contenedor.style.display = 'block';
};

window.seleccionarCliente = function(id) {
    const cliente = store.getClientes().find(c => c.id === id);
    if (!cliente) return;

    document.getElementById('oClienteId').value = cliente.id;
    document.getElementById('oClienteNombre').value = cliente.nombre || '';
    document.getElementById('oClienteTelefono').value = cliente.telefono || '';
    document.getElementById('oClienteBuscar').value = cliente.nombre || '';
    document.getElementById('oClienteResultados').style.display = 'none';

    document.getElementById('oClienteNombre').readOnly = true;
    document.getElementById('oClienteTelefono').readOnly = true;

    utils.showToast(`Cliente seleccionado: ${cliente.nombre}`);
};

// ============================================================
// GUARDAR NUEVA ORDEN
// 🔥 FIX: revertida la validación UUID del área.
//    El backend acepta strings como 'electricidad' y los
//    traduce a UUID real en sync_push.
// ============================================================
window.guardarNuevaOrden = async function(e) {
    e.preventDefault();

    const clienteId = document.getElementById('oClienteId').value.trim();
    const clienteNombre = document.getElementById('oClienteNombre').value.trim();
    const clienteTelefono = document.getElementById('oClienteTelefono').value.trim();
    const equipoTipo = document.getElementById('oEquipoTipo').value.trim();
    const equipoMarca = document.getElementById('oEquipoMarca').value.trim();
    const equipoModelo = document.getElementById('oEquipoModelo').value.trim();
    const areaNombre = document.getElementById('oArea').value;
    const tipoTrabajo = document.getElementById('oTipoTrabajo').value;
    const notasCliente = document.getElementById('oNotasCliente').value.trim();

    if (!clienteNombre || !clienteTelefono) {
        utils.showToast('Nombre y teléfono del cliente son obligatorios');
        return;
    }
    if (!equipoTipo) {
        utils.showToast('El tipo de equipo es obligatorio');
        return;
    }
    if (!areaNombre) {
        utils.showToast('El área es obligatoria');
        return;
    }

    await store.init();

    // 🔥 Revertido: usar el id del área tal como viene (puede ser 'electricidad' o UUID).
    //    El backend lo traduce en sync_push.
    const area = (store.getAreas() || []).find(a => a.nombre === areaNombre);
    const areaId = area ? area.id : null;

    // 🔥 Validar SOLO el cliente (esto sí es necesario porque un cliente con ID inválido rompe el backend)
    let clienteFinalId = clienteId;
    if (clienteFinalId && !esUuidValido(clienteFinalId)) {
        console.warn('Cliente con ID inválido, se buscará/creará por teléfono:', clienteFinalId);
        clienteFinalId = null;
    }
    if (!clienteFinalId) {
        const nuevoCliente = store.addCliente({
            nombre: clienteNombre,
            telefono: clienteTelefono,
            email: '',
            direccion: '',
            notas: '',
        });
        clienteFinalId = nuevoCliente.id;
    }

    const esComplejo = (tipoTrabajo === 'DEF');

    const nuevaOrden = {
        tipo_flujo: 'defectacion',
        tipo_trabajo: tipoTrabajo,
        es_complejo: esComplejo,
        cliente: clienteFinalId,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        equipo_tipo: equipoTipo,
        equipo_marca: equipoMarca,
        equipo_modelo: equipoModelo,
        area: areaId,
        area_nombre: areaNombre,
        tecnico_id: null,
        tecnico_nombre: '',
        jefe_asigno_id: null,
        jefe_asigno_nombre: '',
        estado: 'pendiente_asignacion',
        is_ingreso: 0,
        tmu: 0,
        ctmu: 0,
        cis: 0,
        cisb: 0,
        pago_tecnico_calculado: 0,
        pago_tecnico_final: 0,
        pago_editado_por_admin: false,
        penalizacion: 0,
        garantia_dias: 0,
        notas_tecnico: '',
        notas_cliente: notasCliente,
        materiales: [],
        pausas: [],
    };

    try {
        const created = store.addOrden(nuevaOrden);
        utils.closeModal();
        await rO();
        window.sync?.emitState();
        utils.showToast(`✅ Orden ${created.codigo} creada`);
    } catch (error) {
        console.error('❌ Error al crear orden:', error);
        utils.showToast('❌ Error al crear la orden');
    }
};

// ============================================================
// NUEVA VENTA (flujo simplificado en un solo paso)
// ============================================================
export function oOVenta() {
    (async () => {
        await store.init();

        const areaOpts = (store.areas || []).map(a =>
            `<option value="${a}">${a}</option>`
        ).join('');

        const productos = store.getProductosActivos();
        const prodOpts = productos.map(p =>
            `<option value="${p.id}" data-cat="${p.c}" data-sale="${p.sale}" data-stock="${p.q}">
                ${p.n} (${p.c}) — $${p.sale.toFixed(2)} — Disp: ${p.q}
            </option>`
        ).join('');

        const html = `
            <p class="mt"><i class="fas fa-shopping-cart"></i> Nueva Venta</p>

            <form id="ventaForm" onsubmit="window.guardarVenta(event)">

                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; font-weight:700;">
                        <i class="fas fa-user" style="color:var(--blue);"></i> Cliente
                    </p>

                    <div class="fr">
                        <div class="fg_">
                            <label>Nombre *</label>
                            <input type="text" id="vClienteNombre" required placeholder="Nombre completo">
                        </div>
                        <div class="fg_">
                            <label>Teléfono *</label>
                            <input type="text" id="vClienteTelefono" required placeholder="+53 5555-5555">
                        </div>
                    </div>
                </div>

                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; font-weight:700;">
                        <i class="fas fa-box" style="color:var(--green);"></i> Producto a vender
                    </p>

                    <div class="fg_">
                        <label>Producto *</label>
                        <select id="vProductoId" required onchange="window.actualizarPreviewVenta()">
                            <option value="">Selecciona un producto...</option>
                            ${prodOpts}
                        </select>
                    </div>

                    <div class="fr">
                        <div class="fg_">
                            <label>Cantidad *</label>
                            <input type="number" id="vCantidad" required min="1" step="1" value="1"
                                   oninput="window.actualizarPreviewVenta()">
                        </div>
                        <div class="fg_">
                            <label>Área *</label>
                            <select id="vArea" required>${areaOpts}</select>
                        </div>
                    </div>
                </div>

                <div style="background:var(--bg); border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid var(--border);">
                    <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; font-weight:700;">
                        <i class="fas fa-dollar-sign" style="color:var(--amber);"></i> Cierre de venta
                    </p>

                    <div class="fg_">
                        <label>Ingreso del servicio (IS) — lo que paga el cliente *</label>
                        <input type="number" id="vIS" required min="0" step="0.01" value="0"
                               oninput="window.actualizarPreviewVenta()">
                    </div>

                    <div class="fg_">
                        <label>Días de garantía *</label>
                        <select id="vGarantia" onchange="window.actualizarPreviewVenta()">
                            <option value="0">Sin garantía</option>
                            <option value="30" selected>30 días</option>
                            <option value="60">60 días</option>
                            <option value="90">90 días</option>
                            <option value="180">180 días</option>
                            <option value="365">1 año</option>
                        </select>
                    </div>

                    <div id="ventaPreview" style="margin-top:12px; padding:12px; background:var(--surface); border-radius:10px; border:1px solid var(--border); display:none;"></div>
                </div>

                <button type="submit" class="bp" style="background:var(--green);">
                    <i class="fas fa-check"></i> Registrar venta
                </button>
            </form>
        `;
        utils.openModal(html);

        setTimeout(() => window.actualizarPreviewVenta(), 100);
    })();
}
window.oOVenta = oOVenta;

// ============================================================
// PREVIEW DE VENTA
// ============================================================
window.actualizarPreviewVenta = function() {
    const sel = document.getElementById('vProductoId');
    const cantidad = parseInt(document.getElementById('vCantidad')?.value) || 0;
    const previewEl = document.getElementById('ventaPreview');
    if (!previewEl) return;

    if (!sel || !sel.value || cantidad <= 0) {
        previewEl.style.display = 'none';
        return;
    }

    const opt = sel.options[sel.selectedIndex];
    const cat = opt.dataset.cat || '';
    const sale = parseFloat(opt.dataset.sale) || 0;
    const stock = parseFloat(opt.dataset.stock) || 0;

    const cfg = store.getConfig() || {};
    let comisiones = {};
    try {
        if (cfg.comisiones_venta) comisiones = JSON.parse(cfg.comisiones_venta);
    } catch (e) {}

    const comisionCfg = comisiones[cat] || { valor: 0, tipo: 'porcentaje' };
    const valor = parseFloat(comisionCfg.valor) || 0;
    const tipo = comisionCfg.tipo || 'porcentaje';

    let comision = 0;
    let formula = '';
    if (tipo === 'porcentaje') {
        comision = (sale * cantidad * valor) / 100;
        formula = `${valor}% × $${sale} × ${cantidad}`;
    } else {
        comision = valor * cantidad;
        formula = `$${valor} × ${cantidad}`;
    }
    comision = Math.round(comision * 100) / 100;

    const sinStock = cantidad > stock;

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
        <p style="font-size:10px; color:var(--text-dim); text-transform:uppercase; margin-bottom:6px; font-weight:700;">
            <i class="fas fa-calculator"></i> Vista previa
        </p>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">Categoría</span>
            <span style="color:var(--text);">${cat}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">Precio unitario</span>
            <span style="color:var(--text);">$${sale.toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">Stock</span>
            <span style="color:${sinStock ? 'var(--red)' : 'var(--green)'};">${stock}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:11px;">
            <span style="color:var(--text-dim);">Fórmula comisión</span>
            <span style="color:var(--text); font-family:monospace; font-size:10px;">${formula}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0 0; border-top:1px solid var(--border); margin-top:8px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">Comisión al técnico</span>
            <span style="font-size:16px; font-weight:900; color:var(--green);">$${comision.toFixed(2)}</span>
        </div>
        ${sinStock ? `
        <div style="margin-top:10px; padding:8px; background:var(--red-bg); border:1px solid var(--red); border-radius:8px;">
            <p style="font-size:11px; color:var(--red); font-weight:600;">
                <i class="fas fa-exclamation-triangle"></i> Stock insuficiente
            </p>
        </div>` : ''}
    `;
};

// ============================================================
// GUARDAR VENTA
// ============================================================
window.guardarVenta = async function(e) {
    e.preventDefault();

    const clienteNombre = document.getElementById('vClienteNombre').value.trim();
    const clienteTelefono = document.getElementById('vClienteTelefono').value.trim();
    const productoId = document.getElementById('vProductoId').value;
    const cantidad = parseInt(document.getElementById('vCantidad').value) || 0;
    const areaNombre = document.getElementById('vArea').value;
    const isIngreso = parseFloat(document.getElementById('vIS').value) || 0;
    const garantiaDias = parseInt(document.getElementById('vGarantia').value) || 0;

    if (!clienteNombre || !clienteTelefono) {
        utils.showToast('Nombre y teléfono del cliente son obligatorios');
        return;
    }
    if (!productoId || cantidad <= 0) {
        utils.showToast('Selecciona un producto y cantidad válida');
        return;
    }

    try {
        const { api } = await import('../core/api.js');
        const result = await api.crearVenta({
            cliente_nombre: clienteNombre,
            cliente_telefono: clienteTelefono,
            producto_id: productoId,
            cantidad: cantidad,
            area_nombre: areaNombre,
            is_ingreso: isIngreso,
            garantia_dias: garantiaDias,
        });

        if (result && result.orden) {
            utils.closeModal();
            utils.showToast(`✅ Venta registrada. Comisión: $${result.comision.toFixed(2)}`);
            try {
                const data = await api.syncPull();
                store.applyServerData(data);
            } catch (e) {}
            await rO();
        }
    } catch (err) {
        console.error('❌ Error al registrar venta:', err);
        utils.showToast('❌ ' + (err.message || 'Error al registrar venta'));
    }
};

// ============================================================
// TABS
// ============================================================
function setupTabs() {
    const container = document.getElementById('ordSN');
    if (!container) return;

    container.addEventListener('click', function(e) {
        const tb = e.target.closest('.st');
        if (!tb) return;
        e.stopPropagation();

        const newSub = tb.dataset.s;
        if (newSub === oSub) return;

        oSub = newSub;
        container.querySelectorAll('.st').forEach(t => t.classList.remove('active'));
        tb.classList.add('active');
        rO();
    });

    window.addEventListener('ordenes:setArea', e => {
        oAreaFiltro = e.detail;
        rOAreas();
        rO();
    });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
export function initOrdenes() {
    (async () => {
        await store.init();
        rOAreas();
        await rO();
        setupTabs();
        router.updateFAB();
        console.log('✅ Módulo Órdenes inicializado');
    })();
}

export default {
    init: initOrdenes,
    rO,
    oONew,
    oOVenta
};