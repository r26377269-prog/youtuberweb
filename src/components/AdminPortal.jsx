import React, { useState, useEffect } from 'react';
import '../styles/admin.css';

export default function AdminPortal() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [activeView, setActiveView] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Modals visibility
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [editStreamId, setEditStreamId] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editVideoId, setEditVideoId] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);

  // Forms
  const [streamForm, setStreamForm] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '19:00',
    youtube_url: '',
    status: 'UPCOMING'
  });

  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    youtube_url: '',
    category: 'Gaming',
    thumbnail_url: '',
    is_trending: false
  });

  const [subForm, setSubForm] = useState({
    count: 1245890,
    counter_font: "'Bebas Neue', sans-serif",
    is_api_enabled: false,
    youtube_channel_id: '',
    youtube_api_key: ''
  });

  const [supportForm, setSupportForm] = useState({
    upi_id: 'fam_2f43d815507f5ee1714a857d7454c93c7e6e661e@fam',
    creator_name: 'ALEX VANCE',
    default_amount: 100,
    support_message: 'Support the channel directly!',
    qr_code_url: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    website_title: 'CREATOR • Official YouTuber Website',
    creator_name: 'ALEX VANCE',
    hero_welcome_text: 'WELCOME TO THE CHANNEL',
    hero_typing_texts: 'GAMING, LIVE STREAMS, TECH REVIEWS, DAILY VLOGS',
    about_text: '',
    profile_image: ''
  });

  const [socialForm, setSocialForm] = useState({
    platform: '',
    url: '',
    icon_class: 'fa-brands fa-youtube'
  });

  const [passForm, setPassForm] = useState({ current_password: '', new_password: '' });

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDashboardData(json.data);
        if (json.data.subscribers) setSubForm(json.data.subscribers);
        if (json.data.support) setSupportForm(json.data.support);
        if (json.data.settings) {
          const st = json.data.settings;
          setSettingsForm({
            ...st,
            hero_typing_texts: Array.isArray(st.hero_typing_texts) ? st.hero_typing_texts.join(', ') : (st.hero_typing_texts || '')
          });
        }
      } else {
        localStorage.removeItem('adminToken');
        setToken('');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.success && json.token) {
        localStorage.setItem('adminToken', json.token);
        setToken(json.token);
      } else {
        setAlertMsg({ type: 'danger', text: json.message || 'Invalid email or password.' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: 'Server error during login.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
  };

  // Upload helper
  const handleFileUpload = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const json = await res.json();
      if (json.success) return json.fileUrl;
    } catch (err) {
      console.error('Upload failed:', err);
    }
    return null;
  };

  // --- STREAMS CRUD ---
  const openAddStream = () => {
    setEditStreamId(null);
    setStreamForm({
      title: '',
      description: '',
      thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '19:00',
      youtube_url: '',
      status: 'UPCOMING'
    });
    setShowStreamModal(true);
  };

  const openEditStream = (s) => {
    setEditStreamId(s.id);
    setStreamForm({
      title: s.title || '',
      description: s.description || '',
      thumbnail_url: s.thumbnail_url || '',
      scheduled_date: s.scheduled_date || '',
      scheduled_time: s.scheduled_time || '',
      youtube_url: s.youtube_url || '',
      status: s.status || 'UPCOMING'
    });
    setShowStreamModal(true);
  };

  const handleSaveStream = async (e) => {
    e.preventDefault();
    const method = editStreamId ? 'PUT' : 'POST';
    const url = editStreamId ? `/api/admin/streams/${editStreamId}` : '/api/admin/streams';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(streamForm)
      });
      const json = await res.json();
      if (json.success) {
        setShowStreamModal(false);
        loadDashboard();
      } else {
        alert(json.message || 'Failed to save stream');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteStream = async (id) => {
    if (!window.confirm('Delete this stream entry?')) return;
    try {
      const res = await fetch(`/api/admin/streams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // --- VIDEOS CRUD ---
  const openAddVideo = () => {
    setEditVideoId(null);
    setVideoForm({ title: '', description: '', youtube_url: '', category: 'Gaming', thumbnail_url: '', is_trending: false });
    setShowVideoModal(true);
  };

  const openEditVideo = (v) => {
    setEditVideoId(v.id);
    setVideoForm({
      title: v.title || '',
      description: v.description || '',
      youtube_url: v.youtube_url || '',
      category: v.category || 'Gaming',
      thumbnail_url: v.thumbnail_url || '',
      is_trending: Boolean(v.is_trending)
    });
    setShowVideoModal(true);
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    const method = editVideoId ? 'PUT' : 'POST';
    const url = editVideoId ? `/api/admin/videos/${editVideoId}` : '/api/admin/videos';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoForm)
      });
      const json = await res.json();
      if (json.success) {
        setShowVideoModal(false);
        loadDashboard();
      } else {
        alert(json.message || 'Failed to save video');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTrending = async (vidId, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/videos/${vidId}/trending`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_trending: !currentStatus })
      });
      const json = await res.json();
      if (json.success) loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteVideo = async (id) => {
    if (!window.confirm('Delete this video entry?')) return;
    try {
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // --- SUBSCRIBER SAVE ---
  const handleSaveSub = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subForm)
      });
      const json = await res.json();
      if (json.success) {
        setShowSubModal(false);
        alert('Subscriber settings saved!');
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SUPPORT / UPI SAVE ---
  const handleSaveSupport = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supportForm)
      });
      const json = await res.json();
      if (json.success) {
        alert('Support / UPI settings saved!');
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- WEBSITE SETTINGS SAVE ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const rawTyping = settingsForm.hero_typing_texts;
    const typingList = typeof rawTyping === 'string' ? rawTyping.split(',').map(s => s.trim()).filter(Boolean) : rawTyping;

    const payload = {
      ...settingsForm,
      hero_typing_texts: typingList
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        alert('Website general settings updated!');
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SOCIALS CRUD ---
  const handleAddSocial = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/socials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(socialForm)
      });
      const json = await res.json();
      if (json.success) {
        setShowSocialModal(false);
        setSocialForm({ platform: '', url: '', icon_class: 'fa-brands fa-youtube' });
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSocial = async (id) => {
    if (!window.confirm('Delete social link?')) return;
    try {
      const res = await fetch(`/api/admin/socials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // --- CHANGE PASSWORD ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passForm)
      });
      const json = await res.json();
      alert(json.message);
      if (json.success) setPassForm({ current_password: '', new_password: '' });
    } catch (err) {
      console.error(err);
    }
  };

  // LOGIN SCREEN FOR UNAUTHENTICATED USERS
  if (!token) {
    return (
      <div className="login-body">
        <div className="login-card">
          <div className="login-logo"><i className="fa-solid fa-shield-halved"></i> OWNER PORTAL</div>
          <p className="login-subtitle">Enter admin credentials to manage live streams, videos, subs & settings</p>

          {alertMsg.text && <div className={`alert-box alert-${alertMsg.type}`}>{alertMsg.text}</div>}

          <form onSubmit={handleLogin} autoComplete="off">
            <div className="form-group">
              <label>Admin Email</label>
              <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" placeholder="Enter admin email..." />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Enter password..." />
            </div>

            <button type="submit" className="btn-admin-primary">Log In to Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  const { videos = [], streams = [], subscribers = {}, support = {}, socials = [], settings = {} } = dashboardData || {};

  return (
    <div className="admin-body">
      <div className="dashboard-layout">
        {/* SIDEBAR NAVIGATION */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2><i className="fa-solid fa-shield-halved"></i> ADMIN PORTAL</h2>
          </div>

          <ul className="sidebar-menu">
            <li><button className={activeView === 'overview' ? 'active' : ''} onClick={() => setActiveView('overview')}><i className="fa-solid fa-chart-line"></i> Overview</button></li>
            <li><button className={activeView === 'streams' ? 'active' : ''} onClick={() => setActiveView('streams')}><i className="fa-solid fa-tower-cell"></i> Live Streams</button></li>
            <li><button className={activeView === 'videos' ? 'active' : ''} onClick={() => setActiveView('videos')}><i className="fa-brands fa-youtube"></i> Videos</button></li>
            <li><button className={activeView === 'subscribers' ? 'active' : ''} onClick={() => setActiveView('subscribers')}><i className="fa-solid fa-users"></i> Subscribers</button></li>
            <li><button className={activeView === 'support' ? 'active' : ''} onClick={() => setActiveView('support')}><i className="fa-solid fa-qrcode"></i> Support / UPI</button></li>
            <li><button className={activeView === 'socials' ? 'active' : ''} onClick={() => setActiveView('socials')}><i className="fa-solid fa-share-nodes"></i> Social Links</button></li>
            <li><button className={activeView === 'settings' ? 'active' : ''} onClick={() => setActiveView('settings')}><i className="fa-solid fa-sliders"></i> Website Settings</button></li>
            <li><button className={activeView === 'security' ? 'active' : ''} onClick={() => setActiveView('security')}><i className="fa-solid fa-lock"></i> Security</button></li>
          </ul>

          <div className="sidebar-footer">
            <button className="btn-logout" onClick={handleLogout}><i className="fa-solid fa-right-from-bracket"></i> Logout</button>
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT */}
        <main className="main-content">
          <header className="content-header">
            <h1>{activeView.toUpperCase()} MANAGER</h1>
            <a href="/" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
              <i className="fa-solid fa-arrow-up-right-from-square"></i> View Live Site
            </a>
          </header>

          {/* 1. OVERVIEW VIEW */}
          {activeView === 'overview' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon"><i className="fa-brands fa-youtube"></i></div>
                  <div className="stat-info">
                    <h3>{videos.length}</h3>
                    <p>Total Videos</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><i className="fa-solid fa-tower-cell"></i></div>
                  <div className="stat-info">
                    <h3>{streams.length}</h3>
                    <p>Live Streams</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
                  <div className="stat-info">
                    <h3>{(subscribers.count || 0).toLocaleString()}</h3>
                    <p>Subscribers</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h2 className="card-title">System Status</h2></div>
                <p style={{ color: '#64748b' }}>All changes save instantly to database and reflect on public homepage.</p>
              </div>
            </div>
          )}

          {/* 2. STREAMS MANAGER (FIXED ADD BUTTON & FULL TABLE) */}
          {activeView === 'streams' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><i className="fa-solid fa-tower-cell"></i> Live / Upcoming Stream Management</h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Schedule streams, set status (LIVE NOW, UPCOMING, ENDED), and upload thumbnails.</p>
                </div>
                <button className="btn-admin-primary" style={{ width: 'auto' }} onClick={openAddStream}>
                  <i className="fa-solid fa-plus"></i> Add New Stream
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Scheduled Date/Time</th>
                    <th>Status</th>
                    <th>YouTube Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {streams.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>No streams configured yet. Click "Add New Stream" above.</td></tr>
                  ) : (
                    streams.map(s => (
                      <tr key={s.id}>
                        <td><img src={s.thumbnail_url} style={{ width: 60, height: 35, objectFit: 'cover', borderRadius: 6 }} alt="" /></td>
                        <td><strong>{s.title}</strong></td>
                        <td>{s.scheduled_date} {s.scheduled_time}</td>
                        <td><span className={`status-badge status-${s.status === 'LIVE NOW' ? 'live' : 'upcoming'}`}>{s.status}</span></td>
                        <td><a href={s.youtube_url} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>Watch Link</a></td>
                        <td>
                          <button className="btn-sm btn-edit" onClick={() => openEditStream(s)} style={{ marginRight: 6 }}><i className="fa-solid fa-pen"></i></button>
                          <button className="btn-sm btn-delete" onClick={() => deleteStream(s.id)}><i className="fa-solid fa-trash"></i></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. VIDEOS MANAGER */}
          {activeView === 'videos' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title"><i className="fa-brands fa-youtube"></i> Video Management</h2>
                <button className="btn-admin-primary" style={{ width: 'auto' }} onClick={openAddVideo}><i className="fa-solid fa-plus"></i> Add Video</button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Trending Status</th>
                    <th>YouTube Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map(v => (
                    <tr key={v.id}>
                      <td><img src={v.thumbnail_url} style={{ width: 60, height: 35, objectFit: 'cover', borderRadius: 6 }} alt="" /></td>
                      <td><strong>{v.title}</strong></td>
                      <td><span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{v.category || 'General'}</span></td>
                      <td>
                        {v.is_trending ? (
                          <button className="btn-sm" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 700 }} onClick={() => toggleTrending(v.id, true)}>
                            <i className="fa-solid fa-fire"></i> 🔥 Trending
                          </button>
                        ) : (
                          <button className="btn-sm" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }} onClick={() => toggleTrending(v.id, false)}>
                            <i className="fa-regular fa-fire"></i> Set Trending
                          </button>
                        )}
                      </td>
                      <td><a href={v.youtube_url} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>Watch</a></td>
                      <td>
                        <button className="btn-sm btn-edit" onClick={() => openEditVideo(v)} style={{ marginRight: 6 }}><i className="fa-solid fa-pen"></i></button>
                        <button className="btn-sm btn-delete" onClick={() => deleteVideo(v.id)}><i className="fa-solid fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. SUBSCRIBERS EDITABLE TABLE */}
          {activeView === 'subscribers' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><i className="fa-solid fa-users"></i> Subscriber Counter Settings</h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Edit live sub count and YouTube API sync settings.</p>
                </div>
                <button className="btn-admin-primary" style={{ width: 'auto' }} onClick={() => setShowSubModal(true)}><i className="fa-solid fa-pen-to-square"></i> Edit Table</button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Setting Name</th>
                    <th>Current Value</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Live Subscriber Count</strong></td>
                    <td><span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{(subscribers.count || 0).toLocaleString()}</span></td>
                    <td>Numeric</td>
                    <td><button className="btn-sm btn-edit" onClick={() => setShowSubModal(true)}><i className="fa-solid fa-pen"></i> Edit</button></td>
                  </tr>
                  <tr>
                    <td><strong>YouTube API Sync</strong></td>
                    <td>{subscribers.is_api_enabled ? 'Enabled' : 'Disabled'}</td>
                    <td>Toggle</td>
                    <td><button className="btn-sm btn-edit" onClick={() => setShowSubModal(true)}><i className="fa-solid fa-sliders"></i> Change</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 5. SUPPORT / UPI SETTINGS */}
          {activeView === 'support' && (
            <div className="card" style={{ maxWidth: 650 }}>
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-qrcode"></i> Support / UPI Settings</h2>
              </div>
              <form onSubmit={handleSaveSupport}>
                <div className="form-group">
                  <label>UPI ID (e.g. creator@upi)</label>
                  <input type="text" className="form-control" value={supportForm.upi_id || ''} onChange={e => setSupportForm({ ...supportForm, upi_id: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Creator / Payment Name</label>
                  <input type="text" className="form-control" value={supportForm.creator_name || ''} onChange={e => setSupportForm({ ...supportForm, creator_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Default Support Amount (₹ INR)</label>
                  <input type="number" className="form-control" value={supportForm.default_amount || 100} onChange={e => setSupportForm({ ...supportForm, default_amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Support Message</label>
                  <textarea className="form-control" rows="3" value={supportForm.support_message || ''} onChange={e => setSupportForm({ ...supportForm, support_message: e.target.value })}></textarea>
                </div>
                <div className="form-group">
                  <label>Paytm Merchant ID (MID) / Gateway Link</label>
                  <input type="text" className="form-control" placeholder="Enter Paytm MID or Gateway Link" value={supportForm.paytm_mid || ''} onChange={e => setSupportForm({ ...supportForm, paytm_mid: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Paytm Merchant Key</label>
                  <input type="password" className="form-control" placeholder="Enter Paytm Merchant Key" onChange={e => setSupportForm({ ...supportForm, paytm_key: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>QR Code Image URL or Upload File</label>
                  <input type="text" className="form-control" value={supportForm.qr_code_url || ''} onChange={e => setSupportForm({ ...supportForm, qr_code_url: e.target.value })} style={{ marginBottom: 10 }} />
                  <input type="file" accept="image/*" className="form-control" onChange={async (e) => {
                    const fileUrl = await handleFileUpload(e.target.files[0]);
                    if (fileUrl) setSupportForm({ ...supportForm, qr_code_url: fileUrl });
                  }} />
                </div>
                <button type="submit" className="btn-admin-primary">Save Support & Paytm Gateway Settings</button>
              </form>
            </div>
          )}

          {/* 6. SOCIAL LINKS */}
          {activeView === 'socials' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-share-nodes"></i> Social Media Links</h2>
                <button className="btn-admin-primary" style={{ width: 'auto' }} onClick={() => setShowSocialModal(true)}><i className="fa-solid fa-plus"></i> Add Link</button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>URL</th>
                    <th>Icon Class</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {socials.map(s => (
                    <tr key={s.id}>
                      <td><i className={s.icon_class}></i> <strong>{s.platform}</strong></td>
                      <td><a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{s.url}</a></td>
                      <td><code>{s.icon_class}</code></td>
                      <td><button className="btn-sm btn-delete" onClick={() => deleteSocial(s.id)}><i className="fa-solid fa-trash"></i> Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. WEBSITE SETTINGS */}
          {activeView === 'settings' && (
            <div className="card" style={{ maxWidth: 700 }}>
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-sliders"></i> General Website Settings</h2>
              </div>
              <form onSubmit={handleSaveSettings}>
                <div className="form-group">
                  <label>Website Title</label>
                  <input type="text" className="form-control" value={settingsForm.website_title || ''} onChange={e => setSettingsForm({ ...settingsForm, website_title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Creator Name</label>
                  <input type="text" className="form-control" value={settingsForm.creator_name || ''} onChange={e => setSettingsForm({ ...settingsForm, creator_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Hero Welcome Line</label>
                  <input type="text" className="form-control" value={settingsForm.hero_welcome_text || ''} onChange={e => setSettingsForm({ ...settingsForm, hero_welcome_text: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hero Typing Subtitle Phrases (comma-separated)</label>
                  <input type="text" className="form-control" value={settingsForm.hero_typing_texts || ''} onChange={e => setSettingsForm({ ...settingsForm, hero_typing_texts: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Profile Image URL / Upload File</label>
                  <input type="text" className="form-control" value={settingsForm.profile_image || ''} onChange={e => setSettingsForm({ ...settingsForm, profile_image: e.target.value })} style={{ marginBottom: 10 }} />
                  <input type="file" accept="image/*" className="form-control" onChange={async (e) => {
                    const fileUrl = await handleFileUpload(e.target.files[0]);
                    if (fileUrl) setSettingsForm({ ...settingsForm, profile_image: fileUrl });
                  }} />
                </div>
                <div className="form-group">
                  <label>About Creator Bio Text</label>
                  <textarea className="form-control" rows="4" value={settingsForm.about_text || ''} onChange={e => setSettingsForm({ ...settingsForm, about_text: e.target.value })}></textarea>
                </div>
                <button type="submit" className="btn-admin-primary">Save Website Settings</button>
              </form>
            </div>
          )}

          {/* 8. SECURITY & PASSWORD */}
          {activeView === 'security' && (
            <div className="card" style={{ maxWidth: 500 }}>
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-lock"></i> Security & Password</h2>
              </div>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" className="form-control" value={passForm.current_password} onChange={e => setPassForm({ ...passForm, current_password: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>New Password (min 6 characters)</label>
                  <input type="password" className="form-control" value={passForm.new_password} onChange={e => setPassForm({ ...passForm, new_password: e.target.value })} required minLength={6} />
                </div>
                <button type="submit" className="btn-admin-primary">Update Password</button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* STREAM MODAL */}
      {showStreamModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="card-title" style={{ marginBottom: 20 }}>{editStreamId ? 'Edit Stream' : 'Add New Stream'}</h2>
            <form onSubmit={handleSaveStream}>
              <div className="form-group">
                <label>Stream Title</label>
                <input type="text" className="form-control" value={streamForm.title} onChange={e => setStreamForm({ ...streamForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows="3" value={streamForm.description} onChange={e => setStreamForm({ ...streamForm, description: e.target.value })}></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div className="form-group">
                  <label>Scheduled Date</label>
                  <input type="date" className="form-control" value={streamForm.scheduled_date} onChange={e => setStreamForm({ ...streamForm, scheduled_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Scheduled Time</label>
                  <input type="time" className="form-control" value={streamForm.scheduled_time} onChange={e => setStreamForm({ ...streamForm, scheduled_time: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={streamForm.status} onChange={e => setStreamForm({ ...streamForm, status: e.target.value })}>
                  <option value="LIVE NOW">LIVE NOW</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ENDED">ENDED</option>
                </select>
              </div>
              <div className="form-group">
                <label>YouTube Live / Stream Link</label>
                <input type="url" className="form-control" value={streamForm.youtube_url} onChange={e => setStreamForm({ ...streamForm, youtube_url: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Thumbnail Image URL or File Upload</label>
                <input type="text" className="form-control" value={streamForm.thumbnail_url} onChange={e => setStreamForm({ ...streamForm, thumbnail_url: e.target.value })} style={{ marginBottom: 10 }} />
                <input type="file" accept="image/*" className="form-control" onChange={async (e) => {
                  const fileUrl = await handleFileUpload(e.target.files[0]);
                  if (fileUrl) setStreamForm({ ...streamForm, thumbnail_url: fileUrl });
                }} />
              </div>
              <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
                <button type="submit" className="btn-admin-primary">Save Stream</button>
                <button type="button" className="btn-sm btn-delete" onClick={() => setShowStreamModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="card-title" style={{ marginBottom: 20 }}>{editVideoId ? 'Edit Video' : 'Add New Video'}</h2>
            <form onSubmit={handleSaveVideo}>
              <div className="form-group">
                <label>Video Title</label>
                <input type="text" className="form-control" value={videoForm.title} onChange={e => setVideoForm({ ...videoForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows="2" value={videoForm.description} onChange={e => setVideoForm({ ...videoForm, description: e.target.value })}></textarea>
              </div>
              <div className="form-group">
                <label>YouTube URL</label>
                <input type="url" className="form-control" value={videoForm.youtube_url} onChange={e => setVideoForm({ ...videoForm, youtube_url: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" className="form-control" value={videoForm.category} onChange={e => setVideoForm({ ...videoForm, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Thumbnail Image URL or File Upload</label>
                <input type="text" className="form-control" value={videoForm.thumbnail_url} onChange={e => setVideoForm({ ...videoForm, thumbnail_url: e.target.value })} style={{ marginBottom: 10 }} />
                <input type="file" accept="image/*" className="form-control" onChange={async (e) => {
                  const fileUrl = await handleFileUpload(e.target.files[0]);
                  if (fileUrl) setVideoForm({ ...videoForm, thumbnail_url: fileUrl });
                }} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff7ed', padding: 12, borderRadius: 10 }}>
                <input type="checkbox" checked={videoForm.is_trending} onChange={e => setVideoForm({ ...videoForm, is_trending: e.target.checked })} style={{ width: 18, height: 18 }} />
                <label style={{ margin: 0, textTransform: 'none', color: '#c2410c', fontWeight: 700 }}>🔥 Mark as Trending Video</label>
              </div>
              <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
                <button type="submit" className="btn-admin-primary">Save Video</button>
                <button type="button" className="btn-sm btn-delete" onClick={() => setShowVideoModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB MODAL */}
      {showSubModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="card-title" style={{ marginBottom: 20 }}><i className="fa-solid fa-users"></i> Edit Subscriber Counter</h2>
            <form onSubmit={handleSaveSub}>
              <div className="form-group">
                <label>Live Subscriber Count</label>
                <input type="number" className="form-control" value={subForm.count} onChange={e => setSubForm({ ...subForm, count: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Counter Font Style</label>
                <select className="form-control" value={subForm.counter_font} onChange={e => setSubForm({ ...subForm, counter_font: e.target.value })}>
                  <option value="'Bebas Neue', sans-serif">Bebas Neue (Bold Display)</option>
                  <option value="'Outfit', sans-serif">Outfit (Clean Geometric)</option>
                  <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech Modern)</option>
                  <option value="'Orbitron', sans-serif">Orbitron (Futuristic Gaming)</option>
                  <option value="'Syne', sans-serif">Syne (Artistic Heavy)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
                <button type="submit" className="btn-admin-primary">Save Subscriber Table</button>
                <button type="button" className="btn-sm btn-delete" onClick={() => setShowSubModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOCIAL MODAL */}
      {showSocialModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="card-title" style={{ marginBottom: 20 }}><i className="fa-solid fa-share-nodes"></i> Add Social Link</h2>
            <form onSubmit={handleAddSocial}>
              <div className="form-group">
                <label>Platform Name</label>
                <input type="text" className="form-control" placeholder="Discord" value={socialForm.platform} onChange={e => setSocialForm({ ...socialForm, platform: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>URL</label>
                <input type="url" className="form-control" placeholder="https://..." value={socialForm.url} onChange={e => setSocialForm({ ...socialForm, url: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>FontAwesome Icon Class</label>
                <input type="text" className="form-control" placeholder="fa-brands fa-discord" value={socialForm.icon_class} onChange={e => setSocialForm({ ...socialForm, icon_class: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
                <button type="submit" className="btn-admin-primary">Add Link</button>
                <button type="button" className="btn-sm btn-delete" onClick={() => setShowSocialModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
