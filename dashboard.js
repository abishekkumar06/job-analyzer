/* ============================================
   JobAnalyzer — dashboard.js
   Full interactivity for all 11 sections
   ============================================ */

const JOB_ROLES = {
  'Data Scientist':       { required:['Python','Machine Learning','Statistics','SQL','Data Analysis'], preferred:['Deep Learning','TensorFlow','PyTorch','NLP','Pandas'], salary:'₹18.5 LPA', range:'₹8-35 LPA', growth:'+24%', openings:4520 },
  'Data Analyst':         { required:['SQL','Excel','Data Analysis','Data Visualization','Statistics'], preferred:['Python','Tableau','Power BI','Pandas','R'], salary:'₹8.5 LPA', range:'₹4-18 LPA', growth:'+18%', openings:3200 },
  'ML Engineer':          { required:['Python','Machine Learning','Deep Learning','TensorFlow','PyTorch'], preferred:['MLOps','Docker','Kubernetes','AWS','REST API'], salary:'₹22.0 LPA', range:'₹12-40 LPA', growth:'+28%', openings:2340 },
  'Data Engineer':        { required:['Python','SQL','ETL','Data Engineering','Apache Spark'], preferred:['AWS','Hadoop','Kafka','Airflow','Docker'], salary:'₹16.5 LPA', range:'₹6-30 LPA', growth:'+22%', openings:2800 },
  'Full Stack Developer': { required:['JavaScript','HTML/CSS','React','Node.js','SQL'], preferred:['TypeScript','MongoDB','REST API','Git','Docker'], salary:'₹15.2 LPA', range:'₹5-28 LPA', growth:'+18%', openings:3890 },
  'Cloud Architect':      { required:['AWS','Docker','Kubernetes','Linux','Microservices'], preferred:['Terraform','CI/CD','Google Cloud','Azure','Serverless'], salary:'₹25.0 LPA', range:'₹15-45 LPA', growth:'+32%', openings:2750 },
  'DevOps Engineer':      { required:['Docker','Kubernetes','CI/CD','Linux','AWS'], preferred:['Terraform','Ansible','Python','Bash','Git'], salary:'₹18.0 LPA', range:'₹8-32 LPA', growth:'+25%', openings:3100 },
  'Backend Developer':    { required:['Python','REST API','SQL','System Design','Git'], preferred:['Docker','Kubernetes','Microservices','AWS','Redis'], salary:'₹14.5 LPA', range:'₹5-26 LPA', growth:'+20%', openings:4200 },
  'Cybersecurity Analyst':{ required:['Network Security','Linux','SIEM','Penetration Testing','Vulnerability Assessment'], preferred:['Python','AWS','Compliance','Incident Response'], salary:'₹12.0 LPA', range:'₹5-25 LPA', growth:'+35%', openings:1800 },
  'Product Manager':      { required:['Product Strategy','Agile','Data Analysis','Roadmap Planning','User Research'], preferred:['SQL','Jira','Python','A/B Testing','Figma'], salary:'₹20.0 LPA', range:'₹10-40 LPA', growth:'+15%', openings:1500 },
};

const TOP_SKILLS = [
  { name:'Python', count:5842 }, { name:'Machine Learning', count:4231 },
  { name:'SQL', count:3987 },    { name:'Data Analysis', count:3456 },
  { name:'AWS', count:2987 },    { name:'Docker', count:2654 },
  { name:'JavaScript', count:2432 }, { name:'Deep Learning', count:2187 },
];

const TOP_LOCATIONS = [
  { name:'Bengaluru', count:4230 }, { name:'Hyderabad', count:2150 },
  { name:'Mumbai', count:1890 },    { name:'Pune', count:1430 },
  { name:'Chennai', count:1120 },
];

let lastResumeData = null;
let trendChart = null, locationChart = null;

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
  const session = DB.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  setUserUI(session.user);
  setCurrentDate();
  renderSkillsBars();
  renderLocationList();
  initTrendChart();
  initLocationChart();
  initAnalyticsCharts();
  initSalaryCharts();
  initForecastChart();
  loadResumeHistory();
  populateSkillGapSelect();
});

/* ============ USER UI ============ */
function setUserUI(user) {
  const name    = user.name || user.email || 'User';
  const initial = name.charAt(0).toUpperCase();
  setText('welcomeName', name.split(' ')[0]);
  setText('userName', name);
  document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initial);
  const chatGreet = document.querySelector('#chatBody .chat-bubble p');
  if (chatGreet) chatGreet.innerHTML = `Hi ${name.split(' ')[0]}! 👋<br>How can I help you today?`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

