// ============================================================
// ROUTER - NAVEGACIÓN Y CARGA DE VISTAS
// ============================================================
import { store } from './store.js';
import { utils } from './utils.js';

class Router {
    constructor() {
        this.modules = {};
        this.currentView = 'dashboard';
        this.container = null;
        this.fabS = null;
        this.fabB = null;
    }

    init() {
        console.log('🔧 Router.init() ejecutándose...');
        this.container = document.getElementById('view-container');
        if (!this.container) {
            return;
        }

        document.querySelectorAll('.nb').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const view = this.dataset.t;
                if (view) router.goTo(view);
            });
        });

        this.fabS = document.getElementById('fabS');
        this.fabB = document.getElementById('fabB');

        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) utils.closeModal();
            });
        }
    }

    registerModule(name, initFn) {
        this.modules[name] = initFn;
    }

    goTo(view) {
        if (view === 'home') view = 'dashboard';
        this.currentView = view;
        this.loadView(view);
    }

    loadView(view) {
        const container = this.container;
        if (!container) {
            return;
        }

        const url = 'sessions/' + view + '.html?v=' + Date.now();

        fetch(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.text();
            })
            .then(html => {
                container.innerHTML = html;

                document.querySelectorAll('.nb').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.t === view || (view === 'dashboard' && btn.dataset.t === 'home'));
                });

                this.initView(view);
                container.scrollTop = 0;
            })
            .catch(err => {
                container.innerHTML = `<div class="es"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar la vista: ${err.message}</p></div>`;
            });
    }

    initView(view) {
        if (this.modules[view]) {
            this.modules[view]();
        }
        this.updateFAB();
    }

    // ============================================================
    // ACTUALIZAR FAB SEGÚN LA VISTA ACTUAL
    // ============================================================
    updateFAB() {
        if (!this.fabS || !this.fabB) return;
        const cSub = store.cSub || 'productos';

        // INVENTARIO
        if (this.currentView === 'inventario') {
            this.fabS.style.display = 'block';
            if (cSub === 'productos') {
                this.fabB.onclick = function() {
                    import('../modules/inventario.js').then(module => {
                        module.oVENewProduct();
                    });
                };
            } else if (cSub === 'movimientos') {
                this.fabB.onclick = function() {
                    import('../modules/inventario.js').then(module => {
                        module.oSE();
                    });
                };
            } else {
                this.fabS.style.display = 'none';
            }
        }

        // ÓRDENES (elegir entre orden normal o venta)
        else if (this.currentView === 'ordenes') {
            this.fabS.style.display = 'block';
            this.fabB.onclick = function() {
                import('../modules/ordenes.js').then(module => {
                    const html = `
                        <p class="mt"><i class="fas fa-plus-circle"></i> ¿Qué deseas crear?</p>
                        <div style="display:flex; gap:10px; margin-top:16px;">
                            <button class="bp" style="background:var(--blue); flex:1; padding:16px 12px; display:flex; flex-direction:column; align-items:center; gap:6px;"
                                    onclick="window.cM(); window.oONew();">
                                <i class="fas fa-clipboard-list" style="font-size:22px;"></i>
                                <span style="font-size:11px; font-weight:600;">Orden de servicio</span>
                            </button>
                            <button class="bp" style="background:var(--green); flex:1; padding:16px 12px; display:flex; flex-direction:column; align-items:center; gap:6px;"
                                    onclick="window.cM(); window.oOVenta();">
                                <i class="fas fa-shopping-cart" style="font-size:22px;"></i>
                                <span style="font-size:11px; font-weight:600;">Venta directa</span>
                            </button>
                        </div>
                    `;
                    utils.openModal(html);
                });
            };
        }

        // GARANTÍAS
        else if (this.currentView === 'garantias') {
            this.fabS.style.display = 'block';
            this.fabB.onclick = function() {
                import('../modules/garantias.js').then(module => {
                    module.oGN();
                });
            };
        }

        // CUALQUIER OTRA VISTA
        else {
            this.fabS.style.display = 'none';
        }
    }
}

export const router = new Router();