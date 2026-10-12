// ============================================================
// STORE - ESTADO GLOBAL CON localStorage, UUIDs Y SYNC
// ============================================================
import { db } from '../data/db.js';
import { uuid } from './uuid.js';

const SCHEMA_VERSION = 3;

class Store {
    constructor() {
        this.cats = ['Todos', 'Equipo', 'Piezas', 'Partes', 'Insumos'];
        this.areas = [];
        this.areasFull = [];
        this.P = [];
        this.M = [];
        this.O = [];
        this.TX = [];
        this.G = [];
        this.C = [];
        this.CFG = {};
        this.cSub = 'productos';
        this.cCat = 'Todos';
        this.cMF = 'todas';
        this.currentView = 'dashboard';
        this.mFilters = [
            { k: 'todas', l: 'Todas' },
            { k: 'entrada', l: 'Entradas' },
            { k: 'salida', l: 'Salidas' }
        ];
        this._initialized = false;
    }

    loadData() {
        const stored = db.loadAll();
        if (stored) {
            this.P = stored.P || [];
            this.M = stored.M || [];
            this.O = stored.O || [];
            this.TX = stored.TX || [];
            this.G = stored.G || [];
            this.C = stored.C || [];
            this.CFG = stored.CFG || {};
            this.areasFull = stored.areasFull || [];
            this.areas = this.areasFull.map(a => a.nombre);

            this.P = this.P.map(p => this._normalizeProducto(p));

            if (this.areas.length === 0) {
                this.areas = ['Electricidad', 'Electrónica', 'Baterías'];
                this.areasFull = [
                    { id: 'electricidad', nombre: 'Electricidad', color: '#ff6b6b' },
                    { id: 'electronica', nombre: 'Electrónica', color: '#4ecdc4' },
                    { id: 'baterias', nombre: 'Baterías', color: '#ffd93d' },
                ];
            }
        } else {
            const sample = db.getSampleData();
            this.P = (sample.P || []).map(p => this._normalizeProducto(p));
            this.M = sample.M || [];
            this.O = sample.O || [];
            this.TX = sample.TX || [];
            this.G = sample.G || [];
            this.areas = ['Electricidad', 'Electrónica', 'Baterías'];
            this.areasFull = [
                { id: 'electricidad', nombre: 'Electricidad', color: '#ff6b6b' },
                { id: 'electronica', nombre: 'Electrónica', color: '#4ecdc4' },
                { id: 'baterias', nombre: 'Baterías', color: '#ffd93d' },
            ];
        }
        this._initialized = true;
    }

    _normalizeProducto(p) {
        if (p.margen_ganancia === undefined) p.margen_ganancia = 30;
        if (p.precio_venta_minimo === undefined) {
            p.precio_venta_minimo = this.calcularPVM(p.cost, p.margen_ganancia);
        }
        if (p.eliminado === undefined) p.eliminado = false;
        return p;
    }

    saveData() {
        db.saveAll({
            _schemaVersion: SCHEMA_VERSION,
            P: this.P,
            M: this.M,
            O: this.O,
            TX: this.TX,
            G: this.G,
            C: this.C,
            CFG: this.CFG,
            areasFull: this.areasFull,
        });
    }

    async init() {
        if (!this._initialized) {
            this.loadData();
        }
        return true;
    }

    getProductos() { return this.P; }
    getMovimientos() { return this.M; }
    getOrdenes() { return this.O; }
    getTransacciones() { return this.TX; }
    getGarantias() { return this.G; }
    getClientes() { return this.C; }
    getConfig() { return this.CFG; }
    getAreas() { return this.areasFull; }
    getProductosActivos() { return this.P.filter(p => !p.eliminado); }

    calcularPVM(costo, margen) {
        return parseFloat((costo * (1 + margen / 100)).toFixed(4));
    }

    _touch(record) {
        const now = new Date().toISOString();
        record.updatedAt = now;
        record.syncStatus = 'pending';
        record.version = (record.version || 1) + 1;
        return record;
    }