/* ============ SIDEBAR / SECTION SWITCHING ============ */
let sidebarCollapsed = false;

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('mainContent').classList.toggle('expanded', sidebarCollapsed);
  const icon = document.querySelector('#sidebarCollapse i');
  if (icon) icon.className = sidebarCollapsed ? 'fas fa-angles-right' : 'fas fa-angles-left';
}

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.classList.toggle('open');
}

function switchSection(name, linkEl) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(`section-${name}`);
  if (sec) sec.classList.add('active');
  if (linkEl) linkEl.classList.add('active');
  const titleMap = {
    dashboard:'Dashboard', analytics:'Job Analytics', salary:'Salary Insights',
    skills:'Skill Gap Analyzer', resume:'Resume Analyzer', coach:'AI Career Coach',
    predictions:'Predictions', saved:'Saved Jobs', datamanager:'Data Manager',
    profile:'My Profile', settings:'Settings'
  };
  setText('pageTitle', titleMap[name] || name);
  if (window.innerWidth <= 768) toggleMobileSidebar();
}

function goToFromSearch(name) {
  const link = document.querySelector(`[data-section="${name}"]`);
  switchSection(name, link);
  closeSearchModal();
}

/* ============ DROPDOWNS ============ */
function toggleNotifications() {
  document.getElementById('notifDropdown').classList.toggle('open');
  document.getElementById('userDropdown').classList.remove('open');
}
function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
  document.getElementById('notifDropdown').classList.remove('open');
}
function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  const badge = document.querySelector('.notif-badge');
  if (badge) badge.textContent = '0';
}
document.addEventListener('click', e => {
  if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown'))
    document.getElementById('notifDropdown')?.classList.remove('open');
  if (!e.target.closest('.user-menu') && !e.target.closest('#userDropdown'))
    document.getElementById('userDropdown')?.classList.remove('open');
  if (e.target.classList.contains('modal-overlay'))
    e.target.classList.remove('open');
});

/* ============ SEARCH ============ */
function handleSearch(e) {
  if (e.key === 'Enter') openSearchModal();
}
function openSearchModal() {
  document.getElementById('searchModal')?.classList.add('open');
  setTimeout(() => document.getElementById('searchModalInput')?.focus(), 50);
}
function closeSearchModal() {
  document.getElementById('searchModal')?.classList.remove('open');
}
function filterSearchResults(val) {
  document.querySelectorAll('.search-result-item').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
  });
}
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearchModal(); }
  if (e.key === 'Escape') closeSearchModal();
});

/* ============ LOGOUT ============ */
function handleLogout(e) {
  if (e) e.preventDefault();
  DB.clearSession();
  window.location.href = 'index.html';
}

/* ============ DASHBOARD CHARTS ============ */
function initTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx || !window.Chart) return;
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Feb','Mar','Apr','May','Jun','Jul'],
      datasets: [
        { label:'Data Science', data:[3200,3450,3600,3900,4100,4520], borderColor:'#111', backgroundColor:'rgba(17,17,17,.08)', tension:.4, fill:true, pointRadius:3 },
        { label:'Full Stack',   data:[2800,2950,3100,3300,3600,3890], borderColor:'#6b6a66', backgroundColor:'rgba(107,106,102,.08)', tension:.4, fill:true, pointRadius:3 },
        { label:'DevOps',       data:[2100,2300,2500,2700,2900,3100], borderColor:'#b8b6ae', backgroundColor:'rgba(184,182,174,.08)', tension:.4, fill:true, pointRadius:3 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{ labels:{ font:{size:12}, boxWidth:12 } } },
      scales:{ x:{ grid:{color:'#e4e2da'}, ticks:{font:{size:11}} }, y:{ grid:{color:'#e4e2da'}, ticks:{font:{size:11}} } }
    }
  });
}

function updateTrendChart() {
  if (!trendChart) return;
  const period = parseInt(document.getElementById('trendPeriod')?.value||'6');
  const all = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  trendChart.data.labels = all.slice(-period);
  trendChart.data.datasets[0].data = Array.from({length:period}, (_,i) => 3000+i*200+(Math.random()*100|0));
  trendChart.data.datasets[1].data = Array.from({length:period}, (_,i) => 2600+i*180+(Math.random()*80|0));
  trendChart.data.datasets[2].data = Array.from({length:period}, (_,i) => 2000+i*160+(Math.random()*60|0));
  trendChart.update();
}

