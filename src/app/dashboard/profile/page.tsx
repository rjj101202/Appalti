'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateNL, daysUntilDeadline } from '@/lib/date-utils';
import { useSession } from 'next-auth/react';
import { InlineLoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session, update: updateSession } = useSession();
  
  // User data
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  
  // Work data
  const [activeWork, setActiveWork] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Calendar
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', type: 'reminder' as const });
  const [addingEvent, setAddingEvent] = useState(false);
  
  // Messages
  const [messages, setMessages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState({ toUserId: '', subject: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel for better performance
      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [meRes, workRes, statsRes, calRes, msgRes, teamRes] = await Promise.allSettled([
        fetch('/api/users/me'),
        fetch('/api/users/me/work'),
        fetch('/api/users/me/stats'),
        fetch(`/api/users/me/calendar?from=${today}&to=${in30Days}`),
        fetch('/api/messages?type=received'),
        fetch('/api/companies/_/members')
      ]);

      // Process user data
      if (meRes.status === 'fulfilled') {
        const meData = await meRes.value.json();
        if (meData?.data) {
          setMe(meData.data);
          setName(meData.data.name || '');
          setAvatar(meData.data.avatar || meData.data.image || '');
          setPhoneNumber(meData.data.phoneNumber || '');
          setJobTitle(meData.data.metadata?.jobTitle || '');
          setBio(meData.data.metadata?.bio || '');
        }
      }

      // Process work data
      if (workRes.status === 'fulfilled') {
        try {
          const workData = await workRes.value.json();
          if (workData.success) setActiveWork(workData.data || []);
        } catch {}
      }

      // Process stats
      if (statsRes.status === 'fulfilled') {
        try {
          const statsData = await statsRes.value.json();
          if (statsData.success) setStats(statsData.data);
        } catch {}
      }

      // Process calendar
      if (calRes.status === 'fulfilled') {
        try {
          const calData = await calRes.value.json();
          if (calData.success) setCalendarEvents(calData.data || []);
        } catch {}
      }

      // Process messages
      if (msgRes.status === 'fulfilled') {
        try {
          const msgData = await msgRes.value.json();
          if (msgData.success) setMessages(msgData.data || []);
        } catch {}
      }

      // Process team members
      if (teamRes.status === 'fulfilled') {
        try {
          const teamData = await teamRes.value.json();
          if (teamData.success) setTeamMembers(teamData.data || []);
        } catch {}
      }

    } catch (e) {
      console.error('Load profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          avatar,
          phoneNumber,
          metadata: {
            jobTitle,
            bio
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        // Update me state with saved data
        setMe((prev: any) => ({
          ...prev,
          name,
          avatar,
          image: avatar,
          phoneNumber,
          metadata: { ...prev?.metadata, jobTitle, bio }
        }));
        setSaveMsg('✓ Opgeslagen');
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        setSaveMsg(json.error || 'Opslaan mislukt');
      }
    } catch (e) {
      console.error('Save profile error:', e);
      setSaveMsg('Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setUploadMsg('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/users/me/avatar', { method: 'POST', body: form });
      const json = await res.json();
      if (res.ok && json.url) {
        setAvatar(json.url);
        // Update me state so avatar persists
        setMe((prev: any) => ({ ...prev, avatar: json.url, image: json.url }));
        setUploadMsg('✓ Geüpload en opgeslagen');
        
        // Update NextAuth session so sidebar shows new avatar immediately
        if (updateSession) {
          await updateSession({
            ...session,
            user: {
              ...session?.user,
              image: json.url,
              avatar: json.url
            }
          });
        }
        
        setTimeout(() => setUploadMsg(''), 3000);
      } else {
        setUploadMsg(json.error || 'Upload mislukt');
      }
    } catch (e) {
      console.error('Avatar upload error:', e);
      setUploadMsg('Upload mislukt');
    } finally {
      setUploading(false);
    }
  };

  const addCalendarEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    setAddingEvent(true);
    try {
      const res = await fetch('/api/users/me/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      const json = await res.json();
      if (res.ok) {
        setNewEvent({ title: '', date: '', time: '', type: 'reminder' });
        // Reload calendar events
        const today = new Date().toISOString().split('T')[0];
        const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const calRes = await fetch(`/api/users/me/calendar?from=${today}&to=${in30Days}`);
        const calData = await calRes.json();
        if (calData.success) setCalendarEvents(calData.data || []);
      } else {
        alert(json.error || 'Toevoegen mislukt');
      }
    } catch (e) {
      console.error('Add calendar event error:', e);
      alert('Toevoegen mislukt');
    } finally {
      setAddingEvent(false);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/users/me/calendar?id=${id}`, { method: 'DELETE' });
      if (res.ok) await loadAll();
    } catch {}
  };

  const sendMessage = async () => {
    if (!newMessage.toUserId || !newMessage.subject || !newMessage.message) return;
    setSendingMessage(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage)
      });
      if (res.ok) {
        setNewMessage({ toUserId: '', subject: '', message: '' });
        alert('Bericht verzonden!');
      }
    } catch {} finally {
      setSendingMessage(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/messages/${id}/read`, { method: 'PUT' });
      setMessages(msgs => msgs.map(m => m._id === id ? { ...m, isRead: true } : m));
    } catch {}
  };

  if (loading) {
    return (
      <DashboardLayout>
        <InlineLoadingSpinner />
      </DashboardLayout>
    );
  }

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <DashboardLayout>
      <div className="page-container">
        <h1 style={{ marginBottom: '2rem' }}>Mijn Profiel</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Personal Info Card */}
            <div className="card">
              <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Persoonlijke Gegevens</h2>
              
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: avatar ? 'transparent' : '#701c74',
                  backgroundImage: avatar ? `url(${avatar})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2em',
                  fontWeight: '600'
                }}>
                  {!avatar && (me?.name?.charAt(0) || 'U').toUpperCase()}
                </div>
                <div>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploaden...' : 'Wijzig foto'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(file);
                    }}
                  />
                  {uploadMsg && <div style={{ fontSize: '0.85em', marginTop: '0.25rem', color: uploadMsg.includes('✓') ? '#16a34a' : '#dc2626' }}>{uploadMsg}</div>}
                </div>
              </div>

              {/* Form fields */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9em' }}>Naam</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9em' }}>E-mail</label>
                  <input
                    type="email"
                    value={me?.email || ''}
                    disabled
                    style={{ width: '100%', backgroundColor: '#f9fafb' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9em' }}>Telefoonnummer</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+31 6 12345678"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9em' }}>Functie</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Senior Tenderschrijver"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9em' }}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Korte beschrijving over jezelf..."
                    rows={3}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <button 
                    className="btn btn-primary" 
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Opslaan...' : 'Profiel Opslaan'}
                  </button>
                  {saveMsg && <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', color: saveMsg.includes('✓') ? '#16a34a' : '#dc2626' }}>{saveMsg}</span>}
                </div>
              </div>

              {/* Role info */}
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: 6 }}>
                <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>Mijn rol</div>
                <div style={{ fontWeight: 600 }}>{me?.companyRole || 'onbekend'}</div>
                {me?.platformRole && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>Platform rol</div>
                    <div style={{ fontWeight: 600 }}>{me.platformRole}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            {stats && (
              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Mijn Statistieken</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f3e8ff', borderRadius: 8 }}>
                    <div style={{ fontSize: '2em', fontWeight: '700', color: '#701c74' }}>{stats.activeBids || 0}</div>
                    <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Actieve Bids</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: 8 }}>
                    <div style={{ fontSize: '2em', fontWeight: '700', color: '#16a34a' }}>{stats.approvedStagesThisMonth || 0}</div>
                    <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Goedgekeurd deze maand</div>
                  </div>
                </div>
                {stats.topCpvCodes && stats.topCpvCodes.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>Meest gebruikte CPV codes</div>
                    {stats.topCpvCodes.map((cpv: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9em' }}>
                        <span>{cpv.code}</span>
                        <span style={{ color: '#6b7280' }}>{cpv.count}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Team Berichten</h3>
                {unreadCount > 0 && (
                  <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.25rem 0.5rem', borderRadius: 12, fontSize: '0.85em', fontWeight: 600 }}>
                    {unreadCount} nieuw
                  </span>
                )}
              </div>

              {/* Send message form */}
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: 6 }}>
                <div style={{ fontSize: '0.9em', fontWeight: 600, marginBottom: '0.5rem' }}>Nieuw bericht</div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <select
                    value={newMessage.toUserId}
                    onChange={(e) => setNewMessage({ ...newMessage, toUserId: e.target.value })}
                    style={{ width: '100%', fontSize: '0.9em' }}
                  >
                    <option value="">Selecteer teamlid...</option>
                    {teamMembers.filter(m => m.userId !== me?._id).map(m => (
                      <option key={m.userId} value={m.userId}>{m.name || m.email}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Onderwerp"
                    style={{ width: '100%', fontSize: '0.9em' }}
                  />
                  <textarea
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                    placeholder="Bericht..."
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', fontSize: '0.9em' }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessage.toUserId || !newMessage.subject || !newMessage.message}
                    style={{ fontSize: '0.9em' }}
                  >
                    {sendingMessage ? 'Verzenden...' : 'Verstuur'}
                  </button>
                </div>
              </div>

              {/* Messages list */}
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {messages.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>Geen berichten</p>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg._id}
                      onClick={() => !msg.isRead && markAsRead(msg._id)}
                      style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: msg.isRead ? 'transparent' : '#fef3c7',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9em' }}>{msg.subject}</div>
                        <div style={{ fontSize: '0.75em', color: '#6b7280' }}>
                          {new Date(msg.createdAt).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Van: {msg.fromUser?.name || msg.fromUser?.email}
                      </div>
                      <div style={{ fontSize: '0.9em', color: '#374151' }}>{msg.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Active Work Card */}
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Mijn Actieve Werk</h3>
              
              {activeWork.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>Geen actieve tenders</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {activeWork.map((work: any) => {
                    const stageLabels: Record<string, string> = {
                      storyline: 'Storyline',
                      version_65: '65%',
                      version_95: '95%',
                      final: 'Final'
                    };
                    
                     const daysUntil = daysUntilDeadline(work.tenderDeadline);
                     const isUrgent = daysUntil !== null && daysUntil < 7;
                     const isWarning = daysUntil !== null && daysUntil >= 7 && daysUntil < 14;

                    return (
                      <div
                        key={work.bidId}
                        style={{
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: isUrgent ? '#dc2626' : isWarning ? '#f59e0b' : '#701c74',
                          backgroundColor: 'white',
                          transition: 'box-shadow 0.2s',
                          cursor: 'pointer'
                        }}
                        onClick={() => router.push(`/dashboard/clients/${work.clientId}/tenders/${work.tenderId}/process`)}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95em' }}>{work.tenderTitle}</div>
                          {daysUntil !== null && (
                            <div style={{ 
                              fontSize: '0.75em', 
                              fontWeight: 600,
                              color: isUrgent ? '#dc2626' : isWarning ? '#f59e0b' : '#6b7280',
                              whiteSpace: 'nowrap'
                            }}>
                              {daysUntil >= 0 ? `${daysUntil}d` : 'Verlopen'}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '0.5rem' }}>
                          Client: {work.clientName}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '0.75em', 
                            padding: '0.25rem 0.5rem', 
                            backgroundColor: '#f3e8ff', 
                            color: '#701c74',
                            borderRadius: 4,
                            fontWeight: 600
                          }}>
                            {stageLabels[work.currentStage] || work.currentStage}
                          </span>
                          {work.tenderDeadline && (
                            <span style={{ fontSize: '0.75em', color: '#6b7280' }}>
                              Deadline: {formatDateNL(work.tenderDeadline)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calendar/Agenda Card */}
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Mijn Agenda</h3>
              
              {/* Add event form */}
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: 6 }}>
                <div style={{ fontSize: '0.9em', fontWeight: 600, marginBottom: '0.5rem' }}>Nieuwe afspraak/reminder</div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Titel"
                    style={{ width: '100%', fontSize: '0.9em' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      style={{ fontSize: '0.9em' }}
                    />
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      style={{ fontSize: '0.9em' }}
                    />
                  </div>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    style={{ width: '100%', fontSize: '0.9em' }}
                  >
                    <option value="meeting">Vergadering</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Herinnering</option>
                    <option value="other">Anders</option>
                  </select>
                  <button 
                    className="btn btn-secondary" 
                    onClick={addCalendarEvent}
                    disabled={addingEvent || !newEvent.title || !newEvent.date}
                    style={{ fontSize: '0.9em' }}
                  >
                    {addingEvent ? 'Toevoegen...' : 'Toevoegen'}
                  </button>
                </div>
              </div>

              {/* Events list */}
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {calendarEvents.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>Geen aankomende afspraken</p>
                ) : (
                  calendarEvents.map((event: any) => {
                    const eventDate = new Date(event.date);
                    const today = new Date();
                    const isToday = eventDate.toDateString() === today.toDateString();
                    const isPast = eventDate < today && !isToday;

                    const typeColors: Record<string, { bg: string; color: string; icon: string }> = {
                      meeting: { bg: '#dbeafe', color: '#1e40af', icon: '👥' },
                      deadline: { bg: '#fee2e2', color: '#dc2626', icon: '⏰' },
                      reminder: { bg: '#fef3c7', color: '#d97706', icon: '🔔' },
                      other: { bg: '#f3f4f6', color: '#374151', icon: '📌' }
                    };

                    const colors = typeColors[event.type] || typeColors.other;

                    return (
                      <div
                        key={event._id}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          opacity: isPast ? 0.6 : 1,
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{colors.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9em' }}>{event.title}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Verwijderen?')) deleteEvent(event._id);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#dc2626' }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                          {eventDate.toLocaleDateString('nl-NL', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          {event.time && ` om ${event.time}`}
                          {isToday && <span style={{ marginLeft: '0.5rem', color: '#16a34a', fontWeight: 600 }}>Vandaag!</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
