// Admin Dashboard Full CRUD Logic & View Switcher

var API_BASE_URL = window.API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? 'https://youtuberweb.onrender.com' : '');

let currentDashboardData = null;
let currentEditStreamId = null;
let currentEditVideoId = null;

function getValidImgSrc(url, fallback) {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback || '';
  const clean = url.trim();
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.startsWith('/uploads/')) {
    return API_BASE_URL + clean;
  }
  return clean || fallback || '';
}

// Route Guard & Load Data
document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    window.location.href = '/admin';
    return;
  }

  // Setup live file upload change listeners
  const profileFileInput = document.getElementById('setting-profile-file');
  if (profileFileInput) {
    profileFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          const previewInput = document.getElementById('setting-profile-preview');
          const previewBox = document.getElementById('setting-profile-preview-box');
          const imgTag = document.getElementById('setting-profile-img-tag');
          if (previewInput) previewInput.value = dataUrl;
          if (imgTag) imgTag.src = dataUrl;
          if (previewBox) previewBox.style.display = 'flex';
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });
  }

  const qrFileInput = document.getElementById('upi-qr-file');
  if (qrFileInput) {
    qrFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          const previewInput = document.getElementById('upi-qr-preview');
          const previewBox = document.getElementById('upi-qr-preview-box');
          const imgTag = document.getElementById('upi-qr-img-tag');
          if (previewInput) previewInput.value = dataUrl;
          if (imgTag) imgTag.src = dataUrl;
          if (previewBox) previewBox.style.display = 'flex';
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });
  }

  loadDashboardData();
  setupNavigation();
});

// Fetch all dashboard data strictly from Admin API / Supabase
async function loadDashboardData() {
  const token = getAdminToken();
  if (!token) return;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API_BASE_URL + '/api/admin/dashboard-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
      }
      const json = await res.json();

      if (json.success && json.data) {
        currentDashboardData = json.data;
        renderOverviewStats();
        renderStreamsTable();
        renderVideosTable();
        renderSubscribersTable();
        populateSupportForm();
        renderSocialsTable();
        populateSettingsForm();
        return;
      } else {
        console.warn('[Dashboard Warning] API returned error on attempt ' + attempt + ':', json.message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
      }
    } catch (err) {
      console.warn('[Dashboard Warning] Network exception on attempt ' + attempt + ':', err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
    }
  }
}

// Navigation & Tab Switcher
function setupNavigation() {
  const links = document.querySelectorAll('.sidebar-menu a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.dataset.view;
      if (!targetView) return;

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = 'none';
      });

      const activeSec = document.getElementById(`view-${targetView}`);
      if (activeSec) activeSec.style.display = 'block';

      const titleEl = document.getElementById('current-view-title');
      if (titleEl) titleEl.innerText = link.innerText.trim();
    });
  });
}

// 1. OVERVIEW STATS
function renderOverviewStats() {
  if (!currentDashboardData) return;
  const streams = currentDashboardData.streams || [];
  const videos = currentDashboardData.videos || [];
  const subscribers = currentDashboardData.subscribers || {};

  const totalStreamsEl = document.getElementById('stat-total-streams');
  const totalVideosEl = document.getElementById('stat-total-videos');
  const subCountEl = document.getElementById('stat-sub-count');

  if (totalStreamsEl) totalStreamsEl.innerText = streams.length;
  if (totalVideosEl) totalVideosEl.innerText = videos.length;
  if (subCountEl) subCountEl.innerText = Number(subscribers.count || 0).toLocaleString();
}

// 2. FILE UPLOAD HELPER
async function uploadFile(inputId) {
  const fileInput = document.getElementById(inputId);
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) return null;

  const file = fileInput.files[0];
  let base64Url = null;

  try {
    base64Url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  } catch(e) {}

  const token = getAdminToken();
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const json = await res.json();
    if (json.success && json.fileUrl) return json.fileUrl;
  } catch (err) {
    console.error('Upload warning:', err);
  }
  return base64Url;
}