    // ============================================================
    // CRUD PRODUCTOS
    // ============================================================
    addProducto(producto) {
        if (!producto.area || !this.areas.includes(producto.area)) {
            throw new Error('Área inválida: ' + this.areas.join(', '));
        }
        if (producto.margen_ganancia === undefined || producto.margen_ganancia === null) {
            producto.margen_ganancia = 30;
        }
        const now = new Date().toISOString();
        producto.id = uuid.v4();
        producto.precio_venta_minimo = this.calcularPVM(producto.cost, producto.margen_ganancia);
        producto.eliminado = false;
        producto.createdAt = now;
        producto.updatedAt = now;
        producto.deletedAt = null;
        producto.syncStatus = 'pending';
        producto.version = 1;
        this.P.push(producto);
        this.saveData();
        return producto;
    }

    updateProducto(id, data) {
        const idx = this.P.findIndex(p => p.id === id);
        if (idx === -1) return false;
        const current = this.P[idx];
        if (data.cost !== undefined || data.margen_ganancia !== undefined) {
            const nuevoCosto = data.cost !== undefined ? data.cost : current.cost;
            const nuevoMargen = data.margen_ganancia !== undefined ? data.margen_ganancia : (current.margen_ganancia || 30);
            data.precio_venta_minimo = this.calcularPVM(nuevoCosto, nuevoMargen);
        }
        this.P[idx] = this._touch({ ...current, ...data });
        this.saveData();
        return true;
    }

    deleteProducto(id) {
        const idx = this.P.findIndex(p => p.id === id);
        if (idx === -1) return false;
        this.P[idx].eliminado = true;
        this.P[idx].deletedAt = new Date().toISOString();
        this._touch(this.P[idx]);
        this.saveData();
        return true;
    }

    addMovimiento(movimiento) {
        const now = new Date().toISOString();
        movimiento.id = uuid.v4();
        movimiento.createdAt = now;
        movimiento.updatedAt = now;
        movimiento.deletedAt = null;
        movimiento.syncStatus = 'pending';
        movimiento.version = 1;
        this.M.push(movimiento);
        this.saveData();
        return movimiento;
    }

    addOrden(orden) {
        const now = new Date().toISOString();
        orden.id = uuid.v4();

        const codigos = this.O.map(o => o.codigo).filter(Boolean);
        let next = codigos.length + 1;
        let codigo = 'OS-' + String(next).padStart(3, '0');
        while (codigos.includes(codigo)) {
            next++;
            codigo = 'OS-' + String(next).padStart(3, '0');
        }
        orden.codigo = codigo;
        orden.estado = orden.estado || 'pendiente_asignacion';
        orden.tipo_flujo = orden.tipo_flujo || 'defectacion';
        orden.tipo_trabajo = orden.tipo_trabajo || 'DEF';
        orden.materiales = orden.materiales || [];
        orden.pausas = orden.pausas || [];
        orden.fecha_creacion = now;
        orden.createdAt = now;
        orden.updatedAt = now;
        orden.deletedAt = null;
        orden.syncStatus = 'pending';
        orden.version = 1;
        this.O.push(orden);
        this.saveData();
        return orden;
    }

    updateOrden(id, data) {
        const idx = this.O.findIndex(o => o.id === id);
        if (idx === -1) return false;
        this.O[idx] = this._touch({ ...this.O[idx], ...data });
        this.saveData();
        return true;
    }

    deleteOrden(id) {
        const idx = this.O.findIndex(o => o.id === id);
        if (idx === -1) return false;
        this.O[idx].deletedAt = new Date().toISOString();
        this._touch(this.O[idx]);
        this.saveData();
        return true;
    }

    addTransaccion(trans) {
        const now = new Date().toISOString();
        trans.id = uuid.v4();
        trans.createdAt = now;
        trans.updatedAt = now;
        trans.deletedAt = null;
        trans.syncStatus = 'pending';
        trans.version = 1;
        this.TX.push(trans);
        this.saveData();
        return trans;
    }

