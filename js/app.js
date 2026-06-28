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

        // ========== Модалка складов ==========
        warehouseModalOpen: false,
        editingWarehouse: null,
        warehouseForm: {
            name: '',
            address: ''
        },

        // ========== Модалка контрагентов ==========
        counterpartyModalOpen: false,
        editingCounterparty: null,
        counterpartyForm: {
            name: '',
            role: 'supplier'  // по умолчанию поставщик
        },

        // ========== Модалка спецификаций ==========
        assemblyModalOpen: false,
        editingAssembly: null,
        assemblyForm: {
            name: '',
            output_product_id: '',
            output_quantity: 1,
            components: []
        },

        // ========== Отчёт о продажах ==========
        salesPeriod: {
            from: '',
            to: '',
            counterparty_id: '',
            documents: [],
            details: [],
            totalRevenue: 0,
            totalCogs: 0,
            totalProfit: 0
        },
        
        // Меню навигации
        menus: [
            { id: 'products', name: 'Номенклатура', icon: 'fas fa-boxes', badge: false },
            { id: 'warehouses', name: 'Склады', icon: 'fas fa-warehouse', badge: false },
            { id: 'counterparties', name: 'Контрагенты', icon: 'fas fa-handshake', badge: false },
            { id: 'assemblies', name: 'Спецификации', icon: 'fas fa-puzzle-piece', badge: false },
            { id: 'stocks', name: 'Остатки', icon: 'fas fa-chart-bar', badge: false },
            { id: 'movements', name: 'Движения', icon: 'fas fa-history', badge: false },
            { id: 'batches', name: 'Партии', icon: 'fas fa-tags', badge: false },
            { id: 'incoming', name: 'Приход', icon: 'fas fa-download', badge: false },
            { id: 'outgoing', name: 'Отгрузка', icon: 'fas fa-upload', badge: false },
            { id: 'assembly', name: 'Сборка', icon: 'fas fa-cogs', badge: false },
            { id: 'cogs', name: 'Продажи', icon: 'fas fa-chart-line', badge: false }, 
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
            
            console.log("Cклады", this.warehouses);

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
                    await this.loadSalesReport();
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
                await this.loadSalesReport();
            }
            if (pageId === 'sales') {
                await this.loadSalesReport();
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
            console.log('openProductModal called', product); // Отладка
            
            if (product) {
                // Редактирование существующего
                this.editingProduct = product;
                this.productForm = {
                    name: product.name,
                    unit: product.unit || '',
                    min_stock: product.min_stock || 0
                };
            } else {
                // Создание нового
                this.editingProduct = null;
                this.productForm = {
                    name: '',
                    unit: '',
                    min_stock: 0
                };
            }
            this.productModalOpen = true;
            console.log('Modal open:', this.productModalOpen); // Отладка
        },

        async saveProduct() {
            console.log('saveProduct called', this.productForm); // Отладка
            
            try {
                if (this.editingProduct) {
                    // Обновление
                    await API.updateProduct(this.editingProduct.id, this.productForm);
                    console.log('Product updated');
                } else {
                    // Создание нового
                    await API.createProduct(this.productForm);
                    console.log('Product created');
                }
                
                // Обновляем данные
                await this.refreshAll();
                
                // Закрываем модалку
                this.productModalOpen = false;
                
                // Очищаем форму
                this.productForm = { name: '', unit: '', min_stock: 0 };
                this.editingProduct = null;
                
                alert('✅ Товар сохранен успешно');
            } catch (error) {
                console.error('Save product error:', error);
                alert('❌ Ошибка при сохранении товара: ' + (error.message || 'Неизвестная ошибка'));
            }
        },

        async deleteProduct(id) {
            if (confirm('Удалить товар? Это действие нельзя отменить.')) {
                try {
                    await API.deleteProduct(id);
                    await this.refreshAll();
                    alert('✅ Товар удален');
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('❌ Ошибка при удалении');
                }
            }
        },
        
        // ========== МЕТОДЫ ДЛЯ СКЛАДОВ ==========
        openWarehouseModal(warehouse = null) {
            console.log('openWarehouseModal called', warehouse);
            
            if (warehouse) {
                this.editingWarehouse = warehouse;
                this.warehouseForm = {
                    name: warehouse.name,
                    address: warehouse.address || ''
                };
            } else {
                this.editingWarehouse = null;
                this.warehouseForm = {
                    name: '',
                    address: ''
                };
            }
            this.warehouseModalOpen = true;
        },

        async saveWarehouse() {
            console.log('saveWarehouse called', this.warehouseForm);
            
            if (!this.warehouseForm.name) {
                alert('Введите название склада');
                return;
            }
            
            try {
                const warehouseData = {
                    name: this.warehouseForm.name,
                    address: this.warehouseForm.address || ''
                };
                
                if (this.editingWarehouse) {
                    // Для редактирования нужно использовать PATCH
                    await API.updateWarehouse(this.editingWarehouse.id, warehouseData);
                    console.log('Warehouse updated');
                } else {
                    await API.createWarehouse(warehouseData);
                    console.log('Warehouse created');
                }
                
                await this.refreshAll();
                this.warehouseModalOpen = false;
                this.warehouseForm = { name: '', address: '' };
                this.editingWarehouse = null;
                
                alert('✅ Склад сохранен успешно');
            } catch (error) {
                console.error('Save warehouse error:', error);
                alert('❌ Ошибка при сохранении склада: ' + (error.message || 'Неизвестная ошибка'));
            }
        },

        async deleteWarehouse(id) {
            if (confirm('Удалить склад? Это действие нельзя отменить.')) {
                try {
                    await API.deleteWarehouse(id);
                    await this.refreshAll();
                    alert('✅ Склад удален');
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('❌ Ошибка при удалении склада');
                }
            }
        },

        // ========== МЕТОДЫ ДЛЯ КОНТРАГЕНТОВ ==========
        openCounterpartyModal(counterparty = null) {
            console.log('openCounterpartyModal called', counterparty);
            
            if (counterparty) {
                this.editingCounterparty = counterparty;
                this.counterpartyForm = {
                    name: counterparty.name,
                    role: counterparty.role || 'supplier'
                };
            } else {
                this.editingCounterparty = null;
                this.counterpartyForm = {
                    name: '',
                    role: 'supplier'
                };
            }
            this.counterpartyModalOpen = true;
        },

        async saveCounterparty() {
            console.log('saveCounterparty called', this.counterpartyForm);
            
            if (!this.counterpartyForm.name) {
                alert('Введите название контрагента');
                return;
            }
            
            try {
                const counterpartyData = {
                    name: this.counterpartyForm.name,
                    role: this.counterpartyForm.role
                };
                
                if (this.editingCounterparty) {
                    // Для редактирования нужен PATCH
                    await API.updateCounterparty(this.editingCounterparty.id, counterpartyData);
                    console.log('Counterparty updated');
                } else {
                    await API.createCounterparty(counterpartyData);
                    console.log('Counterparty created');
                }
                
                await this.refreshAll();
                this.counterpartyModalOpen = false;
                this.counterpartyForm = { name: '', role: 'supplier' };
                this.editingCounterparty = null;
                
                alert('✅ Контрагент сохранен успешно');
            } catch (error) {
                console.error('Save counterparty error:', error);
                alert('❌ Ошибка при сохранении контрагента: ' + (error.message || 'Неизвестная ошибка'));
            }
        },

        async deleteCounterparty(id) {
            if (confirm('Удалить контрагента? Это действие нельзя отменить.')) {
                try {
                    await API.deleteCounterparty(id);
                    await this.refreshAll();
                    alert('✅ Контрагент удален');
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('❌ Ошибка при удалении контрагента');
                }
            }
        },
        
        // ========== МЕТОДЫ ДЛЯ СПЕЦИФИКАЦИЙ ==========
        openAssemblyModal(assembly = null) {
            console.log('openAssemblyModal called', assembly);
            
            if (assembly) {
                this.editingAssembly = assembly;
                this.assemblyForm = {
                    name: assembly.name,
                    output_product_id: assembly.output_product_id,
                    output_quantity: assembly.output_quantity || 1,
                    components: assembly.components ? [...assembly.components] : []
                };
            } else {
                this.editingAssembly = null;
                this.assemblyForm = {
                    name: '',
                    output_product_id: '',
                    output_quantity: 1,
                    components: []
                };
            }
            this.assemblyModalOpen = true;
        },

        addAssemblyComponent() {
            this.assemblyForm.components.push({
                product_id: '',
                quantity: 1
            });
        },

        removeAssemblyComponent(index) {
            this.assemblyForm.components.splice(index, 1);
        },

        async saveAssembly() {
            console.log('saveAssembly called', this.assemblyForm);
            
            // Валидация
            if (!this.assemblyForm.name) {
                alert('Введите название спецификации');
                return;
            }
            
            if (!this.assemblyForm.output_product_id) {
                alert('Выберите выходной продукт');
                return;
            }
            
            if (!this.assemblyForm.output_quantity || this.assemblyForm.output_quantity < 1) {
                alert('Укажите количество на выходе');
                return;
            }
            
            if (this.assemblyForm.components.length === 0) {
                alert('Добавьте хотя бы один компонент');
                return;
            }
            
            // Проверка заполненности компонентов
            for (let i = 0; i < this.assemblyForm.components.length; i++) {
                const comp = this.assemblyForm.components[i];
                if (!comp.product_id) {
                    alert(`В компоненте ${i + 1} не выбран товар`);
                    return;
                }
                if (!comp.quantity || comp.quantity < 1) {
                    alert(`В компоненте ${i + 1} укажите количество`);
                    return;
                }
            }
            
            try {
                const assemblyData = {
                    name: this.assemblyForm.name,
                    output_product_id: parseInt(this.assemblyForm.output_product_id),
                    output_quantity: this.assemblyForm.output_quantity,
                    components: this.assemblyForm.components.map(comp => ({
                        product_id: parseInt(comp.product_id),
                        quantity: comp.quantity
                    }))
                };
                
                console.log('Отправка данных:', assemblyData);
                
                if (this.editingAssembly) {
                    await API.updateAssembly(this.editingAssembly.id, assemblyData);
                    console.log('Assembly updated');
                } else {
                    await API.createAssembly(assemblyData);
                    console.log('Assembly created');
                }
                
                await this.refreshAll();
                this.assemblyModalOpen = false;
                this.assemblyForm = {
                    name: '',
                    output_product_id: '',
                    output_quantity: 1,
                    components: []
                };
                this.editingAssembly = null;
                
                alert('✅ Спецификация сохранена успешно');
            } catch (error) {
                console.error('Save assembly error:', error);
                alert('❌ Ошибка при сохранении спецификации: ' + (error.message || 'Неизвестная ошибка'));
            }
        },

        async deleteAssembly(id) {
            if (confirm('Удалить спецификацию? Это действие нельзя отменить.')) {
                try {
                    await API.deleteAssembly(id);
                    await this.refreshAll();
                    alert('✅ Спецификация удалена');
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('❌ Ошибка при удалении спецификации');
                }
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

        // ========== ОТЧЁТ О ПРОДАЖАХ ==========
        async loadSalesReport() {
            console.log('📊 Загрузка отчёта о продажах...');
            
            try {
                let data = await API.getCOGS(this.salesPeriod.from, this.salesPeriod.to);
                console.log('Sales API response:', data);
                
                if (!Array.isArray(data)) {
                    data = [];
                }
                
                // Фильтрация по контрагенту (если выбран)
                let filteredData = data;
                if (this.salesPeriod.counterparty_id) {
                    filteredData = data.filter(doc => doc.counterparty_id == this.salesPeriod.counterparty_id);
                }
                
                // Подготовка данных
                const details = [];
                let totalRevenue = 0;
                let totalCogs = 0;
                let totalProfit = 0;
                
                for (const doc of filteredData) {
                    for (const item of doc.items) {
                        const detailItem = {
                            id: Math.random(),
                            document_id: doc.document_id,
                            date: doc.date,
                            counterparty_id: doc.counterparty_id,
                            counterparty_name: doc.counterparty_name,
                            product_id: item.product_id,
                            product_name: item.product_name,
                            product_unit: item.product_unit,
                            quantity: item.quantity,
                            selling_price: item.selling_price,
                            unit_cost: item.unit_cost,
                            revenue: item.revenue,
                            cogs: item.cogs,
                            profit: item.profit
                        };
                        details.push(detailItem);
                        
                        totalRevenue += item.revenue;
                        totalCogs += item.cogs;
                        totalProfit += item.profit;
                    }
                }
                
                this.salesPeriod.documents = filteredData;
                this.salesPeriod.details = details;
                this.salesPeriod.totalRevenue = totalRevenue;
                this.salesPeriod.totalCogs = totalCogs;
                this.salesPeriod.totalProfit = totalProfit;
                
                console.log(`📊 Выручка: ${totalRevenue} ₽, Прибыль: ${totalProfit} ₽`);
            } catch (error) {
                console.error('Sales report error:', error);
                this.salesPeriod.documents = [];
                this.salesPeriod.details = [];
                this.salesPeriod.totalRevenue = 0;
                this.salesPeriod.totalCogs = 0;
                this.salesPeriod.totalProfit = 0;
                alert('❌ Ошибка при загрузке отчёта о продажах');
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