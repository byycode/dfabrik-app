
// ============================================================
// PUNTO DE ENTRADA PRINCIPAL
// ============================================================
import { router } from './core/router.js';
import { store } from './core/store.js';
import { utils } from './core/utils.js';
import { initInventario } from './modules/inventario.js';
import { initConfiguracion } from './modules/configuracion.js';
import { initDashboard } from './modules/dashboard.js';
import { sync } from './core/sync.js';   // 🔥 NUEVO
import { initOrdenes } from './modules/ordenes.js';
import { initGarantias } from './modules/garantias.js';
import { initFinanzas } from './modules/finanzas.js';   // 🔥 NUEVO


// Exponer funciones globales para onclick
window.showToast = utils.showToast;
window.cM = utils.closeModal;
window.goTo = router.goTo.bind(router);

// ============================================================
// MENÚ LATERAL (DRAWER)
// ============================================================
function initDrawer() {
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    const closeBtn = document.getElementById('drawerClose');
    const items = document.querySelectorAll('.drawer-item');

    if (!drawer || !overlay) {
        console.warn('⚠️ Drawer no encontrado. Verifica que existan #drawer y #drawerOverlay.');
        return;
    }

    function abrir() {
        drawer.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function cerrar() {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (menuBtn) menuBtn.addEventListener('click', abrir);
    if (closeBtn) closeBtn.addEventListener('click', cerrar);
    if (overlay) overlay.addEventListener('click', cerrar);

    items.forEach(item => {
        item.addEventListener('click', function() {
            const view = this.dataset.view;
            if (view) {
                cerrar();
                setTimeout(() => window.goTo(view), 150);
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            cerrar();
        }
    });

    console.log('✅ Drawer inicializado');
}

// ============================================================
// NOTIFICACIONES
// ============================================================
function initNotificaciones() {
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            window.showToast('3 notificaciones');
        });
    }
}

// ============================================================
// INDICADOR DE SINCRONIZACIÓN (click para sync manual)
// ============================================================
function initSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) {
        console.warn('⚠️ Indicador de sync no encontrado en el DOM');
        return;
    }

    indicator.addEventListener('click', async () => {
        if (!window.sync) return;

        window.showToast('Sincronizando...');
        const result = await window.sync.forceSync();

        if (result && result.success) {
            window.showToast('✅ Sincronizado');
        } else if (result && !result.success) {
            window.showToast('❌ ' + (result.error || 'Error'));
        } else {
            window.showToast('⚠️ No hay conexión configurada');
        }
    });

    console.log('✅ Indicador de sync inicializado');
}

// ============================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando D.Fabrik...');

    // Cargar datos en el store
    store.loadData();

    // Inicializar router
    router.init();

    // 🔥 Registrar módulos (incluyendo dashboard)
    router.registerModule('dashboard', initDashboard);
    router.registerModule('inventario', initInventario);
    router.registerModule('ordenes', initOrdenes);
    router.registerModule('garantias', initGarantias);
    router.registerModule('finanzas', initFinanzas);   // 🔥 NUEVO
    try {
        router.registerModule('configuracion', initConfiguracion);
    } catch (e) {
        console.warn('⚠️ Módulo de configuración no disponible:', e.message);
    }

    // Inicializar drawer y notificaciones
    initDrawer();
    initNotificaciones();
    initSyncIndicator();

    // 🔥 Inicializar motor de sincronización
    sync.init();

    // Cargar vista inicial
    router.goTo('dashboard');
});
