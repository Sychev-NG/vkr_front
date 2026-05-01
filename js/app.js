function warehouseApp() {
    return {
        // ========== ДАННЫЕ (реактивные свойства Alpine) ==========
        _activePage: 'stocks',  // Внутреннее хранилище
        
        products: [],
        warehouses: [],
        counterparties: [],
        assemblies: [],
        stocks: [],
        movements: [],
        batches: [],
        alerts: [],
        
        loading: false,
        serverStatus: true,
        currentPageContent: '',
        
        // Геттер/сеттер для activePage (как в оригинале)
        get activePage() { 
            return this._activePage;
        },
        set activePage(val) { 
            this._activePage = val;
            // Сохраняем в localStorage
            localStorage.setItem('lastPage', val);
            // Загружаем контент страницы
            this.loadPageContent(val);
            // Загружаем специфичные данные
            this.loadPageData(val);
        },
        
        // Фильтры
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
        
        // Формы
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
        
        // Модалка товаров
        productModalOpen: false,
        editingProduct: null,
        productForm: {
            name: '',
            unit: '',
            min_stock: 0
        },
        
        // Меню навигации
        menus: [
            { id: 'products', name: 'Номенклатура', icon: 'fas fa-boxes', badge: false },
            { id: 'warehouses', name: 'Склады', icon: 'fas fa-warehouse', badge: false },
            { id: 'counterparties', name: 'Контрагенты', icon: 'fas fa-handshake', badge: false },
            { id: 'assemblies', name: 'Спецификации', icon: 'fas fa-puzzle-piece', badge: false },
            { id: 'stocks', name: 'Остатки', icon: 'fas fa-chart-simple', badge: false },
            { id: 'movements', name: 'Движения', icon: 'fas fa-history', badge: false },
            { id: 'batches', name: 'Партии', icon: 'fas fa-tags', badge: false },
            { id: 'incoming', name: 'Приход', icon: 'fas fa-download', badge: false },
            { id: 'outgoing', name: 'Отгрузка', icon: 'fas fa-upload', badge: false },
            { id: 'assembly', name: 'Сборка', icon: 'fas fa-cogs', badge: false },
            { id: 'cogs', name: 'Себестоимость', icon: 'fas fa-coins', badge: false },
            { id: 'alerts', name: 'Уведомления', icon: 'fas fa-bell', badge: false }
        ],
        
        // ========== ИНИЦИАЛИЗАЦИЯ ==========
        async init() {
            console.log('🚀 Инициализация приложения...');
            
            // Восстанавливаем последнюю открытую страницу
            const lastPage = localStorage.getItem('lastPage');
            if (lastPage && this.menus.find(m => m.id === lastPage)) {
                this.activePage = lastPage;  // Используем сеттер
            } else {
                this.activePage = 'stocks';   // Используем сеттер
            }
            
            // Загружаем данные
            await this.refreshAll();
            
            // Автообновление каждые 30 секунд
            setInterval(() => {
                if (document.hasFocus()) {
                    this.refreshAll();
                }
            }, 30000);
            
            console.log('✅ Инициализация завершена');
        },
        
        // ========== ЗАГРУЗКА ДАННЫХ ==========
        async refreshAll() {
            const isBackground = this.loading === false;
            
            if (!isBackground) {
                this.loading = true;
            }
            
            console.log('🔄 Обновление данных...');
            
            try {
                const [products, warehouses, counterparties, assemblies, stocks, batches, alerts] = await Promise.all([
                    API.getProducts().catch(() => []),
                    API.getWarehouses().catch(() => []),
                    API.getCounterparties().catch(() => []),
                    API.getAssemblies().catch(() => []),
                    API.getStocks().catch(() => []),
                    API.getBatches().catch(() => []),
                    API.getAlerts().catch(() => [])
                ]);
                
                this.products = products;
                this.warehouses = warehouses;
                this.counterparties = counterparties;
                this.assemblies = assemblies;
                this.stocks = stocks;
                this.batches = batches;
                this.alerts = alerts;
                this.serverStatus = true;
                
                console.log(`📦 Загружено: ${products.length} товаров, ${warehouses.length} складов, ${alerts.length} алертов`);
                
                // Загружаем специфичные данные для текущей страницы
                if (this.activePage === 'movements') {
                    await this.loadMovements();
                }
                
                if (this.activePage === 'cogs') {
                    await this.loadCOGS();
                }
                
                // Обновляем бейджи на меню
                this.updateBadges();
                
            } catch (error) {
                this.serverStatus = false;
                console.error('❌ Refresh failed:', error);
            } finally {
                this.loading = false;
            }
        },
        
        updateBadges() {
            const hasAlerts = this.alerts.length > 0;
            const alertsMenu = this.menus.find(m => m.id === 'alerts');
            if (alertsMenu) alertsMenu.badge = hasAlerts;
            
            const hasLowStock = this.stocks.some(s => {
                const product = this.products.find(p => p.id === s.product_id);
                return product && s.quantity < product.min_stock;
            });
            const stocksMenu = this.menus.find(m => m.id === 'stocks');
            if (stocksMenu) stocksMenu.badge = hasLowStock;
        },
        
        async loadPageContent(pageId) {
            try {
                const response = await fetch(`pages/${pageId}.html`);
                if (response.ok) {
                    this.currentPageContent = await response.text();
                } else {
                    this.currentPageContent = `
                        <div class="text-center py-12 text-red-500">
                            <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
                            <p>Ошибка загрузки страницы: ${pageId}</p>
                            <p class="text-sm mt-2">HTTP ${response.status}</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading page:', error);
                this.currentPageContent = `
                    <div class="text-center py-12 text-red-500">
                        <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
                        <p>Ошибка загрузки страницы</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                `;
            }
        },
        
        async loadPageData(pageId) {
            if (pageId === 'movements') {
                await this.loadMovements();
            }
            if (pageId === 'cogs') {
                await this.loadCOGS();
            }
        },
        
        async loadMovements() {
            const params = {};
            if (this.movementFilters.from) params.from = this.movementFilters.from;
            if (this.movementFilters.to) params.to = this.movementFilters.to;
            if (this.movementFilters.product_id) params.product_id = this.movementFilters.product_id;
            if (this.movementFilters.warehouse_id) params.warehouse_id = this.movementFilters.warehouse_id;
            
            this.movements = await API.getMovements(params).catch(() => []);
            console.log(`📜 Загружено движений: ${this.movements.length}`);
        },
        
        async loadCOGS() {
            const data = await API.getCOGS(this.cogsPeriod.from, this.cogsPeriod.to).catch(() => ({ total_cost: 0, details: [] }));
            this.cogsPeriod.total = data.total_cost || 0;
            this.cogsPeriod.details = data.details || [];
            console.log(`💰 COGS: ${this.cogsPeriod.total} руб.`);
        },
        
        applyMovementFilters() {
            this.loadMovements();
        },
        
        // ========== ТОВАРЫ ==========
        openProductModal(product = null) {
            if (product) {
                this.editingProduct = product;
                this.productForm = { ...product };
            } else {
                this.editingProduct = null;
                this.productForm = { name: '', unit: '', min_stock: 0 };
            }
            this.productModalOpen = true;
        },
        
        async saveProduct() {
            try {
                if (this.editingProduct) {
                    await API.updateProduct(this.editingProduct.id, this.productForm);
                } else {
                    await API.createProduct(this.productForm);
                }
                await this.refreshAll();
                this.productModalOpen = false;
            } catch (error) {
                console.error('Save product error:', error);
                alert('Ошибка при сохранении товара');
            }
        },
        
        async deleteProduct(id) {
            if (confirm('Удалить товар? Это действие нельзя отменить.')) {
                await API.deleteProduct(id);
                await this.refreshAll();
            }
        },
        
        // ========== СКЛАДЫ ==========
        async createWarehouse() {
            const name = prompt('Название склада:');
            if (name) {
                await API.createWarehouse({ name, address: '' });
                await this.refreshAll();
            }
        },
        
        async deleteWarehouse(id) {
            if (confirm('Удалить склад?')) {
                await API.deleteWarehouse(id);
                await this.refreshAll();
            }
        },
        
        // ========== КОНТРАГЕНТЫ ==========
        async createCounterparty() {
            const name = prompt('Название контрагента:');
            if (name) {
                const role = confirm('Это поставщик? (OK - поставщик, Отмена - покупатель)') ? 'supplier' : 'buyer';
                await API.createCounterparty({ name, role });
                await this.refreshAll();
            }
        },
        
        async deleteCounterparty(id) {
            if (confirm('Удалить контрагента?')) {
                await API.deleteCounterparty(id);
                await this.refreshAll();
            }
        },
        
        // ========== СПЕЦИФИКАЦИИ ==========
        async createAssembly() {
            alert('Создание спецификации через API.\nPOST /assemblies с полями:\n- name\n- output_product_id\n- output_quantity\n- components (массив {product_id, quantity})');
        },
        
        async deleteAssembly(id) {
            if (confirm('Удалить спецификацию?')) {
                await API.deleteAssembly(id);
                await this.refreshAll();
            }
        },
        
        // ========== ПРИХОД ==========
        async submitIncoming() {
            if (!this.incomingForm.warehouse_id || !this.incomingForm.product_id || !this.incomingForm.quantity) {
                alert('Заполните все поля');
                return;
            }
            
            try {
                await API.incoming({
                    counterparty_id: this.incomingForm.counterparty_id || null,
                    warehouse_id: this.incomingForm.warehouse_id,
                    items: [{
                        product_id: this.incomingForm.product_id,
                        quantity: Number(this.incomingForm.quantity),
                        price: Number(this.incomingForm.price) || 0
                    }]
                });
                
                await this.refreshAll();
                
                this.incomingForm = {
                    warehouse_id: '',
                    product_id: '',
                    quantity: 1,
                    price: 0,
                    counterparty_id: ''
                };
                
                alert('✅ Приход оформлен успешно');
            } catch (error) {
                console.error('Incoming error:', error);
                alert('❌ Ошибка при оформлении прихода');
            }
        },
        
        // ========== ОТГРУЗКА ==========
        async submitOutgoing() {
            if (!this.outgoingForm.warehouse_id || !this.outgoingForm.product_id || !this.outgoingForm.quantity) {
                alert('Заполните все поля');
                return;
            }
            
            try {
                await API.outgoing({
                    counterparty_id: this.outgoingForm.counterparty_id || null,
                    warehouse_id: this.outgoingForm.warehouse_id,
                    items: [{
                        product_id: this.outgoingForm.product_id,
                        quantity: Number(this.outgoingForm.quantity),
                        price: Number(this.outgoingForm.price) || 0
                    }]
                });
                
                await this.refreshAll();
                
                this.outgoingForm = {
                    warehouse_id: '',
                    product_id: '',
                    quantity: 1,
                    price: 0,
                    counterparty_id: ''
                };
                
                alert('✅ Отгрузка оформлена успешно');
            } catch (error) {
                console.error('Outgoing error:', error);
                alert('❌ Ошибка при отгрузке (возможно недостаточно товара на складе)');
            }
        },
        
        // ========== СБОРКА ==========
        async submitAssembly() {
            if (!this.assemblyForm.assembly_id || !this.assemblyForm.warehouse_id || !this.assemblyForm.quantity) {
                alert('Заполните все поля');
                return;
            }
            
            try {
                await API.assembly({
                    assembly_id: this.assemblyForm.assembly_id,
                    warehouse_id: this.assemblyForm.warehouse_id,
                    quantity: Number(this.assemblyForm.quantity)
                });
                
                await this.refreshAll();
                
                this.assemblyForm = {
                    assembly_id: '',
                    warehouse_id: '',
                    quantity: 1
                };
                
                alert('✅ Сборка выполнена успешно');
            } catch (error) {
                console.error('Assembly error:', error);
                alert('❌ Ошибка при сборке (возможно недостаточно компонентов)');
            }
        },
        
        // ========== УВЕДОМЛЕНИЯ ==========
        async resolveAlert(id) {
            console.log(`🔔 Закрытие алерта ${id}...`);
            try {
                await API.resolveAlert(id);
                await this.refreshAll();
                
                // Если мы на странице алертов - перезагружаем контент
                if (this.activePage === 'alerts') {
                    await this.loadPageContent('alerts');
                }
                
                console.log(`✅ Алерт ${id} закрыт, осталось: ${this.alerts.length}`);
            } catch (error) {
                console.error('Resolve alert error:', error);
                alert('❌ Ошибка при закрытии уведомления');
            }
        },
        
        // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
        formatNumber(num) {
            if (num === undefined || num === null) return '0';
            return Number(num).toLocaleString('ru-RU', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 3 
            });
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
        
        getStockQuantity(productId, warehouseId) {
            const stock = this.stocks.find(s => s.product_id == productId && s.warehouse_id == warehouseId);
            return stock ? stock.quantity : 0;
        },
        
        formatComponents(components) {
            if (!components || !components.length) return '—';
            return components.map(c => `${this.getProductName(c.product_id)} × ${c.quantity}`).join(', ');
        },
        
        isLowStock(productId, warehouseId) {
            const stock = this.getStockQuantity(productId, warehouseId);
            const product = this.products.find(p => p.id == productId);
            return product && stock < product.min_stock;
        }
    };
}