// ============================================================
// SYNC ENGINE
// ============================================================
import { store } from './store.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MIN_TIME_BETWEEN_SYNCS = 30 * 1000;

class SyncEngine {
    constructor() {
        this.timer = null;
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.lastSyncAttempt = 0;
        this.lastSyncSuccess = null;
        this.lastError = null;
        this.listeners = [];
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        console.log('🔄 Sync Engine iniciando...');

        window.addEventListener('online', () => {
            console.log('🌐 Conexión recuperada');
            this.isOnline = true;
            this.emitState();
            setTimeout(() => this.syncNow('online-event'), 2000);
        });

        window.addEventListener('offline', () => {
            console.log('📴 Sin conexión');
            this.isOnline = false;
            this.emitState();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const elapsed = Date.now() - (this.lastSyncSuccess || 0);
                if (elapsed > SYNC_INTERVAL_MS) {
                    this.syncNow('visibility-event');
                }
            }
        });

        this.schedulePeriodicSync();
        setTimeout(() => this.syncNow('app-start'), 3000);

        this.emitState();
        console.log('✅ Sync Engine listo');
    }

    schedulePeriodicSync() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.syncNow('periodic');
        }, SYNC_INTERVAL_MS);
    }

    async syncNow(reason = 'manual') {
        const elapsed = Date.now() - this.lastSyncAttempt;
        if (elapsed < MIN_TIME_BETWEEN_SYNCS && reason !== 'manual') {
            console.log('⏭️ Sync saltado (demasiado pronto)');
            return null;
        }

        if (this.isSyncing) {
            console.log('⏭️ Sync ya en progreso');
            return null;
        }

        if (!this.isOnline) {
            console.log('📴 Sin conexión, sync cancelado');
            return null;
        }

        if (!window._getConfig) return null;
        const config = await window._getConfig();
        if (!config.backendConnected || !config.backendToken) {
            console.log('⚠️ No hay sesión de backend activa');
            this.emitState();
            return null;
        }

        this.isSyncing = true;
        this.lastSyncAttempt = Date.now();
        this.emitState('syncing');

        try {
            console.log(`🔄 Sincronizando (${reason})...`);

            const { api } = await import('./api.js');
            const pending = store.getPendingChanges();
            const totalPending = ['C', 'P', 'M', 'O', 'TX', 'G'].reduce(
                (acc, k) => acc + (pending[k] || []).length, 0
            );

            if (totalPending > 0) {
                console.log(`📤 Subiendo ${totalPending} cambios...`);
                const payload = this.buildPayload(pending);
                const pushResult = await api.syncPush(payload);

                console.log('📤 Resultado del push:', pushResult);

                // 🔥 FIX: incluye 'OM' para procesar la respuesta de materiales
                ['C', 'P', 'M', 'O', 'OM', 'TX', 'G'].forEach(key => {
                    const synced = (pushResult[key] && pushResult[key].synced) || [];
                    if (synced.length > 0) {
                        store.markAsSynced(key, synced);
                    }
                });

                // 🔥 FIX: incluye 'OM' para reportar conflictos de materiales
                ['C', 'P', 'M', 'O', 'OM', 'TX', 'G'].forEach(key => {
                    const conflicts = (pushResult[key] && pushResult[key].conflicts) || [];
                    if (conflicts.length > 0) {
                        console.warn(`⚠️ Conflictos en ${key}:`, conflicts);
                    }
                });
            }

            console.log('📥 Descargando cambios del servidor...');
            const data = await api.syncPull();
            store.applyServerData(data);

            this.lastSyncSuccess = Date.now();
            this.lastError = null;

            try {
                const cfg = await window._getConfig();
                cfg.lastSync = new Date().toISOString();
                await window._saveConfig(cfg);
            } catch (e) {}

            console.log('✅ Sync completado');
            this.emitState('synced');
            this.notifyListeners({ type: 'success', pending: totalPending });
            return { success: true, pending: totalPending };

        } catch (error) {
            console.error('❌ Error en sync:', error);
            this.lastError = error.message;

            if (error.message && error.message.includes('Sesión expirada')) {
                try {
                    const cfg = await window._getConfig();
                    cfg.backendConnected = false;
                    cfg.backendToken = '';
                    cfg.backendRefresh = '';
                    await window._saveConfig(cfg);
                } catch (e) {}
            }

            this.emitState('error');
            this.notifyListeners({ type: 'error', error });
            return { success: false, error };
        } finally {
            this.isSyncing = false;
            this.emitState();
        }
    }

    buildPayload(pending) {
        const toServerFormat = (record, type) => {
            const base = {
                id: record.id,
                created_at: record.createdAt,
                updated_at: record.updatedAt,
                deleted_at: record.deletedAt,
                sync_status: 'synced',
                version: record.version,
            };

            switch (type) {
                case 'P':
                    return {
                        ...base,
                        n: record.n, c: record.c, area: record.area,
                        marca: record.marca, modelo: record.modelo,
                        q: record.q, mn: record.mn, cost: record.cost,
                        sale: record.sale, sup: record.sup, loc: record.loc,
                        margen_ganancia: record.margen_ganancia,
                        precio_venta_minimo: record.precio_venta_minimo,
                        eliminado: record.eliminado,
                        _old_id: record._oldId || null,
                    };
                case 'M':
                    return {
                        ...base,
                        t: record.t, pi: record.pi, q: record.q,
                        pc: record.pc, dt: record.dt, r: record.r, ref: record.ref,
                    };
                case 'O':
                    return {
                        ...base,
                        codigo: record.codigo,
                        tipo_flujo: record.tipo_flujo,
                        tipo_trabajo: record.tipo_trabajo,
                        es_complejo: record.es_complejo,
                        cliente: record.cliente,
                        equipo_tipo: record.equipo_tipo,
                        equipo_marca: record.equipo_marca,
                        equipo_modelo: record.equipo_modelo,
                        area: record.area,
                        area_nombre: record.area_nombre,   // 🔥 NUEVO: enviar nombre del área
                        tecnico_id: record.tecnico_id,
                        jefe_asigno_id: record.jefe_asigno_id,
                        estado: record.estado,
                        is_ingreso: record.is_ingreso,
                        tmu: record.tmu,
                        ctmu: record.ctmu,
                        cis: record.cis,
                        cisb: record.cisb,
                        pago_tecnico_calculado: record.pago_tecnico_calculado,
                        pago_tecnico_final: record.pago_tecnico_final,
                        pago_editado_por_admin: record.pago_editado_por_admin,
                        penalizacion: record.penalizacion,
                        garantia_dias: record.garantia_dias,
                        notas_tecnico: record.notas_tecnico,
                        notas_cliente: record.notas_cliente,
                    };
                case 'TX':
                    return {
                        ...base,
                        t: record.t, d: record.d, a: record.a, dt: record.dt,
                    };
                case 'G':
                    return {
                        ...base,
                        codigo: record.codigo, cliente: record.cliente,
                        producto: record.producto, desc: record.desc,
                        fecha_inicio: record.fechaInicio,
                        fecha_fin: record.fechaFin,
                        estado: record.estado, orden: record.orden,
                    };
                case 'C':
                    return {
                        ...base,
                        nombre: record.nombre,
                        telefono: record.telefono,
                        email: record.email || '',
                        direccion: record.direccion || '',
                        notas: record.notas || '',
                    };
            }
        };

        return {
            C: (pending.C || []).map(r => toServerFormat(r, 'C')),
            P: (pending.P || []).map(r => toServerFormat(r, 'P')),
            M: (pending.M || []).map(r => toServerFormat(r, 'M')),
            O: (pending.O || []).map(r => toServerFormat(r, 'O')),
            // 🔥 FIX: aplanar materiales de todas las órdenes pendientes
            OM: (pending.O || []).flatMap(o =>
                (o.materiales || []).map(m => ({
                    id: m.id,
                    orden: o.id,
                    producto_id: m.producto_id,
                    producto_nombre: m.producto_nombre,
                    cantidad: m.cantidad,
                    costo_unitario: m.costo_unitario,
                    subtotal: m.subtotal,
                    created_at: m.createdAt || o.createdAt || new Date().toISOString(),
                    updated_at: m.updatedAt || o.updatedAt || new Date().toISOString(),
                    sync_status: 'synced',
                    version: m.version || 1,
                }))
            ),
            TX: (pending.TX || []).map(r => toServerFormat(r, 'TX')),
            G: (pending.G || []).map(r => toServerFormat(r, 'G')),
        };
    }

    getVisualState() {
        if (this.isSyncing) return 'syncing';
        if (!this.isOnline) return 'offline';

        const pending = store.getPendingChanges();
        const totalPending = ['C', 'P', 'M', 'O', 'TX', 'G'].reduce(
            (acc, k) => acc + (pending[k] || []).length, 0
        );

        if (this.lastError) return 'offline';
        if (totalPending > 0) return 'pending';
        return 'synced';
    }

    emitState(overrideState = null) {
        const state = overrideState || this.getVisualState();
        this.updateIndicator(state);
    }

    updateIndicator(state) {
        const indicator = document.getElementById('syncIndicator');
        if (!indicator) return;

        indicator.classList.remove('synced', 'pending', 'offline', 'syncing');
        indicator.classList.add(state);

        const titles = {
            synced: 'Todo sincronizado',
            pending: 'Cambios pendientes por subir',
            offline: 'Sin conexión al servidor',
            syncing: 'Sincronizando...'
        };
        indicator.title = titles[state] || 'Estado de sincronización';
    }

    addListener(fn) {
        this.listeners.push(fn);
    }

    notifyListeners(event) {
        this.listeners.forEach(fn => {
            try { fn(event); } catch (e) { console.error(e); }
        });
    }

    async forceSync() {
        this.lastSyncAttempt = 0;
        return await this.syncNow('manual');
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }
}

export const sync = new SyncEngine();
window.sync = sync;