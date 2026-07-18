const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * 401 geldiğinde localStorage'ı temizleyip login sayfasına yönlendirir.
 * Sonsuz döngü oluşturmaması için aynı anda tek bir redirect tetiklenir.
 */
let _redirecting = false;
function _handleUnauthorized() {
    if (_redirecting) return;
    // Login sayfasındayken tekrar tetikleme — sonsuz döngüyü önler
    if (window.location.pathname === '/login') return;
    _redirecting = true;
    console.warn('[AUTH] 401 alındı — oturum temizleniyor, /login\'e yönlendiriliyor. Pathname:', window.location.pathname);
    localStorage.removeItem('user');
    localStorage.removeItem('wt_user_profile');
    localStorage.removeItem('wt_token');
    window.location.href = '/login';
}

/**
 * Merkezi API İstemcisi
 * Tüm backend istekleri bu fonksiyon üzerinden geçmeli.
 * Token ekleme ve hata fırlatma işlemleri otomatiktir.
 */
export const apiClient = async (endpoint, { method = 'GET', body, ...customConfig } = {}) => {
    let token = null;
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.token) token = userData.token;
    } catch (err) {
        console.error("Token error:", err);
    }
    
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers: { ...headers, ...customConfig.headers },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);

        // 401 → oturumu temizle ve login'e yönlendir
        if (response.status === 401) {
            _handleUnauthorized();
            throw new Error('Kimlik doğrulanamadı. Token geçersiz veya süresi dolmuş.');
        }

        const data = await response.json();
        
        if (!response.ok) {
            // FastAPI validation error format
            let errorMsg = 'Sunucu ile iletişim kurulamadı.';
            
            if (data.detail) {
                if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                } else if (Array.isArray(data.detail)) {
                    // Pydantic validation errors
                    errorMsg = data.detail.map(err => err.msg || err.detail || JSON.stringify(err)).join(' | ');
                } else if (typeof data.detail === 'object') {
                    errorMsg = JSON.stringify(data.detail);
                }
            } else if (data.msg) {
                errorMsg = data.msg;
            }
            
            throw new Error(errorMsg);
        }
        return data;
    } catch (error) {
        console.error(`[API ÇAĞRI HATASI] ${endpoint}:`, error);
        throw error;
    }
};