import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://saas-notes-backend.vercel.app/api'  // Replace with your actual backend URL
  : '/api';

function App() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    tenant: 'acme'
  });

  // Note form state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchTenantInfo();
      fetchNotes();
    }
  }, []);

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || 'Request failed');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      fetchTenantInfo();
      fetchNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTenant(null);
    setNotes([]);
  };

  const fetchTenantInfo = async () => {
    try {
      const tenantInfo = await apiCall('/tenant');
      setTenant(tenantInfo);
    } catch (err) {
      setError('Failed to fetch tenant information');
    }
  };

  const fetchNotes = async () => {
    try {
      const notesData = await apiCall('/notes');
      setNotes(notesData);
    } catch (err) {
      setError('Failed to fetch notes');
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (editingNote) {
        await apiCall(`/notes/${editingNote.id}`, {
          method: 'PUT',
          body: JSON.stringify(noteForm)
        });
        setSuccess('Note updated successfully!');
      } else {
        await apiCall('/notes', {
          method: 'POST',
          body: JSON.stringify(noteForm)
        });
        setSuccess('Note created successfully!');
      }
      
      setShowNoteModal(false);
      setNoteForm({ title: '', content: '' });
      setEditingNote(null);
      fetchNotes();
      fetchTenantInfo(); // Refresh tenant info for note count
    } catch (err) {
      if (err.message.includes('Note limit reached')) {
        setError('You have reached the maximum number of notes for the Free plan. Please upgrade to Pro for unlimited notes.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await apiCall(`/notes/${id}`, { method: 'DELETE' });
      setSuccess('Note deleted successfully!');
      fetchNotes();
      fetchTenantInfo();
    } catch (err) {
      setError('Failed to delete note');
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      content: note.content || ''
    });
    setShowNoteModal(true);
  };

  const handleUpgradeTenant = async () => {
    if (!window.confirm('Are you sure you want to upgrade to Pro?')) {
      return;
    }

    setLoading(true);
    try {
      await apiCall(`/tenants/${user.tenant}/upgrade`, {
        method: 'POST'
      });
      setSuccess('Successfully upgraded to Pro! You now have unlimited notes.');
      fetchTenantInfo();
    } catch (err) {
      setError('Failed to upgrade tenant');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  if (!user) {
    return (
      <div className="container">
        <div className="header">
          <h1>SaaS Notes App</h1>
          <p>Multi-tenant note management system</p>
        </div>

        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
          
          {error && <div className="error">{error}</div>}
          
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
                placeholder="Enter your password"
              />
            </div>
            
            <div className="form-group">
              <label>Tenant:</label>
              <select
                value={loginData.tenant}
                onChange={(e) => setLoginData({...loginData, tenant: e.target.value})}
              >
                <option value="acme">Acme Corporation</option>
                <option value="globex">Globex Corporation</option>
              </select>
            </div>
            
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
            <h3>Test Accounts:</h3>
            <p><strong>Acme:</strong> admin@acme.test / user@acme.test</p>
            <p><strong>Globex:</strong> admin@globex.test / user@globex.test</p>
            <p><strong>Password:</strong> password (for all accounts)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>SaaS Notes App</h1>
        <p>Welcome back, {user.email}!</p>
      </div>

      {error && (
        <div className="error">
          {error}
          <button onClick={clearMessages} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit' }}>×</button>
        </div>
      )}

      {success && (
        <div className="success">
          {success}
          <button onClick={clearMessages} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit' }}>×</button>
        </div>
      )}

      <div className="card">
        <div className="nav">
          <h2>Dashboard</h2>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {tenant && (
          <div className={`plan-info ${tenant.plan === 'pro' ? 'plan-pro' : ''}`}>
            <h3>{tenant.name}</h3>
            <p><strong>Plan:</strong> {tenant.plan.toUpperCase()}</p>
            <p><strong>Role:</strong> {user.role.toUpperCase()}</p>
            <p><strong>Notes:</strong> {tenant.notesCount}{tenant.noteLimit ? `/${tenant.noteLimit}` : ' (unlimited)'}</p>
            
            {tenant.plan === 'free' && user.role === 'admin' && (
              <div style={{ marginTop: '10px' }}>
                <button className="btn-success" onClick={handleUpgradeTenant} disabled={loading}>
                  {loading ? 'Upgrading...' : 'Upgrade to Pro'}
                </button>
              </div>
            )}
          </div>
        )}

        {tenant && tenant.plan === 'free' && tenant.notesCount >= tenant.noteLimit && (
          <div className="upgrade-prompt">
            <p><strong>Note limit reached!</strong></p>
            <p>You have used all {tenant.noteLimit} notes available in your Free plan.</p>
            {user.role === 'admin' && (
              <button className="btn-success" onClick={handleUpgradeTenant} disabled={loading}>
                Upgrade to Pro for unlimited notes
              </button>
            )}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => setShowNoteModal(true)}
            disabled={tenant && tenant.plan === 'free' && tenant.notesCount >= tenant.noteLimit}
          >
            Create New Note
          </button>
        </div>

        <div className="notes-grid">
          {notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-title">{note.title}</div>
              <div className="note-content">
                {note.content || 'No content'}
              </div>
              <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '10px' }}>
                Created: {new Date(note.created_at).toLocaleDateString()}
              </div>
              <div className="note-actions">
                <button className="btn-secondary" onClick={() => handleEditNote(note)}>
                  Edit
                </button>
                <button className="btn-danger" onClick={() => handleDeleteNote(note.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {notes.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            <p>No notes yet. Create your first note!</p>
          </div>
        )}
      </div>

      {showNoteModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingNote ? 'Edit Note' : 'Create Note'}</h3>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNote(null);
                  setNoteForm({ title: '', content: '' });
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateNote}>
              <div className="form-group">
                <label>Title:</label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                  required
                  placeholder="Enter note title"
                />
              </div>
              
              <div className="form-group">
                <label>Content:</label>
                <textarea
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({...noteForm, content: e.target.value})}
                  placeholder="Enter note content"
                />
              </div>
              
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingNote ? 'Update Note' : 'Create Note')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;