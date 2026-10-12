// ============================================================
// UUID HELPER - Generación y validación de UUIDs v4
// ============================================================

export const uuid = {
    // Genera un UUID v4
    v4() {
        // Usar crypto.randomUUID si está disponible
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        // Fallback manual
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    },

    // Verifica si un string es un UUID v4
    isUUID(str) {
        if (typeof str !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    }
};

export function getUUID() {
    return uuid.v4();
}