// 3. STREAMS CRUD
function renderStreamsTable() {
  const tbody = document.getElementById('streams-table-body');
  if (!tbody || !currentDashboardData) return;

  const streams = currentDashboardData.streams || [];
  if (streams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No streams configured yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = streams.map(s => `
    <tr>
      <td><img src="${s.thumbnail_url || ''}" style="width:60px; height:35px; object-fit:cover; border-radius:6px;"></td>
      <td><strong>${s.title}</strong></td>
      <td>${s.scheduled_date || ''} ${s.scheduled_time || ''}</td>
      <td><span class="badge ${s.status === 'LIVE NOW' ? 'bg-danger' : 'bg-primary'}" style="padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">${s.status}</span></td>
      <td><a href="${s.youtube_url || '#'}" target="_blank" style="color:#38bdf8;">Link</a></td>
      <td>
        <button class="btn-sm btn-edit" onclick="openEditStreamModal('${s.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-sm btn-delete" onclick="deleteStream('${s.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openAddStreamModal() {
  currentEditStreamId = null;
  document.getElementById('stream-modal-title').innerText = 'Create Live / Upcoming Stream';
  document.getElementById('stream-form').reset();
  document.getElementById('stream-modal').style.display = 'grid';
}

function openEditStreamModal(id) {
  const stream = (currentDashboardData.streams || []).find(s => s.id.toString() === id.toString());
  if (!stream) return;

  currentEditStreamId = id;
  document.getElementById('stream-modal-title').innerText = 'Edit Stream';
  document.getElementById('stream-title-input').value = stream.title || '';
  document.getElementById('stream-desc-input').value = stream.description || '';
  document.getElementById('stream-date-input').value = stream.scheduled_date || '';
  document.getElementById('stream-time-input').value = stream.scheduled_time || '';
  document.getElementById('stream-url-input').value = stream.youtube_url || '';
  document.getElementById('stream-status-select').value = stream.status || 'UPCOMING';
  document.getElementById('stream-thumb-preview').value = stream.thumbnail_url || '';

  document.getElementById('stream-modal').style.display = 'grid';
}

function closeStreamModal() {
  document.getElementById('stream-modal').style.display = 'none';
}

async function saveStreamForm(e) {
  e.preventDefault();
  const token = getAdminToken();

  const title = document.getElementById('stream-title-input').value;
  const description = document.getElementById('stream-desc-input').value;
  const scheduled_date = document.getElementById('stream-date-input').value;
  const scheduled_time = document.getElementById('stream-time-input').value;
  const youtube_url = document.getElementById('stream-url-input').value;
  const status = document.getElementById('stream-status-select').value;
  let thumbnail_url = document.getElementById('stream-thumb-preview').value;

  const uploaded = await uploadFile('stream-thumb-file');
  if (uploaded) thumbnail_url = uploaded;

  const payload = { title, description, scheduled_date, scheduled_time, youtube_url, status, thumbnail_url };
  const method = currentEditStreamId ? 'PUT' : 'POST';
  const url = currentEditStreamId ? `/api/admin/streams/${currentEditStreamId}` : '/api/admin/streams';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      closeStreamModal();
      alert(json.message || 'Stream saved successfully to database!');
      loadDashboardData();
    } else {
      alert('❌ Save failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('Error saving stream:', err);
    alert('❌ Save failed: Could not connect to backend server.');
  }
}

async function deleteStream(id) {
  if (!confirm('Are you sure you want to delete this stream entry?')) return;
  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/streams/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) {
      alert(json.message || 'Stream deleted from database!');
      loadDashboardData();
    } else {
      alert('❌ Delete failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('Error deleting stream:', err);
    alert('❌ Delete failed: Network connection error.');
  }
}

// 4. VIDEOS CRUD
function renderVideosTable() {
  const tbody = document.getElementById('videos-table-body');
  if (!tbody || !currentDashboardData) return;

  const videos = currentDashboardData.videos || [];
  if (videos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No videos added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = videos.map(v => `
    <tr>
      <td><img src="${v.thumbnail_url || ''}" style="width:60px; height:35px; object-fit:cover; border-radius:6px;"></td>
      <td><strong>${v.title}</strong></td>
      <td><span style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-size:0.85rem; font-weight:600;">${v.category || 'General'}</span></td>
      <td>
        ${v.is_trending 
          ? `<button class="btn-sm" style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; font-weight:700; cursor:pointer;" onclick="toggleVideoTrending('${v.id}', false)"><i class="fa-solid fa-fire"></i> 🔥 Trending</button>`
          : `<button class="btn-sm" style="background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; cursor:pointer;" onclick="toggleVideoTrending('${v.id}', true)"><i class="fa-regular fa-fire"></i> Set Trending</button>`}
      </td>
      <td><a href="${v.youtube_url}" target="_blank" style="color:#0284c7; font-weight:700;">Watch <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.75rem;"></i></a></td>
      <td>
        <button class="btn-sm btn-edit" onclick="openEditVideoModal('${v.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-sm btn-delete" onclick="deleteVideo('${v.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

async function toggleVideoTrending(id, isTrending) {
  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/videos/${id}/trending`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_trending: isTrending })
    });
    const json = await res.json();
    if (json.success) {
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('Error toggling video trending:', err);
    alert('❌ Connection error toggling trending status.');
  }
}

function openAddVideoModal() {
  currentEditVideoId = null;
  document.getElementById('video-modal-title').innerText = 'Add New YouTube Video';
  document.getElementById('video-form').reset();
  const trendingToggle = document.getElementById('video-trending-toggle');
  if (trendingToggle) trendingToggle.checked = false;
  document.getElementById('video-modal').style.display = 'grid';
}

function openEditVideoModal(id) {
  const vid = (currentDashboardData.videos || []).find(v => v.id.toString() === id.toString());
  if (!vid) return;

  currentEditVideoId = id;
  document.getElementById('video-modal-title').innerText = 'Edit Video';
  document.getElementById('video-title-input').value = vid.title || '';
  document.getElementById('video-desc-input').value = vid.description || '';
  document.getElementById('video-url-input').value = vid.youtube_url || '';
  document.getElementById('video-category-input').value = vid.category || 'Gaming';
  document.getElementById('video-thumb-preview').value = vid.thumbnail_url || '';
  const trendingToggle = document.getElementById('video-trending-toggle');
  if (trendingToggle) trendingToggle.checked = Boolean(vid.is_trending);

  document.getElementById('video-modal').style.display = 'grid';
}

function closeVideoModal() {
  document.getElementById('video-modal').style.display = 'none';
}

async function saveVideoForm(e) {
  e.preventDefault();
  const token = getAdminToken();

  const title = document.getElementById('video-title-input').value;
  const description = document.getElementById('video-desc-input').value;
  const youtube_url = document.getElementById('video-url-input').value;
  const category = document.getElementById('video-category-input').value;
  const is_trending = document.getElementById('video-trending-toggle').checked;
  let thumbnail_url = document.getElementById('video-thumb-preview').value;

  const uploaded = await uploadFile('video-thumb-file');
  if (uploaded) thumbnail_url = uploaded;

  const payload = { title, description, youtube_url, category, thumbnail_url, status: 'published', is_trending };
  const method = currentEditVideoId ? 'PUT' : 'POST';
  const url = currentEditVideoId ? `/api/admin/videos/${currentEditVideoId}` : '/api/admin/videos';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      closeVideoModal();
      alert(json.message || 'Video saved to database successfully!');
      loadDashboardData();
    } else {
      alert('❌ Save failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('Error saving video:', err);
    alert('❌ Save failed: Could not connect to backend server.');
  }
}

async function deleteVideo(id) {
  if (!confirm('Are you sure you want to delete this video entry?')) return;
  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/videos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) {
      alert(json.message || 'Video deleted from database!');
      loadDashboardData();
    } else {
      alert('❌ Delete failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('Error deleting video:', err);
    alert('❌ Delete failed: Network connection error.');
  }
}

// 5. SUBSCRIBER TABLE & MODAL LOGIC
function renderSubscribersTable() {
  const tbody = document.getElementById('subscribers-table-body');
  if (!tbody) return;

  if (!currentDashboardData || !currentDashboardData.subscribers) return;
  const s = currentDashboardData.subscribers;

  const fontDisplayNames = {
    "'Bebas Neue', sans-serif": "Bebas Neue (Bold Display)",
    "'Outfit', sans-serif": "Outfit (Clean Geometric)",
    "'Space Grotesk', sans-serif": "Space Grotesk (Tech Modern)",
    "'Orbitron', sans-serif": "Orbitron (Futuristic Gaming)",
    "'Syne', sans-serif": "Syne (Artistic Heavy)",
    "'Plus Jakarta Sans', sans-serif": "Plus Jakarta Sans (Standard)"
  };
  const currentFontName = fontDisplayNames[s.counter_font] || s.counter_font || "'Bebas Neue', sans-serif";

  tbody.innerHTML = `
    <tr>
      <td><strong><i class="fa-solid fa-calculator" style="color:var(--sky-accent); margin-right:8px;"></i> Live Subscriber Count</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="number" id="inline-sub-count-input" value="${s.count !== undefined ? s.count : 42800}" style="padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; font-size: 1.1rem; width: 130px;" />
          <button class="btn-sm btn-edit" onclick="saveInlineSubCount()"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </td>
      <td>Manual numeric count on public website</td>
      <td>
        <button class="btn-sm btn-edit" onclick="openEditSubModal()"><i class="fa-solid fa-pen"></i> Edit Table</button>
      </td>
    </tr>
    <tr>
      <td><strong><i class="fa-solid fa-font" style="color:var(--sky-accent); margin-right:8px;"></i> Counter Font Family</strong></td>
      <td>
        <span class="sub-font-preview-badge" style="font-family: ${s.counter_font || "'Bebas Neue', sans-serif"}; font-size: 1.1rem; font-weight: 700; background: #e0f2fe; color: #0284c7; padding: 4px 14px; border-radius: 8px; display: inline-block;">
          ${currentFontName}
        </span>
      </td>
      <td>Font typography applied to sub counter display</td>
      <td>
        <button class="btn-sm btn-edit" onclick="openEditSubModal('font')"><i class="fa-solid fa-pen"></i> Change Font</button>
      </td>
    </tr>
    <tr>
      <td><strong><i class="fa-solid fa-arrows-rotate" style="color:var(--sky-accent); margin-right:8px;"></i> YouTube API Sync Status</strong></td>
      <td>
        ${s.is_api_enabled 
          ? '<span class="status-badge status-live"><i class="fa-solid fa-check"></i> Enabled</span>' 
          : '<span class="status-badge status-ended"><i class="fa-solid fa-xmark"></i> Disabled</span>'}
      </td>
      <td>Automatic background sync with YouTube Data API</td>
      <td>
        <button class="btn-sm btn-edit" onclick="toggleSubApiStatus()"><i class="fa-solid fa-sliders"></i> Toggle</button>
      </td>
    </tr>
    <tr>
      <td><strong><i class="fa-solid fa-id-badge" style="color:var(--sky-accent); margin-right:8px;"></i> YouTube Channel ID</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="text" id="inline-channel-id-input" value="${s.youtube_channel_id || ''}" placeholder="e.g. UCxxxxxxxx" style="padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.9rem; width: 180px;" />
          <button class="btn-sm btn-edit" onclick="saveInlineChannelId()"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </td>
      <td>Channel ID parameter for API sync</td>
      <td>
        <button class="btn-sm btn-edit" onclick="openEditSubModal('channel_id')"><i class="fa-solid fa-pen"></i> Edit Modal</button>
      </td>
    </tr>
    <tr>
      <td><strong><i class="fa-solid fa-key" style="color:var(--sky-accent); margin-right:8px;"></i> YouTube Data API Key</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="password" id="inline-api-key-input" value="${s.youtube_api_key || ''}" placeholder="API Key..." style="padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 0.9rem; width: 180px;" />
          <button class="btn-sm btn-edit" onclick="saveInlineApiKey()"><i class="fa-solid fa-check"></i> Save</button>
        </div>
      </td>
      <td>Google API key for channel stats</td>
      <td>
        <button class="btn-sm btn-edit" onclick="openEditSubModal('api_key')"><i class="fa-solid fa-pen"></i> Edit Modal</button>
      </td>
    </tr>
  `;
}

async function saveInlineSubCount() {
  const inputEl = document.getElementById('inline-sub-count-input');
  if (!inputEl) return;
  const newCount = Number(inputEl.value) || 0;

  const currentSub = (currentDashboardData && currentDashboardData.subscribers) ? currentDashboardData.subscribers : {};
  const updatedSub = { ...currentSub, count: newCount };

  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/subscribers', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSub)
    });
    const json = await res.json();
    if (json.success) {
      alert('Subscriber count updated to ' + newCount.toLocaleString() + ' and saved to database!');
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API sync error:', err);
    alert('❌ Connection error updating subscriber count.');
  }
}
window.saveInlineSubCount = saveInlineSubCount;

async function saveInlineChannelId() {
  const inputEl = document.getElementById('inline-channel-id-input');
  if (!inputEl) return;
  const newChannelId = inputEl.value.trim();

  const currentSub = (currentDashboardData && currentDashboardData.subscribers) ? currentDashboardData.subscribers : {};
  const updatedSub = { ...currentSub, youtube_channel_id: newChannelId };

  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/subscribers', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSub)
    });
    const json = await res.json();
    if (json.success) {
      alert('YouTube Channel ID updated successfully in database!');
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API sync error:', err);
    alert('❌ Connection error updating Channel ID.');
  }
}
window.saveInlineChannelId = saveInlineChannelId;

async function saveInlineApiKey() {
  const inputEl = document.getElementById('inline-api-key-input');
  if (!inputEl) return;
  const newApiKey = inputEl.value.trim();

  const currentSub = (currentDashboardData && currentDashboardData.subscribers) ? currentDashboardData.subscribers : {};
  const updatedSub = { ...currentSub, youtube_api_key: newApiKey };

  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/subscribers', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSub)
    });
    const json = await res.json();
    if (json.success) {
      alert('YouTube API Key updated successfully in database!');
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API sync error:', err);
    alert('❌ Connection error updating API Key.');
  }
}
window.saveInlineApiKey = saveInlineApiKey;

async function toggleSubApiStatus() {
  const currentSub = (currentDashboardData && currentDashboardData.subscribers) ? currentDashboardData.subscribers : {};
  const updatedSub = { ...currentSub, is_api_enabled: !Boolean(currentSub.is_api_enabled) };

  const token = getAdminToken();
  if (!token) return;

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/subscribers', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSub)
    });
    const json = await res.json();
    if (json.success) {
      const statusStr = updatedSub.is_api_enabled ? 'Enabled' : 'Disabled';
      alert('YouTube API Sync status changed to ' + statusStr + ' in database!');
      loadDashboardData();
    } else {
      alert('❌ Status toggle failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API sync error:', err);
    alert('❌ Connection error toggling API sync status.');
  }
}
window.toggleSubApiStatus = toggleSubApiStatus;

function openEditSubModal(targetField) {
  if (!currentDashboardData || !currentDashboardData.subscribers) return;
  const s = currentDashboardData.subscribers;
  
  const countInput = document.getElementById('sub-count-input');
  const fontSelect = document.getElementById('sub-font-select');
  const apiToggle = document.getElementById('sub-api-toggle');
  const channelInput = document.getElementById('sub-channel-id-input');
  const apiKeyInput = document.getElementById('sub-api-key-input');
  const subModal = document.getElementById('sub-modal');

  if (countInput) countInput.value = s.count !== undefined ? s.count : 42800;
  if (fontSelect) fontSelect.value = s.counter_font || "'Bebas Neue', sans-serif";
  if (apiToggle) apiToggle.checked = Boolean(s.is_api_enabled);
  if (channelInput) channelInput.value = s.youtube_channel_id || '';
  if (apiKeyInput) apiKeyInput.value = s.youtube_api_key || '';
  if (subModal) subModal.style.display = 'grid';

  if (targetField === 'channel_id' && channelInput) {
    setTimeout(() => { channelInput.focus(); channelInput.select(); }, 150);
  } else if (targetField === 'api_key' && apiKeyInput) {
    setTimeout(() => { apiKeyInput.focus(); apiKeyInput.select(); }, 150);
  } else if (targetField === 'font' && fontSelect) {
    setTimeout(() => { fontSelect.focus(); }, 150);
  }
}
window.openEditSubModal = openEditSubModal;

function closeSubModal() {
  const subModal = document.getElementById('sub-modal');
  if (subModal) subModal.style.display = 'none';
}

async function saveSubscriberSettings(e) {
  e.preventDefault();
  const token = getAdminToken();
  const countVal = document.getElementById('sub-count-input') ? document.getElementById('sub-count-input').value : '42800';
  const count = Number(countVal) || 0;
  const counter_font = document.getElementById('sub-font-select') ? document.getElementById('sub-font-select').value : "'Bebas Neue', sans-serif";
  const is_api_enabled = document.getElementById('sub-api-toggle') ? document.getElementById('sub-api-toggle').checked : false;
  const youtube_channel_id = document.getElementById('sub-channel-id-input') ? document.getElementById('sub-channel-id-input').value : '';
  const youtube_api_key = document.getElementById('sub-api-key-input') ? document.getElementById('sub-api-key-input').value : '';

  const payload = { count, counter_font, is_api_enabled, youtube_channel_id, youtube_api_key };

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/subscribers', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      closeSubModal();
      alert('Subscriber settings updated successfully in database!');
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API sync error:', err);
    alert('❌ Connection error saving subscriber settings.');
  }
}

// 6. SUPPORT / UPI FORM
function populateSupportForm() {
  if (!currentDashboardData || !currentDashboardData.support) return;
  const sup = currentDashboardData.support;
  document.getElementById('upi-id-input').value = sup.upi_id || '';
  document.getElementById('upi-name-input').value = sup.creator_name || '';
  document.getElementById('upi-amount-input').value = sup.default_amount || 100;
  document.getElementById('upi-message-input').value = sup.support_message || '';
  document.getElementById('upi-qr-preview').value = sup.qr_code_url || '';

  const qrBox = document.getElementById('upi-qr-preview-box');
  const qrImg = document.getElementById('upi-qr-img-tag');
  if (sup.qr_code_url && qrBox && qrImg) {
    qrImg.src = getValidImgSrc(sup.qr_code_url);
    qrBox.style.display = 'flex';
  }
}

async function saveSupportSettings(e) {
  e.preventDefault();
  const token = getAdminToken();
  const upi_id = document.getElementById('upi-id-input').value;
  const creator_name = document.getElementById('upi-name-input').value;
  const default_amount = document.getElementById('upi-amount-input').value;
  const support_message = document.getElementById('upi-message-input').value;
  let qr_code_url = document.getElementById('upi-qr-preview').value;

  const fileInput = document.getElementById('upi-qr-file');
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    const uploaded = await uploadFile('upi-qr-file');
    if (uploaded) qr_code_url = uploaded;
  }

  const payload = { upi_id, creator_name, default_amount: Number(default_amount), support_message, qr_code_url };

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/support', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      alert('Support / UPI settings updated successfully in database!');
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API support save error:', err);
    alert('❌ Connection error saving support settings.');
  }
}

// 7. SOCIAL LINKS TABLE
function renderSocialsTable() {
  const tbody = document.getElementById('socials-table-body');
  if (!tbody || !currentDashboardData) return;

  const socials = currentDashboardData.socials || [];
  if (socials.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No social links configured.</td></tr>`;
    return;
  }

  tbody.innerHTML = socials.map(s => `
    <tr>
      <td><i class="${s.icon_class}"></i> <strong>${s.platform}</strong></td>
      <td><a href="${s.url}" target="_blank" style="color:#38bdf8;">${s.url}</a></td>
      <td>${s.is_active ? 'Active' : 'Disabled'}</td>
      <td>
        <button class="btn-sm btn-delete" onclick="deleteSocial('${s.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

async function saveAddSocialForm(e) {
  e.preventDefault();
  const token = getAdminToken();
  const platform = document.getElementById('social-platform-input').value;
  const url = document.getElementById('social-url-input').value;
  const icon_class = document.getElementById('social-icon-input').value;

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/socials', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ platform, url, icon_class })
    });
    const json = await res.json();
    if (json.success) {
      document.getElementById('social-form').reset();
      alert('Social link added to database successfully!');
      loadDashboardData();
    } else {
      alert('❌ Add failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API add social error:', err);
    alert('❌ Connection error adding social link.');
  }
}

async function deleteSocial(id) {
  if (!confirm('Remove this social link?')) return;
  const token = getAdminToken();
  try {
    const res = await fetch(`/api/admin/socials/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) {
      alert('Social link deleted from database!');
      loadDashboardData();
    } else {
      alert('❌ Delete failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API delete social error:', err);
    alert('❌ Connection error deleting social link.');
  }
}

// 8. WEBSITE SETTINGS FORM
function populateSettingsForm() {
  if (!currentDashboardData || !currentDashboardData.settings) return;
  const st = currentDashboardData.settings;

  const titleInp = document.getElementById('setting-title-input');
  const nameInp = document.getElementById('setting-name-input');
  const welcomeInp = document.getElementById('setting-hero-welcome-input');
  const typingInp = document.getElementById('setting-typing-input');
  const profileInp = document.getElementById('setting-profile-preview');
  const aboutInp = document.getElementById('setting-about-input');

  if (titleInp) titleInp.value = st.website_title || '';
  if (nameInp) nameInp.value = st.creator_name || '';
  if (welcomeInp) welcomeInp.value = st.hero_welcome_text || '';
  if (typingInp) typingInp.value = Array.isArray(st.hero_typing_texts) ? st.hero_typing_texts.join(', ') : (st.hero_typing_texts || '');
  if (profileInp) profileInp.value = st.profile_image || '';
  if (aboutInp) aboutInp.value = st.about_text || '';

  const prevBox = document.getElementById('setting-profile-preview-box');
  const imgTag = document.getElementById('setting-profile-img-tag');
  if (st.profile_image && prevBox && imgTag) {
    imgTag.src = getValidImgSrc(st.profile_image);
    prevBox.style.display = 'flex';
  }
}

async function saveWebsiteSettings(e) {
  e.preventDefault();
  const token = getAdminToken();

  const website_title = document.getElementById('setting-title-input').value;
  const creator_name = document.getElementById('setting-name-input').value;
  const hero_welcome_text = document.getElementById('setting-hero-welcome-input').value;
  const typingRaw = document.getElementById('setting-typing-input').value;
  const hero_typing_texts = typingRaw.split(',').map(s => s.trim()).filter(Boolean);
  const about_text = document.getElementById('setting-about-input').value;
  let profile_image = document.getElementById('setting-profile-preview').value;

  const fileInput = document.getElementById('setting-profile-file');
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    const uploaded = await uploadFile('setting-profile-file');
    if (uploaded) profile_image = uploaded;
  }

  const payload = { website_title, creator_name, hero_welcome_text, hero_typing_texts, about_text, profile_image };

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      alert('Website settings updated successfully in database!');
      loadDashboardData();
    } else {
      alert('❌ Update failed: ' + (json.message || 'Database error'));
    }
  } catch (err) {
    console.error('API settings save error:', err);
    alert('❌ Connection error saving website settings.');
  }
}