function renderSkillsBars() {
  const el = document.getElementById('dashSkillsBars');
  if (!el) return;
  const max = TOP_SKILLS[0].count;
  el.innerHTML = TOP_SKILLS.map(s => `
    <div class="skill-bar-row">
      <span class="skill-bar-label">${s.name}</span>
      <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${(s.count/max*100).toFixed(0)}%"></div></div>
      <span class="skill-bar-val">${(s.count/1000).toFixed(1)}k</span>
    </div>`).join('');
}

function renderLocationList() {
  const el = document.getElementById('dashLocationList');
  if (!el) return;
  const max = TOP_LOCATIONS[0].count;
  el.innerHTML = TOP_LOCATIONS.map(l => `
    <div class="loc-row">
      <span class="loc-name">${l.name}</span>
      <div class="loc-bar"><div class="loc-fill" style="width:${(l.count/max*100).toFixed(0)}%"></div></div>
      <span class="loc-count">${l.count.toLocaleString()}</span>
    </div>`).join('');
}

function initLocationChart() {
  const ctx = document.getElementById('locationChart');
  if (!ctx || !window.Chart) return;
  locationChart = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels: TOP_LOCATIONS.map(l=>l.name),
      datasets:[{ data: TOP_LOCATIONS.map(l=>l.count), backgroundColor:['#111','#3a3a38','#6b6a66','#b8b6ae','#cfcdc4'], borderWidth:0 }]
    },
    options:{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, boxWidth:12 } } } }
  });
}

/* ============ AI CHAT ============ */
const CHAT_REPLIES = {
  'skill':   'Python, SQL, and Cloud skills top the demand charts. Machine Learning and DevOps are fastest-growing. Check Skill Gap Analyzer for your personal roadmap.',
  'resume':  'Head to the Resume Analyzer section — upload your PDF/DOCX and get instant ATS score, job matches, and learning path.',
  'career':  'Try the Skill Gap Analyzer to see which roles fit your current skills. Based on trends, Data Science and Cloud roles offer best growth.',
  'trend':   'Top trends: AI/ML roles up +28%, Cloud Architect +32%, Cybersecurity +35%. Python is the most in-demand language.',
  'salary':  'Average salaries range ₹8.5 LPA (Data Analyst) to ₹25 LPA (Cloud Architect). Senior roles can reach ₹40-45 LPA.',
  'market':  'India\'s tech job market has 25,000+ open roles. Bengaluru leads with 35% share, followed by Hyderabad and Mumbai.',
  'interview': 'Practice system design and DSA for tech roles. For data roles, focus on SQL and ML concepts. Mock interviews on platforms like Pramp help a lot.',
  'network': 'LinkedIn is key — update your profile with keywords from job descriptions. Engage with posts in your domain daily.',
};

function sendSuggestion(text) {
  const input = document.getElementById('chatInput');
  if (input) { input.value = text; sendMessage(); }
}
function sendMessage() {
  const input = document.getElementById('chatInput');
  const body  = document.getElementById('chatBody');
  if (!input || !body || !input.value.trim()) return;
  const msg = input.value.trim(); input.value = '';
  body.innerHTML += `<div class="chat-message user"><div class="chat-avatar"><i class="fas fa-user"></i></div><div class="chat-bubble">${msg}</div></div>`;
  body.scrollTop = body.scrollHeight;
  setTimeout(() => {
    const lower = msg.toLowerCase();
    let reply = 'Great question! Check the specific sections (Job Analytics, Salary, Skill Gap) for detailed insights.';
    for (const [key, val] of Object.entries(CHAT_REPLIES)) { if (lower.includes(key)) { reply = val; break; } }
    body.innerHTML += `<div class="chat-message bot"><div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble">${reply}</div></div>`;
    body.scrollTop = body.scrollHeight;
  }, 500);
}

