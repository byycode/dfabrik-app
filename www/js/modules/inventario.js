// ============================================================
// MÓDULO INVENTARIO - CON PVM E INDICADOR VISUAL EN TIEMPO REAL
// ============================================================
import { store } from '../core/store.js';
import { utils } from '../core/utils.js';
import { router } from '../core/router.js';

let cSub = 'productos';
let cCat = 'Todos';
let cMF = 'todas';

// Colores para áreas
function getAreaColor(area) {
    const colors = {
        'Electricidad': '#ff6b6b',
        'Electrónica': '#4ecdc4',
        'Baterías': '#ffd93d'
    };
    return colors[area] || '#7c7ca8';
}

// ============================================================
// FUNCIÓN PARA RECARGAR DATOS DESDE LOCALSTORAGE
// ============================================================
async function refreshData() {
    await store.init();
    store.loadData();
    return true;
}

// ============================================================
// FUNCIÓN PARA ACTUALIZAR PVM E INDICADOR EN FORMULARIO
// ============================================================
function actualizarPVM(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const precioVentaInput = form.querySelector('.precio-venta');
    const costoInput = form.querySelector('.precio-costo');
    const margenInput = form.querySelector('.margen-input');
    const pvmDisplay = form.querySelector('.pvm-display');
    const indicador = form.querySelector('.indicador-pvm');
    const mensajeSpan = form.querySelector('.mensaje-pvm');

    if (!precioVentaInput || !costoInput || !margenInput || !pvmDisplay || !indicador) return;

    const costo = parseFloat(costoInput.value) || 0;
    const margen = parseFloat(margenInput.value) || 30;
    const pvm = store.calcularPVM(costo, margen);
    const precioVenta = parseFloat(precioVentaInput.value) || 0;

    pvmDisplay.textContent = '$' + pvm.toFixed(2);

    let color = '#7c7ca8';
    let icono = '•';
    let mensaje = '';

    if (precioVenta === 0) {
        color = '#7c7ca8';
        icono = '•';
        mensaje = 'Ingresa un precio de venta';
    } else if (precioVenta < pvm) {
        color = '#ff5252';
        icono = '✕';
        mensaje = '¡Por debajo del mínimo!';
    } else if (precioVenta >= pvm * 1.1) {
        color = '#00e676';
        icono = '✓';
        mensaje = 'Margen óptimo';
    } else {
        color = '#ffab00';
        icono = '⚠';
        mensaje = 'Cerca del mínimo';
    }

    indicador.style.color = color;
    indicador.textContent = icono;
    indicador.title = mensaje;
    indicador.style.display = 'inline-block';

    if (mensajeSpan) {
        mensajeSpan.textContent = mensaje;
        mensajeSpan.style.color = color;
    }

    precioVentaInput.style.borderColor = color;
}

// ============================================================
// RENDERIZAR PRODUCTOS Y CATEGORÍAS
// ============================================================
export function rCP() {
    const container = document.getElementById('cPills');
    if (!container) return;
    container.innerHTML = store.cats.map(c => {
        return `<button class="pi${c === cCat ? ' active' : ''}" onclick="window.dispatchEvent(new CustomEvent('inventario:setCat', { detail: '${c}' }))">${c}</button>`;
    }).join('');
}

export async function rP() {
    if (cSub !== 'productos') {
        console.log('⏭️ rP() ignorado porque cSub =', cSub);
        return;
    }

    if (!store._initialized) {
        await refreshData();
    }
    const productos = store.getProductosActivos();
    if (!productos || productos.length === 0) {
        renderEmptyState();
        return;
    }
    renderProductList(productos);

    mostrarVista('productos');
}
window.rP = rP;

function toggleClearBtn() {
    const input = document.getElementById('pSrch');
    const btn = document.getElementById('clearBtn');
    if (btn && input) {
        btn.style.display = input.value.length > 0 ? 'block' : 'none';
    }
}
window.toggleClearBtn = toggleClearBtn;

