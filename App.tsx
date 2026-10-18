import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCircle2, Clock3, Plus, Trash2, CalendarDays, Sparkles, Sun, Coffee, BookOpen, Dumbbell, Droplets, ChevronLeft, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

type Task = { id: string; title: string; date: string; time: string; done: boolean; reminder: boolean; notifiedAt?: string };
const key = 'dayflow-routines-v1';
const localDate = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const starter: Task[] = [
  { id: '1', title: 'Drink a glass of water', date: localDate(), time: '08:00', done: false, reminder: true },
  { id: '2', title: 'Get ready for the day', date: localDate(), time: '08:15', done: false, reminder: true },
  { id: '3', title: 'Study or finish homework', date: localDate(), time: '16:00', done: false, reminder: true },
  { id: '4', title: 'Prepare for tomorrow', date: localDate(), time: '20:30', done: false, reminder: true }
];
const nativeId = (id: string) => { let n = 0; for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0; return (n % 2000000000) + 1; };
function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return starter;
      const parsed = JSON.parse(saved) as Array<Partial<Task> & { id: string; title: string; time: string }>;
      return parsed.map(t => ({ ...t, date: t.date || localDate(), done: !!t.done, reminder: t.reminder !== false })) as Task[];
    } catch { return starter; }
  });
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState('09:00');
  const [reminder, setReminder] = useState(true);
  const [permission, setPermission] = useState(Capacitor.isNativePlatform() ? 'default' : (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const [notice, setNotice] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => localDate().slice(0, 7));
  const today = localDate();
  const selectedTasks = useMemo(() => tasks.filter(t => t.date === date).sort((a, b) => a.time.localeCompare(b.time)), [tasks, date]);
  const done = selectedTasks.filter(t => t.done).length;
  const percent = selectedTasks.length ? Math.round(done / selectedTasks.length * 100) : 0;
  const monthDate = new Date(Number(calendarMonth.slice(0, 4)), Number(calendarMonth.slice(5, 7)) - 1, 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDay = monthDate.getDay();
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        const pending = tasks.filter(t => t.reminder && !t.done && new Date(t.date + 'T' + t.time + ':00').getTime() > Date.now());
        const scheduled = await LocalNotifications.getPending();
        if (scheduled.notifications.length) await LocalNotifications.cancel({ notifications: scheduled.notifications.map(n => ({ id: n.id })) });
        if (cancelled || pending.length === 0) return;
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted' || cancelled) return;
        await LocalNotifications.schedule({ notifications: pending.map(t => ({ id: nativeId(t.id), title: 'Dayflow reminder 🔔', body: 'Time to: ' + t.title, schedule: { at: new Date(t.date + 'T' + t.time + ':00'), allowWhileIdle: true }, extra: { taskId: t.id } })) });
        setPermission('granted');
      } catch (err) { console.warn('Native reminder scheduling failed', err); }
    })();
    return () => { cancelled = true; };
  }, [tasks]);
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const check = () => {
      const now = new Date();
      const day = localDate(now);
      const hhmm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      setTasks(prev => prev.map(t => {
        const reminderKey = day + 'T' + hhmm;
        if (t.reminder && !t.done && t.date === day && t.time === hhmm && t.notifiedAt !== reminderKey) {
          try { new Notification('Dayflow reminder 🔔', { body: 'Time to: ' + t.title, tag: t.id + '-' + reminderKey }); } catch {}
          return { ...t, notifiedAt: reminderKey };
        }
        return t;
      }));
    };
    check();
    const timer = window.setInterval(check, 15000);
    return () => window.clearInterval(timer);
  }, []);
  async function enableNotifications() {
    if (Capacitor.isNativePlatform()) {
      try { const p = await LocalNotifications.requestPermissions(); setPermission(p.display); setNotice(p.display === 'granted' ? 'Android reminders enabled! 🔔' : 'Allow notifications for Dayflow in Android settings.'); } catch { setNotice('Could not enable Android notifications. Check app permissions.'); }
      return;
    }
    if (typeof Notification === 'undefined') { setNotice('Notifications are not supported in this browser. Try Chrome.'); return; }
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      setNotice(p === 'granted' ? 'Notifications enabled! Android reminders are scheduled.' : 'Notifications are blocked. Enable them in your browser site settings.');
    } catch { setNotice('Could not enable notifications in this browser.'); }
  }
  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) { setNotice('Add a task name first 🙂'); return; }
    if (date < today) { setNotice('Choose today or a future date for a new reminder.'); return; }
    setTasks(prev => [...prev, { id: crypto.randomUUID(), title: clean, date, time, done: false, reminder }]);
    setTitle('');
    setNotice('Routine scheduled for ' + new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ✨');
  }
  function toggle(id: string) { setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function remove(id: string) { setTasks(prev => prev.filter(t => t.id !== id)); }
  function moveMonth(amount: number) {
    const d = new Date(Number(calendarMonth.slice(0, 4)), Number(calendarMonth.slice(5, 7)) - 1 + amount, 1);
    setCalendarMonth(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return (
    <main className="page">
      <header className="topbar"><div className="brand"><div className="brandmark"><Sparkles size={21} /></div><span>dayflow</span></div><button className="bell-btn" onClick={enableNotifications} aria-label="Enable notifications"><Bell size={19} /></button></header>
      <section className="hero"><div className="eyebrow"><Sun size={15} /> YOUR DAY, AT YOUR PACE</div><h1>Make today<br /><span>count.</span></h1><p>A little structure. A little progress. You got this.</p><div className="date-pill"><CalendarDays size={16} />{dateLabel}</div></section>
      <section className="calendar-card">
        <div className="calendar-head"><div><span className="muted">PICK YOUR DAY</span><h2>Routine calendar</h2></div><div className="month-nav"><button onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={18}/></button><strong>{monthDate.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong><button onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={18}/></button></div></div>
        <div className="calendar-grid calendar-weekdays">{['S','M','T','W','T','F','S'].map((d,i)=><span key={d+i}>{d}</span>)}</div>
        <div className="calendar-grid">{Array.from({length:firstDay},(_,i)=><span className="calendar-blank" key={'blank'+i}/>)}{Array.from({length:daysInMonth},(_,i)=>{const day=i+1;const d=calendarMonth+'-'+String(day).padStart(2,'0');const count=tasks.filter(t=>t.date===d).length;return <button key={d} className={'calendar-day '+(date===d?'selected ':'')+(d===today?'today ':'')+(d<today?'past':'')} onClick={()=>{setDate(d);setShowCompleted(false);}}><span>{day}</span>{count>0&&<i>{count}</i>}</button>})}</div>
        <div className="calendar-bottom"><span><i className="legend-dot"/> Dot/count = scheduled tasks</span><button onClick={()=>{setDate(today);setCalendarMonth(today.slice(0,7));}}>Jump to today</button></div>
      </section>
      <section className="progress-card"><div className="progress-head"><div><span className="muted">SELECTED DAY PROGRESS</span><h2>{done} <small>of {selectedTasks.length} tasks done</small></h2></div><div className="progress-number">{percent}%</div></div><div className="progress-track"><div className="progress-fill" style={{width:percent+'%'}} /></div><p>{selectedTasks.length===0?'No tasks scheduled for this day yet. Add one below.':percent===100?'All done. Take a well-earned breather! 🎉':percent===0?'Start small. Every checkmark counts.':'You’re making moves. Keep it going ✨'}</p></section>
      <section className="routine-section"><div className="section-heading"><div><span className="muted">YOUR PLAN</span><h2>{date===today?'Today':new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</h2></div><button className="show-done" onClick={()=>setShowCompleted(v=>!v)}>{showCompleted?'Hide completed':'Show completed'}</button></div>
        <div className="task-list">{selectedTasks.filter(t=>showCompleted||!t.done).map(t=><article className={'task '+(t.done?'is-done':'')} key={t.id}><button className="check" onClick={()=>toggle(t.id)} aria-label={t.done?'Mark incomplete':'Mark complete'}>{t.done&&<Check size={17}/>}</button><div className="task-copy"><strong>{t.title}</strong><span><CalendarDays size={13}/>{new Date(t.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}<span className="dot">·</span><Clock3 size={13}/>{t.time}{t.reminder&&<><span className="dot">·</span><Bell size={12}/> Reminder</>}</span></div><button className="delete" onClick={()=>remove(t.id)} aria-label="Delete task"><Trash2 size={16}/></button></article>)}{selectedTasks.filter(t=>showCompleted||!t.done).length===0&&<div className="empty"><CheckCircle2 size={28}/><strong>{selectedTasks.length?'All caught up!':'Nothing planned yet'}</strong><span>{selectedTasks.length?'Enjoy the breathing room.':'Choose a date and schedule your first task below.'}</span></div>}</div>
      </section>
      <section className="add-section"><div className="section-heading"><div><span className="muted">BUILD YOUR HABIT</span><h2>Schedule a task</h2></div><div className="add-icon"><Plus size={20}/></div></div>
        <form onSubmit={addTask}><label htmlFor="task-title">What do you need to do?</label><input id="task-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Read for 15 minutes" maxLength={90}/>
          <div className="schedule-fields"><div className="date-field"><label htmlFor="task-date">Pick the day</label><input id="task-date" type="date" min={today} value={date} onChange={e=>{if(e.target.value){setDate(e.target.value);setCalendarMonth(e.target.value.slice(0,7));}}}/></div><div className="time-field"><label htmlFor="task-time">Ping me at</label><input id="task-time" type="time" value={time} onChange={e=>setTime(e.target.value)}/></div></div>
          <label className="reminder-toggle"><input type="checkbox" checked={reminder} onChange={e=>setReminder(e.target.checked)}/><span><Bell size={15}/> Send me a reminder at this date and time</span></label><button className="add-button" type="submit"><Plus size={18}/> Schedule routine</button>
        </form>
      </section>
      <section className="notification-card"><div className="notification-icon"><Bell size={19}/></div><div className="notification-copy"><strong>Stay on track 🔔</strong><p>{permission==='granted'?'Notifications are enabled on this browser.':permission==='denied'?'Notifications are blocked in browser settings.':'Enable notifications for scheduled reminders.'}</p></div><button onClick={enableNotifications} className="enable-btn">{permission==='granted'?'Enabled':'Enable'}</button></section>
      {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}
      <footer><div className="footer-icons"><Coffee size={16}/><BookOpen size={16}/><Droplets size={16}/><Dumbbell size={16}/></div><p>Progress over perfection. Always.</p><small>Routines save on this device. Android app uses scheduled local reminders.</small></footer>
    </main>
  );
}
export default App;