/* ============ AI COACH SECTION ============ */
const COACH_TOPICS = {
  skills:    { icon:'fa-code', title:'Skill Development', msg:'Focus on Python, SQL, and one cloud platform. Aim for 1-2 skills per month.' },
  career:    { icon:'fa-road', title:'Career Path', msg:'Your skills suit Data Analyst → Data Scientist → ML Engineer progression.' },
  resume:    { icon:'fa-file-lines', title:'Resume Tips', msg:'Quantify achievements. Use action verbs. Keep it 1 page for under 5 years experience.' },
  interview: { icon:'fa-comments', title:'Interview Prep', msg:'Practice LeetCode (medium), study system design, and prepare behavioral stories (STAR method).' },
  salary:    { icon:'fa-indian-rupee-sign', title:'Salary Negotiation', msg:'Research market rates, counter at 15-20% above offer, and emphasize your unique skills.' },
  switch:    { icon:'fa-shuffle', title:'Career Switch', msg:'Identify transferable skills, build a portfolio project, and network in your target domain.' },
  goals:     { icon:'fa-bullseye', title:'Goal Setting', msg:'Set SMART goals: 1 new skill/month, 3 portfolio projects/quarter, 10 connections/week.' },
  networking:{ icon:'fa-people-group', title:'Networking', msg:'Engage on LinkedIn daily, attend virtual meetups, and contribute to open source.' },
};

function askCoach(topic, btn) {
  document.querySelectorAll('.coach-topic-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const t = COACH_TOPICS[topic];
  if (!t) return;
  const panel = document.getElementById('coachResponsePanel');
  if (panel) {
    panel.innerHTML = `<div style="padding:20px;"><div style="font-size:28px;margin-bottom:12px"><i class="fas ${t.icon}"></i></div><h3 style="font-size:17px;font-weight:700;margin-bottom:8px">${t.title}</h3><p style="font-size:14px;color:var(--gray-700)">${t.msg}</p></div>`;
    panel.style.display = 'block';
  }
}

function sendCoachMessage() {
  const input = document.getElementById('coachInput');
  const body  = document.getElementById('coachChatBody');
  if (!input || !body || !input.value.trim()) return;
  const msg = input.value.trim(); input.value = '';
  body.innerHTML += `<div class="chat-message user"><div class="chat-avatar"><i class="fas fa-user"></i></div><div class="chat-bubble">${msg}</div></div>`;
  body.scrollTop = body.scrollHeight;
  setTimeout(() => {
    const lower = msg.toLowerCase();
    let reply = 'That\'s a thoughtful question. My advice: stay consistent, keep building your portfolio, and network actively in your target domain.';
    for (const [key, val] of Object.entries(CHAT_REPLIES)) { if (lower.includes(key)) { reply = val; break; } }
    body.innerHTML += `<div class="chat-message bot"><div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble">${reply}</div></div>`;
    body.scrollTop = body.scrollHeight;
  }, 500);
}

/* ============ JOB ANALYTICS SECTION ============ */
function updateAnalytics() { /* filters are static-display only */ }

function filterAnalytics(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function initAnalyticsCharts() {
  const makeChart = (id, type, labels, datasets, opts={}) => {
    const ctx = document.getElementById(id);
    if (!ctx || !window.Chart) return;
    new Chart(ctx, { type, data:{ labels, datasets }, options:{ responsive:true, maintainAspectRatio:true, plugins:{legend:{labels:{font:{size:11},boxWidth:12}}}, ...opts } });
  };

  const mono = ['#111','#3a3a38','#6b6a66','#b8b6ae','#cfcdc4'];

  makeChart('industryChart', 'doughnut',
    ['Technology','Finance','Healthcare','E-commerce','Consulting'],
    [{ data:[45,18,12,14,11], backgroundColor:mono, borderWidth:0 }]);

  makeChart('workModeChart', 'doughnut',
    ['Hybrid','Remote','On-site'],
    [{ data:[42,28,30], backgroundColor:['#111','#6b6a66','#cfcdc4'], borderWidth:0 }]);

  makeChart('experienceChart', 'bar',
    ['Fresher','1-3 yrs','3-6 yrs','6-10 yrs','10+ yrs'],
    [{ data:[2800,4200,3600,2100,900], backgroundColor:'#111', borderRadius:3 }],
    { scales:{ x:{grid:{display:false},ticks:{font:{size:11}}}, y:{grid:{color:'#e4e2da'},ticks:{font:{size:11}}} }, plugins:{legend:{display:false}} });

  makeChart('timelineChart', 'line',
    ['Jan','Feb','Mar','Apr','May','Jun','Jul'],
    [{ label:'Job Postings', data:[1800,2100,2400,2600,2900,3100,3400], borderColor:'#111', backgroundColor:'rgba(17,17,17,.08)', tension:.4, fill:true, pointRadius:3 }],
    { scales:{ x:{grid:{color:'#e4e2da'},ticks:{font:{size:11}}}, y:{grid:{color:'#e4e2da'},ticks:{font:{size:11}}} } });
}

/* ============ SALARY SECTION ============ */
function compareSalary() {
  const role = document.getElementById('salaryRole')?.value || 'Data Scientist';
  const loc  = document.getElementById('salaryLocation')?.value || 'Bangalore';
  const exp  = document.getElementById('salaryExp')?.value || '3-5 years';
  const match = Object.entries(JOB_ROLES).find(([k]) => k.toLowerCase().includes(role.toLowerCase()));
  const data  = match ? match[1] : { salary:'₹15 LPA', range:'₹8-28 LPA' };
  const result = document.getElementById('salaryResult');
  if (result) result.innerHTML = `
    <div class="salary-range-card" style="background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:20px;">
      <h4 style="font-size:14px;font-weight:700;margin-bottom:14px">${role} — ${loc} (${exp})</h4>
      <div style="font-size:28px;font-weight:800;margin-bottom:4px">${data.salary}</div>
      <div style="font-size:13px;color:var(--gray-500)">Range: ${data.range}</div>
    </div>`;
}

function initSalaryCharts() {
  const mono = ['#111','#3a3a38','#6b6a66','#b8b6ae','#cfcdc4','#d4d3cb','#e0dfd7'];
  const ctx1 = document.getElementById('salaryRoleChart');
  if (ctx1 && window.Chart) {
    new Chart(ctx1, {
      type:'bar',
      data:{ labels: Object.keys(JOB_ROLES).slice(0,6), datasets:[{ label:'Avg Salary (LPA)', data:[18.5,8.5,22.0,16.5,15.2,25.0], backgroundColor:mono, borderRadius:3 }] },
      options:{ responsive:true, maintainAspectRatio:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{font:{size:10}}}, y:{grid:{color:'#e4e2da'},ticks:{font:{size:11},callback:v=>'₹'+v}} } }
    });
  }
  const ctx2 = document.getElementById('salaryExpChart');
  if (ctx2 && window.Chart) {
    new Chart(ctx2, {
      type:'line',
      data:{ labels:['0-1 yr','1-3 yrs','3-5 yrs','5-8 yrs','8-12 yrs','12+ yrs'], datasets:[{ label:'Avg Salary (LPA)', data:[6,10,16,22,30,40], borderColor:'#111', backgroundColor:'rgba(17,17,17,.08)', tension:.4, fill:true, pointRadius:4 }] },
      options:{ responsive:true, maintainAspectRatio:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{font:{size:11}}}, y:{grid:{color:'#e4e2da'},ticks:{font:{size:11},callback:v=>'₹'+v}} } }
    });
  }
}