function renderProductList(productos) {
    const s = (document.getElementById('pSrch') ? document.getElementById('pSrch').value : '').toLowerCase();
    const filtered = productos.filter(p => {
        return (cCat === 'Todos' || p.c === cCat) &&
               (p.n.toLowerCase().includes(s) || p.c.toLowerCase().includes(s) || (p.area && p.area.toLowerCase().includes(s)) ||
                (p.marca && p.marca.toLowerCase().includes(s)) || (p.modelo && p.modelo.toLowerCase().includes(s)));
    });

    const total = document.getElementById('pT');
    const low = document.getElementById('pL');
    const cost = document.getElementById('pCV');
    const list = document.getElementById('pList');
    const hpTotal = document.getElementById('hpTotal');
    const hpLow = document.getElementById('hpLow');

    if (total) total.textContent = productos.length;
    if (low) low.textContent = productos.filter(p => p.q <= p.mn).length;
    if (hpTotal) hpTotal.textContent = productos.length;
    if (hpLow) hpLow.textContent = productos.filter(p => p.q <= p.mn).length;

    let totalCost = 0;
    productos.forEach(p => totalCost += p.q * p.cost);
    if (cost) cost.textContent = '$' + totalCost.toFixed(0);

    if (!list) return;

    if (filtered.length === 0 && s.length > 0) {
        list.innerHTML = `
            <div class="es" style="padding:30px 20px; border:2px dashed #252550; border-radius:12px;">
                <i class="fas fa-plus-circle" style="font-size:34px;color:#00e676;margin-bottom:10px;display:block;"></i>
                <p style="font-size:13px;color:#e6e6f4;font-weight:600;">No se encontró "${s}"</p>
                <p style="font-size:11px;color:#7c7ca8;margin:4px 0 12px;">¿Quieres agregarlo al inventario?</p>
                <button class="btn-module green" onclick="window.oVENewProduct('${s}')" 
                        style="display:inline-block;padding:8px 20px;border-radius:8px;border:1px solid #00e676;background:transparent;color:#00e676;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;">
                    <i class="fas fa-plus"></i> Agregar "${s}"
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(p => {
        const lowStock = p.q <= p.mn;
        const margin = Math.round((1 - p.cost / p.sale) * 100);
        const areaColor = getAreaColor(p.area);
        const areaBadge = `<span style="background:${areaColor};color:#fff;padding:2px 8px;border-radius:10px;font-size:8px;font-weight:600;margin-left:4px;display:inline-block;">${p.area}</span>`;
        return `<div class="pit" onclick="window.sPD('${p.id}')">
            <div class="pdt ${lowStock ? 'low' : 'ok'}"></div>
            <div class="pif"><div class="pnm">${p.n} ${areaBadge}</div><div class="pct">${p.c} · ${p.loc}</div></div>
            <div class="prt"><div class="pqt">${p.q}</div>
            <div class="ppr">$${p.sale.toFixed(2)} <span style="color:var(--green);font-size:8px">+${margin}%</span></div>
            <div class="pst ${lowStock ? 'low' : 'ok'}">${lowStock ? 'Bajo stock' : 'Normal'}</div></div>
        </div>`;
    }).join('');
}

function renderEmptyState() {
    const list = document.getElementById('pList');
    if (!list) return;
    list.innerHTML = `
        <div class="es" style="padding:40px 20px;">
            <i class="fas fa-box-open" style="font-size:40px;opacity:0.4;margin-bottom:12px;display:block;"></i>
            <p style="font-size:13px;color:#e6e6f4;font-weight:600;">No hay productos en el inventario</p>
            <p style="font-size:11px;color:#7c7ca8;margin-top:4px;">Agrega un nuevo producto usando el botón +</p>
        </div>
    `;
}

// ============================================================
// FUNCIÓN PARA MOSTRAR UNA VISTA ESPECÍFICA
// ============================================================
function mostrarVista(vista) {
    const todas = document.querySelectorAll('.sv');
    console.log('🔍 Mostrando solo vista:', vista);
    console.log('📦 Elementos encontrados:', todas.length);
    todas.forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    });

    const target = document.getElementById('sv-' + vista);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
        console.log('✅ Mostrado:', 'sv-' + vista);
    } else {
        console.error('❌ No existe el elemento #sv-' + vista);
    }

    document.querySelectorAll('.st').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.st[data-s="${vista}"]`);
    if (tab) tab.classList.add('active');
}

// ============================================================
// DETALLE DEL PRODUCTO
// ============================================================
export async function sPD(id) {
    await store.init();
    const productos = store.getProductos();
    const p = productos.find(x => x.id === id);
    if (!p) { utils.showToast('Producto no encontrado'); return; }
    const areaColor = getAreaColor(p.area);

    const pvm = p.precio_venta_minimo || store.calcularPVM(p.cost, p.margen_ganancia || 30);
    const margen = p.margen_ganancia || 30;

    let html = `<p class="mt"><i class="fas fa-box"></i> ${p.n}</p>
        <div class="dr"><span class="dl">Área</span><span class="dv" style="color:${areaColor};font-weight:600;">${p.area}</span></div>`;
    if (p.marca && p.marca !== 'N/A') {
        html += `<div class="dr"><span class="dl">Marca</span><span class="dv">${p.marca}</span></div>`;
    }
    if (p.modelo && p.modelo !== 'N/A') {
        html += `<div class="dr"><span class="dl">Modelo</span><span class="dv">${p.modelo}</span></div>`;
    }
    html += `<div class="dr"><span class="dl">Precio ponderado</span><span class="dv" style="color:var(--green);font-weight:700;">$${p.cost.toFixed(4)}</span></div>
        <div class="dr"><span class="dl">P.V.M. (${margen}%)</span><span class="dv" style="color:var(--amber);font-weight:700;">$${pvm.toFixed(2)}</span></div>
        <div class="dr"><span class="dl">Margen de ganancia</span><span class="dv">${margen}%</span></div>
        <div class="dr"><span class="dl">Proveedor</span><span class="dv">${p.sup}</span></div>
        <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="bp" onclick="window.oVEAddStock('${p.id}'); window.cM();" style="flex:1; min-width:100px;">
                <i class="fas fa-plus-circle"></i> Agregar stock
            </button>
            <button class="bp" onclick="window.oEEditarProducto('${p.id}'); window.cM();" style="flex:1; min-width:100px; background:var(--blue);">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="bp" onclick="window.eliminarProducto('${p.id}'); window.cM();" style="flex:1; min-width:100px; background:var(--red);">
                <i class="fas fa-trash-alt"></i> Eliminar
            </button>
        </div>`;

    utils.openModal(html);
}
window.sPD = sPD;