    addGarantia(garantia) {
        const now = new Date().toISOString();
        garantia.id = uuid.v4();
        const codigos = this.G.map(g => g.codigo).filter(Boolean);
        let next = codigos.length + 1;
        let codigo = 'G-' + String(next).padStart(3, '0');
        while (codigos.includes(codigo)) {
            next++;
            codigo = 'G-' + String(next).padStart(3, '0');
        }
        garantia.codigo = codigo;
        garantia.createdAt = now;
        garantia.updatedAt = now;
        garantia.deletedAt = null;
        garantia.syncStatus = 'pending';
        garantia.version = 1;
        this.G.push(garantia);
        this.saveData();
        return garantia;
    }

    addCliente(cliente) {
        const now = new Date().toISOString();
        cliente.id = uuid.v4();
        cliente.createdAt = now;
        cliente.updatedAt = now;
        cliente.deletedAt = null;
        cliente.syncStatus = 'pending';
        cliente.version = 1;
        this.C.push(cliente);
        this.saveData();
        return cliente;
    }

    updateCliente(id, data) {
        const idx = this.C.findIndex(c => c.id === id);
        if (idx === -1) return false;
        this.C[idx] = this._touch({ ...this.C[idx], ...data });
        this.saveData();
        return true;
    }

    getPendingChanges() {
        return {
            P: this.P.filter(x => x.syncStatus === 'pending'),
            M: this.M.filter(x => x.syncStatus === 'pending'),
            O: this.O.filter(x => x.syncStatus === 'pending'),
            TX: this.TX.filter(x => x.syncStatus === 'pending'),
            G: this.G.filter(x => x.syncStatus === 'pending'),
            C: this.C.filter(x => x.syncStatus === 'pending'),
        };
    }

    // ============================================================
    // MARCAR COMO SINCRONIZADO
    // 🔥 FIX: guard para 'OM' (no vive como colección en el store)
    // ============================================================
    markAsSynced(entityType, ids) {
        // 🔥 'OM' no es una colección del store. Los materiales ya
        // quedan marcados al sincronizarse la orden padre.
        if (entityType === 'OM') return;

        const collection = this[entityType];
        if (!collection) return;
        collection.forEach(rec => {
            if (ids.includes(rec.id)) {
                rec.syncStatus = 'synced';
            }
        });
        this.saveData();
    }