/* ============ SKILL GAP ANALYZER ============ */
function populateSkillGapSelect() {
  const sel = document.getElementById('targetRole');
  if (!sel) return;
  sel.innerHTML = Object.keys(JOB_ROLES).map(r => `<option>${r}</option>`).join('');
  analyzeSkillGap();
}

function addSkill() {
  const input = document.getElementById('newSkillInput');
  if (!input || !input.value.trim()) return;
  const tag = document.createElement('span');
  tag.className = 'skill-tag';
  tag.innerHTML = `${input.value.trim()} <button onclick="removeSkill(this)">×</button>`;
  document.getElementById('currentSkillTags')?.appendChild(tag);
  input.value = '';
  analyzeSkillGap();
}

function removeSkill(btn) {
  btn.parentElement?.remove();
  analyzeSkillGap();
}

function analyzeSkillGap() {
  const role = document.getElementById('targetRole')?.value;
  if (!role || !JOB_ROLES[role]) return;
  const data = JOB_ROLES[role];

  // Get user skills from skill tag elements
  const userSkills = new Set(
    Array.from(document.querySelectorAll('#currentSkillTags .skill-tag'))
      .map(el => el.textContent.replace('×','').trim().toLowerCase())
  );
  // Also pull from last resume upload if available
  if (lastResumeData?.skills?.all_skills) {
    lastResumeData.skills.all_skills.forEach(s => userSkills.add(s.toLowerCase()));
  }

  const haveReq  = data.required.filter(s => userSkills.has(s.toLowerCase()));
  const missReq  = data.required.filter(s => !userSkills.has(s.toLowerCase()));
  const havePref = data.preferred.filter(s => userSkills.has(s.toLowerCase()));
  const missPref = data.preferred.filter(s => !userSkills.has(s.toLowerCase()));
  const pct = Math.round(((haveReq.length + havePref.length) / (data.required.length + data.preferred.length)) * 100);

  const panel = document.getElementById('skillResults');
  if (!panel) return;
  panel.innerHTML = `
    <div style="background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin-bottom:16px">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Skill Match for ${role}</h3>
      <div style="font-size:13px;margin-bottom:6px;display:flex;justify-content:space-between"><span>Your match</span><strong>${pct}%</strong></div>
      <div class="gap-pct-bar"><div class="gap-pct-fill" style="width:${pct}%"></div></div>

      <div class="gap-section-title" style="margin-top:16px">Required Skills</div>
      <div class="skill-tags" style="margin-bottom:12px">
        ${haveReq.map(s=>`<span class="skill-tag have"><i class="fas fa-check"></i> ${s}</span>`).join('')}
        ${missReq.map(s=>`<span class="skill-tag missing"><i class="fas fa-xmark"></i> ${s}</span>`).join('')}
      </div>
      <div class="gap-section-title">Nice-to-Have Skills</div>
      <div class="skill-tags">
        ${havePref.map(s=>`<span class="skill-tag have">${s}</span>`).join('')}
        ${missPref.map(s=>`<span class="skill-tag neutral">${s}</span>`).join('')}
      </div>
    </div>
    <div style="background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:20px">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px"><i class="fas fa-graduation-cap"></i> Learning Path for Missing Skills</h3>
      ${missReq.concat(missPref).slice(0,5).map((s,i)=>`
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-soft)">
          <div style="width:24px;height:24px;background:var(--ink);color:var(--white);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
          <div><strong style="font-size:13px">${s}</strong><div style="font-size:12px;color:var(--gray-500);margin-top:2px">Learn via Coursera / YouTube / Official Docs</div></div>
        </div>`).join('')}
      ${missReq.length + missPref.length === 0 ? '<p style="font-size:13px;color:#059669"><i class="fas fa-circle-check"></i> You already have all required skills for this role. Great job!</p>' : ''}
    </div>`;
}