// ============================================================
// ELIMINACIÓN LÓGICA DE PRODUCTO
// ============================================================
window.eliminarProducto = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este producto? (La eliminación es lógica, no se perderán datos históricos)')) return;
    await store.init();
    const success = store.deleteProducto(id);
    if (success) {
        utils.showToast('✅ Producto eliminado lógicamente');
        await rP();
        window.sync?.emitState();   // 🔥 NUEVO: notificar al motor de sync
    } else {
        utils.showToast('❌ Error al eliminar');
    }
};

// ============================================================
// EDITAR PRODUCTO
// ============================================================
export function oEEditarProducto(productId) {
    (async () => {
        await store.init();
        const productos = store.getProductos();
        const p = productos.find(x => x.id === productId);
        if (!p) { utils.showToast('Producto no encontrado'); return; }

        const areaOpts = store.areas.map(a => 
            `<option value="${a}" ${a === p.area ? 'selected' : ''}>${a}</option>`
        ).join('');

        const html = `
            <p class="mt"><i class="fas fa-edit"></i> Editar producto: ${p.n}</p>
            <form id="editProductForm" onsubmit="window.guardarEdicionProducto(event)">
                <input type="hidden" id="editProductId" value="${p.id}">
                <div class="fg_"><label>Nombre</label><input type="text" id="editNombre" required value="${p.n}"></div>
                <div class="fg_"><label>Área</label><select id="editArea" required>${areaOpts}</select></div>
                <div class="fg_"><label>Marca</label><input type="text" id="editMarca" value="${p.marca !== 'N/A' ? p.marca : ''}" placeholder="Marca (opcional)"></div>
                <div class="fg_"><label>Modelo</label><input type="text" id="editModelo" value="${p.modelo !== 'N/A' ? p.modelo : ''}" placeholder="Modelo (opcional)"></div>
                <div class="fg_"><label>Ubicación</label><input type="text" id="editUbicacion" required value="${p.loc}"></div>
                <div class="fg_"><label>Stock mínimo</label><input type="number" id="editStockMin" required min="0" value="${p.mn}"></div>

                <div class="fr">
                    <div class="fg_"><label>Precio de compra ($)</label><input type="number" id="editCosto" class="precio-costo" required min="0" step="0.01" value="${p.cost}"></div>
                    <div class="fg_"><label>Margen de ganancia (%)</label><input type="number" id="editMargen" class="margen-input" required min="0" step="0.5" value="${p.margen_ganancia || 30}"></div>
                </div>

                <div class="fg_">
                    <label>Precio de venta ($)</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" id="editSale" class="precio-venta" required min="0" step="0.01" value="${p.sale}" style="flex:1;">
                        <span class="indicador-pvm" style="font-size:20px; display:none; width:30px; text-align:center;"></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px;">
                        <span style="font-size:11px; color:#7c7ca8;">
                            P.V.M. sugerido: <span class="pvm-display" style="color:#00e676; font-weight:600;">$${p.precio_venta_minimo ? p.precio_venta_minimo.toFixed(2) : '0.00'}</span>
                        </span>
                        <span class="mensaje-pvm" style="font-size:11px; font-weight:500;"></span>
                    </div>
                </div>

                <div class="fg_"><label>Proveedor</label><input type="text" id="editProveedor" required value="${p.sup}"></div>
                <button type="submit" class="bp" style="background:var(--blue);">Guardar cambios</button>
            </form>
        `;
        utils.openModal(html);

        setTimeout(() => {
            const form = document.getElementById('editProductForm');
            if (!form) return;

            const precioVenta = form.querySelector('.precio-venta');
            const costo = form.querySelector('.precio-costo');
            const margen = form.querySelector('.margen-input');

            const update = () => actualizarPVM('editProductForm');

            if (precioVenta) precioVenta.addEventListener('input', update);
            if (costo) costo.addEventListener('input', update);
            if (margen) margen.addEventListener('input', update);

            setTimeout(update, 100);
        }, 100);
    })();
}
window.oEEditarProducto = oEEditarProducto;

