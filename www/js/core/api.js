// ============================================================
// API CLIENT - Comunicación con el backend Django
// ============================================================

export const api = {
    async getBackendUrl() {
        if (!window._getConfig) return 'http://127.0.0.1:8000';
        const config = await window._getConfig();
        return config.backendUrl || 'http://127.0.0.1:8000';
    },

    async getToken() {
        if (!window._getConfig) return null;
        const config = await window._getConfig();
        return config.backendToken || null;
    },

    async saveTokens(access, refresh) {
        if (!window._getConfig || !window._saveConfig) return;
        const config = await window._getConfig();
        config.backendToken = access;
        config.backendRefresh = refresh;
        config.backendConnected = true;
        await window._saveConfig(config);
    },

    async clearTokens() {
        if (!window._getConfig || !window._saveConfig) return;
        const config = await window._getConfig();
        config.backendToken = '';
        config.backendRefresh = '';
        config.backendConnected = false;
        await window._saveConfig(config);
    },

    async request(method, endpoint, body = null, requiresAuth = true) {
        const baseUrl = await this.getBackendUrl();
        const url = baseUrl.replace(/\/$/, '') + endpoint;

        const headers = { 'Content-Type': 'application/json' };

        if (requiresAuth) {
            const token = await this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);

            if (response.status === 401 && requiresAuth) {
                const refreshed = await this.refreshToken();
                if (refreshed) return this.request(method, endpoint, body, requiresAuth);
                throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(error.detail || `Error ${response.status}`);
            }

            if (response.status === 204) return null;
            return await response.json();
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    },

    async login(username, password) {
        const baseUrl = await this.getBackendUrl();
        const url = baseUrl.replace(/\/$/, '') + '/api/auth/login/';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Usuario o contraseña incorrectos');
            throw new Error(`Error del servidor (${response.status})`);
        }

        const data = await response.json();
        await this.saveTokens(data.access, data.refresh);
        return data;
    },

    async refreshToken() {
        const config = await window._getConfig();
        if (!config.backendRefresh) return false;

        try {
            const baseUrl = await this.getBackendUrl();
            const url = baseUrl.replace(/\/$/, '') + '/api/auth/refresh/';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: config.backendRefresh }),
            });

            if (!response.ok) return false;

            const data = await response.json();
            config.backendToken = data.access;
            await window._saveConfig(config);
            return true;
        } catch (error) {
            console.error('Error refreshing token:', error);
            return false;
        }
    },

    async testConnection() {
        try {
            const baseUrl = await this.getBackendUrl();
            const url = baseUrl.replace(/\/$/, '') + '/api/auth/login/';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: '_test_', password: '_test_' }),
            });
            return response.status === 200 || response.status === 401;
        } catch (error) {
            return false;
        }
    },

    async getProductos() {
        return this.request('GET', '/api/productos/');
    },

    async createProducto(producto) {
        return this.request('POST', '/api/productos/', producto);
    },

    async updateProducto(id, data) {
        return this.request('PATCH', `/api/productos/${id}/`, data);
    },

    async deleteProducto(id) {
        return this.request('DELETE', `/api/productos/${id}/`);
    },

    async getTecnicos(areaId = null) {
        let endpoint = '/api/auth/users/tecnicos/';
        if (areaId) endpoint += `?area_id=${areaId}`;
        return this.request('GET', endpoint);
    },

    async agregarMaterialOrden(ordenId, material) {
        return this.request('POST', `/api/ordenes/${ordenId}/agregar_material/`, material);
    },

    async quitarMaterialOrden(ordenId, materialId) {
        return this.request('POST', `/api/ordenes/${ordenId}/quitar_material/`, {
            material_id: materialId,
        });
    },

    async getResumenPagos(desde = null, hasta = null, tecnicoId = null) {
        const params = [];
        if (desde) params.push(`desde=${encodeURIComponent(desde)}`);
        if (hasta) params.push(`hasta=${encodeURIComponent(hasta)}`);
        if (tecnicoId) params.push(`tecnico_id=${encodeURIComponent(tecnicoId)}`);
        const endpoint = '/api/pagos-tecnicos/resumen/' + (params.length ? '?' + params.join('&') : '');
        return this.request('GET', endpoint);
    },

    async repararPagosFaltantes() {
        return this.request('POST', '/api/pagos-tecnicos/reparar_faltantes/', {});
    },

    // 🔥 Crear venta (flujo simplificado)
    async crearVenta(data) {
        return this.request('POST', '/api/ordenes/crear_venta/', data);
    },

    // 🔥 Resolver garantía (cliente vuelve por garantía)
    async resolverGarantia(ordenId, data) {
        return this.request('POST', `/api/ordenes/${ordenId}/resolver_garantia/`, data);
    },

    // 🔥 CONFIGURACIÓN DEL BACKEND
    async getConfiguracionAll() {
        return this.request('GET', '/api/configuracion/all/');
    },

    async getConfiguracionLista() {
        return this.request('GET', '/api/configuracion/');
    },

    async crearConfiguracion(data) {
        return this.request('POST', '/api/configuracion/', data);
    },

    async actualizarConfiguracion(id, data) {
        return this.request('PATCH', `/api/configuracion/${id}/`, data);
    },

    async setConfiguracionByClave(clave, valor, descripcion = '') {
        const lista = await this.getConfiguracionLista();
        const existente = Array.isArray(lista) ? lista.find(c => c.clave === clave) : null;
        if (existente) {
            return this.actualizarConfiguracion(existente.id, { valor, descripcion });
        }
        return this.crearConfiguracion({ clave, valor, descripcion });
    },

    async syncPull(since = null) {
        const endpoint = since
            ? `/api/sync/pull/?since=${encodeURIComponent(since)}`
            : '/api/sync/pull/';
        return this.request('GET', endpoint);
    },

    async syncPush(data) {
        return this.request('POST', '/api/sync/push/', data);
    }
};

window.api = api;