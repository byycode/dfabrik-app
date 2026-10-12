// ============================================================
// DB - PERSISTENCIA DE DATOS (localStorage)
// ============================================================
const STORAGE_KEY = 'dfabrik_data';

export const db = {
    loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error('Error loading data:', e);
            return null;
        }
    },

    saveAll(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    },

    getSampleData() {
        return {
            // ============================================================
            // PRODUCTOS DE EJEMPLO
            // ============================================================
            P: [
                // ===== EQUIPO - ELECTRÓNICA =====
                {id:17,n:'Fuente 12V 2A',c:'Equipo',area:'Electrónica',marca:'PowerTech',modelo:'PT-1220',q:7,mn:3,cost:6.50,sale:12.00,sup:'PowerTech',loc:'G-01',margen_ganancia:30,precio_venta_minimo:8.45},
                {id:18,n:'Fuente 5V 3A',c:'Equipo',area:'Electrónica',marca:'PowerTech',modelo:'PT-530',q:9,mn:3,cost:4.20,sale:8.50,sup:'PowerTech',loc:'G-01',margen_ganancia:30,precio_venta_minimo:5.46},
                {id:19,n:'Protoboard 830 pts',c:'Equipo',area:'Electrónica',marca:'ToolBox',modelo:'PB-830',q:22,mn:5,cost:2.50,sale:4.50,sup:'ToolBox',loc:'H-01',margen_ganancia:30,precio_venta_minimo:3.25},
                {id:20,n:'Soldador 60W',c:'Equipo',area:'Electrónica',marca:'ToolBox',modelo:'S-60',q:3,mn:2,cost:9.00,sale:18.00,sup:'ToolBox',loc:'H-02',margen_ganancia:30,precio_venta_minimo:11.70},

                // ===== PIEZAS - ELECTRÓNICA =====
                {id:1,n:'Resistor 1kΩ 1/4W',c:'Piezas',area:'Electrónica',marca:'ElectroParts',modelo:'R-1K',q:450,mn:50,cost:.03,sale:.05,sup:'ElectroParts SA',loc:'A-01',margen_ganancia:30,precio_venta_minimo:0.0390},
                {id:2,n:'Resistor 4.7kΩ 1/4W',c:'Piezas',area:'Electrónica',marca:'ElectroParts',modelo:'R-4K7',q:320,mn:40,cost:.03,sale:.05,sup:'ElectroParts SA',loc:'A-01',margen_ganancia:30,precio_venta_minimo:0.0390},
                {id:3,n:'Resistor 10kΩ 1/4W',c:'Piezas',area:'Electrónica',marca:'ElectroParts',modelo:'R-10K',q:280,mn:40,cost:.03,sale:.05,sup:'ElectroParts SA',loc:'A-02',margen_ganancia:30,precio_venta_minimo:0.0390},
                {id:4,n:'Capacitor 100µF 25V',c:'Piezas',area:'Electrónica',marca:'ComponentMax',modelo:'C-100',q:120,mn:30,cost:.20,sale:.35,sup:'ComponentMax',loc:'B-01',margen_ganancia:30,precio_venta_minimo:0.2600},
                {id:5,n:'Capacitor 10µF 50V',c:'Piezas',area:'Electrónica',marca:'ComponentMax',modelo:'C-10',q:85,mn:25,cost:.15,sale:.28,sup:'ComponentMax',loc:'B-01',margen_ganancia:30,precio_venta_minimo:0.1950},
                {id:6,n:'Capacitor 0.1µF Cerámico',c:'Piezas',area:'Electrónica',marca:'ComponentMax',modelo:'C-104',q:200,mn:30,cost:.04,sale:.08,sup:'ComponentMax',loc:'B-02',margen_ganancia:30,precio_venta_minimo:0.0520},
                {id:7,n:'LED Rojo 5mm',c:'Piezas',area:'Electrónica',marca:'LEDWorld',modelo:'R-5',q:8,mn:20,cost:.06,sale:.12,sup:'LEDWorld',loc:'C-01',margen_ganancia:30,precio_venta_minimo:0.0780},
                {id:8,n:'LED Verde 5mm',c:'Piezas',area:'Electrónica',marca:'LEDWorld',modelo:'G-5',q:15,mn:20,cost:.06,sale:.12,sup:'LEDWorld',loc:'C-01',margen_ganancia:30,precio_venta_minimo:0.0780},
                {id:9,n:'LED Blanco 5mm',c:'Piezas',area:'Electrónica',marca:'LEDWorld',modelo:'W-5',q:6,mn:15,cost:.09,sale:.18,sup:'LEDWorld',loc:'C-02',margen_ganancia:30,precio_venta_minimo:0.1170},
                {id:10,n:'Transistor 2N2222',c:'Piezas',area:'Electrónica',marca:'SemiCon',modelo:'2N2222',q:65,mn:15,cost:.25,sale:.45,sup:'SemiCon',loc:'D-01',margen_ganancia:30,precio_venta_minimo:0.3250},
                {id:11,n:'Transistor IRF540N',c:'Piezas',area:'Electrónica',marca:'SemiCon',modelo:'IRF540N',q:12,mn:10,cost:.95,sale:1.80,sup:'SemiCon',loc:'D-01',margen_ganancia:30,precio_venta_minimo:1.2350},
                {id:12,n:'CI 555 Timer',c:'Piezas',area:'Electrónica',marca:'ChipStore',modelo:'NE555',q:3,mn:10,cost:.60,sale:1.20,sup:'ChipStore',loc:'E-01',margen_ganancia:30,precio_venta_minimo:0.7800},
                {id:13,n:'CI LM7805 5V',c:'Piezas',area:'Electrónica',marca:'ChipStore',modelo:'LM7805',q:18,mn:8,cost:.45,sale:.90,sup:'ChipStore',loc:'E-01',margen_ganancia:30,precio_venta_minimo:0.5850},
                {id:14,n:'CI ATmega328P',c:'Piezas',area:'Electrónica',marca:'ChipStore',modelo:'ATmega328P',q:5,mn:5,cost:1.80,sale:3.50,sup:'ChipStore',loc:'E-02',margen_ganancia:30,precio_venta_minimo:2.3400},
                {id:15,n:'Cable USB-C 1m',c:'Piezas',area:'Electrónica',marca:'CablePlus',modelo:'USBC-1M',q:15,mn:10,cost:1.50,sale:2.80,sup:'CablePlus',loc:'F-01',margen_ganancia:30,precio_venta_minimo:1.9500},
                {id:16,n:'Cable Jumper M-M',c:'Piezas',area:'Electrónica',marca:'CablePlus',modelo:'JM-10',q:4,mn:20,cost:.02,sale:.04,sup:'CablePlus',loc:'F-01',margen_ganancia:30,precio_venta_minimo:0.0260},

                // ===== PARTES - ELECTRICIDAD =====
                {id:21,n:'Pantalla LCD 15.6"',c:'Partes',area:'Electricidad',marca:'RepuestosPro',modelo:'LCD-156',q:5,mn:2,cost:45.00,sale:75.00,sup:'RepuestosPro',loc:'R-01',margen_ganancia:30,precio_venta_minimo:58.5000},
                {id:22,n:'Carcasa para laptop 14"',c:'Partes',area:'Electricidad',marca:'RepuestosPro',modelo:'CS-14',q:8,mn:3,cost:18.50,sale:32.00,sup:'RepuestosPro',loc:'R-02',margen_ganancia:30,precio_venta_minimo:24.0500},
                {id:23,n:'Teclado USB Retroiluminado',c:'Partes',area:'Electricidad',marca:'RepuestosPro',modelo:'KB-RGB',q:12,mn:4,cost:12.00,sale:22.00,sup:'RepuestosPro',loc:'R-03',margen_ganancia:30,precio_venta_minimo:15.6000},
                {id:24,n:'Batería Li-Ion 18650 (x4)',c:'Partes',area:'Baterías',marca:'BatteryWorld',modelo:'18650-4',q:6,mn:2,cost:28.00,sale:45.00,sup:'BatteryWorld',loc:'R-04',margen_ganancia:30,precio_venta_minimo:36.4000},
                {id:25,n:'Fuente de poder ATX 500W',c:'Partes',area:'Electricidad',marca:'PowerTech',modelo:'ATX-500',q:4,mn:1,cost:35.00,sale:60.00,sup:'PowerTech',loc:'R-05',margen_ganancia:30,precio_venta_minimo:45.5000},

                // ===== INSUMOS - ELECTRICIDAD =====
                {id:26,n:'Estaño 60/40 100g',c:'Insumos',area:'Electricidad',marca:'InsumosPlus',modelo:'SN-100',q:20,mn:5,cost:6.50,sale:12.00,sup:'InsumosPlus',loc:'I-01',margen_ganancia:30,precio_venta_minimo:8.4500},
                {id:27,n:'Flux líquido 50ml',c:'Insumos',area:'Electricidad',marca:'InsumosPlus',modelo:'FLX-50',q:15,mn:3,cost:3.20,sale:6.50,sup:'InsumosPlus',loc:'I-02',margen_ganancia:30,precio_venta_minimo:4.1600},
                {id:28,n:'Cinta aislante negra',c:'Insumos',area:'Electricidad',marca:'InsumosPlus',modelo:'CT-19',q:30,mn:10,cost:1.20,sale:2.50,sup:'InsumosPlus',loc:'I-03',margen_ganancia:30,precio_venta_minimo:1.5600},
                {id:29,n:'Alcohol isopropílico 250ml',c:'Insumos',area:'Electricidad',marca:'InsumosPlus',modelo:'IPA-250',q:12,mn:4,cost:4.50,sale:8.00,sup:'InsumosPlus',loc:'I-04',margen_ganancia:30,precio_venta_minimo:5.8500},
                {id:30,n:'Pasta térmica 5g',c:'Insumos',area:'Electricidad',marca:'InsumosPlus',modelo:'PT-5',q:25,mn:5,cost:2.80,sale:5.50,sup:'InsumosPlus',loc:'I-05',margen_ganancia:30,precio_venta_minimo:3.6400}
            ],

            // ============================================================
            // MOVIMIENTOS DE EJEMPLO
            // ============================================================
            M: [
                {id:1,t:'entrada',pi:1,q:500,pc:.03,dt:'2026-01-02 09:15',r:'Compra',ref:'FAC-001'},
                {id:2,t:'salida',pi:1,q:50,pc:.05,dt:'2026-01-05 14:30',r:'Uso interno',ref:'OS-001'},
                {id:3,t:'entrada',pi:4,q:150,pc:.18,dt:'2026-01-03 10:00',r:'Compra',ref:'FAC-002'},
                {id:4,t:'salida',pi:4,q:30,pc:.35,dt:'2026-01-08 11:45',r:'Venta',ref:'OS-004'},
                {id:5,t:'entrada',pi:7,q:50,pc:.05,dt:'2026-01-04 08:30',r:'Compra',ref:'FAC-003'},
                {id:6,t:'salida',pi:7,q:42,pc:.12,dt:'2026-01-10 16:00',r:'Venta',ref:'OS-006'},
                {id:7,t:'entrada',pi:10,q:80,pc:.22,dt:'2026-01-05 11:00',r:'Compra',ref:'FAC-004'},
                {id:8,t:'salida',pi:10,q:15,pc:.45,dt:'2026-01-12 09:00',r:'Uso interno',ref:'OS-008'},
                {id:9,t:'entrada',pi:12,q:20,pc:.55,dt:'2026-01-06 10:30',r:'Compra',ref:'FAC-005'},
                {id:10,t:'salida',pi:12,q:17,pc:1.20,dt:'2026-01-13 15:15',r:'Venta',ref:'OS-009'},
                {id:11,t:'entrada',pi:15,q:20,pc:1.30,dt:'2026-01-07 09:45',r:'Compra',ref:'FAC-006'},
                {id:12,t:'salida',pi:15,q:5,pc:2.80,dt:'2026-01-14 13:30',r:'Venta',ref:'OS-002'},
                {id:13,t:'entrada',pi:17,q:10,pc:5.80,dt:'2026-01-08 08:00',r:'Compra',ref:'FAC-007'},
                {id:14,t:'salida',pi:17,q:3,pc:12.00,dt:'2026-01-15 10:00',r:'Uso interno',ref:'OS-001'},
                {id:15,t:'entrada',pi:19,q:25,pc:2.20,dt:'2026-01-09 14:00',r:'Compra',ref:'FAC-008'},
                {id:16,t:'salida',pi:19,q:3,pc:4.50,dt:'2026-01-11 17:00',r:'Venta',ref:'OS-005'}
            ],

            // ============================================================
            // ÓRDENES DE EJEMPLO (VACÍO - se crean desde la app)
            // ============================================================
            O: [],

            // ============================================================
            // TRANSACCIONES DE EJEMPLO (VACÍO)
            // ============================================================
            TX: [],

            // ============================================================
            // GARANTÍAS DE EJEMPLO (VACÍO)
            // ============================================================
            G: []
        };
    }
};