window.guardarEdicionProducto = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const area = document.getElementById('editArea').value;
    const marca = document.getElementById('editMarca').value.trim() || 'N/A';
    const modelo = document.getElementById('editModelo').value.trim() || 'N/A';
    const ubicacion = document.getElementById('editUbicacion').value.trim() || 'S/A';
    const stockMin = parseFloat(document.getElementById('editStockMin').value) || 10;
    const costo = parseFloat(document.getElementById('editCosto').value);
    const sale = parseFloat(document.getElementById('editSale').value);
    const margen = parseFloat(document.getElementById('editMargen').value);
    const proveedor = document.getElementById('editProveedor').value.trim();

    if (!nombre || !area || isNaN(costo) || isNaN(sale) || isNaN(margen) || !proveedor) {
        utils.showToast('Todos los campos son obligatorios');
        return;
    }

    const pvm = store.calcularPVM(costo, margen);
    if (sale < pvm) {
        if (!confirm(`⚠️ El precio de venta ($${sale.toFixed(2)}) es menor al PVM sugerido ($${pvm.toFixed(2)}). ¿Deseas continuar?`)) {
            return;
        }
    }

    await store.init();
    const success = store.updateProducto(id, {
        n: nombre,
        area: area,
        marca: marca,
        modelo: modelo,
        loc: ubicacion,
        mn: stockMin,
        cost: costo,
        sale: sale,
        margen_ganancia: margen,
        sup: proveedor
    });

    if (success) {
        utils.closeModal();
        await rP();
        window.sync?.emitState();   // 🔥 NUEVO: notificar al motor de sync
        utils.showToast('✅ Producto actualizado');
    } else {
        utils.showToast('❌ Error al actualizar');
    }
};

// ============================================================
// VALE DE ENTRADA - AGREGAR STOCK
// ============================================================
export function oVEAddStock(productId) {
    (async () => {
        await store.init();
        const productos = store.getProductos();
        const p = productos.find(x => x.id === productId);
        if (!p) { utils.showToast('Producto no encontrado'); return; }

        const now = new Date();
        const dt = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        const html = `
            <p class="mt"><i class="fas fa-file-invoice"></i> Vale de Entrada - Agregar stock</p>
            <form id="addStockForm" onsubmit="window.registrarValeAddStock(event)">
                <div style="background:#0b0b14; border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid #252550;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div style="font-size:16px; font-weight:700; color:#e6e6f4;">${p.n}</div>
                        <div style="background:${getAreaColor(p.area)}; padding:4px 12px; border-radius:12px; color:#fff; font-size:10px; font-weight:600;">${p.area}</div>
                    </div>
                    ${p.marca && p.marca !== 'N/A' ? `<div style="font-size:12px; color:#7c7ca8;">Marca: <span style="color:#e6e6f4;">${p.marca}</span></div>` : ''}
                    ${p.modelo && p.modelo !== 'N/A' ? `<div style="font-size:12px; color:#7c7ca8;">Modelo: <span style="color:#e6e6f4;">${p.modelo}</span></div>` : ''}
                    <div style="font-size:12px; color:#7c7ca8;">Stock actual: <span style="color:#e6e6f4; font-weight:600;">${p.q} uds</span></div>
                    <div style="font-size:12px; color:#7c7ca8;">Precio ponderado: <span style="color:#e6e6f4; font-weight:600;">$${p.cost.toFixed(4)}</span></div>
                </div>
                <input type="hidden" id="selectedProductId" value="${p.id}">

                <div class="fg_"><label>Cantidad a ingresar</label><input type="number" id="vQ" required min="1" value="1"></div>
                <div class="fg_"><label>Precio unitario de compra ($)</label><input type="number" id="vPC" required min="0" step="0.01" placeholder="0.00"></div>
                <div class="fg_"><label>Fecha y hora</label><input type="datetime-local" id="vDT" required value="${dt}"></div>
                <div class="fg_"><label>Proveedor</label><input type="text" id="vSup" placeholder="Nombre del proveedor"></div>
                <div class="fg_"><label>Folio / Referencia</label><input type="text" id="vRef" placeholder="Ej: FAC-009"></div>
                <button type="submit" class="bp">Registrar entrada</button>
            </form>
        `;
        utils.openModal(html);
    })();
}
window.oVEAddStock = oVEAddStock;

