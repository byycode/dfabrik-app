// ============================================================
// MÓDULO DE CONFIGURACIÓN / AJUSTES GENERALES
// ============================================================

const CONFIG_KEY = 'dfabrik_config';

const DEFAULT_CONFIG = {
    nombre: 'Mi taller',
    logo: '',
    telefono: '',
    email: '',
    direccion: '',
    tema: 'dark',
    encabezado: 'D.Fabrik - Electrónica',
    pie: 'Gracias por su preferencia',

    monedaPrincipal: 'CUP',
    simboloCUP: '₱',
    simboloUSD: '$',
    tasaCambio: 320.00,
    redondeo: '2',

    backendUrl: 'http://127.0.0.1:8000',
    backendUser: '',
    backendToken: '',
    backendRefresh: '',
    backendConnected: false,
    lastSync: null
};

// ============================================================
// FILESYSTEM (lazy)
// ============================================================
let _filesystemModule = null;

async function getFilesystem() {
    if (_filesystemModule !== null) return _filesystemModule;
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) {
            _filesystemModule = false;
            return false;
        }
        const fs = await import('@capacitor/filesystem');
        _filesystemModule = fs;
        return fs;
    } catch (e) {
        _filesystemModule = false;
        return false;
    }
}

// ============================================================
// PERSISTENCIA LOCAL
// ============================================================
async function cargarConfiguracion() {
    try {
        const fs = await getFilesystem();
        if (fs) {
            const result = await fs.Filesystem.readFile({
                path: 'config.json',
                directory: fs.Directory.Data,
                encoding: fs.Encoding.UTF8
            });
            const config = JSON.parse(result.data);
            return { ...DEFAULT_CONFIG, ...config };
        } else {
            const raw = localStorage.getItem(CONFIG_KEY);
            if (raw) {
                const config = JSON.parse(raw);
                return { ...DEFAULT_CONFIG, ...config };
            }
        }
    } catch (error) {
        console.warn('⚠️ No se pudo cargar configuración, usando valores por defecto.');
    }
    return { ...DEFAULT_CONFIG };
}

async function guardarConfiguracion(config) {
    try {
        const fs = await getFilesystem();
        if (fs) {
            await fs.Filesystem.writeFile({
                path: 'config.json',
                data: JSON.stringify(config, null, 2),
                directory: fs.Directory.Data,
                encoding: fs.Encoding.UTF8
            });
        } else {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        }
        return true;
    } catch (error) {
        console.error('❌ Error al guardar configuración:', error);
        return false;
    }
}

// ============================================================
// 🔥 COMISIONES DE VENTA
// ============================================================
const COMISIONES_DEFAULT = {
    Equipo:  { valor: 5, tipo: 'porcentaje' },
    Partes:  { valor: 3, tipo: 'porcentaje' },
    Piezas:  { valor: 2, tipo: 'porcentaje' },
    Insumos: { valor: 1, tipo: 'porcentaje' },
};

async function cargarComisionesBackend() {
    try {
        const { api } = await import('../core/api.js');
        const all = await api.getConfiguracionAll();
        if (all && all.comisiones_venta) {
            return { ...COMISIONES_DEFAULT, ...JSON.parse(all.comisiones_venta) };
        }
    } catch (e) {
        console.warn('⚠️ No se pudieron cargar comisiones del backend:', e.message);
    }
    return { ...COMISIONES_DEFAULT };
}

async function guardarComisionesBackend(comisiones) {
    try {
        const { api } = await import('../core/api.js');
        await api.setConfiguracionByClave(
            'comisiones_venta',
            JSON.stringify(comisiones),
            'Comisiones de venta por categoría'
        );
        return true;
    } catch (e) {
        console.error('❌ Error al guardar comisiones:', e);
        return false;
    }
}

