/**
 * New Leap Labs - Shared Frontend API Client & Auth Manager
 * Vanilla JavaScript / Fetch API
 */

(function () {
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE_URL = (isLocalDev && window.location.port !== '5000' && window.location.port !== '')
    ? 'http://localhost:5000/api'
    : '/api';

  const TOKEN_KEY = 'nll_auth_token';
  const USER_KEY = 'nll_user_profile';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  function setAuth(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function isAdmin() {
    const u = getCurrentUser();
    return u && u.role === 'admin';
  }

  function isCandidate() {
    const u = getCurrentUser();
    return u && u.role === 'candidate';
  }

  /**
   * Universal fetch wrapper with authorization and error handling.
   */
  async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const headers = {
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If body is plain object, JSON-encode and set Content-Type
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const config = {
      ...options,
      headers,
      body
    };

    try {
      const res = await fetch(url, config);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error = new Error(data.message || `Request failed with status ${res.status}`);
        error.status = res.status;
        error.errors = data.errors || [];
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      // If unauthorized, token might be expired
      if (err.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
        console.warn('Session expired or unauthorized. Redirecting to login...');
        clearAuth();
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith('login.html') && !currentPath.endsWith('index.html') && currentPath !== '/') {
          window.location.href = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
        }
      }
      throw err;
    }
  }

  /**
   * Route Access Guard
   */
  function enforceAuthGuard(expectedRole = null) {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('login.html') || currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/');

    if (!isAuthenticated()) {
      if (!isLoginPage) {
        window.location.href = currentPath.includes('/pages/') ? '../login.html' : 'login.html';
      }
      return false;
    }

    const user = getCurrentUser();
    if (!user) {
      clearAuth();
      if (!isLoginPage) {
        window.location.href = currentPath.includes('/pages/') ? '../login.html' : 'login.html';
      }
      return false;
    }

    // Role-specific check
    if (expectedRole && user.role !== expectedRole) {
      console.warn(`Access forbidden for role ${user.role} on ${expectedRole} route.`);
      if (user.role === 'admin') {
        window.location.href = currentPath.includes('/pages/') ? 'dashboard-admin.html' : 'pages/dashboard-admin.html';
      } else {
        window.location.href = currentPath.includes('/pages/') ? 'dashboard-user.html' : 'pages/dashboard-user.html';
      }
      return false;
    }

    // If already logged in and visiting login page, redirect to appropriate dashboard
    if (isLoginPage) {
      if (user.role === 'admin') {
        window.location.href = 'pages/dashboard-admin.html';
      } else {
        window.location.href = 'pages/dashboard-user.html';
      }
      return false;
    }

    return true;
  }

  // Expose API module globally
  window.NLL_API = {
    BASE_URL: API_BASE_URL,
    getToken,
    setAuth,
    clearAuth,
    getCurrentUser,
    isAuthenticated,
    isAdmin,
    isCandidate,
    fetch: apiFetch,
    enforceAuthGuard,

    // Auth endpoints
    auth: {
      login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: { email, password } }),
      register: (userData) => apiFetch('/auth/register', { method: 'POST', body: userData }),
      me: () => apiFetch('/auth/me')
    },

    // Applications endpoints
    applications: {
      submit: (formData) => apiFetch('/applications', { method: 'POST', body: formData }),
      getMyApplication: () => apiFetch('/applications/me'),
      list: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return apiFetch(`/applications${q ? '?' + q : ''}`);
      },
      getById: (id) => apiFetch(`/applications/${id}`),
      updateStatus: (id, status, remarks = '') => apiFetch(`/applications/${id}/status`, {
        method: 'PATCH',
        body: { status, remarks }
      })
    },

    // Tasks endpoints
    tasks: {
      assign: (data) => apiFetch('/tasks', { method: 'POST', body: data }),
      getMyTasks: () => apiFetch('/tasks/me'),
      list: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return apiFetch(`/tasks${q ? '?' + q : ''}`);
      },
      getById: (id) => apiFetch(`/tasks/${id}`),
      submit: (taskId, formData) => apiFetch(`/tasks/${taskId}/submit`, { method: 'POST', body: formData }),
      review: (taskId, reviewData) => apiFetch(`/tasks/${taskId}/review`, { method: 'PATCH', body: reviewData }),
      getSubmission: (taskId) => apiFetch(`/tasks/${taskId}/submission`),
      getSubmissionFileUrl: (taskId, download = false) => {
        const token = getToken();
        return `${API_BASE_URL}/tasks/${taskId}/submission/file?token=${encodeURIComponent(token)}${download ? '&download=1' : ''}`;
      }
    },

    // Interviews endpoints
    interviews: {
      schedule: (data) => apiFetch('/interviews', { method: 'POST', body: data }),
      getMyInterview: () => apiFetch('/interviews/me'),
      list: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return apiFetch(`/interviews${q ? '?' + q : ''}`);
      },
      getById: (id) => apiFetch(`/interviews/${id}`),
      update: (id, data) => apiFetch(`/interviews/${id}`, { method: 'PATCH', body: data }),
      addQuestion: (id, question, answer) => apiFetch(`/interviews/${id}/questions`, { method: 'POST', body: { question, answer } }),
      getQuestions: (id) => apiFetch(`/interviews/${id}/questions`),
      deleteQuestion: (questionId) => apiFetch(`/interviews/questions/${questionId}`, { method: 'DELETE' }),
      addFeedback: (id, score, feedback) => apiFetch(`/interviews/${id}/feedback`, { method: 'POST', body: { score, feedback } }),
      getFeedback: (id) => apiFetch(`/interviews/${id}/feedback`)
    },

    // Dashboard endpoints
    dashboard: {
      getStats: () => apiFetch('/dashboard/stats'),
      getCandidateData: () => apiFetch('/dashboard/candidate')
    }
  };
})();