// 9. CHANGE PASSWORD
async function handleChangePassword(e) {
  e.preventDefault();
  const token = getAdminToken();
  const current_password = document.getElementById('pass-current-input').value;
  const new_password = document.getElementById('pass-new-input').value;

  try {
    const res = await fetch(API_BASE_URL + '/api/admin/change-password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ current_password, new_password })
    });
    const json = await res.json();
    alert(json.message);
    if (json.success) {
      document.getElementById('password-form').reset();
    }
  } catch (err) {
    console.error('Error changing password:', err);
    alert('❌ Connection error changing password.');
  }
}

window.openAddStreamModal = openAddStreamModal;
window.openEditStreamModal = openEditStreamModal;
window.closeStreamModal = closeStreamModal;
window.saveStreamForm = saveStreamForm;
window.deleteStream = deleteStream;

window.openAddVideoModal = openAddVideoModal;
window.openEditVideoModal = openEditVideoModal;
window.closeVideoModal = closeVideoModal;
window.saveVideoForm = saveVideoForm;
window.deleteVideo = deleteVideo;

window.saveSubscriberSettings = saveSubscriberSettings;
window.saveSupportSettings = saveSupportSettings;
window.saveAddSocialForm = saveAddSocialForm;
window.deleteSocial = deleteSocial;
window.saveWebsiteSettings = saveWebsiteSettings;
window.handleChangePassword = handleChangePassword;