function aplicarComisionesAlForm(comisiones) {
    const cats = ['Equipo', 'Partes', 'Piezas', 'Insumos'];
    cats.forEach(cat => {
        const tipoEl = document.getElementById(`com${cat}Tipo`);
        const valorEl = document.getElementById(`com${cat}Valor`);
        const cfg = comisiones[cat] || COMISIONES_DEFAULT[cat];
        if (tipoEl) tipoEl.value = cfg.tipo || 'porcentaje';
        if (valorEl) valorEl.value = cfg.valor !== undefined ? cfg.valor : 0;
    });
}

function leerComisionesDelForm() {
    const cats = ['Equipo', 'Partes', 'Piezas', 'Insumos'];
    const result = {};
    cats.forEach(cat => {
        const tipoEl = document.getElementById(`com${cat}Tipo`);
        const valorEl = document.getElementById(`com${cat}Valor`);
        result[cat] = {
            tipo: tipoEl ? tipoEl.value : 'porcentaje',
            valor: parseFloat(valorEl ? valorEl.value : 0) || 0,
        };
    });
    return result;
}

// ============================================================
// TEMA
// ============================================================
function aplicarTema(tema) {
    const root = document.documentElement;
    if (tema === 'light') {
        root.style.setProperty('--bg', '#f5f5f5');
        root.style.setProperty('--surface', '#ffffff');
        root.style.setProperty('--surface-2', '#e8e8e8');
        root.style.setProperty('--border', '#cccccc');
        root.style.setProperty('--text', '#1a1a1a');
        root.style.setProperty('--text-dim', '#666666');
        root.style.setProperty('--text-faint', '#999999');
    } else {
        root.style.setProperty('--bg', '#0b0b14');
        root.style.setProperty('--surface', '#13132a');
        root.style.setProperty('--surface-2', '#1c1c3a');
        root.style.setProperty('--border', '#252550');
        root.style.setProperty('--text', '#e6e6f4');
        root.style.setProperty('--text-dim', '#7c7ca8');
        root.style.setProperty('--text-faint', '#4a4a72');
    }
}

// ============================================================
// CONVERSIÓN CAMEL → SNAKE (para envío al servidor)
// ============================================================
function toServerFormat(record, type) {
    const base = {
        id: record.id,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt,
        sync_status: record.syncStatus,
        version: record.version,
    };

    switch (type) {
        case 'P':
            return {
                ...base,
                n: record.n,
                c: record.c,
                area: record.area,
                marca: record.marca,
                modelo: record.modelo,
                q: record.q,
                mn: record.mn,
                cost: record.cost,
                sale: record.sale,
                sup: record.sup,
                loc: record.loc,
                margen_ganancia: record.margen_ganancia,
                precio_venta_minimo: record.precio_venta_minimo,
                eliminado: record.eliminado,
                _old_id: record._oldId || null,
            };
        case 'M':
            return {
                ...base,
                t: record.t,
                pi: record.pi,
                q: record.q,
                pc: record.pc,
                dt: record.dt,
                r: record.r,
                ref: record.ref,
            };
        case 'O':
            return {
                ...base,
                codigo: record.codigo,
                cl: record.cl,
                sv: record.sv,
                st: record.st,
                dt: record.dt,
                am: record.am,
            };
        case 'TX':
            return {
                ...base,
                t: record.t,
                d: record.d,
                a: record.a,
                dt: record.dt,
            };
        case 'G':
            return {
                ...base,
                codigo: record.codigo,
                cliente: record.cliente,
                producto: record.producto,
                desc: record.desc,
                fecha_inicio: record.fechaInicio,
                fecha_fin: record.fechaFin,
                estado: record.estado,
                orden: record.orden,
            };
    }
    return record;
}

// ============================================================
// CONEXIÓN AL BACKEND
// ============================================================
function mostrarEstadoConexion(conectado, mensaje = null) {
    const estado = document.getElementById('estadoConexion');
    if (!estado) return;

    if (conectado) {
        estado.innerHTML = `
            <i class="fas fa-circle" style="color:var(--green); font-size:8px;"></i>
            <span style="color:var(--green); font-weight:600;">Conectado al servidor</span>
        `;
    } else {
        estado.innerHTML = `
            <i class="fas fa-circle" style="color:var(--text-faint); font-size:8px;"></i>
            <span>${mensaje || 'Sin conexión configurada'}</span>
        `;
    }
}

