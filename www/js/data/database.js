// ============================================================
// DATABASE - SQLite (Capacitor Community)
// ============================================================
import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

let dbInstance = null;

export class Database {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return this.db;

        try {
            const sqlite = new SQLiteConnection(Capacitor);
            const dbName = 'dfabrik.db';
            // Verificar si existe conexión
            const isConn = await sqlite.isConnection(dbName, false);
            if (isConn.result) {
                this.db = await sqlite.retrieveConnection(dbName, false);
            } else {
                this.db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
            }
            await this.db.open();
            await this.createTables();
            this.initialized = true;
            return this.db;
        } catch (error) {
            console.error('Error initializing SQLite:', error);
            throw error;
        }
    }

    async createTables() {
        const queries = [
            // Productos
            `CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                area TEXT NOT NULL,
                marca TEXT,
                modelo TEXT,
                cantidad INTEGER NOT NULL DEFAULT 0,
                stock_minimo INTEGER NOT NULL DEFAULT 0,
                costo REAL NOT NULL DEFAULT 0,
                precio_venta REAL NOT NULL DEFAULT 0,
                proveedor TEXT,
                ubicacion TEXT
            );`,
            // Movimientos
            `CREATE TABLE IF NOT EXISTS movimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL,
                tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
                cantidad INTEGER NOT NULL,
                precio_unitario REAL NOT NULL,
                fecha TEXT NOT NULL,
                razon TEXT,
                referencia TEXT,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            );`,
            // Órdenes
            `CREATE TABLE IF NOT EXISTS ordenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                cliente TEXT NOT NULL,
                servicio TEXT NOT NULL,
                estado TEXT NOT NULL CHECK(estado IN ('activa', 'en_proceso', 'finalizada')),
                fecha TEXT NOT NULL,
                monto REAL NOT NULL
            );`,
            // Transacciones
            `CREATE TABLE IF NOT EXISTS transacciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT NOT NULL CHECK(tipo IN ('income', 'expense')),
                descripcion TEXT NOT NULL,
                monto REAL NOT NULL,
                fecha TEXT NOT NULL
            );`,
            // Garantías
            `CREATE TABLE IF NOT EXISTS garantias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                cliente TEXT NOT NULL,
                producto TEXT NOT NULL,
                descripcion TEXT,
                fecha_inicio TEXT NOT NULL,
                fecha_fin TEXT NOT NULL,
                estado TEXT NOT NULL CHECK(estado IN ('activa', 'vencida', 'finalizada')),
                orden_id INTEGER,
                FOREIGN KEY (orden_id) REFERENCES ordenes(id)
            );`
        ];

        for (const query of queries) {
            try {
                await this.db.execute(query);
            } catch (e) {
                console.warn('Error creating table (maybe already exists):', e);
            }
        }
    }

    // Consultas genéricas
    async query(sql, params = []) {
        const db = await this.init();
        return db.query(sql, params);
    }

    async execute(sql, params = []) {
        const db = await this.init();
        return db.execute(sql, params);
    }

    async getOne(sql, params = []) {
        const result = await this.query(sql, params);
        return result.values ? result.values[0] : null;
    }

    async getAll(sql, params = []) {
        const result = await this.query(sql, params);
        return result.values || [];
    }

    async insert(table, data) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(',');
        const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
        const values = keys.map(k => data[k]);
        const result = await this.execute(sql, values);
        return result.changes?.lastId || null;
    }

    async update(table, id, data) {
        const keys = Object.keys(data);
        const setClause = keys.map(k => `${k} = ?`).join(',');
        const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
        const values = [...keys.map(k => data[k]), id];
        await this.execute(sql, values);
        return true;
    }

    async delete(table, id) {
        const sql = `DELETE FROM ${table} WHERE id = ?`;
        await this.execute(sql, [id]);
        return true;
    }

    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
            this.initialized = false;
        }
    }
}

export const db = new Database();