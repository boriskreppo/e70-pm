import React, { useState, useEffect, useRef } from 'react';
import { ACCENT, TONE } from '../tokens.js';
import { relativeTime, hexToRgba } from '../utils.js';
import { authToken, API_BASE } from '../api.js';
import { TrashIcon } from '../icons.jsx';
import { toast } from './Toast.jsx';

function formatSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function typeLabel(mime, name) {
  if (mime.startsWith('image/')) return null;
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('word') || /\.(docx?|odt)$/i.test(name)) return 'DOC';
  if (mime.includes('excel') || mime.includes('spreadsheet') || /\.(xlsx?|ods|csv)$/i.test(name)) return 'XLS';
  if (mime.includes('powerpoint') || mime.includes('presentation') || /\.(pptx?|odp)$/i.test(name)) return 'PPT';
  if (mime.includes('zip') || mime.includes('compressed') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) return 'ZIP';
  if (mime.startsWith('text/') || /\.(txt|md)$/i.test(name)) return 'TXT';
  return 'FILE';
}

function dlUrl(id) {
  return `${API_BASE}/api/attachments/${id}/download?token=${encodeURIComponent(authToken)}`;
}

export function AttachmentPanel({ projectId, taskId, user }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index into images[]
  const inputRef = useRef(null);

  const listUrl = taskId
    ? `${API_BASE}/api/projects/${projectId}/attachments?task_id=${taskId}`
    : `${API_BASE}/api/projects/${projectId}/attachments`;
  const uploadUrl = taskId
    ? `${API_BASE}/api/projects/${projectId}/tasks/${taskId}/attachments`
    : `${API_BASE}/api/projects/${projectId}/attachments`;
  const dlAllUrl = `${API_BASE}/api/projects/${projectId}/attachments/download-all?token=${encodeURIComponent(authToken)}`;

  const load = () => {
    fetch(listUrl, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => { setAttachments(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); load(); }, [projectId, taskId]);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = e => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') setLightbox(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setLightbox(i => (i + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  const uploadFiles = async (files) => {
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) { toast(`${file.name}: prevelik (max 15MB)`, 'error'); continue; }
      setUploading(true); setProgress(0);
      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) { setAttachments(JSON.parse(xhr.responseText)); resolve(); }
            else { try { reject(new Error(JSON.parse(xhr.responseText).error)); } catch { reject(new Error(`HTTP ${xhr.status}`)); } }
          };
          xhr.onerror = () => reject(new Error('Greška pri uploadu'));
          const fd = new FormData(); fd.append('file', file);
          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          xhr.send(fd);
        });
        toast(`${file.name} uploadovan`);
      } catch (e) { toast(e.message || 'Greška pri uploadu', 'error'); }
      finally { setUploading(false); setProgress(0); }
    }
  };

  const handleDelete = async (id, name) => {
    try {
      const r = await fetch(`${API_BASE}/api/attachments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
      if (!r.ok) throw new Error((await r.json()).error);
      setAttachments(await r.json());
      toast(`${name} obrisan`);
    } catch (e) { toast(e.message, 'error'); }
  };

  const images = attachments.filter(a => a.mime_type.startsWith('image/'));
  const docs = attachments.filter(a => !a.mime_type.startsWith('image/'));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
      onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}>

      {/* Upload zone */}
      <div onClick={() => !uploading && inputRef.current?.click()}
        style={{ marginBottom: 14, border: `1px dashed ${dragging ? ACCENT : '#2A2E33'}`, padding: '12px 14px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: dragging ? hexToRgba(ACCENT, 0.03) : 'transparent', transition: 'all 0.12s' }}>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => { uploadFiles(e.target.files); e.target.value = ''; }} />
        {uploading ? (
          <div>
            <div style={{ fontSize: 10, color: '#848B96', marginBottom: 6, letterSpacing: '0.1em' }}>UPLOADING {progress}%</div>
            <div style={{ height: 2, background: '#2C3138' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: ACCENT, transition: 'width 0.15s' }} />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#626873', letterSpacing: '0.1em' }}>
            <span style={{ color: ACCENT, marginRight: 4 }}>↑</span>KLIKNI ILI PREVUCI<span style={{ color: '#2A2E33', marginLeft: 6 }}>MAX 15MB</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 11, color: '#626873', letterSpacing: '0.1em' }}>UČITAVANJE...</div>
      ) : attachments.length === 0 ? (
        <div style={{ fontSize: 12, color: '#626873' }}>Nema fajlova.</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: '#848B96', letterSpacing: '0.12em', fontWeight: 600 }}>
              {attachments.length} FAJL{attachments.length !== 1 ? 'A' : ''}
            </span>
            <a href={dlAllUrl} download style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.08em', fontWeight: 600, textDecoration: 'none' }}>↓ PREUZMI SVE</a>
          </div>

          {/* Image grid */}
          {images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: docs.length > 0 ? 14 : 0 }}>
              {images.map((att, idx) => (
                <div key={att.id}>
                  <div onClick={() => setLightbox(idx)}
                    style={{ aspectRatio: '1', background: '#0F1114', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid #2C3138' }}>
                    <img src={dlUrl(att.id)} alt={att.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <div style={{ flex: 1, fontSize: 9, color: '#626873', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.original_name}</div>
                    <a href={dlUrl(att.id)} download={att.original_name} style={{ color: '#848B96', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>↓</a>
                    {(att.uploader === user?.username) && (
                      <button onClick={() => handleDelete(att.id, att.original_name)} style={{ background: 'transparent', border: 'none', color: '#626873', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}><TrashIcon size={10} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Document list */}
          {docs.map((att, i) => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #22262B' }}>
              <div style={{ width: 30, height: 30, background: '#0F1114', border: '1px solid #2C3138', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#848B96', letterSpacing: '0.05em', flexShrink: 0 }}>
                {typeLabel(att.mime_type, att.original_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#E8EAED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.original_name}</div>
                <div style={{ fontSize: 10, color: '#626873', marginTop: 1 }}>{formatSize(att.size)} · {att.uploader} · {relativeTime(att.created_at)}</div>
              </div>
              <a href={dlUrl(att.id)} download={att.original_name} style={{ color: '#848B96', fontSize: 14, textDecoration: 'none', flexShrink: 0 }}>↓</a>
              {(att.uploader === user?.username) && (
                <button onClick={() => handleDelete(att.id, att.original_name)} style={{ background: 'transparent', border: 'none', color: '#626873', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}><TrashIcon size={11} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,11,0.96)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(rgba(8,9,11,0.8),transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: '#9AA0A8', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{images[lightbox].original_name}</span>
              <span style={{ fontSize: 10, color: '#626873' }}>{formatSize(images[lightbox].size)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href={dlUrl(images[lightbox].id)} download={images[lightbox].original_name} onClick={e => e.stopPropagation()}
                style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.08em', fontWeight: 600, textDecoration: 'none' }}>↓ PREUZMI</a>
              <button onClick={() => setLightbox(null)} style={{ background: 'transparent', border: 'none', color: '#E8EAED', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          </div>

          {/* Prev / Next */}
          {images.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + images.length) % images.length); }}
              style={{ position: 'absolute', left: 16, background: 'rgba(10,11,13,0.7)', border: '1px solid #2A2E33', color: '#E8EAED', fontSize: 22, cursor: 'pointer', padding: '10px 16px', lineHeight: 1, zIndex: 1 }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % images.length); }}
              style={{ position: 'absolute', right: 16, background: 'rgba(10,11,13,0.7)', border: '1px solid #2A2E33', color: '#E8EAED', fontSize: 22, cursor: 'pointer', padding: '10px 16px', lineHeight: 1, zIndex: 1 }}>›</button>
          </>}

          {/* Image */}
          <img onClick={e => e.stopPropagation()} src={dlUrl(images[lightbox].id)} alt={images[lightbox].original_name}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }} />

          {/* Dots */}
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 20, display: 'flex', gap: 6 }}>
              {images.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setLightbox(i); }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: i === lightbox ? ACCENT : '#2A2E33', cursor: 'pointer', transition: 'background 0.15s' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