window.registrarValeAddStock = async function(e) {
    e.preventDefault();
    const productId = document.getElementById('selectedProductId').value;
    const qty = parseFloat(document.getElementById('vQ').value);
    const pc = parseFloat(document.getElementById('vPC').value);
    const dt = document.getElementById('vDT').value;
    const sup = document.getElementById('vSup').value.trim();
    const ref = document.getElementById('vRef').value.trim();

    if (!qty || qty <= 0 || !pc || pc < 0) {
        utils.showToast('Datos inválidos');
        return;
    }

    await store.init();
    const productos = store.getProductos();
    const p = productos.find(x => x.id === productId);
    if (!p) { utils.showToast('Producto no encontrado'); return; }

    const nuevoCosto = (p.q * p.cost + qty * pc) / (p.q + qty);
    p.cost = nuevoCosto;
    p.q += qty;
    if (sup) p.sup = sup;
    if (p.margen_ganancia !== undefined) {
        p.precio_venta_minimo = store.calcularPVM(nuevoCosto, p.margen_ganancia);
    }
    p.updatedAt = new Date().toISOString();
    p.syncStatus = 'pending';
    p.version = (p.version || 1) + 1;
    store.saveData();

    const dtShow = dt.replace('T', ' ').substring(0, 16);
    store.addMovimiento({
        t: 'entrada',
        pi: productId,
        q: qty,
        pc: pc,
        dt: dtShow,
        r: 'Vale de entrada - Agregar stock',
        ref: ref || 'V-' + String(store.M.length + 1).padStart(3, '0')
    });

    utils.closeModal();
    await rP();
    await rM();
    const hpTotal = document.getElementById('hpTotal');
    const hpLow = document.getElementById('hpLow');
    if (hpTotal) hpTotal.textContent = store.P.length;
    if (hpLow) hpLow.textContent = store.P.filter(p => p.q <= p.mn).length;

    window.sync?.emitState();   // 🔥 NUEVO: notificar al motor de sync
    utils.showToast('✅ Stock actualizado');
};

// ============================================================
// VALE DE ENTRADA - NUEVO PRODUCTO
// ============================================================
export function oVENewProduct(prefillName = '') {
    (async () => {
        await store.init();
        const areaOpts = store.areas.map(a => `<option value="${a}">${a}</option>`).join('');
        const now = new Date();
        const dt = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        const html = `
            <p class="mt"><i class="fas fa-file-invoice"></i> Vale de Entrada - Nuevo producto</p>
            <form id="newProductForm" onsubmit="window.registrarValeNewProduct(event)">
                <div class="fg_"><label>Nombre</label><input type="text" id="vNN" required placeholder="Nombre del producto" value="${prefillName}"></div>
                <div class="fg_"><label>Categoría</label><select id="vNC" required>${store.cats.slice(1).map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                <div class="fg_"><label>Área</label><select id="vNArea" required>${areaOpts}</select></div>
                <div class="fg_"><label>Marca</label><input type="text" id="vNMarca" placeholder="Marca (opcional)"></div>
                <div class="fg_"><label>Modelo</label><input type="text" id="vNModelo" placeholder="Modelo (opcional)"></div>
                <div class="fg_"><label>Ubicación</label><input type="text" id="vNL" required placeholder="Ej: A-01"></div>
                <div class="fg_"><label>Stock mínimo</label><input type="number" id="vNM" required min="0" value="10"></div>

                <div class="fr">
                    <div class="fg_"><label>Precio de compra ($)</label><input type="number" id="vPC" class="precio-costo" required min="0" step="0.01" placeholder="0.00"></div>
                    <div class="fg_"><label>Margen de ganancia (%)</label><input type="number" id="vNMargen" class="margen-input" required min="0" step="0.5" value="30"></div>
                </div>

                <div class="fg_">
                    <label>Precio de venta ($)</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" id="vNS" class="precio-venta" required min="0" step="0.01" style="flex:1;">
                        <span class="indicador-pvm" style="font-size:20px; display:none; width:30px; text-align:center;"></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px;">
                        <span style="font-size:11px; color:#7c7ca8;">
                            P.V.M. sugerido: <span class="pvm-display" style="color:#00e676; font-weight:600;">$0.00</span>
                        </span>
                        <span class="mensaje-pvm" style="font-size:11px; font-weight:500;"></span>
                    </div>
                </div>

                <div class="fg_"><label>Cantidad a ingresar</label><input type="number" id="vQ" required min="1" value="1"></div>
                <div class="fg_"><label>Fecha y hora</label><input type="datetime-local" id="vDT" required value="${dt}"></div>
                <div class="fg_"><label>Proveedor</label><input type="text" id="vSup" placeholder="Nombre del proveedor"></div>
                <div class="fg_"><label>Folio / Referencia</label><input type="text" id="vRef" placeholder="Ej: FAC-009"></div>
                <button type="submit" class="bp">Crear producto y registrar entrada</button>
            </form>
        `;
        utils.openModal(html);

        setTimeout(() => {
            const form = document.getElementById('newProductForm');
            if (!form) return;

            const precioVenta = form.querySelector('.precio-venta');
            const costo = form.querySelector('.precio-costo');
            const margen = form.querySelector('.margen-input');

            const update = () => actualizarPVM('newProductForm');

            if (precioVenta) precioVenta.addEventListener('input', update);
            if (costo) costo.addEventListener('input', update);
            if (margen) margen.addEventListener('input', update);

            setTimeout(update, 100);
        }, 100);
    })();
}
window.oVENewProduct = oVENewProduct;

