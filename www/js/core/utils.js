// ============================================================
// UTILS - FUNCIONES REUTILIZABLES
// ============================================================
export const utils = {
    toastTimer: null,

    showToast(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        el.textContent = msg;
        el.classList.add('show');
        this.toastTimer = setTimeout(() => {
            el.classList.remove('show');
        }, 1800);
    },


    openModal(html) {
        const body = document.getElementById('mBody');
        if (body) body.innerHTML = html;
        const modal = document.getElementById('modal');
        if (modal) modal.classList.add('show');
    },

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('show');
    },

    formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
};

