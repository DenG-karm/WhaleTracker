const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiRequest = async (endpoint, body = null, method = 'POST') => {
    try {
        let token = null;
        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (userData && userData.token) token = userData.token;
        } catch (err) {
            console.error("Token okunurken hata:", err);
        }

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${API_URL}${endpoint}`, options);

        if (res.status === 401) {
            localStorage.removeItem('user');
            window.location.href = '/login';
            return { ok: false, error: "Oturum süresi doldu." };
        }

        const data = await res.json();
        return { ok: res.ok, data };
    } catch (e) {
        return { ok: false, error: "Sunucu hatası" };
    }
};

export default apiRequest;