// ============================================================
// REGISTRAR NUEVO PRODUCTO CON MOVIMIENTOS
// ============================================================
window.registrarValeNewProduct = async function(e) {
    e.preventDefault();
    const nn = document.getElementById('vNN').value.trim();
    const area = document.getElementById('vNArea').value;
    const qty = parseFloat(document.getElementById('vQ').value);
    const pc = parseFloat(document.getElementById('vPC').value);
    const dt = document.getElementById('vDT').value;
    const sup = document.getElementById('vSup').value.trim();
    const ref = document.getElementById('vRef').value.trim();
    const margen = parseFloat(document.getElementById('vNMargen').value) || 30;

    if (!nn) { utils.showToast('Nombre requerido'); return; }
    if (!area) { utils.showToast('Área requerida'); return; }
    if (!qty || qty <= 0 || !pc || pc < 0) {
        utils.showToast('Cantidad y precio válidos');
        return;
    }

    const sale = parseFloat(document.getElementById('vNS').value);
    const pvm = store.calcularPVM(pc, margen);
    if (sale < pvm) {
        if (!confirm(`⚠️ El precio de venta ($${sale.toFixed(2)}) es menor al PVM sugerido ($${pvm.toFixed(2)}). ¿Deseas continuar?`)) {
            return;
        }
    }

    await store.init();
    const nuevoProducto = {
        n: nn,
        c: document.getElementById('vNC').value,
        area: area,
        marca: document.getElementById('vNMarca').value.trim() || 'N/A',
        modelo: document.getElementById('vNModelo').value.trim() || 'N/A',
        q: qty,
        mn: parseFloat(document.getElementById('vNM').value),
        cost: pc,
        sale: sale,
        sup: sup || 'Sin proveedor',
        loc: document.getElementById('vNL').value.trim() || 'S/A',
        margen_ganancia: margen
    };
    const created = store.addProducto(nuevoProducto);

    const dtShow = dt.replace('T', ' ').substring(0, 16);
    store.addMovimiento({
        t: 'entrada',
        pi: created.id,
        q: qty,
        pc: pc,
        dt: dtShow,
        r: 'Vale de entrada - Nuevo producto',
        ref: ref || 'V-' + String(store.M.length + 1).padStart(3, '0')
    });

    utils.closeModal();

    mostrarVista('productos');
    cSub = 'productos';
    router.updateFAB();

    await rP();
    await rM();

    const hpTotal = document.getElementById('hpTotal');
    const hpLow = document.getElementById('hpLow');
    if (hpTotal) hpTotal.textContent = store.P.length;
    if (hpLow) hpLow.textContent = store.P.filter(p => p.q <= p.mn).length;

    const mList = document.getElementById('mList');
    if (mList) mList.innerHTML = '';

    window.sync?.emitState();   // 🔥 NUEVO: notificar al motor de sync
    utils.showToast('✅ Producto creado y entrada registrada');
};

// ============================================================
// MOVIMIENTOS
// ============================================================
export function rMF() {
    const container = document.getElementById('mPills');
    if (!container) return;
    container.innerHTML = store.mFilters.map(f => {
        return `<button class="pi${f.k === cMF ? ' active' : ''}" onclick="window.dispatchEvent(new CustomEvent('inventario:setMF', { detail: '${f.k}' }))">${f.l}</button>`;
    }).join('');
}

export async function rM() {
    await store.init();
    const movimientos = store.getMovimientos();
    const ins = movimientos.filter(m => m.t === 'entrada').length;
    const outs = movimientos.filter(m => m.t === 'salida').length;

    const elIn = document.getElementById('mIn');
    const elOut = document.getElementById('mOut');
    const elTot = document.getElementById('mTot');
    if (elIn) elIn.textContent = ins;
    if (elOut) elOut.textContent = outs;
    if (elTot) elTot.textContent = movimientos.length;

    const filtered = cMF === 'todas' ? movimientos : movimientos.filter(m => m.t === cMF);
    const list = document.getElementById('mList');
    if (!list) return;
    if (!filtered.length) {
        list.innerHTML = '<div class="es"><i class="fas fa-exchange-alt"></i><p>Sin movimientos</p></div>';
        return;
    }

    const productos = store.getProductos();
    list.innerHTML = filtered.slice().reverse().map(m => {
        const p = productos.find(x => x.id === m.pi);
        const pn = p ? p.n + ' (' + p.area + ')' : 'Producto #' + (p ? p._oldId : m.pi);
        const total = (m.q * m.pc).toFixed(2);
        return `<div class="mit ${m.t}">
            <div class="mtt"><span class="mtp ${m.t}">${m.t === 'entrada' ? '▲ Entrada' : '▲ Salida'}</span><span style="font-size:13px;font-weight:800;color:var(--text)">${m.q} uds</span></div>
            <div class="mtn">${pn}</div>
            <div class="mtnu">Costo unitario: <strong>$${m.pc.toFixed(2)}</strong> &middot; Total: <strong>$${total}</strong></div>
            <div class="mtd"><i class="far fa-clock"></i> ${m.dt}${m.ref ? ' &middot; ' + m.ref : ''}</div>
        </div>`;
    }).join('');
}

