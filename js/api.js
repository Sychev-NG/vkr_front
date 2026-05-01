// API сервис для работы с бэкендом
const API = {
    baseUrl: 'http://localhost:8080/api/v1',
    
    // Общий метод запроса
   async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            // Для DELETE и PATCH без тела может быть 204 или 200 с пустым телом
            if (response.status === 204) {
                return { success: true };
            }
            
            if (!response.ok) {
                // Пытаемся получить сообщение об ошибке от сервера
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorBody = await response.text();
                    if (errorBody) {
                        const parsed = JSON.parse(errorBody);
                        errorMessage = parsed.message || parsed.error || errorMessage;
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
                throw new Error(errorMessage);
            }
            
            // Проверяем, есть ли тело ответа
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (!text || text.trim() === '') {
                    return { success: true };
                }
                return JSON.parse(text);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },
    
    // ========== Товары ==========
    getProducts: () => API.request('/products'),
    createProduct: (data) => API.request('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => API.request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteProduct: (id) => API.request(`/products/${id}`, { method: 'DELETE' }),
    
    // ========== Склады ==========
    getWarehouses: () => API.request('/warehouses'),
    createWarehouse: (data) => API.request('/warehouses', { method: 'POST', body: JSON.stringify(data) }),
    deleteWarehouse: (id) => API.request(`/warehouses/${id}`, { method: 'DELETE' }),
    
    // ========== Контрагенты ==========
    getCounterparties: () => API.request('/counterparties'),
    createCounterparty: (data) => API.request('/counterparties', { method: 'POST', body: JSON.stringify(data) }),
    deleteCounterparty: (id) => API.request(`/counterparties/${id}`, { method: 'DELETE' }),
    
    // ========== Спецификации ==========
    getAssemblies: () => API.request('/assemblies'),
    createAssembly: (data) => API.request('/assemblies', { method: 'POST', body: JSON.stringify(data) }),
    deleteAssembly: (id) => API.request(`/assemblies/${id}`, { method: 'DELETE' }),
    
    // ========== Операции ==========
    incoming: (data) => API.request('/incoming', { method: 'POST', body: JSON.stringify(data) }),
    outgoing: (data) => API.request('/outgoing', { method: 'POST', body: JSON.stringify(data) }),
    assembly: (data) => API.request('/assembly', { method: 'POST', body: JSON.stringify(data) }),
    
    // ========== Отчёты ==========
    getStocks: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.request(`/stocks${query ? '?' + query : ''}`);
    },
    getMovements: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.request(`/movements${query ? '?' + query : ''}`);
    },
    getBatches: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.request(`/batches${query ? '?' + query : ''}`);
    },
    getAlerts: () => API.request('/alerts'),
    resolveAlert: (id) => API.request(`/alerts/${id}/resolve`, { method: 'PATCH' }),
    getCOGS: (from, to) => API.request(`/reports/cogs?from=${from}&to=${to}`)
};