/* ============ RESUME ANALYZER SECTION ============ */
async function handleResumeAnalysis(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('raUploadArea').style.display = 'none';
  document.getElementById('raProgressArea').style.display = 'block';
  document.getElementById('raErrorArea').style.display = 'none';
  document.getElementById('raResults').style.display = 'none';

  // Animate progress steps
  const steps = ['raStep1','raStep2','raStep3','raStep4'];
  const lines  = ['raLine1','raLine2','raLine3'];
  const tips   = ['Reading document contents...','Identifying skills and experience...','Matching to job roles...','Generating insights and recommendations...'];
  let stepIdx = 0;
  const bar = document.getElementById('raProgressBar');
  const tip = document.getElementById('raProgressTip');
  const stepTimer = setInterval(() => {
    if (stepIdx < steps.length) {
      document.getElementById(steps[stepIdx])?.classList.add('active');
      if (stepIdx > 0 && lines[stepIdx-1]) document.getElementById(lines[stepIdx-1])?.classList.add('active');
      if (tip) tip.textContent = tips[stepIdx];
      if (bar) bar.style.width = ((stepIdx+1)/steps.length*100) + '%';
      stepIdx++;
    }
  }, 700);

  try {
    const data = await DB.analyzeResume(file);
    clearInterval(stepTimer);
    if (data.error) {
      document.getElementById('raProgressArea').style.display = 'none';
      document.getElementById('raErrorArea').style.display = 'block';
      setText('raErrorMsg', data.error);
      return;
    }
    lastResumeData = data;
    // Refresh skill gap tags if user had skills from last resume
    if (data.skills?.all_skills?.length) analyzeSkillGap();
    renderResumeResults(data);
    loadResumeHistory();
    if (data.saved) showDashToast('Resume saved to your account.');
    else showDashToast('Resume analyzed successfully.');
  } catch (err) {
    clearInterval(stepTimer);
    document.getElementById('raProgressArea').style.display = 'none';
    document.getElementById('raErrorArea').style.display = 'block';
    setText('raErrorMsg', 'Could not reach the server. Please try again.');
  }
}