// ============================================================
// SALIDA DE ALMACÉN
// ============================================================
export function oSE() {
    (async () => {
        await store.init();
        const productos = store.getProductosActivos();
        const opts = productos.map(p => `<option value="${p.id}">${p.n} (${p.area} - ${p.q} uds)</option>`).join('');
        const html = `<p class="mt"><i class="fas fa-arrow-up"></i> Salida de Almacén</p>
            <form id="salidaForm" onsubmit="window.registrarSalida(event)">
                <div class="fg_"><label>Producto</label><select id="sP" required>${opts}</select></div>
                <div class="fg_"><label>Cantidad</label><input type="number" id="sQ" required min="1" value="1"></div>
                <div class="fg_"><label>Motivo</label><select id="sR" required><option value="Uso interno">Uso interno</option><option value="Venta">Venta</option><option value="Ajuste">Ajuste</option><option value="Devolución">Devolución</option></select></div>
                <div class="fg_"><label>Referencia</label><input type="text" id="sRef" placeholder="Ej: OS-014"></div>
                <button type="submit" class="bp" style="background:var(--red)">Registrar Salida</button>
            </form>`;
        utils.openModal(html);
    })();
}
window.oSE = oSE;

window.registrarSalida = async function(e) {
    e.preventDefault();
    const pid = document.getElementById('sP').value;
    const qty = parseFloat(document.getElementById('sQ').value);
    const p = store.getProductos().find(x => x.id === pid);
    if (!p) { utils.showToast('Producto no encontrado'); return; }
    if (qty > p.q) { utils.showToast('Stock insuficiente (disponible: ' + p.q + ')'); return; }

    p.q -= qty;
    p.updatedAt = new Date().toISOString();
    p.syncStatus = 'pending';
    p.version = (p.version || 1) + 1;
    store.saveData();

    const now = new Date();
    const dt = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    store.addMovimiento({
        t: 'salida',
        pi: pid,
        q: qty,
        pc: p.sale,
        dt: dt,
        r: document.getElementById('sR').value,
        ref: document.getElementById('sRef').value.trim() || ''
    });

    utils.closeModal();
    await rP();
    await rM();
    const hpTotal = document.getElementById('hpTotal');
    const hpLow = document.getElementById('hpLow');
    if (hpTotal) hpTotal.textContent = store.P.length;
    if (hpLow) hpLow.textContent = store.P.filter(p => p.q <= p.mn).length;

    window.sync?.emitState();   // 🔥 NUEVO: notificar al motor de sync
    utils.showToast('✅ Salida registrada: -' + qty + ' ' + p.n);
};

// ============================================================
// ANÁLISIS
// ============================================================
export async function rA() {
    await store.init();
    const productos = store.getProductos();
    let totalCost = 0, totalSale = 0;
    productos.forEach(p => {
        totalCost += p.q * p.cost;
        totalSale += p.q * p.sale;
    });

    const aCV = document.getElementById('aCV');
    const aSV = document.getElementById('aSV');
    const aPV = document.getElementById('aPV');
    if (aCV) aCV.textContent = '$' + totalCost.toFixed(0);
    if (aSV) aSV.textContent = '$' + totalSale.toFixed(0);
    if (aPV) aPV.textContent = '$' + (totalSale - totalCost).toFixed(0);

    const categories = store.cats.slice(1);
    const margins = [];
    categories.forEach(c => {
        const prods = productos.filter(p => p.c === c);
        if (!prods.length) return;
        let cost = 0, sale = 0;
        prods.forEach(p => {
            cost += p.cost;
            sale += p.sale;
        });
        margins.push({ n: c, m: Math.round((1 - cost / sale) * 100) });
    });
    margins.sort((a, b) => b.m - a.m);
    const max = Math.max(...margins.map(c => c.m)) || 1;
    const colors = ['var(--green)','var(--cyan)','var(--blue)','var(--amber)','var(--purple)','var(--red)','var(--green)','var(--cyan)'];

    const barsContainer = document.getElementById('mBars');
    if (barsContainer) {
        barsContainer.innerHTML = margins.map((c, i) => {
            const width = Math.max(5, (c.m / max) * 100);
            return `<div class="mr"><span class="mrl">${c.n}</span><div class="mrt"><div class="mrf" style="width:${width}%;background:${colors[i % colors.length]}"></div></div><span class="mrp" style="color:${colors[i % colors.length]}">${c.m}%</span></div>`;
        }).join('');
    }

    const top = productos.slice().map(p => ({ ...p, profit: (p.sale - p.cost) * p.q, margin: Math.round((1 - p.cost / p.sale) * 100) }))
        .sort((a, b) => b.profit - a.profit).slice(0, 5);

    const topContainer = document.getElementById('tProd');
    if (topContainer) {
        topContainer.innerHTML = top.map((p, i) => {
            const areaColor = getAreaColor(p.area);
            return `<div class="tpi" onclick="window.sPD('${p.id}')">
                <div class="tprk">${i + 1}</div>
                <div class="tpin"><div class="tpn">${p.n} <span style="font-size:8px;color:${areaColor};">(${p.area})</span></div><div class="tpc">${p.c} · +${p.margin}%</div></div>
                <div class="tpv">$${p.profit.toFixed(2)}</div>
            </div>`;
        }).join('');
    }
}

