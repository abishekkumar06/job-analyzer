/* ============================================
   database.js — Supabase API helpers
   Called by dashboard.js
   ============================================ */

const DB = {

  /* ---- Session helpers ---- */
  getSession() {
    try {
      const token = localStorage.getItem('jobanalyzer_token');
      const user  = JSON.parse(localStorage.getItem('jobanalyzer_user') || 'null');
      return token && user ? { token, user } : null;
    } catch { return null; }
  },

  clearSession() {
    localStorage.removeItem('jobanalyzer_token');
    localStorage.removeItem('jobanalyzer_user');
  },

  authHeaders() {
    const s = this.getSession();
    if (!s) return {};
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s.token}`
    };
  },

  /* ---- Resume history ---- */
  async fetchResumes() {
    try {
      const res = await fetch('/api/resumes', { headers: this.authHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.resumes || [];
    } catch { return []; }
  },

  /* ---- Upload + analyze resume ---- */
  async analyzeResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    const s = this.getSession();
    const headers = {};
    if (s) headers['Authorization'] = `Bearer ${s.token}`;
    const res = await fetch('/api/analyze-resume', { method: 'POST', headers, body: formData });
    return res.json();
  }
};