    // ============================================================
    // APLICAR DATOS DEL SERVIDOR (MERGE, no replace)
    // ============================================================
    applyServerData(serverData) {
        if (!serverData) return false;
        const now = new Date().toISOString();

        const merge = (localArray, serverArray, normalizer) => {
        const localMap = new Map(localArray.map(r => [r.id, r]));
        const merged = [];
        const codigosYaVistos = new Set();

        for (const raw of (serverArray || [])) {
            const serverRec = normalizer(raw);
            const localRec = localMap.get(serverRec.id);

            // Deduplicar por código
            if (serverRec.codigo && codigosYaVistos.has(serverRec.codigo)) {
                localMap.delete(serverRec.id);
                continue;
            }

            if (localRec && localRec.syncStatus === 'pending') {
                merged.push(localRec);
                if (localRec.codigo) codigosYaVistos.add(localRec.codigo);
            } else {
                // 🔥 FIX: si el servidor no trae materiales pero el local sí, conservarlos.
                // Esto evita que al cambiar de estado se "pierdan" los materiales
                // cuando el backend aún no los tenía sincronizados.
                if (
                    serverRec.materiales !== undefined &&
                    (!serverRec.materiales || serverRec.materiales.length === 0) &&
                    localRec && localRec.materiales && localRec.materiales.length > 0
                ) {
                    serverRec.materiales = localRec.materiales;
                }
                merged.push(serverRec);
                if (serverRec.codigo) codigosYaVistos.add(serverRec.codigo);
            }
            localMap.delete(serverRec.id);
        }

        // 🔥 CRÍTICO: Solo conservar locales que estén 'pending' (cambios sin subir)
        // Los locales que NO están en el servidor y NO están pendientes → se descartan
        for (const localRec of localMap.values()) {
            if (localRec.syncStatus === 'pending') {
                // Tiene cambios locales sin subir → mantener
                if (localRec.codigo && codigosYaVistos.has(localRec.codigo)) {
                    continue;
                }
                merged.push(localRec);
                if (localRec.codigo) codigosYaVistos.add(localRec.codigo);
            }
            // else: no está en servidor y no está pendiente → SE DESCARTA (basura)
        }

            return merged;
        };

        const normalizeProducto = (p) => ({
            id: p.id,
            n: p.n, c: p.c, area: p.area,
            marca: p.marca || 'N/A',
            modelo: p.modelo || 'N/A',
            q: parseFloat(p.q) || 0,
            mn: parseFloat(p.mn) || 0,
            cost: parseFloat(p.cost) || 0,
            sale: parseFloat(p.sale) || 0,
            sup: p.sup || 'Sin proveedor',
            loc: p.loc || 'S/A',
            margen_ganancia: parseFloat(p.margen_ganancia) || 30,
            precio_venta_minimo: parseFloat(p.precio_venta_minimo) || 0,
            eliminado: p.eliminado || false,
            _oldId: p._old_id || p._oldId || null,
            createdAt: p.created_at || p.createdAt || now,
            updatedAt: p.updated_at || p.updatedAt || now,
            deletedAt: p.deleted_at || p.deletedAt || null,
            syncStatus: 'synced',
            version: p.version || 1
        });

        const normalizeMovimiento = (m) => ({
            id: m.id, t: m.t, pi: m.pi,
            q: parseFloat(m.q) || 0,
            pc: parseFloat(m.pc) || 0,
            dt: m.dt,
            r: m.r || '',
            ref: m.ref || '',
            createdAt: m.created_at || m.createdAt || now,
            updatedAt: m.updated_at || m.updatedAt || now,
            deletedAt: m.deleted_at || m.deletedAt || null,
            syncStatus: 'synced',
            version: m.version || 1
        });

        const normalizeOrden = (o) => ({
            id: o.id,
            codigo: o.codigo || 'OS-000',
            tipo_flujo: o.tipo_flujo || 'defectacion',
            tipo_trabajo: o.tipo_trabajo || 'DEF',
            es_complejo: o.es_complejo || false,
            cliente: o.cliente || null,
            cliente_info: o.cliente_info || null,
            cliente_nombre: (o.cliente_info && o.cliente_info.nombre) || '',
            cliente_telefono: (o.cliente_info && o.cliente_info.telefono) || '',
            equipo_tipo: o.equipo_tipo || '',
            equipo_marca: o.equipo_marca || '',
            equipo_modelo: o.equipo_modelo || '',
            area: o.area || null,
            area_nombre: o.area_nombre || '',
            tecnico_id: o.tecnico_id || null,
            tecnico_nombre: o.tecnico_nombre || '',                  // 🔥 NUEVO
            jefe_asigno_id: o.jefe_asigno_id || null,
            jefe_asigno_nombre: o.jefe_asigno_nombre || '',          // 🔥 NUEVO
            fecha_asignacion: o.fecha_asignacion || null,
            estado: o.estado || 'pendiente_asignacion',
            fecha_creacion: o.fecha_creacion || now,
            fecha_inicio_trabajo: o.fecha_inicio_trabajo || null,
            fecha_fin_trabajo: o.fecha_fin_trabajo || null,
            fecha_cierre: o.fecha_cierre || null,
            fecha_entrega: o.fecha_entrega || null,
            tmu: parseFloat(o.tmu) || 0,
            ctmu: parseFloat(o.ctmu) || 0,
            materiales: o.materiales || [],
            is_ingreso: parseFloat(o.is_ingreso) || 0,
            cis: parseFloat(o.cis) || 0,
            cisb: parseFloat(o.cisb) || 0,
            pago_tecnico_calculado: parseFloat(o.pago_tecnico_calculado) || 0,
            pago_tecnico_final: parseFloat(o.pago_tecnico_final) || 0,
            pago_editado_por_admin: o.pago_editado_por_admin || false,
            penalizacion: parseFloat(o.penalizacion) || 0,
            garantia_dias: o.garantia_dias || 0,
            fecha_inicio_garantia: o.fecha_inicio_garantia || null,
            fecha_fin_garantia: o.fecha_fin_garantia || null,
            orden_original: o.orden_original || null,
            veces_reabierta: o.veces_reabierta || 0,
            pausas: o.pausas || [],
            notas_tecnico: o.notas_tecnico || '',
            notas_cliente: o.notas_cliente || '',
            createdAt: o.created_at || o.createdAt || now,
            updatedAt: o.updated_at || o.updatedAt || now,
            deletedAt: o.deleted_at || o.deletedAt || null,
            syncStatus: 'synced',
            version: o.version || 1
        });

        const normalizeTransaccion = (t) => ({
            id: t.id, t: t.t, d: t.d,
            a: parseFloat(t.a) || 0,
            dt: t.dt,
            createdAt: t.created_at || t.createdAt || now,
            updatedAt: t.updated_at || t.updatedAt || now,
            deletedAt: t.deleted_at || t.deletedAt || null,
            syncStatus: 'synced',
            version: t.version || 1
        });

        const normalizeGarantia = (g) => ({
            id: g.id,
            codigo: g.codigo || g.id,
            cliente: g.cliente,
            producto: g.producto,
            desc: g.desc || '',
            fechaInicio: g.fecha_inicio || g.fechaInicio || '',
            fechaFin: g.fecha_fin || g.fechaFin || '',
            estado: g.estado || 'activa',
            orden: g.orden || '',
            createdAt: g.created_at || g.createdAt || now,
            updatedAt: g.updated_at || g.updatedAt || now,
            deletedAt: g.deleted_at || g.deletedAt || null,
            syncStatus: 'synced',
            version: g.version || 1
        });

        const normalizeCliente = (c) => ({
            id: c.id,
            nombre: c.nombre || '',
            telefono: c.telefono || '',
            email: c.email || '',
            direccion: c.direccion || '',
            notas: c.notas || '',
            createdAt: c.created_at || c.createdAt || now,
            updatedAt: c.updated_at || c.updatedAt || now,
            deletedAt: c.deleted_at || c.deletedAt || null,
            syncStatus: 'synced',
            version: c.version || 1
        });

        this.P = merge(this.P, serverData.P, normalizeProducto);
        this.M = merge(this.M, serverData.M, normalizeMovimiento);
        this.O = merge(this.O, serverData.O, normalizeOrden);
        this.TX = merge(this.TX, serverData.TX, normalizeTransaccion);
        this.G = merge(this.G, serverData.G, normalizeGarantia);
        this.C = merge(this.C, serverData.C, normalizeCliente);

        if (serverData.AR && Array.isArray(serverData.AR)) {
            this.areasFull = serverData.AR.map(a => ({
                id: a.id,
                nombre: a.nombre,
                descripcion: a.descripcion || '',
                color: a.color || '#7c7ca8',
                activa: a.activa !== false,
            }));
            this.areas = this.areasFull.map(a => a.nombre);
        }

        if (serverData.CFG && typeof serverData.CFG === 'object') {
            this.CFG = serverData.CFG;
        }

        this.saveData();

        const pendingCounts = this.getPendingChanges();
        console.log('✅ Datos del servidor aplicados (MERGE):', {
            productos: this.P.length,
            movimientos: this.M.length,
            ordenes: this.O.length,
            transacciones: this.TX.length,
            garantias: this.G.length,
            clientes: this.C.length,
            areas: this.areas.length,
            pendientes: {
                P: pendingCounts.P.length,
                M: pendingCounts.M.length,
                O: pendingCounts.O.length,
                C: pendingCounts.C.length,
            },
        });
        return true;
    }
}

export const store = new Store();
window.store = store;