// ============================================================
// SALARIOS - CON FILTRO POR MES ACTUAL
// ============================================================
export function rS() {
    (async () => {
        await store.init();
        const ordenes = store.getOrdenes();
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const ordenesMes = ordenes.filter(o => {
            const dateParts = o.dt.split('-');
            if (dateParts.length >= 2) {
                const oYear = parseInt(dateParts[0]);
                const oMonth = parseInt(dateParts[1]) - 1;
                return oYear === currentYear && oMonth === currentMonth;
            }
            return false;
        });

        const method = document.getElementById('sM') ? document.getElementById('sM').value : 'percent';
        const rate = parseFloat(document.getElementById('sR') ? document.getElementById('sR').value : 30) || 0;
        const dedPct = parseFloat(document.getElementById('sD') ? document.getElementById('sD').value : 15) || 0;

        let totalIncome = 0;
        ordenesMes.forEach(o => totalIncome += o.am);

        const gross = method === 'percent' ? (totalIncome * rate / 100) : (ordenesMes.length * rate);
        const ded = gross * (dedPct / 100);
        const net = gross - ded;

        const res = document.getElementById('sRes');
        if (res) {
            res.innerHTML = `<p class="ctt" style="margin-bottom:8px"><i class="fas fa-calculator"></i> Resultado del mes</p>
                <div class="srr"><span class="srl">Ingreso total servicios (mes)</span><span class="srv" style="color:var(--blue)">$${totalIncome.toLocaleString()}</span></div>
                <div class="srr"><span class="srl">Método</span><span class="srv" style="color:var(--text-dim);font-weight:500">${method === 'percent' ? rate + '% del ingreso' : '$' + rate + ' por servicio'}</span></div>
                <div class="srr"><span class="srl">Salario bruto</span><span class="srv green">$${gross.toFixed(2)}</span></div>
                <div class="srr"><span class="srl">Deducciones (${dedPct}%)</span><span class="srv red">-$${ded.toFixed(2)}</span></div>
                <div class="srr total"><span class="srl" style="font-weight:700;color:var(--text)">Salario neto</span><span class="srv green" style="font-size:18px">$${net.toFixed(2)}</span></div>`;
        }

        const list = document.getElementById('sList');
        if (list) {
            list.innerHTML = ordenesMes.slice().reverse().map(o => {
                const earn = method === 'percent' ? (o.am * rate / 100) : rate;
                return `<div class="sli"><div class="slic"><i class="fas fa-wrench"></i></div><div class="slii"><div class="slid">${o.sv}</div><div class="slidt">${o.cl} · ${o.dt}</div></div><div class="sliA">+$${earn.toFixed(2)}</div></div>`;
            }).join('');
        }
    })();
}

// ============================================================
// MANEJO DE TABS
// ============================================================
function setupTabs() {
    const container = document.getElementById('view-container');
    if (!container) return;

    container.addEventListener('click', function(e) {
        const tb = e.target.closest('.st');
        if (!tb) return;
        if (!tb.dataset.s) return;

        e.stopPropagation();

        const newSub = tb.dataset.s;
        if (newSub === cSub) return;

        console.log('🔄 Cambiando a:', newSub);
        cSub = newSub;

        mostrarVista(newSub);
        
        window.dispatchEvent(new CustomEvent('inventario:tabChanged', { detail: cSub }));
        router.updateFAB();

        if (cSub === 'movimientos') {
            rM();
        } else if (cSub === 'analisis') {
            rA();
        } else if (cSub === 'salarios') {
            rS();
        } else if (cSub === 'productos') {
            rP();
        }
    });
}

// ============================================================
// INICIALIZACIÓN DEL MÓDULO
// ============================================================
export function initInventario() {
    window.cM = utils.closeModal;
    window.showToast = utils.showToast;

    (async () => {
        await refreshData();
        rCP();
        await rP();
        rMF();
        await rM();
        await rA();
        rS();
        setupTabs();
        window.dispatchEvent(new CustomEvent('inventario:tabChanged', { detail: cSub }));
        router.updateFAB();
    })();

    window.addEventListener('inventario:setCat', e => {
        cCat = e.detail;
        rCP();
        rP();
    });

    window.addEventListener('inventario:setMF', e => {
        cMF = e.detail;
        rMF();
        rM();
    });

    const sM = document.getElementById('sM');
    const sR = document.getElementById('sR');
    const sD = document.getElementById('sD');
    if (sM) sM.addEventListener('change', rS);
    if (sR) sR.addEventListener('input', rS);
    if (sD) sD.addEventListener('input', rS);
}

export default {
    init: initInventario,
    rP,
    rM,
    rA,
    rS,
    rCP,
    rMF,
    oVEAddStock,
    oVENewProduct,
    oSE,
    sPD,
    oEEditarProducto
};