function renderResumeResults(data) {
  document.getElementById('raProgressArea').style.display = 'none';
  document.getElementById('raResults').style.display = 'block';

  // Header
  setText('raFileName', data.filename || 'Resume');
  setText('raWordCount', `${data.word_count || 0} words analyzed`);

  // ATS Score circle
  const score = data.ats_score || 0;
  setText('raScoreNum', score);
  const circle = document.getElementById('raScoreCircle');
  if (circle) {
    const circumference = 490.09;
    circle.style.strokeDashoffset = circumference - (score/100) * circumference;
  }
  const grade = score>=90?'A+':score>=80?'A':score>=70?'B+':score>=60?'B':'C';
  const gradeLabel = score>=80?'Excellent':score>=60?'Good':'Needs Work';
  const gradeEl = document.getElementById('raScoreGrade');
  if (gradeEl) gradeEl.innerHTML = `<span class="ra-grade-badge">${grade}</span><span>${gradeLabel}</span>`;

  // Score breakdown
  const breakdown = document.getElementById('raBreakdownList');
  if (breakdown && data.score_breakdown) {
    breakdown.innerHTML = Object.entries(data.score_breakdown).slice(0,6).map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:13px">
        <span>${k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:80px;height:5px;background:var(--line-soft);border-radius:999px;overflow:hidden"><div style="height:100%;width:${v}%;background:var(--ink)"></div></div>
          <span style="font-weight:700;width:32px;text-align:right">${v}</span>
        </div>
      </div>`).join('');
  }

  // Skills cloud
  const cloud = document.getElementById('raSkillsCloud');
  const count = document.getElementById('raSkillCount');
  if (cloud && data.skills) {
    if (count) count.textContent = `${data.skills.total_count} skills found`;
    cloud.innerHTML = (data.skills.all_skills||[]).map(s=>`<span style="display:inline-block;padding:5px 12px;border:1px solid var(--line);border-radius:999px;font-size:12px;font-weight:500;margin:3px;background:var(--paper)">${s}</span>`).join('');
  }

  // Job matches
  const matchesEl = document.getElementById('raJobMatches');
  if (matchesEl && data.job_matches) {
    matchesEl.innerHTML = data.job_matches.slice(0,6).map(m=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:13px">
        <div>
          <div style="font-weight:600">${m.role}</div>
          <div style="font-size:12px;color:var(--gray-500)">${m.avg_salary} · ${(m.openings||0).toLocaleString()} openings</div>
        </div>
        <span style="background:var(--ink);color:var(--white);font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px">${m.match_percentage}%</span>
      </div>`).join('') || '<p style="font-size:13px;color:var(--gray-500)">No strong matches. Upload a more detailed resume.</p>';
  }

  // Learning path
  const lpEl = document.getElementById('raLearningPath');
  if (lpEl && data.learning_path) {
    lpEl.innerHTML = data.learning_path.slice(0,5).map((l,i)=>`
      <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-soft)">
        <div style="width:22px;height:22px;background:var(--ink);color:var(--white);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
        <div>
          <strong style="font-size:13px">${l.skill}</strong>
          <div style="font-size:12px;color:var(--gray-500);margin-top:2px">${l.reason||'Improves your job match'}</div>
        </div>
      </div>`).join('') || '<p style="font-size:13px;color:var(--gray-500)">No specific gaps detected.</p>';
  }

  // Resume sections checklist
  const secEl = document.getElementById('raSections');
  if (secEl && data.resume_sections) {
    secEl.innerHTML = Object.entries(data.resume_sections).map(([k,v])=>`
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:13px">
        <i class="fas ${v?'fa-circle-check':'fa-circle-xmark'}" style="color:${v?'#059669':'#dc2626'}"></i>
        ${k.replace('has_','').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
      </div>`).join('');
  }

  // Insights
  const insEl = document.getElementById('raInsightsList');
  if (insEl && data.insights) {
    insEl.innerHTML = data.insights.slice(0,5).map(insight=>`
      <div style="display:flex;gap:8px;padding:10px;background:var(--paper);border-radius:var(--radius);font-size:13px;margin-bottom:8px">
        <i class="fas fa-lightbulb" style="color:var(--ink);margin-top:2px;flex-shrink:0"></i>
        <span>${insight}</span>
      </div>`).join('');
  }
}

function resetResumeAnalyzer() {
  document.getElementById('raUploadArea').style.display = 'block';
  document.getElementById('raProgressArea').style.display = 'none';
  document.getElementById('raErrorArea').style.display = 'none';
  document.getElementById('raResults').style.display = 'none';
  const fileInput = document.getElementById('raFileInput');
  if (fileInput) fileInput.value = '';
}