async function conectarBackend() {
    const url = document.getElementById('cfgBackendUrl').value.trim();
    const user = document.getElementById('cfgBackendUser').value.trim();
    const pass = document.getElementById('cfgBackendPass').value;

    if (!url || !user || !pass) {
        window.showToast('Completa todos los campos de conexión');
        return;
    }

    const btn = document.getElementById('btnConectar');
    btn.disabled = true;
    const htmlOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';

    try {
        const config = await cargarConfiguracion();
        config.backendUrl = url;
        config.backendUser = user;
        await guardarConfiguracion(config);

        const { api } = await import('../core/api.js');
        await api.login(user, pass);

        mostrarEstadoConexion(true);
        window.showToast('✅ Conectado al servidor');
    } catch (error) {
        console.error(error);
        mostrarEstadoConexion(false, '❌ Error de conexión');
        window.showToast('❌ ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = htmlOriginal;
    }
}

async function desconectarBackend() {
    try {
        const { api } = await import('../core/api.js');
        await api.clearTokens();
        mostrarEstadoConexion(false);
        window.showToast('Desconectado del servidor');
    } catch (error) {
        console.error(error);
        window.showToast('❌ Error al desconectar');
    }
}

// ============================================================
// SINCRONIZACIÓN COMPLETA
// ============================================================
async function sincronizarCambios() {
    const btn = document.getElementById('btnSyncTest');
    const panel = document.getElementById('syncTestResult');
    const htmlOriginal = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
    panel.style.display = 'none';

    try {
        const { api } = await import('../core/api.js');
        const { store } = await import('../core/store.js');

        const pending = store.getPendingChanges();
        const countsPending = {
            P: (pending.P || []).length,
            M: (pending.M || []).length,
            O: (pending.O || []).length,
            TX: (pending.TX || []).length,
            G: (pending.G || []).length,
        };
        const totalPending = Object.values(countsPending).reduce((a, b) => a + b, 0);

        let pushResult = null;

        if (totalPending > 0) {
            const payload = {
                P: (pending.P || []).map(r => toServerFormat(r, 'P')),
                M: (pending.M || []).map(r => toServerFormat(r, 'M')),
                O: (pending.O || []).map(r => toServerFormat(r, 'O')),
                TX: (pending.TX || []).map(r => toServerFormat(r, 'TX')),
                G: (pending.G || []).map(r => toServerFormat(r, 'G')),
            };

            pushResult = await api.syncPush(payload);

            ['P', 'M', 'O', 'TX', 'G'].forEach(key => {
                const synced = (pushResult[key] && pushResult[key].synced) || [];
                if (synced.length > 0) {
                    store.markAsSynced(key, synced);
                }
            });
        }

        const data = await api.syncPull();
        store.applyServerData(data);

        const config = await cargarConfiguracion();
        config.lastSync = new Date().toISOString();
        await guardarConfiguracion(config);

        const counts = {
            productos: store.P.length,
            movimientos: store.M.length,
            ordenes: store.O.length,
            transacciones: store.TX.length,
            garantias: store.G.length,
        };

        let pushInfo = '';
        if (pushResult) {
            const conflictCount = ['P', 'M', 'O', 'TX', 'G'].reduce(
                (acc, k) => acc + ((pushResult[k] && pushResult[k].conflicts) ? pushResult[k].conflicts.length : 0), 0
            );
            pushInfo = `
                <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border);">
                    <p style="color:var(--text-dim); font-size:10px; margin-bottom:4px;">Cambios locales enviados:</p>
                    <div style="display:flex; justify-content:space-between; font-size:11px;">
                        <span>Subidos</span>
                        <strong style="color:var(--green);">${totalPending - conflictCount}</strong>
                    </div>
                    ${conflictCount > 0 ? `
                        <div style="display:flex; justify-content:space-between; font-size:11px;">
                            <span>Conflictos</span>
                            <strong style="color:var(--amber);">${conflictCount}</strong>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        panel.innerHTML = `
            <p style="color:var(--green); font-weight:600; margin-bottom:8px;">
                ✅ Sincronización completa
            </p>
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border);">
                <span>Productos</span>
                <strong style="color:var(--blue);">${counts.productos}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border);">
                <span>Movimientos</span>
                <strong style="color:var(--green);">${counts.movimientos}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border);">
                <span>Órdenes</span>
                <strong style="color:var(--amber);">${counts.ordenes}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border);">
                <span>Transacciones</span>
                <strong style="color:var(--purple);">${counts.transacciones}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;">
                <span>Garantías</span>
                <strong style="color:var(--cyan);">${counts.garantias}</strong>
            </div>
            ${pushInfo}
            <p style="color:var(--text-dim); font-size:10px; margin-top:8px;">
                Última sync: ${new Date().toLocaleString()}
            </p>
        `;
        panel.style.display = 'block';

        if (totalPending > 0) {
            window.showToast(`✅ Sincronizado: ${counts.productos} productos`);
        } else {
            window.showToast(`✅ Datos actualizados: ${counts.productos} productos`);
        }

        try {
            const dashboardModule = await import('./dashboard.js');
            if (dashboardModule && dashboardModule.initDashboard) {
                await dashboardModule.initDashboard();
            }
        } catch (e) {}
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        panel.innerHTML = `
            <p style="color:var(--red); font-weight:600; margin-bottom:4px;">
                ❌ Error al sincronizar
            </p>
            <p style="color:var(--text-dim); font-size:11px;">${error.message}</p>
        `;
        panel.style.display = 'block';
        window.showToast('❌ ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = htmlOriginal;
    }
}

// ============================================================
// INICIALIZAR VISTA DE CONFIGURACIÓN
// ============================================================
export async function initConfiguracion() {
    try {
        const config = await cargarConfiguracion();

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== undefined && val !== null ? val : '';
        };

        setVal('cfgNombre', config.nombre);
        setVal('cfgLogo', config.logo);
        setVal('cfgTelefono', config.telefono);
        setVal('cfgEmail', config.email);
        setVal('cfgDireccion', config.direccion);
        setVal('cfgTema', config.tema || 'dark');
        setVal('cfgEncabezado', config.encabezado);
        setVal('cfgPie', config.pie);

        setVal('cfgMonedaPrincipal', config.monedaPrincipal || 'CUP');
        setVal('cfgSimboloCUP', config.simboloCUP || '₱');
        setVal('cfgSimboloUSD', config.simboloUSD || '$');
        setVal('cfgTasaCambio', config.tasaCambio || 320);
        setVal('cfgRedondeo', config.redondeo || '2');

        setVal('cfgBackendUrl', config.backendUrl || 'http://127.0.0.1:8000');
        setVal('cfgBackendUser', config.backendUser || '');
        setVal('cfgBackendPass', '');

        aplicarTema(config.tema || 'dark');
        mostrarEstadoConexion(config.backendConnected);

        // 🔥 Cargar comisiones desde el backend (si hay conexión)
        let comisiones = { ...COMISIONES_DEFAULT };
        if (config.backendConnected && config.backendToken) {
            try {
                comisiones = await cargarComisionesBackend();
            } catch (e) {
                console.warn('⚠️ Usando comisiones por defecto:', e.message);
            }
        }
        aplicarComisionesAlForm(comisiones);

        const btnConectar = document.getElementById('btnConectar');
        const btnDesconectar = document.getElementById('btnDesconectar');
        const btnSyncTest = document.getElementById('btnSyncTest');

        if (btnConectar) btnConectar.onclick = conectarBackend;
        if (btnDesconectar) btnDesconectar.onclick = desconectarBackend;
        if (btnSyncTest) btnSyncTest.onclick = sincronizarCambios;

        window.guardarConfiguracion = guardarConfiguracionHandler;
        window.restablecerConfiguracion = restablecerConfiguracionHandler;
        window.conectarBackend = conectarBackend;
        window.desconectarBackend = desconectarBackend;
        window.sincronizarCambios = sincronizarCambios;
    } catch (error) {
        console.error('❌ Error al inicializar configuración:', error);
    }
}

// ============================================================
// MANEJADORES DE FORMULARIO
// ============================================================
async function guardarConfiguracionHandler(e) {
    e.preventDefault();

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const configActual = await cargarConfiguracion();

    const config = {
        nombre: getVal('cfgNombre').trim(),
        logo: getVal('cfgLogo').trim(),
        telefono: getVal('cfgTelefono').trim(),
        email: getVal('cfgEmail').trim(),
        direccion: getVal('cfgDireccion').trim(),
        tema: getVal('cfgTema'),
        encabezado: getVal('cfgEncabezado').trim(),
        pie: getVal('cfgPie').trim(),

        monedaPrincipal: getVal('cfgMonedaPrincipal'),
        simboloCUP: getVal('cfgSimboloCUP').trim() || '₱',
        simboloUSD: getVal('cfgSimboloUSD').trim() || '$',
        tasaCambio: parseFloat(getVal('cfgTasaCambio')) || 0,
        redondeo: getVal('cfgRedondeo'),

        backendUrl: getVal('cfgBackendUrl').trim() || 'http://127.0.0.1:8000',
        backendUser: getVal('cfgBackendUser').trim(),

        backendToken: configActual.backendToken || '',
        backendRefresh: configActual.backendRefresh || '',
        backendConnected: configActual.backendConnected || false,
        lastSync: configActual.lastSync || null
    };

    const success = await guardarConfiguracion(config);

    // 🔥 Guardar comisiones en el backend (si hay conexión)
    const comisiones = leerComisionesDelForm();
    let comisionesGuardadas = false;
    if (config.backendConnected && config.backendToken) {
        comisionesGuardadas = await guardarComisionesBackend(comisiones);
    }

    if (success) {
        aplicarTema(config.tema);
        if (comisionesGuardadas) {
            window.showToast('✅ Configuración y comisiones guardadas');
        } else if (config.backendConnected) {
            window.showToast('⚠️ Config guardada local, comisiones no sincronizadas');
        } else {
            window.showToast('✅ Configuración guardada');
        }
    } else {
        window.showToast('❌ Error al guardar');
    }
}

async function restablecerConfiguracionHandler() {
    if (!confirm('¿Restablecer todos los ajustes a sus valores por defecto?')) return;

    const success = await guardarConfiguracion(DEFAULT_CONFIG);
    if (success) {
        aplicarTema(DEFAULT_CONFIG.tema);
        await initConfiguracion();
        window.showToast('✅ Configuración restablecida');
    } else {
        window.showToast('❌ Error al restablecer');
    }
}

// ============================================================
// HELPERS EXPORTADOS
// ============================================================
export async function getConfig() {
    return await cargarConfiguracion();
}

export function formatearMoneda(monto, moneda = null, config = null) {
    if (!config) return '$' + Number(monto).toFixed(2);
    const m = moneda || config.monedaPrincipal;
    const simbolo = m === 'CUP' ? config.simboloCUP : config.simboloUSD;

    let decimales = 2;
    if (config.redondeo === 'whole') decimales = 0;
    else if (config.redondeo === '1') decimales = 1;
    else if (config.redondeo === '0') decimales = 4;

    const num = Number(monto) || 0;
    return simbolo + num.toFixed(decimales);
}

export function convertirMoneda(monto, desde, hacia, config) {
    if (!config || !config.tasaCambio) return monto;
    if (desde === hacia) return monto;

    if (desde === 'USD' && hacia === 'CUP') {
        return monto * config.tasaCambio;
    }
    if (desde === 'CUP' && hacia === 'USD') {
        return monto / config.tasaCambio;
    }
    return monto;
}

// ============================================================
// EXPONER PARA API CLIENT
// ============================================================
window._getConfig = cargarConfiguracion;
window._saveConfig = guardarConfiguracion;

export default {
    init: initConfiguracion,
    getConfig,
    formatearMoneda,
    convertirMoneda
};