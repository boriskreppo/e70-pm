import React, { useState, useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { ACCENT, TONE } from './tokens.js';
import { effectiveStatus, formatDate, tc } from './utils.js';
import { api, setOnUnauthorized, setAuthToken, clearAuthToken } from './api.js';
import { SearchIcon, ChevronDown, ChevronRight } from './icons.jsx';
import { StatCard, Footer, ProgressBar } from './components/ui.jsx';
import { TopBar } from './components/TopBar.jsx';
import { ToastContainer, toast } from './components/Toast.jsx';
import { ProjectModal, CommandPalette } from './components/Modals.jsx';
import { ProjectRow } from './components/ProjectRow.jsx';
import { KanbanView } from './components/KanbanView.jsx';
import { GanttView } from './components/GanttView.jsx';
import { DetailView } from './components/DetailView.jsx';
import { LoginScreen } from './components/LoginScreen.jsx';
import { ProfilePage } from './components/ProfilePage.jsx';
import { NotificationBell } from './components/NotificationBell.jsx';
import { ActivitySidebar } from './components/ActivitySidebar.jsx';

export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('e70_token');
    const username = localStorage.getItem('e70_user');
    return (token && username) ? { token, username } : null;
  });
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('AKTIVNI');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accent-color') || '#FF5200');
  const [showActivitySidebar, setShowActivitySidebar] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activities, setActivities] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const toggleGroup = (status) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const projectListRef = useRef(null);

  useEffect(() => {
    if (view !== 'list') return;

    const containers = document.querySelectorAll('.project-group-rows');
    const sortables = [];

    containers.forEach(container => {
      const sortable = Sortable.create(container, {
        group: 'projects-list',
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          const { oldIndex, newIndex, item, to, from } = evt;
          if (oldIndex === undefined || newIndex === undefined) return;

          // Revert SortableJS DOM move immediately so React handles it cleanly
          const childrenArr = Array.from(from.children);
          if (oldIndex < childrenArr.length) {
            from.insertBefore(item, childrenArr[oldIndex]);
          } else {
            from.appendChild(item);
          }

          const projectId = item.getAttribute('data-id');
          const targetGroup = to.getAttribute('data-group');
          const sourceGroup = from.getAttribute('data-group');

          if (projectId && targetGroup && targetGroup !== sourceGroup) {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
              triggerUndoableGroupChange(proj, targetGroup);
            }
          }
        }
      });
      sortables.push(sortable);
    });

    return () => {
      sortables.forEach(s => s.destroy());
    };
  }, [projects, view, filter, query]);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    localStorage.setItem('accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    let c = accentColor.substring(1);
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    document.documentElement.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

  const fetchActivities = async () => {
    try {
      const data = await api('/activity?limit=25');
      setActivities(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (showActivitySidebar) {
      fetchActivities();
      const interval = setInterval(fetchActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [showActivitySidebar]);

  const handleLogout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthToken();
    setUser(null);
    setProjects([]);
    setSelectedId(null);
  };

  useEffect(() => {
    if (!user) return;
    loadProjects();
    const iv = setInterval(() => api('/health').then(() => setOnline(true)).catch(() => setOnline(false)), 15000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(s => !s); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !selectedId) { e.preventDefault(); setShowNew(true); }
      if (e.key === 'Escape') { setShowNew(false); setEditing(null); setShowSearch(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId]);

  const loadProjects = async () => {
    try { const d = await api('/projects'); setProjects(d); setOnline(true); }
    catch { setOnline(false); }
    finally { setLoading(false); }
  };

  const sync = updated => {
    setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
    if (showActivitySidebar) fetchActivities();
  };

  const handleCreate = async data => {
    try {
      const p = await api('/projects', { method: 'POST', body: JSON.stringify(data) });
      setProjects(ps => [p, ...ps]);
      setShowNew(false);
      toast('Projekat kreiran');
      if (showActivitySidebar) fetchActivities();
    } catch (e) {
      if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error');
    }
  };
  const [undoData, setUndoData] = useState(null);

  const handleUpdate = async data => {
    try { const p = await api(`/projects/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }); sync(p); setEditing(null); toast('Sačuvano'); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };

  const triggerUndoableStatusChange = (projectsList, newStatus) => {
    const list = Array.isArray(projectsList) ? projectsList : [projectsList];
    const changes = list.map(p => ({ projectId: p.id, prevStatus: p.status, title: p.title }));

    list.forEach(p => {
      handleUpdate({ ...p, status: newStatus });
    });

    if (undoData && undoData.intervalId) {
      clearInterval(undoData.intervalId);
    }

    let timeLeft = 5;
    const intervalId = setInterval(() => {
      setUndoData(prev => {
        if (!prev) return null;
        const nextTime = prev.timeLeft - 1;
        if (nextTime <= 0) {
          clearInterval(intervalId);
          return null;
        }
        return { ...prev, timeLeft: nextTime };
      });
    }, 1000);

    const projectTitle = list.length === 1 ? list[0].title : `${list.length} projekta`;

    setUndoData({
      changes,
      projectTitle,
      newStatus,
      timeLeft,
      intervalId
    });
  };

  const triggerUndoableGroupChange = (project, newGroupName) => {
    const prevGroupName = project.groupName || 'Glavna grupa';
    if (prevGroupName === newGroupName) return;

    handleUpdate({ ...project, groupName: newGroupName });

    if (undoData && undoData.intervalId) {
      clearInterval(undoData.intervalId);
    }

    let timeLeft = 5;
    const intervalId = setInterval(() => {
      setUndoData(prev => {
        if (!prev) return null;
        const nextTime = prev.timeLeft - 1;
        if (nextTime <= 0) {
          clearInterval(intervalId);
          return null;
        }
        return { ...prev, timeLeft: nextTime };
      });
    }, 1000);

    setUndoData({
      changes: [{ projectId: project.id, prevGroupName, title: project.title }],
      projectTitle: project.title,
      newGroupName,
      timeLeft,
      intervalId,
      isGroupChange: true
    });
  };

  const executeUndo = () => {
    if (!undoData) return;
    clearInterval(undoData.intervalId);
    if (undoData.isGroupChange) {
      undoData.changes.forEach(change => {
        const proj = projects.find(p => p.id === change.projectId);
        if (proj) {
          handleUpdate({ ...proj, groupName: change.prevGroupName });
        }
      });
      toast('Premještanje u drugu grupu poništeno');
    } else {
      undoData.changes.forEach(change => {
        const proj = projects.find(p => p.id === change.projectId);
        if (proj) {
          handleUpdate({ ...proj, status: change.prevStatus });
        }
      });
      toast('Promjena statusa poništena');
    }
    setUndoData(null);
  };

  const handleUpdateUndoable = async data => {
    const original = projects.find(p => p.id === data.id);
    if (original && original.status !== data.status) {
      triggerUndoableStatusChange(original, data.status);
    } else if (original && original.groupName !== data.groupName) {
      triggerUndoableGroupChange(original, data.groupName);
    } else {
      await handleUpdate(data);
    }
  };
  const handleDelete = async id => {
    try {
      await api(`/projects/${id}`, { method: 'DELETE' });
      setProjects(ps => ps.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast('Projekat obrisan');
      if (showActivitySidebar) fetchActivities();
    } catch (e) {
      if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error');
    }
  };
  const handleAddTask = async (pid, data) => {
    try { sync(await api(`/projects/${pid}/tasks`, { method: 'POST', body: JSON.stringify(data) })); toast('Task dodan'); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleUpdateTask = async (pid, tid, data) => {
    try { sync(await api(`/projects/${pid}/tasks/${tid}`, { method: 'PUT', body: JSON.stringify(data) })); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleDeleteTask = async (pid, tid) => {
    try { sync(await api(`/projects/${pid}/tasks/${tid}`, { method: 'DELETE' })); toast('Task obrisan'); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleBulkUpdateTasks = async (pid, ids, data) => {
    try { sync(await api(`/projects/${pid}/tasks/bulk`, { method: 'PATCH', body: JSON.stringify({ ids, data }) })); toast(`${ids.length} task${ids.length !== 1 ? 'a' : ''} ažurirano`); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleBulkDeleteTasks = async (pid, ids) => {
    try { sync(await api(`/projects/${pid}/tasks/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids }) })); toast(`${ids.length} task${ids.length !== 1 ? 'a' : ''} obrisano`); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleAddNote = async (pid, content) => {
    try { sync(await api(`/projects/${pid}/notes`, { method: 'POST', body: JSON.stringify({ content }) })); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleUpdateNote = async (pid, nid, content) => {
    try { sync(await api(`/projects/${pid}/notes/${nid}`, { method: 'PUT', body: JSON.stringify({ content }) })); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };
  const handleDeleteNote = async (pid, nid) => {
    try { sync(await api(`/projects/${pid}/notes/${nid}`, { method: 'DELETE' })); }
    catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };

  const handleArchive = async (id, archived) => {
    try {
      await api(`/projects/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) });
      if (archived) {
        setProjects(ps => ps.filter(p => p.id !== id));
        setArchivedProjects([]);
        if (selectedId === id) setSelectedId(null);
        toast('Projekat arhiviran');
      } else {
        setArchivedProjects(ps => ps.filter(p => p.id !== id));
        await loadProjects();
        toast('Projekat razarhiviran');
      }
    } catch (e) { if (e.message !== 'UNAUTHORIZED') toast(e.message, 'error'); }
  };

  useEffect(() => {
    if (filter !== 'ARHIVA' || loadingArchived) return;
    setLoadingArchived(true);
    api('/projects?archived=1').then(d => { setArchivedProjects(d); setLoadingArchived(false); }).catch(() => setLoadingArchived(false));
  }, [filter]);

  const exportCSV = () => {
    const cols = ['ID', 'Naziv', 'Status', 'Prioritet', 'Vlasnik', 'Rok', 'Napredak %', 'Taskovi ukupno', 'Taskovi završeni', 'Tagovi', 'Kreirano'];
    const rows = projects.map(p => [
      p.id, p.title, effectiveStatus(p), p.priority, p.owner,
      p.deadline || '', p.progress, p.tasks.length,
      p.tasks.filter(t => t.status === 'DONE').length,
      p.tags.join(';'),
      formatDate(p.createdAt),
    ]);
    const csv = [cols, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `e70-pm-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('CSV eksportovan');
  };

  const selectedProject = projects.find(p => p.id === selectedId) || null;

  if (!user) return <LoginScreen onLogin={u => { setAuthToken(u.token); setUser(u); setLoading(true); }} />;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#08090B' }}>
      {/* Topbar skeleton */}
      <div style={{ height: 56, borderBottom: '1px solid #22262B', background: '#0A0B0D', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16 }}>
        <div style={{ width: 28, height: 28, background: ACCENT }} />
        <div style={{ width: 160, height: 10, background: '#2C3138', borderRadius: 2 }} />
      </div>
      {/* Hero skeleton */}
      <div style={{ padding: '28px', borderBottom: '1px solid #22262B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 280, height: 40, background: '#2C3138', borderRadius: 2 }} />
        <div style={{ width: 140, height: 36, background: '#2C3138', borderRadius: 2 }} />
      </div>
      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #22262B' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ padding: '28px', borderRight: i < 3 ? '1px solid #2C3138' : 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 80, height: 8, background: '#2C3138', borderRadius: 2 }} />
            <div style={{ width: 60, height: 48, background: '#2C3138', borderRadius: 2 }} />
          </div>
        ))}
      </div>
      {/* Rows skeleton */}
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ padding: '22px 28px', borderTop: '1px solid #22262B', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 40, height: 8, background: '#2C3138', borderRadius: 2 }} />
          <div style={{ flex: 1, height: 10, background: '#2C3138', borderRadius: 2 }} />
          <div style={{ width: 120, height: 6, background: '#2C3138', borderRadius: 2 }} />
          <div style={{ width: 80, height: 20, background: '#2C3138', borderRadius: 2 }} />
        </div>
      ))}
    </div>
  );

  const userRight = (extra) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {extra}
      <button onClick={() => setShowSearch(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'transparent', border: '1px solid #2C3138', color: '#848B96', cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em' }}>
        <span style={{ fontSize: 12 }}>⌕</span> TRAŽI
        <kbd style={{ fontSize: 9, border: '1px solid #2A2E33', padding: '1px 5px', letterSpacing: '0.04em' }}>⌘K</kbd>
      </button>
      <NotificationBell onSelectProject={id => { setSelectedId(id); setFilter('SVE'); }} />
      <button
        onClick={() => setShowActivitySidebar(prev => !prev)}
        style={{
          background: 'transparent',
          border: 'none',
          color: showActivitySidebar ? 'var(--accent-color)' : '#848B96',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
        title="Pregled aktivnosti"
      >
        <span style={{ fontSize: 8 }}>●</span> AKTIVNOST
      </button>
      <span style={{ color: '#2A2E33' }}>·</span>
      <button onClick={() => setShowProfile(true)} style={{ fontSize: 11, color: '#E8EAED', fontWeight: 600, letterSpacing: '0.1em', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{user.username.toUpperCase()}</button>
      <button onClick={handleLogout} style={{ fontSize: 10, color: '#848B96', background: 'transparent', border: '1px solid #2C3138', padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 600 }}>ODJAVA</button>
    </div>
  );

  if (showProfile) return (
    <>
      <ToastContainer />
      <ProfilePage user={user} online={online} onBack={() => setShowProfile(false)} onLogout={handleLogout}
        onProfileUpdate={updated => setUser(u => ({ ...u, ...updated }))} />
    </>
  );

  if (selectedProject) return (
    <>
      <ToastContainer />
      {showSearch && (
        <CommandPalette
          projects={projects}
          onClose={() => setShowSearch(false)}
          onNavigateProject={id => { setSelectedId(id); setShowSearch(false); }}
          onExecuteCommand={cmd => {
            setShowSearch(false);
            if (cmd === 'lista') { setView('list'); setSelectedId(null); }
            else if (cmd === 'kanban') { setView('kanban'); setSelectedId(null); }
            else if (cmd === 'gantt') { setView('gantt'); setSelectedId(null); }
            else if (cmd === 'novi') { setShowNew(true); setSelectedId(null); }
            else if (cmd === 'pretraga') {
              const searchInput = document.querySelector('.toolbar-search input');
              if (searchInput) searchInput.focus();
            }
            else if (cmd === 'filter-sve') { setFilter('SVE'); setSelectedId(null); }
            else if (cmd === 'filter-aktivno') { setFilter('AKTIVNO'); setSelectedId(null); }
            else if (cmd === 'filter-uskoro') { setFilter('USKORO'); setSelectedId(null); }
            else if (cmd === 'filter-prekoraceno') { setFilter('PROBIJEN ROK'); setSelectedId(null); }
          }}
        />
      )}
      <DetailView project={selectedProject} online={online} user={user} onLogout={handleLogout}
        onBack={() => setSelectedId(null)}
        onEdit={() => { setEditing(selectedProject); setSelectedId(null); }}
        onArchive={archived => handleArchive(selectedProject.id, archived)}
        onUpdateProject={handleUpdateUndoable}
        onAddTask={data => handleAddTask(selectedProject.id, data)}
        onUpdateTask={(tid, data) => handleUpdateTask(selectedProject.id, tid, data)}
        onDeleteTask={tid => handleDeleteTask(selectedProject.id, tid)}
        onBulkUpdate={(ids, data) => handleBulkUpdateTasks(selectedProject.id, ids, data)}
        onBulkDelete={ids => handleBulkDeleteTasks(selectedProject.id, ids)}
        onAddNote={content => handleAddNote(selectedProject.id, content)}
        onUpdateNote={(nid, content) => handleUpdateNote(selectedProject.id, nid, content)}
        onDeleteNote={nid => handleDeleteNote(selectedProject.id, nid)}
        onReorder={sync}
      />
      {editing && <ProjectModal onClose={() => setEditing(null)} onSave={handleUpdate} initial={editing} existingGroups={Array.from(new Set(projects.map(p => p.groupName || 'Glavna grupa')))} />}
    </>
  );

  const allStatuses = projects.map(effectiveStatus);
  const stats = {
    total: projects.length,
    aktivni: allStatuses.filter(s => s === 'AKTIVNO' || s === 'USKORO').length,
    završeni: allStatuses.filter(s => s === 'ZAVRŠEN').length,
    probijeni: allStatuses.filter(s => s === 'PROBIJEN ROK').length,
  };

  const filterFn = {
    'SVE': () => true,
    'AKTIVNI': p => ['AKTIVNO', 'USKORO'].includes(effectiveStatus(p)),
    'ZAVRŠENI': p => effectiveStatus(p) === 'ZAVRŠEN',
    'PROBIJENI': p => effectiveStatus(p) === 'PROBIJEN ROK',
  };
  const displayProjects = filter === 'ARHIVA' ? archivedProjects : projects;
  const filtered = displayProjects.filter(p => (filter === 'ARHIVA' || filterFn[filter](p)) && (query === '' || p.title.toLowerCase().includes(query.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))));

  const getGroupColor = (name) => {
    const n = (name || '').toUpperCase();
    if (n.includes('DEEPVIEW')) return tc('cyan');
    if (n.includes('INTERN')) return tc('lime');
    if (n.includes('MARKET')) return tc('amber');
    if (n.includes('INFRA')) return tc('magenta');
    if (n.includes('DESIGN')) return '#A78BFA';
    if (n.includes('PRODUK')) return '#F472B6';
    return 'var(--accent-color)';
  };

  const renderListGroups = (projectList, collapsed, toggleFn) => {
    const uniqueGroups = Array.from(new Set(projectList.map(p => p.groupName || 'Glavna grupa')));
    return uniqueGroups.map(groupName => {
      const groupProjects = projectList.filter(p => (p.groupName || 'Glavna grupa') === groupName);
      if (groupProjects.length === 0) return null;
      const isCollapsed = collapsed.has(groupName);
      const groupColor = getGroupColor(groupName);

      const deadlines = groupProjects.map(p => p.deadline).filter(Boolean).map(d => new Date(d));
      const dtOptions = { day: 'numeric', month: 'short' };
      let dateRange;
      if (deadlines.length === 0) {
        const now = new Date();
        const s = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
        const e = new Date(now.getTime() + 11 * 24 * 3600 * 1000);
        dateRange = `${s.toLocaleDateString('sr-RS', dtOptions)} – ${e.toLocaleDateString('sr-RS', dtOptions)}`;
      } else {
        const sorted = [...deadlines].sort((a, b) => a - b);
        dateRange = `${sorted[0].toLocaleDateString('sr-RS', dtOptions)} – ${sorted[sorted.length - 1].toLocaleDateString('sr-RS', dtOptions)}`;
      }

      const uniqueOwners = Array.from(new Set(groupProjects.map(p => p.owner).filter(Boolean)));

      let todoCount = 0, inProgressCount = 0, doneCount = 0;
      groupProjects.forEach(p => {
        p.tasks.forEach(t => {
          if (t.status === 'DONE') doneCount++;
          else if (t.status === 'IN PROGRESS') inProgressCount++;
          else todoCount++;
        });
      });
      const totalTasks = todoCount + inProgressCount + doneCount;

      let kriticanCount = 0, visokCount = 0, srednjiCount = 0, nizakCount = 0;
      groupProjects.forEach(p => {
        if (p.priority === 'KRITIČAN') kriticanCount++;
        else if (p.priority === 'VISOK') visokCount++;
        else if (p.priority === 'SREDNJI') srednjiCount++;
        else nizakCount++;
      });
      const totalPrios = groupProjects.length;
      const totalSP = groupProjects.reduce((sum, p) => sum + (p.estimateSP ?? 2), 0);
      const avgProgress = Math.round(groupProjects.reduce((sum, p) => sum + (p.progress ?? 0), 0) / groupProjects.length);

      const statusCounts = {
        AKTIVNO: groupProjects.filter(p => effectiveStatus(p) === 'AKTIVNO').length,
        'PROBIJEN ROK': groupProjects.filter(p => effectiveStatus(p) === 'PROBIJEN ROK').length,
        ZAVRŠEN: groupProjects.filter(p => effectiveStatus(p) === 'ZAVRŠEN').length,
      };

      return (
        <div key={groupName} style={{ marginBottom: 24 }}>
          <div
            onClick={() => toggleFn(groupName)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 16px', background: '#0B0D10',
              borderTop: `2px solid ${groupColor}`,
              cursor: 'pointer', userSelect: 'none', marginTop: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isCollapsed
                ? <ChevronRight size={12} style={{ color: groupColor }} />
                : <ChevronDown size={12} style={{ color: groupColor }} />}
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: groupColor }}>
                ▌ {groupName.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: '#626873', fontWeight: 600 }}>
                {groupProjects.length} {groupProjects.length === 1 ? 'projekat' : 'projekata'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {statusCounts.AKTIVNO > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: tc('lime'), background: '#0A150A', border: `1px solid ${tc('lime')}22`, padding: '2px 7px', letterSpacing: '0.05em' }}>
                    {statusCounts.AKTIVNO} AKT
                  </span>
                )}
                {statusCounts['PROBIJEN ROK'] > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: tc('magenta'), background: '#150A0F', border: `1px solid ${tc('magenta')}22`, padding: '2px 7px', letterSpacing: '0.05em' }}>
                    {statusCounts['PROBIJEN ROK']} KRIT
                  </span>
                )}
                {statusCounts.ZAVRŠEN > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#626873', background: '#0D0F12', border: '1px solid #1C1F26', padding: '2px 7px', letterSpacing: '0.05em' }}>
                    {statusCounts.ZAVRŠEN} ZAV
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#626873', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{dateRange}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newName = window.prompt('Preimenuj grupu:', groupName);
                  if (newName && newName.trim() && newName.trim() !== groupName) {
                    groupProjects.forEach(p => handleUpdate({ ...p, groupName: newName.trim() }));
                    toast(`Grupa preimenovana u "${newName.trim()}"`);
                  }
                }}
                title="Preimenuj grupu"
                style={{ background: 'transparent', border: 'none', color: '#626873', cursor: 'pointer', padding: '2px 4px', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.color = '#E8EAED'}
                onMouseLeave={e => e.currentTarget.style.color = '#626873'}
              >⚙</button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="project-group-rows" data-group={groupName}>
              {groupProjects.map((p, idx) => (
                <ProjectRow
                  key={p.id} project={p} index={idx}
                  onClick={() => setSelectedId(p.id)}
                  onDelete={handleDelete}
                  onUpdateTask={handleUpdateTask}
                  onUpdateProject={handleUpdateUndoable}
                />
              ))}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '24px 24px 40px 1fr 60px 125px 125px 75px 120px 100px 110px 60px',
                alignItems: 'stretch', gap: 0, padding: 0,
                borderBottom: `3px solid ${groupColor}`,
                background: '#08090B', height: 38
              }}>
                <div style={{ borderRight: '1px solid #1C1F26' }} />
                <div style={{ borderRight: '1px solid #1C1F26' }} />
                <div style={{ borderRight: '1px solid #1C1F26' }} />
                <div style={{ borderRight: '1px solid #1C1F26' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%', position: 'relative' }}>
                  {uniqueOwners.slice(0, 3).map((initials, oIdx) => {
                    const proj = groupProjects.find(p => p.owner === initials);
                    const color = proj?.ownerColor || ACCENT;
                    return (
                      <div key={initials} style={{ marginLeft: oIdx > 0 ? -6 : 0, zIndex: 10 - oIdx, border: '1px solid #08090B', borderRadius: '50%', overflow: 'hidden' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, color: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{initials}</div>
                      </div>
                    );
                  })}
                  {uniqueOwners.length > 3 && <span style={{ fontSize: 8, color: '#626873', fontWeight: 600, marginLeft: 2 }}>+{uniqueOwners.length - 3}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%', padding: '0 12px' }}>
                  {totalTasks > 0 ? (
                    <div style={{ display: 'flex', width: '100%', height: 6, background: '#12141C', borderRadius: 1, overflow: 'hidden' }}>
                      {doneCount > 0 && <div style={{ width: `${(doneCount/totalTasks)*100}%`, background: tc('lime') }} />}
                      {inProgressCount > 0 && <div style={{ width: `${(inProgressCount/totalTasks)*100}%`, background: tc('cyan') }} />}
                      {todoCount > 0 && <div style={{ width: `${(todoCount/totalTasks)*100}%`, background: '#2C3138' }} />}
                    </div>
                  ) : <div style={{ fontSize: 9, color: '#626873', letterSpacing: '0.04em' }}>BEZ TASKOVA</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%', padding: '0 12px' }}>
                  {totalPrios > 0 && (
                    <div style={{ display: 'flex', width: '100%', height: 6, background: '#12141C', borderRadius: 1, overflow: 'hidden' }}>
                      {kriticanCount > 0 && <div style={{ width: `${(kriticanCount/totalPrios)*100}%`, background: tc('magenta') }} />}
                      {visokCount > 0 && <div style={{ width: `${(visokCount/totalPrios)*100}%`, background: tc('amber') }} />}
                      {srednjiCount > 0 && <div style={{ width: `${(srednjiCount/totalPrios)*100}%`, background: tc('cyan') }} />}
                      {nizakCount > 0 && <div style={{ width: `${(nizakCount/totalPrios)*100}%`, background: '#2C3138' }} />}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%', padding: '2px 0', background: '#111317' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#E8EAED', fontVariantNumeric: 'tabular-nums' }}>{totalSP} SP</span>
                  <span style={{ fontSize: 7, color: '#626873', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>sum</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'stretch', borderRight: '1px solid #1C1F26', height: '100%', padding: '0 12px' }}>
                  <div style={{ width: '100%' }}><ProgressBar value={avgProgress} tone="cyan" /></div>
                </div>
                <div style={{ borderRight: '1px solid #1C1F26' }} />
                <div style={{ borderRight: '1px solid #1C1F26' }} />
                <div />
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const FILTERS = [
    { key: 'SVE',       label: `SVE · ${stats.total}` },
    { key: 'AKTIVNI',   label: `AKTIVNI · ${stats.aktivni}` },
    { key: 'ZAVRŠENI',  label: `ZAVRŠENI · ${stats.završeni}` },
    { key: 'PROBIJENI', label: `PROBIJENI · ${stats.probijeni}` },
    { key: 'ARHIVA',    label: 'ARHIVA' },
  ];

  const breadcrumb = <><span>INTERNAL</span><span style={{ color: '#2A2E33' }}>/</span><span>PROJECT MANAGEMENT</span></>;

  return (
    <div style={{ minHeight: '100vh', background: '#08090B', display: 'flex', flexDirection: 'column' }}>
      <TopBar breadcrumb={breadcrumb} right={userRight(<span style={{ fontSize: 11, color: '#848B96', letterSpacing: '0.08em' }}>v2.1.0</span>)} online={online} />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

      <div className="hero-wrap" style={{ padding: '28px 28px 24px', borderBottom: '1px solid #22262B' }}>
        <div className="hero-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <h1 className="hero-title" style={{ margin: 0, fontSize: 48, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, color: '#F5F6F7' }}>
              Pregled <span style={{ color: ACCENT }}>projekata.</span>
            </h1>
            <div className="hero-sub" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', color: '#848B96' }}>{projects.length} zapisa</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="hero-sub" style={{ fontSize: 11, color: '#848B96', letterSpacing: '0.1em' }}>
              SYNC · {new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <button onClick={() => setShowNew(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: ACCENT, color: '#0A0B0D', border: 'none', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>+</span> Novi projekat
              <span className="hero-sub" style={{ marginLeft: 8, paddingLeft: 10, borderLeft: '1px solid #0A0B0D33', fontSize: 10, fontWeight: 600, opacity: 0.65 }}>⌘ N</span>
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #22262B' }}>
        <StatCard label="UKUPNO" value={stats.total} tone="neutral" delta="+0 mj" isLast={false} />
        <StatCard label="AKTIVNI" value={stats.aktivni} tone="lime" delta={stats.total ? `${Math.round(stats.aktivni/stats.total*100)}%` : '0%'} isLast={false} />
        <StatCard label="ZAVRŠENI" value={stats.završeni} tone="cyan" delta={stats.total ? `${Math.round(stats.završeni/stats.total*100)}%` : '0%'} isLast={false} />
        <StatCard label="PROBIJENI ROK" value={stats.probijeni} tone="magenta" delta={stats.total ? `${Math.round(stats.probijeni/stats.total*100)}%` : '0%'} isLast />
      </div>

      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '1px solid #22262B', gap: 16 }}>
        <div className="toolbar-search" style={{ flex: 1, maxWidth: 460, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0F1114', border: '1px solid #2C3138' }}>
          <span style={{ color: '#626873' }}><SearchIcon /></span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pretraži projekte..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E8EAED', fontSize: 13, minWidth: 0 }} />
        </div>
        {/* Status filter — compact dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowFilterDropdown(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px',
              background: filter === 'SVE' ? 'transparent' : '#111317',
              border: `1px solid ${filter === 'SVE' ? '#2C3138' : 'var(--accent-color)'}`,
              color: filter === 'SVE' ? '#848B96' : 'var(--accent-color)',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: ({
                'SVE': '#626873', 'AKTIVNI': '#C6F432', 'ZAVRŠENI': '#22D3EE',
                'PROBIJENI': '#FF3DAA', 'ARHIVA': '#6B7280'
              })[filter] || '#626873'
            }} />
            {FILTERS.find(f => f.key === filter)?.label || filter}
            <span style={{ fontSize: 9, color: '#626873', marginLeft: 2 }}>{showFilterDropdown ? '▲' : '▼'}</span>
          </button>

          {showFilterDropdown && (
            <>
              <div onClick={() => setShowFilterDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: '#0A0B0D', border: '1px solid #2C3138',
                zIndex: 100, minWidth: 180,
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                animation: 'toastIn 0.1s ease-out'
              }}>
                {FILTERS.map(f => {
                  const dotColor = ({ 'SVE': '#626873', 'AKTIVNI': '#C6F432', 'ZAVRŠENI': '#22D3EE', 'PROBIJENI': '#FF3DAA', 'ARHIVA': '#6B7280' })[f.key] || '#626873';
                  const isActive = filter === f.key;
                  return (
                    <div
                      key={f.key}
                      onClick={() => { setFilter(f.key); setShowFilterDropdown(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid #16191D',
                        background: isActive ? '#111317' : 'transparent',
                        borderLeft: `3px solid ${isActive ? dotColor : 'transparent'}`,
                        fontSize: 11, fontWeight: isActive ? 700 : 500,
                        letterSpacing: '0.06em', color: isActive ? '#E8EAED' : '#848B96'
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#0F1114'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      {f.label}
                      {isActive && <span style={{ marginLeft: 'auto', fontSize: 10, color: dotColor }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="view-tabs" style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          {['LISTA', 'KANBAN', 'GANTT'].map((t) => {
            const active = view === t.toLowerCase();
            return (
              <button
                key={t}
                onClick={() => setView(t.toLowerCase())}
                style={{
                  padding: '8px 2px',
                  background: 'transparent',
                  color: active ? '#F5F6F7' : '#848B96',
                  border: 'none',
                  borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#F5F6F7'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#848B96'; }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <button onClick={exportCSV} title="Eksportuj kao CSV" style={{ padding: '9px 14px', background: 'transparent', border: '1px solid #2C3138', color: '#848B96', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0 }}>↓ CSV</button>
      </div>

      {view === 'kanban' ? (
        <KanbanView projects={filtered} onSelectProject={setSelectedId} onUpdateProject={handleUpdateUndoable} />
      ) : view === 'gantt' ? (
        <GanttView projects={filtered} onSelectProject={setSelectedId} />
      ) : (
        <>
          <div className="col-headers" style={{
            display: 'grid',
            gridTemplateColumns: '24px 24px 40px 1fr 60px 125px 125px 75px 120px 100px 110px 60px',
            gap: 0,
            padding: 0,
            height: 32,
            alignItems: 'center',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#626873',
            background: '#0B0D10',
            borderBottom: '1px solid #1C1F26'
          }}>
            <div style={{ borderRight: '1px solid #1C1F26', height: '100%' }} />
            <div style={{ borderRight: '1px solid #1C1F26', height: '100%' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>ID</div>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, borderRight: '1px solid #1C1F26', height: '100%' }}>PROJEKAT</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>VLASNIK</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>PRIORITET</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>SP</div>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, borderRight: '1px solid #1C1F26', height: '100%' }}>NAPREDAK</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>ROK</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', height: '100%' }}>AKTIVNOST</div>
            <div />
          </div>
          <div ref={projectListRef}>
            {filtered.length === 0 ? (
              <div style={{ padding: '56px 28px', textAlign: 'center', borderTop: '1px solid #22262B' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#626873', marginBottom: 12 }}>NEMA REZULTATA</div>
                <button onClick={() => setShowNew(true)} style={{ padding: '10px 20px', background: ACCENT, color: '#0A0B0D', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>+ NOVI PROJEKAT</button>
              </div>
            ) : filtered.length === 0 && projects.length > 0 ? (
              <div style={{ padding: '56px 28px', textAlign: 'center', borderTop: '1px solid #22262B' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#626873', marginBottom: 8 }}>NEMA REZULTATA</div>
                <div style={{ fontSize: 12, color: '#2A2E33', marginBottom: 20 }}>Nema projekata koji odgovaraju filteru.</div>
                <button onClick={() => { setFilter('SVE'); setQuery(''); }} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer' }}>PONIŠTI FILTER</button>
              </div>
            ) : renderListGroups(filtered, collapsedGroups, toggleGroup)}
          </div>
        </>
      )}

        </div>

        {showActivitySidebar && (
          <ActivitySidebar
            activities={activities}
            onClose={() => setShowActivitySidebar(false)}
            onSelectProject={setSelectedId}
          />
        )}
      </div>

      <Footer left={<>
        <span style={{ color: online ? ACCENT : TONE.magenta }}>● {online ? 'CONNECTED' : 'OFFLINE'}</span>
        <span>SYNC OK</span>
        <span style={{ color: '#2C3138' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#848B96' }}>BOJA AKCENTA:</span>
          {['#FF5200', '#C6F432', '#22D3EE', '#FF3DAA', '#F5A524'].map(color => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              style={{
                width: 12,
                height: 12,
                background: color,
                border: accentColor === color ? '1px solid #F5F6F7' : '1px solid transparent',
                cursor: 'pointer',
                padding: 0
              }}
              title={color}
            />
          ))}
        </div>
      </>} />

      {showNew && <ProjectModal onClose={() => setShowNew(false)} onSave={handleCreate} existingGroups={Array.from(new Set(projects.map(p => p.groupName || 'Glavna grupa')))} />}
      {editing && <ProjectModal onClose={() => setEditing(null)} onSave={handleUpdate} initial={editing} existingGroups={Array.from(new Set(projects.map(p => p.groupName || 'Glavna grupa')))} />}
      {showSearch && (
        <CommandPalette
          projects={projects}
          onClose={() => setShowSearch(false)}
          onNavigateProject={id => { setSelectedId(id); setShowSearch(false); }}
          onExecuteCommand={cmd => {
            setShowSearch(false);
            if (cmd === 'lista') setView('list');
            else if (cmd === 'kanban') setView('kanban');
            else if (cmd === 'gantt') setView('gantt');
            else if (cmd === 'novi') setShowNew(true);
            else if (cmd === 'pretraga') {
              const searchInput = document.querySelector('.toolbar-search input');
              if (searchInput) searchInput.focus();
            }
            else if (cmd === 'filter-sve') setFilter('SVE');
            else if (cmd === 'filter-aktivno') setFilter('AKTIVNO');
            else if (cmd === 'filter-uskoro') setFilter('USKORO');
            else if (cmd === 'filter-prekoraceno') setFilter('PROBIJEN ROK');
          }}
        />
      )}
      {undoData && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F1114',
          border: '1px solid var(--accent-color)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          zIndex: 1000,
          animation: 'toastIn 0.15s ease-out',
          color: '#E8EAED',
          fontSize: 12
        }}>
          <span>
            Status za <strong>{undoData.projectTitle}</strong> je promijenjen u <strong style={{ color: 'var(--accent-color)' }}>{undoData.newStatus}</strong>.
          </span>
          <button
            onClick={executeUndo}
            style={{
              background: 'var(--accent-color)',
              color: '#0A0B0D',
              border: 'none',
              padding: '6px 12px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
            onMouseLeave={e => e.currentTarget.style.opacity = 1}
          >
            PONIŠTI ({undoData.timeLeft}s)
          </button>
          <button
            onClick={() => {
              clearInterval(undoData.intervalId);
              setUndoData(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#626873',
              cursor: 'pointer',
              fontSize: 16,
              padding: 0,
              lineHeight: 1
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8EAED'}
            onMouseLeave={e => e.currentTarget.style.color = '#626873'}
          >
            ×
          </button>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