/* ============ RESUME HISTORY ============ */
async function loadResumeHistory() {
  const container = document.getElementById('resumeHistoryGrid');
  if (!container) return;
  const resumes = await DB.fetchResumes();
  if (!resumes.length) {
    container.innerHTML = '<div class="history-empty" style="font-size:13px;color:var(--gray-500);text-align:center;padding:24px">No resumes uploaded yet.</div>';
    return;
  }
  container.innerHTML = resumes.slice(0,6).map(r => `
    <div class="history-card">
      <div class="history-card-title">${r.filename||'Resume'}</div>
      <div class="history-card-score">${r.ats_score||'—'}<span style="font-size:13px;font-weight:400">/100</span></div>
      <div class="history-card-date">${new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
    </div>`).join('');
}

/* ============ PREDICTIONS CHART ============ */
function initForecastChart() {
  const ctx = document.getElementById('forecastChart');
  if (!ctx || !window.Chart) return;
  new Chart(ctx, {
    type:'line',
    data:{
      labels:['2026','2027','2028','2029','2030'],
      datasets:[
        { label:'AI/ML', data:[100,130,165,200,240], borderColor:'#111', tension:.4, pointRadius:4 },
        { label:'Cloud', data:[100,120,145,170,200], borderColor:'#6b6a66', tension:.4, pointRadius:4 },
        { label:'Cybersecurity', data:[100,125,155,185,220], borderColor:'#b8b6ae', tension:.4, pointRadius:4 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{ labels:{ font:{size:12}, boxWidth:12 } } },
      scales:{ x:{grid:{color:'#e4e2da'},ticks:{font:{size:11}}}, y:{grid:{color:'#e4e2da'},ticks:{font:{size:11},callback:v=>v+'%'}} }
    }
  });
}

/* ============ PROFILE ============ */
function editProfile() { switchSection('settings', document.querySelector('[data-section=settings]')); }

/* ============ SETTINGS ============ */
function switchSettingsTab(tab, btn) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
  if (btn) btn.classList.add('active');
  const panel = document.getElementById(`settings-${tab}`);
  if (panel) panel.style.display = 'block';
}

function setTheme(theme, btn) {
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  showDashToast(`Theme set to ${theme}.`);
}

/* ============ SAVED JOBS ============ */
function filterSavedJobs(status, btn) {
  document.querySelectorAll('.filter-pills .pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.job-card').forEach(card => {
    card.style.display = (status==='all' || card.dataset.status===status) ? '' : 'none';
  });
}

function unsaveJob(btn) {
  btn.closest('.job-card')?.remove();
  showDashToast('Job removed from saved list.');
}

/* ============ DATA MANAGER ============ */
const DM_DATASETS = {
  naukri_jobs:   { name:'Naukri.com Jobs Dataset', rows:'8,432', cols:['Job Title','Company','Location','Salary','Skills','Experience','Date Posted'], icon:'fa-briefcase', color:'#3b82f6' },
  india_salary:  { name:'India Salary Survey 2026',rows:'3,210', cols:['Role','Location','Experience','Salary','Company Size','Industry'], icon:'fa-indian-rupee-sign', color:'#10b981' },
  global_jobs:   { name:'Global Tech Jobs 2026',   rows:'4,891', cols:['Title','Company','Country','Remote','Salary USD','Tech Stack'], icon:'fa-globe', color:'#8b5cf6' },
};

function viewDataset(key) {
  const d = DM_DATASETS[key]; if (!d) return;
  const section = document.getElementById('dmTableSection');
  if (!section) { showDashToast(`Viewing ${d.name} (${d.rows} rows)`); return; }
  section.style.display = 'block';
  const title = document.getElementById('dmTableTitle');
  const head  = document.getElementById('dmTableHead');
  const body  = document.getElementById('dmTableBody');
  if (title) title.textContent = d.name;
  if (head)  head.innerHTML = `<tr>${d.cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;
  if (body)  body.innerHTML = Array.from({length:5},(_,i)=>`<tr>${d.cols.map(()=>`<td style="font-size:12px;color:var(--gray-500)">Sample data ${i+1}</td>`).join('')}</tr>`).join('');
}

function closeDataTable() {
  const s = document.getElementById('dmTableSection'); if (s) s.style.display='none';
}

/* ============ TOAST ============ */
function showDashToast(msg, type) {
  const container = document.getElementById('dashToastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'dash-toast' + (type==='error' ? ' error' : '');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// Also expose as showToast so existing HTML onclick="showToast()" calls work
function showToast(msg, type) { showDashToast(msg, type); }
