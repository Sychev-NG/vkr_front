// Глобальное состояние приложения
window.Store = {
    // Данные
    products: [],
    warehouses: [],
    counterparties: [],
    assemblies: [],
    stocks: [],
    movements: [],
    batches: [],
    alerts: [],
    
    // UI состояние
    loading: false,
    serverStatus: true,
    activePage: 'stocks',  // начальная страница
    
    // Фильтры для движений
    movementFilters: {
        from: '',
        to: '',
        product_id: '',
        warehouse_id: ''
    },
    
    // Отчёт COGS
    cogsPeriod: {
        from: '',
        to: '',
        total: 0,
        details: []
    },
    
    // Модалка товаров
    productModalOpen: false,
    editingProduct: null,
    productForm: { name: '', unit: '', min_stock: 0 },
    
    // Формы операций
    incomingForm: {
        warehouse_id: '',
        product_id: '',
        quantity: 1,
        price: 0,
        counterparty_id: ''
    },
    
    outgoingForm: {
        warehouse_id: '',
        product_id: '',
        quantity: 1,
        price: 0,
        counterparty_id: ''
    },
    
    assemblyForm: {
        assembly_id: '',
        warehouse_id: '',
        quantity: 1
    },
    
    // Вспомогательные методы
    getProductName(id) {
        const product = this.products.find(p => p.id == id);
        return product ? product.name : `Товар #${id}`;
    },
    
    getWarehouseName(id) {
        const warehouse = this.warehouses.find(w => w.id == id);
        return warehouse ? warehouse.name : `Склад #${id}`;
    },
    
    getCounterpartyName(id) {
        const cp = this.counterparties.find(c => c.id == id);
        return cp ? cp.name : `Контрагент #${id}`;
    },
    
    formatDate(date) {
        if (!date) return '—';
        const d = new Date(date);
        return d.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return Number(num).toLocaleString('ru-RU', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 3 
        });
    }
};