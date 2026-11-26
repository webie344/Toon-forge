/* =====================================================================
   Toonforge — main app. Imports avatars.js and objects.js.

   SETUP
   1. Paste your Firebase config and Cloudinary details into CONFIG.
   2. Serve this folder over http (npx serve or VS Code Live Server).
   3. Add your Groq key in Settings.

   Files needed in the same folder:
     index.html, style.css, app.js, avatars.js, objects.js

   Firestore rules (Firebase console → Firestore → Rules):
     rules_version = '2';
     service cloud.firestore {
       match /databases/{db}/documents {
         match /users/{uid}/projects/{id} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
         }
       }
     }
   ===================================================================== */

import * as THREE from 'three';
import { makeAvatar, applyPose, CLIPS, resolveClip, CLIP_NAMES } from './avatars.js';
import { buildObject, resolveObject, OBJECT_NAMES } from './objects.js';

/* ---------------------------------------------------------------------
   CONFIG
   --------------------------------------------------------------------- */
const CONFIG = {
  firebase: {
    apiKey: "AIzaSyC9jF-ocy6HjsVzWVVlAyXW-4aIFgA79-A",
    authDomain: "crypto-6517d.firebaseapp.com",
    projectId: "crypto-6517d",
    storageBucket: "crypto-6517d.firebasestorage.app",
    messagingSenderId: "60263975159",
    appId: "1:60263975159:web:bd53dcaad86d6ed9592bf2"
  },
  cloudinary: {
    cloudName: 'ddtdqrh1b',
    uploadPreset: 'profile-pictures',
  },
  groq: {
    chatModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    ttsModel: '',
  },
};

const GROQ_CHAT_MODELS = [
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct',    label: 'Llama 4 Scout 17B (fast, recommended)' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct',label: 'Llama 4 Maverick 17B (smarter)' },
  { id: 'openai/gpt-oss-120b',                          label: 'GPT-OSS 120B (strong reasoning)' },
  { id: 'openai/gpt-oss-20b',                           label: 'GPT-OSS 20B (balanced)' },
  { id: 'qwen/qwen3-32b',                               label: 'Qwen3 32B' },
  { id: 'llama-3.1-8b-instant',                         label: 'Llama 3.1 8B Instant (cheapest)' },
];

/* ---------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isPlaceholder = (v) => !v || /^YOUR_/i.test(v);
const lerp = (a, b, t) => a + (b - a) * t;

function toast(msg, kind = 'info', ms = 4500) {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('leave'); setTimeout(() => t.remove(), 300); }, ms);
}
function downloadBlob(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = (s) => (s || 'toon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'toon';

/* ---------------------------------------------------------------------
   Settings
   --------------------------------------------------------------------- */
const SETTINGS_KEY = 'toonforge.settings.v3';
const settingsDefaults = () => ({
  groqKey: '',
  chatModel: CONFIG.groq.chatModel,
  ttsProvider: 'groq',
  ttsModel: CONFIG.groq.ttsModel,
  cloudName: isPlaceholder(CONFIG.cloudinary.cloudName) ? '' : CONFIG.cloudinary.cloudName,
  uploadPreset: isPlaceholder(CONFIG.cloudinary.uploadPreset) ? '' : CONFIG.cloudinary.uploadPreset,
});
function loadSettings() {
  try { return { ...settingsDefaults(), ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return settingsDefaults(); }
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* */ } }

/* ---------------------------------------------------------------------
   Domain data
   --------------------------------------------------------------------- */
const BACKGROUNDS = ['city', 'forest', 'desert', 'snow', 'arena', 'rooftop', 'beach', 'space', 'cave', 'classroom', 'dojo', 'office'];
const CAMERAS = ['wide', 'medium', 'close', 'low', 'side'];
const MOVES = ['left', 'center', 'right', 'toward', 'away'];

const CAST = [
  { id: 'rex',   gender: 'male',   name: 'Sgt. Rex', role: 'Gruff, by-the-book leader',    color: '#4f7a3a', skin: '#c68a5e', hair: '#2b1d14', voice: 'troy',   pitch: 0.7,  rate: 0.95, height: 2.00 },
  { id: 'nova',  gender: 'female', name: 'Nova',     role: 'Quick-witted ace',              color: '#2f6fd0', skin: '#8d5a3b', hair: '#111111', voice: 'hannah', pitch: 1.3,  rate: 1.05, height: 1.85 },
  { id: 'viper', gender: 'female', name: 'Viper',    role: 'Cool, sarcastic rival',         color: '#7d3fa8', skin: '#f0c29b', hair: '#d8b45a', voice: 'daniel', pitch: 0.9,  rate: 1.0,  height: 1.90 },
  { id: 'blaze', gender: 'male',   name: 'Blaze',    role: 'Hot-headed rookie',             color: '#d4561f', skin: '#e0a77d', hair: '#7a2f12', voice: 'austin', pitch: 1.1,  rate: 1.12, height: 1.90 },
  { id: 'frost', gender: 'female', name: 'Frost',    role: 'Calm, dry-witted medic',        color: '#1b8a9c', skin: '#f3d2b3', hair: '#e8e8ec', voice: 'diana',  pitch: 1.15, rate: 0.95, height: 1.85 },
  { id: 'ash',   gender: 'male',   name: 'Ash',      role: 'Silent type, sharp one-liners', color: '#5b5f6b', skin: '#a86f4a', hair: '#3a2a1a', voice: 'autumn', pitch: 1.0,  rate: 0.9,  height: 2.00 },
];
const castById = (id) => CAST.find((c) => c.id === id);

const EXAMPLES = [
  'Two rival sergeants fight over the last slice of pizza in the barracks',
  'A rookie tries to impress the squad and trips into a surprise sparring match',
  'Two soldiers race a canoe across a lake to grab a floating pizza',
  'A shy soldier finally waves hello to the new recruit and it goes wildly wrong',
];

/* ---------------------------------------------------------------------
   App state
   --------------------------------------------------------------------- */
const state = {
  settings: loadSettings(),
  user: null,
  authReady: false,
  projects: [],
  projectId: null,
  cast: ['rex', 'nova'],
  genre: 'action',
  length: 'standard',
  script: null,
  scriptKey: '',
  busy: false,
  videoBlob: null,
  videoUrl: null,
};

/* =====================================================================
   BACKEND
   ===================================================================== */
const firebaseReady = !isPlaceholder(CONFIG.firebase.apiKey) && !isPlaceholder(CONFIG.firebase.projectId);

const backend = {
  mode: firebaseReady ? 'firebase' : 'local',
  _authCb: null, _projCb: null, _unsub: null, fb: null,

  async init(onAuth) {
    this._authCb = onAuth;
    if (this.mode === 'firebase') {
      try { await this._initFirebase(); return; }
      catch (e) { console.error(e); toast('Firebase unreachable, using local mode.', 'error', 7000); this.mode = 'local'; }
    }
    let u = null;
    try { u = JSON.parse(localStorage.getItem('toonforge.local.user') || 'null'); } catch { /* */ }
    onAuth(u);
  },
  async _initFirebase() {
    const v = '10.12.2';
    const base = `https://www.gstatic.com/firebasejs/${v}`;
    const [app, auth, fs] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-firestore.js`),
    ]);
    const fbApp = app.initializeApp(CONFIG.firebase);
    this.fb = { auth, fs, a: auth.getAuth(fbApp), db: fs.getFirestore(fbApp) };
    auth.onAuthStateChanged(this.fb.a, (u) => {
      this._authCb(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
    });
  },
  async signIn(email, pass) {
    if (this.mode === 'firebase') return this.fb.auth.signInWithEmailAndPassword(this.fb.a, email, pass);
    return this._localUser({ email });
  },
  async signUp(name, email, pass) {
    if (this.mode === 'firebase') {
      const cred = await this.fb.auth.createUserWithEmailAndPassword(this.fb.a, email, pass);
      if (name) await this.fb.auth.updateProfile(cred.user, { displayName: name });
      this._authCb({ uid: cred.user.uid, email, displayName: name || null });
      return cred;
    }
    return this._localUser({ email, displayName: name });
  },
  async google() {
    if (this.mode !== 'firebase') return this._localUser({ email: 'demo@local', displayName: 'Demo user' });
    return this.fb.auth.signInWithPopup(this.fb.a, new this.fb.auth.GoogleAuthProvider());
  },
  async signOut() {
    this._unsubscribe();
    if (this.mode === 'firebase') return this.fb.auth.signOut(this.fb.a);
    try { localStorage.removeItem('toonforge.local.user'); } catch { /* */ }
    this._authCb(null);
  },
  _localUser({ email, displayName }) {
    const u = { uid: 'local', email: email || 'demo@local', displayName: displayName || (email ? email.split('@')[0] : 'Demo user') };
    try { localStorage.setItem('toonforge.local.user', JSON.stringify(u)); } catch { /* */ }
    this._authCb(u);
  },
  _unsubscribe() { if (this._unsub) { this._unsub(); this._unsub = null; } },
  subscribeProjects(cb) {
    this._unsubscribe();
    this._projCb = cb;
    if (this.mode === 'firebase') {
      const { fs, db } = this.fb;
      const q = fs.query(fs.collection(db, 'users', state.user.uid, 'projects'), fs.orderBy('createdAt', 'desc'));
      this._unsub = fs.onSnapshot(q,
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
        (err) => { console.error(err); toast(`Could not load library: ${err.message}`, 'error', 7000); });
    } else {
      cb(this._localList());
    }
  },
  _localList() {
    try { return JSON.parse(localStorage.getItem('toonforge.local.projects') || '[]').sort((a, b) => b.createdAt - a.createdAt); }
    catch { return []; }
  },
  _localWrite(list) {
    try { localStorage.setItem('toonforge.local.projects', JSON.stringify(list)); } catch { toast('Browser storage full or blocked.', 'error'); }
    if (this._projCb) this._projCb(this._localList());
  },
  async createProject(data) {
    if (this.mode === 'firebase') {
      const { fs, db } = this.fb;
      const ref = await fs.addDoc(fs.collection(db, 'users', state.user.uid, 'projects'), { ...data, createdAt: fs.serverTimestamp() });
      return ref.id;
    }
    const id = 'p' + Date.now().toString(36);
    this._localWrite([{ id, ...data, createdAt: Date.now() }, ...this._localList()]);
    return id;
  },
  async updateProject(id, patch) {
    if (this.mode === 'firebase') {
      const { fs, db } = this.fb;
      return fs.updateDoc(fs.doc(db, 'users', state.user.uid, 'projects', id), { ...patch, updatedAt: fs.serverTimestamp() });
    }
    this._localWrite(this._localList().map((p) => (p.id === id ? { ...p, ...patch } : p)));
  },
  async deleteProject(id) {
    if (this.mode === 'firebase') {
      const { fs, db } = this.fb;
      return fs.deleteDoc(fs.doc(db, 'users', state.user.uid, 'projects', id));
    }
    this._localWrite(this._localList().filter((p) => p.id !== id));
  },
};

/* =====================================================================
   Cloudinary upload
   ===================================================================== */
function uploadToCloudinary(blob, filename, onProgress) {
  return new Promise((resolve, reject) => {
    const { cloudName, uploadPreset } = state.settings;
    if (!cloudName || !uploadPreset) return reject(new Error('Cloudinary not configured.'));
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('upload_preset', uploadPreset);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let j = {};
      try { j = JSON.parse(xhr.responseText); } catch { /* */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(j);
      else reject(new Error(j.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error.'));
    xhr.send(fd);
  });
}
const cloudThumb = (url) => url.replace('/upload/', '/upload/so_1,w_640,c_fill,ar_16:9/').replace(/\.\w+$/, '.jpg');
const cloudMp4 = (url) => url.replace('/upload/', '/upload/fl_attachment,f_mp4,q_auto/').replace(/\.\w+$/, '.mp4');

/* =====================================================================
   GROQ
   ===================================================================== */
const GROQ = 'https://api.groq.com/openai/v1';

function buildSystemPrompt(castIds, genre, length) {
  const sceneCount = { short: 'exactly 2', standard: '3 or 4', long: '5 or 6' }[length] || '3 or 4';
  const castList = castIds.map((id) => `- "${id}": ${castById(id).name} — ${castById(id).role}`).join('\n');
  const clipList = CLIP_NAMES.map((k) => `- ${k}: ${CLIPS[k].desc}`).join('\n');
  const objectList = OBJECT_NAMES.slice(0, 80).join(', ');
  return `You are the director of a short, fun ${genre} cartoon. A 3D engine will act out your script, so you may ONLY use the characters, clips, backgrounds, cameras and objects listed below.

CAST (use these ids):
${castList}

ALLOWED ANIMATION CLIPS (use these exact names):
${clipList}

BACKGROUNDS: ${BACKGROUNDS.join(', ')}
CAMERAS: ${CAMERAS.join(', ')}
MOVES (optional, makes the character travel): left, center, right, toward (walk up to "target"), away (retreat from "target")

OBJECTS: You may put ANY object your story needs into a scene by naming it in the "objects" array. Prefer these known objects: ${objectList}. If you need something not on that list, still name it — the engine will build a stand-in.

Return ONLY a JSON object, no markdown, in exactly this shape:
{
  "title": "catchy title, max 6 words",
  "logline": "one sentence summary",
  "master_prompt": "one rich paragraph (80-140 words) describing the whole cartoon visually and emotionally",
  "objects": [ { "id": "canoe", "at": "center", "scale": 1 } ],
  "scenes": [
    {
      "background": "one of the backgrounds",
      "camera": "opening camera for the scene",
      "slides": [],
      "beats": [
        {
          "character": "cast id",
          "clip": "allowed clip name",
          "line": "spoken dialogue, or empty string",
          "move": "left|center|right|toward|away or null",
          "target": "cast id this character faces or approaches, or empty string",
          "camera": "optional camera change for this beat, or empty string",
          "duration": 1.5,
          "object": "optional object id mentioned in the objects array",
          "objectMove": "optional: appear|disappear|slideRight|slideLeft|spin|bob|throw|scaleUp",
          "reaction": null
        }
      ]
    }
  ]
}

RULES
- "objects" is a scene-level list. Only include an object if the story needs it. Each object needs an "id" that matches an entry in the list above or any real object name.
- Only reference an object in a beat's "object" field if that object appears in the scene's parent "objects" array.
- Use ${sceneCount} scenes with 3 to 6 beats each.
- Dialogue: short, funny or punchy, at most 18 words per line. Each cast member speaks at least once if there is more than one.
- Beats with a "line" should use a talking-friendly clip (Idle_Neutral, Idle, Wave, Interact).
- After an attack, give the other character a HitRecieve reaction.
- "duration" only matters for looping clips without a line. Use 1 to 4 seconds.
- Write dialogue in the same language as the user's idea.
- Output valid JSON only.`;
}

function normalizeScript(raw, castIds, idea) {
  const cast = castIds.slice();
  const pickChar = (id) => (cast.includes(String(id || '').toLowerCase()) ? String(id).toLowerCase() : null);
  const objects = (Array.isArray(raw?.objects) ? raw.objects : []).slice(0, 8).map((o, i) => ({
    id: String(o?.id || o?.name || `obj${i}`).slice(0, 40),
    at: ['left', 'center', 'right'].includes(o?.at) ? o.at : 'center',
    scale: clamp(Number(o?.scale) || 1, 0.3, 3),
  }));
  const scenes = (Array.isArray(raw?.scenes) ? raw.scenes : []).slice(0, 6).map((sc) => {
    const beats = (Array.isArray(sc?.beats) ? sc.beats : []).slice(0, 8).map((b) => {
      const character = pickChar(b?.character) || cast[0];
      const clip = resolveClip(b?.clip) || 'Idle_Neutral';
      const line = String(b?.line || '').replace(/\s+/g, ' ').trim().slice(0, 180);
      const move = MOVES.includes(String(b?.move || '').toLowerCase()) ? String(b.move).toLowerCase() : null;
      const target = pickChar(b?.target) && pickChar(b.target) !== character ? pickChar(b.target) : '';
      const camera = CAMERAS.includes(String(b?.camera || '').toLowerCase()) ? String(b.camera).toLowerCase() : '';
      const duration = clamp(Number(b?.duration) || 1.6, 0.8, 5);
      let reaction = null;
      if (b?.reaction && typeof b.reaction === 'object') {
        const rc = pickChar(b.reaction.character);
        const rclip = resolveClip(b.reaction.clip);
        if (rc && rclip && rc !== character) reaction = { character: rc, clip: rclip };
      }
      const objId = String(b?.object || '').slice(0, 40) || null;
      const objectMove = ['appear', 'disappear', 'slideRight', 'slideLeft', 'spin', 'bob', 'throw', 'scaleUp'].includes(b?.objectMove) ? b.objectMove : null;
      return { character, clip, line, move, target, camera, duration, reaction, object: objId, objectMove };
    });
    return {
      background: BACKGROUNDS.includes(String(sc?.background || '').toLowerCase()) ? String(sc.background).toLowerCase() : 'city',
      camera: CAMERAS.includes(String(sc?.camera || '').toLowerCase()) ? String(sc.camera).toLowerCase() : 'wide',
      slides: Array.isArray(sc?.slides) ? sc.slides.filter((s) => BACKGROUNDS.includes(s)) : [],
      beats,
    };
  }).filter((s) => s.beats.length);
  if (!scenes.length) throw new Error('The AI returned no scenes. Try again.');
  return {
    title: String(raw?.title || 'Untitled Toon').slice(0, 80),
    logline: String(raw?.logline || idea).slice(0, 300),
    master_prompt: String(raw?.master_prompt || '').slice(0, 1600),
    objects,
    cast,
    scenes,
  };
}

async function generateScript({ idea, genre, length, cast }) {
  const { groqKey, chatModel } = state.settings;
  if (!groqKey) { toast('No Groq key — using demo script.', 'info', 6500); return demoScript(idea, cast); }
  const res = await fetch(`${GROQ}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: chatModel, temperature: 0.85, max_tokens: 3500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(cast, genre, length) },
        { role: 'user', content: idea },
      ],
    }),
  });
  if (!res.ok) throw new Error(await groqError(res, 'Script generation failed'));
  const data = await res.json();
  let parsed;
  try { parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}'); }
  catch { throw new Error('AI returned invalid JSON. Try again.'); }
  return normalizeScript(parsed, cast, idea);
}

async function groqError(res, prefix) {
  let msg = `${res.status}`, body = {};
  try { body = await res.json(); msg = body.error?.message || msg; } catch { /* */ }
  if (res.status === 401) msg = 'Groq rejected the API key.';
  if (res.status === 429) msg = 'Groq rate limit. Wait a moment.';
  if (/model|not exist|no access|decommissioned|not found/i.test(msg)) {
    msg = `Model "${state.settings.chatModel}" unavailable on Groq. Pick a different one in Settings. (${msg})`;
  }
  return `${prefix}: ${msg}`;
}

function demoScript(idea, cast) {
  const [a, b] = cast;
  const short = idea.length > 110 ? idea.slice(0, 107) + '…' : idea;
  const beat = (character, clip, line = '', extra = {}) => ({ character, clip, line, move: null, target: '', camera: '', duration: 1.6, reaction: null, object: null, objectMove: null, ...extra });
  const scenes = [
    { background: 'city', camera: 'wide', slides: [], beats: [
      beat(a, 'Walk', '', { move: 'center' }),
      beat(a, 'Idle_Neutral', `Today: ${short}`, { camera: 'medium' }),
      beat(a, 'Wave', 'Watch this.'),
    ]},
  ];
  if (b) scenes.push({ background: 'arena', camera: 'side', slides: [], beats: [
    beat(a, 'Punch_Right', '', { target: b, reaction: { character: b, clip: 'HitRecieve' } }),
    beat(b, 'Kick_Left', 'Nice try!', { target: a, reaction: { character: a, clip: 'HitRecieve_2' } }),
    beat(a, 'Idle_Neutral', 'Okay, rematch tomorrow?', { target: b }),
    beat(b, 'Wave', 'Deal.'),
  ]});
  return {
    title: 'Demo Toon', logline: short,
    master_prompt: `A short, energetic low-poly cartoon. ${short}`,
    objects: [], cast, scenes,
  };
}

/* ---- TTS ---- */
async function groqTTS(text, member, tries = 2) {
  const { groqKey, ttsModel } = state.settings;
  if (!ttsModel) throw new Error('No TTS model selected. Open Settings and click "Detect TTS model".');
  const res = await fetch(`${GROQ}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ttsModel, input: text, voice: member.voice, response_format: 'wav' }),
  });
  if (res.status === 429 && tries > 1) {
    const wait = clamp(Number(res.headers.get('retry-after')) || 2, 1, 15);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return groqTTS(text, member, tries - 1);
  }
  if (!res.ok) throw new Error(await groqError(res, 'Voice'));
  return audio.decode(await res.arrayBuffer());
}

async function detectTTSModel() {
  const { groqKey } = state.settings;
  if (!groqKey) throw new Error('Add your Groq key first.');
  const res = await fetch(`${GROQ}/models`, { headers: { Authorization: `Bearer ${groqKey}` } });
  if (!res.ok) throw new Error(await groqError(res, 'Model list failed'));
  const j = await res.json();
  const ids = (j.data || []).map((m) => m.id);
  const tts = ids.filter((id) => /tts|orpheus|playai|speech/i.test(id));
  if (!tts.length) throw new Error('No TTS models found on your Groq key. Check your account.');
  state.settings.ttsModel = tts[0];
  saveSettings(state.settings);
  return tts[0];
}

/* ---- Audio graph ---- */
const audio = {
  ctx: null, out: null, dest: null, sources: new Set(),
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.out = this.ctx.createGain();
      this.dest = this.ctx.createMediaStreamDestination();
      this.out.connect(this.ctx.destination);
      this.out.connect(this.dest);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  decode(buf) { return this.ctx.decodeAudioData(buf); },
  play(buffer) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.connect(this.out); s.start();
    this.sources.add(s); s.onended = () => this.sources.delete(s);
    return buffer.duration;
  },
  stopAll() { this.sources.forEach((s) => { try { s.stop(); } catch { /* */ } }); this.sources.clear(); try { speechSynthesis.cancel(); } catch { /* */ } },
};
function speakBrowser(text, member) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = member.pitch; u.rate = member.rate;
    speechSynthesis.speak(u);
  } catch { /* */ }
}
const estimateSpeech = (text, rate = 1) => Math.max(1.3, (text.trim().split(/\s+/).length * 0.4) / rate);

async function prepareVoices(script, onProgress) {
  const jobs = [];
  script.scenes.forEach((sc, si) => sc.beats.forEach((b, bi) => {
    if (b.line) jobs.push({ key: `${si}:${bi}`, text: b.line, member: castById(b.character) });
  }));
  const buffers = new Map();
  let failed = 0, done = 0, firstError = '';
  const useGroq = state.settings.ttsProvider === 'groq' && !!state.settings.groqKey;
  if (useGroq && jobs.length) {
    if (!state.settings.ttsModel) {
      try { await detectTTSModel(); } catch (e) { firstError = e.message; failed = jobs.length; }
    }
    if (state.settings.ttsModel) {
      let i = 0;
      const worker = async () => {
        while (i < jobs.length) {
          const job = jobs[i++];
          try { buffers.set(job.key, await groqTTS(job.text, job.member)); }
          catch (e) { failed++; firstError ||= e.message; }
          onProgress?.(++done / jobs.length);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    }
  }
  return { buffers, failed: useGroq ? failed : jobs.length, firstError, total: jobs.length };
}

/* =====================================================================
   AVATAR PREVIEW RENDERER
   ---------------------------------------------------------------------
   Renders a portrait of each cast member once, caches it as a data URL,
   and reuses it every time the cast grid is drawn. This is what makes
   the picker show a real character instead of a colored circle.
   ===================================================================== */
const AVATAR_PREVIEWS = new Map();

function getAvatarPreview(member) {
  if (AVATAR_PREVIEWS.has(member.id)) return AVATAR_PREVIEWS.get(member.id);

  const W = 220, H = 260;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 50);
  camera.position.set(0, 1.35, 3.2);
  camera.lookAt(0, 1.05, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa0b0ff, 0.4);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const gradient = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradient });

  const avatar = makeAvatar(member, toon);
  const pose = CLIPS.Idle_Neutral.pose(0, 1);
  applyPose(avatar, pose);
  scene.add(avatar.root);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  AVATAR_PREVIEWS.set(member.id, url);
  return url;
}

/* =====================================================================
   STAGE
   ===================================================================== */
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const THEMES = {
  city:     { sky: 0x1d2440, fog: [28, 80], ground: 0x2b2f3f, hemi: [0x9db4ff, 0x20222f, 1.0], sun: [0xffd6a0, 1.5] },
  forest:   { sky: 0xa6dca4, fog: [20, 60], ground: 0x4d8a45, hemi: [0xe6ffd8, 0x35572f, 1.1], sun: [0xfff2c4, 1.6] },
  desert:   { sky: 0xf4c98e, fog: [26, 80], ground: 0xdcae68, hemi: [0xfff0d0, 0x8a6a3a, 1.1], sun: [0xffe2a8, 1.9] },
  snow:     { sky: 0xcfe2f4, fog: [18, 60], ground: 0xeef4fb, hemi: [0xffffff, 0x9bb2cc, 1.2], sun: [0xffffff, 1.3] },
  arena:    { sky: 0x140b26, fog: [22, 60], ground: 0x2b1a4a, hemi: [0x9a7bff, 0x180d2e, 0.9], sun: [0xff9ad1, 1.2] },
  rooftop:  { sky: 0x2a3050, fog: [25, 70], ground: 0x2c2c34, hemi: [0xb0c0ff, 0x181820, 1.0], sun: [0xffb26b, 1.6] },
  beach:    { sky: 0x9fd8f5, fog: [30, 90], ground: 0xe6d2a8, hemi: [0xfff3d8, 0x6a8aa0, 1.2], sun: [0xfff0c0, 1.8] },
  space:    { sky: 0x05060e, fog: [40, 120], ground: 0x101018, hemi: [0x8090ff, 0x101018, 0.6], sun: [0xffffff, 1.0] },
  cave:     { sky: 0x141018, fog: [12, 40], ground: 0x2b2330, hemi: [0x705080, 0x100810, 0.8], sun: [0xffb070, 0.9] },
  classroom:{ sky: 0xf4eadb, fog: [30, 90], ground: 0xc9a879, hemi: [0xfff0d8, 0x6a5a4a, 1.2], sun: [0xfff4d0, 1.5] },
  dojo:     { sky: 0x2a1e12, fog: [22, 70], ground: 0x3a2a1a, hemi: [0xffe0b0, 0x1a1008, 1.0], sun: [0xffd28a, 1.3] },
  office:   { sky: 0xdfe6ee, fog: [30, 90], ground: 0x8a8f96, hemi: [0xe8eefc, 0x404650, 1.2], sun: [0xffffff, 1.2] },
};

function buildEnvironment(name, gradient) {
  const th = THEMES[name] || THEMES.city;
  const group = new THREE.Group();
  const rnd = mulberry32(name.length * 9973 + name.charCodeAt(0));
  const toon = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradient, ...extra });
  const add = (geo, mat, x, y, z, { cast = true, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
    m.castShadow = cast; m.receiveShadow = true;
    group.add(m); return m;
  };
  const ground = add(new THREE.CircleGeometry(80, 48), toon(th.ground), 0, 0, 0, { cast: false, rx: -Math.PI / 2 });
  ground.receiveShadow = true;

  if (name === 'city') {
    const pal = [0x39425f, 0x4b3b63, 0x2f4a5c, 0x5a4a4a, 0x3a4f4a];
    for (let i = 0; i < 26; i++) {
      const w = 3 + rnd() * 3, h = 6 + rnd() * 18, d = 3 + rnd() * 2;
      const x = -40 + i * 3.2 + rnd() * 1.2, z = -10 - rnd() * 14;
      add(new THREE.BoxGeometry(w, h, d), toon(pal[Math.floor(rnd() * pal.length)]), x, h / 2, z);
      const wm = new THREE.MeshBasicMaterial({ color: 0xffd98a });
      for (let r = 0; r < Math.floor(h / 2.2); r++) for (let c = 0; c < 3; c++) {
        if (rnd() < 0.55) add(new THREE.PlaneGeometry(0.6, 0.8), wm, x - w / 3 + c * (w / 3), 1.4 + r * 2.1, z + d / 2 + 0.02, { cast: false });
      }
    }
  } else if (name === 'forest' || name === 'snow') {
    const snow = name === 'snow';
    const leaf = snow ? 0xdfeef8 : 0x2f7a3a, leaf2 = snow ? 0xc4dcee : 0x3f9448, trunk = 0x6b4a2f;
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 70, z = -6 - rnd() * 28;
      if (Math.abs(x) < 3 && z > -10) continue;
      const s = 0.8 + rnd() * 1.2;
      add(new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 1.4 * s, 6), toon(trunk), x, 0.7 * s, z);
      add(new THREE.ConeGeometry(1.5 * s, 2.6 * s, 7), toon(leaf), x, 2.4 * s, z);
      add(new THREE.ConeGeometry(1.1 * s, 2.2 * s, 7), toon(leaf2), x, 3.7 * s, z);
    }
  } else if (name === 'desert') {
    add(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false }), -18, 22, -55, { cast: false });
    for (let i = 0; i < 12; i++) add(new THREE.SphereGeometry(7 + rnd() * 8, 18, 12), toon(0xd6a45e), -50 + i * 10 + rnd() * 4, -4, -22 - rnd() * 16, { cast: false });
    for (let i = 0; i < 6; i++) {
      const x = -26 + i * 14 + rnd() * 4, z = -26 - rnd() * 8, h = 5 + rnd() * 4;
      add(new THREE.CylinderGeometry(2 + rnd(), 3 + rnd(), h, 5), toon(0xb9733f), x, h / 2, z);
    }
  } else if (name === 'arena') {
    const neon = new THREE.MeshBasicMaterial({ color: 0xff5cc8 });
    add(new THREE.TorusGeometry(5, 0.08, 8, 64), neon, 0, 0.05, 0, { cast: false, rx: Math.PI / 2 });
    add(new THREE.TorusGeometry(9, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: 0x57d7ff }), 0, 0.05, 0, { cast: false, rx: Math.PI / 2 });
  } else if (name === 'rooftop') {
    const bldPal = [0x39425f, 0x2f4a5c, 0x5a4a4a, 0x3a4f4a];
    for (let i = 0; i < 22; i++) {
      const w = 4 + rnd() * 4, h = 10 + rnd() * 30, d = 4 + rnd() * 3;
      add(new THREE.BoxGeometry(w, h, d), toon(bldPal[Math.floor(rnd() * bldPal.length)]), -50 + i * 4.8 + rnd() * 2, h / 2 - 2, -20 - rnd() * 20);
    }
  } else if (name === 'beach') {
    add(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: 0xfff6c4, fog: false }), 15, 18, -55, { cast: false });
    add(new THREE.PlaneGeometry(140, 40), toon(0x4ea3d8), 0, 0.005, -32, { cast: false, rx: -Math.PI / 2 });
  } else if (name === 'space') {
    for (let i = 0; i < 200; i++) {
      const r = 20 + rnd() * 40, a = rnd() * Math.PI * 2, y = rnd() * 40 - 5;
      add(new THREE.SphereGeometry(0.08 + rnd() * 0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), Math.cos(a) * r, y, Math.sin(a) * r, { cast: false });
    }
    add(new THREE.SphereGeometry(6, 24, 16), toon(0x8a5a8a), 20, 12, -40, { cast: false });
    add(new THREE.SphereGeometry(4, 24, 16), toon(0x3a4a8a), -22, 8, -45, { cast: false });
  } else if (name === 'cave') {
    for (let i = 0; i < 30; i++) {
      const x = (rnd() - 0.5) * 40, z = -4 - rnd() * 16, h = 3 + rnd() * 5;
      add(new THREE.ConeGeometry(0.8 + rnd() * 0.6, h, 6), toon(0x3a2a40), x, h / 2, z, { ry: rnd() });
    }
    for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.3 + rnd() * 0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb070 }), (rnd() - 0.5) * 30, 1.5 + rnd() * 2, 2 + rnd() * 4, { cast: false });
  } else if (name === 'classroom') {
    add(new THREE.BoxGeometry(20, 0.3, 0.3), toon(0x2a3a2a), 0, 3.2, -12);
    for (let i = 0; i < 8; i++) {
      const x = -10 + i * 2.8, z = -2 + (i % 2) * 2;
      add(new THREE.BoxGeometry(1.4, 0.7, 0.8), toon(0x8b5a2b), x, 0.35, z);
    }
  } else if (name === 'dojo') {
    add(new THREE.PlaneGeometry(30, 15), toon(0x8b6a4a), 0, 0.01, -8, { cast: false, rx: -Math.PI / 2 });
    for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), toon(0x5a3a1a), -12 + i * 5, 2, -14);
  } else if (name === 'office') {
    for (let i = 0; i < 10; i++) {
      const x = -12 + i * 2.6, z = -6 - rnd() * 6;
      add(new THREE.BoxGeometry(1.4, 0.1, 0.7), toon(0xf0f0f0), x, 0.75, z);
      add(new THREE.BoxGeometry(0.08, 0.75, 0.08), toon(0x2a2a30), x - 0.5, 0.375, z);
      add(new THREE.BoxGeometry(0.08, 0.75, 0.08), toon(0x2a2a30), x + 0.5, 0.375, z);
    }
  }

  return { group, theme: th };
}

class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height;

    this.gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.gl.setPixelRatio(1);
    this.gl.setSize(this.W, this.H, false);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.W / this.H, 0.1, 300);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.position.set(7, 12, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.envGroup = new THREE.Group();
    this.objGroup = new THREE.Group();
    this.scene.add(this.envGroup, this.objGroup);

    const grad = new Uint8Array([95, 175, 255]);
    this.gradient = new THREE.DataTexture(grad, 3, 1, THREE.RedFormat);
    this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter;
    this.gradient.needsUpdate = true;
    this.toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: this.gradient });

    this.actors = new Map();
    this.objects = new Map();
    this.camPos = new THREE.Vector3(0, 2.4, 8.5); this.camLook = new THREE.Vector3(0, 1.2, 0);
    this.camPosT = this.camPos.clone(); this.camLookT = this.camLook.clone();
    this.camEase = 2.4;
    this.overlay = { line: null, title: '', titleT: 0, titleDur: 2, fade: 0, fadeTarget: 0 };
    this.clock = new THREE.Clock();
    this.active = false; this.aborted = false; this._cancels = new Set();
    this.bgName = null;
    this.loop = this.loop.bind(this);
    this.setBackground('city');
    this.frame(1);
  }

  setCast(ids) {
    for (const a of this.actors.values()) this._disposeActor(a);
    this.actors.clear();
    const xs = ids.length === 1 ? [0] : ids.length === 2 ? [-2.2, 2.2] : [-3.2, 0, 3.2];
    ids.forEach((id, i) => {
      const member = castById(id);
      const avatar = makeAvatar(member, this.toon);
      avatar.root.position.set(xs[i] ?? 0, 0, 0);
      this.scene.add(avatar.root);
      this.actors.set(id, {
        id: member.id, name: member.name, color: member.color, member, avatar,
        pos: new THREE.Vector3(xs[i] ?? 0, 0, 0),
        home: xs[i] ?? 0, angle: 0, targetAngle: 0, move: null,
        current: null, clipStart: 0, clipDur: 0, loop: false,
      });
    });
  }
  _disposeActor(a) { this.scene.remove(a.avatar.root); }

  setObjects(list) {
    for (const [, g] of this.objects) this.objGroup.remove(g);
    this.objects.clear();
    for (const spec of list) {
      const group = buildObject(spec.id, this.toon);
      const xs = { left: -2.5, center: 0, right: 2.5 };
      group.position.set(xs[spec.at] ?? 0, 0, 0.4);
      group.scale.setScalar(spec.scale);
      group.visible = true;
      group.userData.homeX = xs[spec.at] ?? 0;
      this.objGroup.add(group);
      this.objects.set(spec.id, group);
    }
  }

  setBackground(name) {
    if (this.bgName === name) return;
    this.bgName = name;
    for (const c of [...this.envGroup.children]) {
      this.envGroup.remove(c);
      c.traverse((o) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    }
    const { group, theme } = buildEnvironment(name, this.gradient);
    this.envGroup.add(group);
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.sky, theme.fog[0], theme.fog[1]);
    this.hemi.color.set(theme.hemi[0]); this.hemi.groundColor.set(theme.hemi[1]); this.hemi.intensity = theme.hemi[2];
    this.sun.color.set(theme.sun[0]); this.sun.intensity = theme.sun[1];
  }

  shot(kind, actor) {
    const list = [...this.actors.values()];
    const mid = list.length
      ? list.reduce((v, a) => v.add(a.pos), new THREE.Vector3()).multiplyScalar(1 / list.length)
      : new THREE.Vector3(0, 0, 0);
    const p = actor ? actor.pos : mid;
    const maxH = list.reduce((h, a) => Math.max(h, a.member.height), 1.9);
    const headroom = maxH * 1.3;
    switch (kind) {
      case 'close':
        return { pos: new THREE.Vector3(p.x + Math.sin(actor?.angle || 0) * 1.2, maxH * 1.4, p.z + 2.6), look: new THREE.Vector3(p.x, maxH * 1.05, p.z) };
      case 'medium':
        return { pos: new THREE.Vector3(mid.x * 0.8, maxH * 1.4, 5.6), look: new THREE.Vector3(mid.x, maxH * 0.9, 0) };
      case 'low':
        return { pos: new THREE.Vector3(mid.x * 0.8, 0.5, 6.2), look: new THREE.Vector3(mid.x, headroom * 0.75, 0) };
      case 'side':
        return { pos: new THREE.Vector3(mid.x + 6.5, maxH * 1.2, 3.2), look: new THREE.Vector3(mid.x, maxH * 0.85, 0) };
      default:
        return { pos: new THREE.Vector3(mid.x * 0.6, headroom * 1.1, 9.2), look: new THREE.Vector3(mid.x, maxH * 0.9, 0) };
    }
  }
  setShot(kind, actor, snap = false) {
    const s = this.shot(kind, actor);
    this.camPosT.copy(s.pos); this.camLookT.copy(s.look);
    if (snap) { this.camPos.copy(s.pos); this.camLook.copy(s.look); }
  }

  setActive(on) {
    if (on && !this.active) { this.active = true; this.clock.getDelta(); requestAnimationFrame(this.loop); }
    else if (!on) this.active = false;
  }
  loop() {
    if (!this.active) return;
    requestAnimationFrame(this.loop);
    this.frame(Math.min(this.clock.getDelta(), 0.1));
  }
  frame(dt) {
    const now = performance.now() / 1000;
    for (const a of this.actors.values()) {
      if (a.move) {
        a.move.t += dt;
        const k = clamp(a.move.t / a.move.dur, 0, 1);
        a.pos.lerpVectors(a.move.from, a.move.to, k);
        if (k >= 1) a.move = null;
        a.avatar.root.position.set(a.pos.x, 0, a.pos.z);
      }
      const d = ((a.targetAngle - a.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      a.angle += d * (1 - Math.exp(-dt * 10));
      a.avatar.root.rotation.y = a.angle;

      if (a.current) {
        const elapsed = now - a.clipStart;
        const total = a.loop ? elapsed : Math.min(elapsed, a.clipDur);
        const pose = CLIPS[a.current].pose(total, a.clipDur);
        const talking = this.overlay.line && this.overlay.line.name === a.name;
        if (talking && !pose.mouthOpen) pose.mouthOpen = 0.4 + Math.sin(now * 20) * 0.35;
        applyPose(a.avatar, pose);
      }
    }
    for (const [, g] of this.objects) {
      const t = now;
      if (g.userData.spin) g.rotation.y = t * 2;
      if (g.userData.bob) g.position.y = Math.sin(t * 2) * 0.2;
      if (g.userData.move) {
        const m = g.userData.move;
        m.t += dt;
        const k = clamp(m.t / m.dur, 0, 1);
        g.position.x = lerp(m.from, m.to, k);
        if (k >= 1) g.userData.move = null;
      }
    }

    const k = 1 - Math.exp(-dt * this.camEase);
    this.camPos.lerp(this.camPosT, k);
    this.camLook.lerp(this.camLookT, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    const o = this.overlay;
    if (o.titleT > 0) o.titleT -= dt;
    o.fade += clamp(o.fadeTarget - o.fade, -dt * 3.5, dt * 3.5);

    this.gl.render(this.scene, this.camera);
    this.composite();
  }

  composite() {
    const { ctx, W, H, overlay: o } = this;
    ctx.drawImage(this.gl.domElement, 0, 0, W, H);
    if (o.titleT > 0 && o.title) {
      const a = clamp(Math.min(o.titleT, o.titleDur - o.titleT) * 2.2, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, H * 0.25, 0, H * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.25, W, H * 0.5);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 76px "Bricolage Grotesque", "DM Sans", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18;
      ctx.fillText(o.title, W / 2, H / 2, W - 120);
      ctx.restore();
    }
    if (o.line) {
      const { name, text, color } = o.line;
      ctx.save();
      ctx.font = '600 33px "DM Sans", system-ui, sans-serif';
      const maxW = W - 220;
      const lines = this.wrap(text, maxW);
      const lh = 44, padX = 30, padY = 20;
      const boxW = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + padX * 2;
      const boxH = lines.length * lh + padY * 2;
      const x = (W - boxW) / 2, y = H - 44 - boxH;
      ctx.fillStyle = 'rgba(8,10,16,.78)';
      this.roundRect(x, y, boxW, boxH, 20); ctx.fill();
      ctx.font = '800 20px "DM Sans", system-ui, sans-serif';
      const tw = ctx.measureText(name).width + 28;
      ctx.fillStyle = color;
      this.roundRect(x + 18, y - 17, tw, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(name, x + 32, y + 1);
      ctx.font = '600 33px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
      lines.forEach((l, i) => ctx.fillText(l, x + padX, y + padY + 30 + i * lh + 4));
      ctx.restore();
    }
    if (o.fade > 0.003) { ctx.fillStyle = `rgba(0,0,0,${o.fade})`; ctx.fillRect(0, 0, W, H); }
  }
  wrap(text, maxW) {
    const words = text.split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (this.ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  roundRect(x, y, w, h, r) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  sleep(sec) {
    return new Promise((res) => {
      const t = setTimeout(done, sec * 1000);
      const cancel = () => { clearTimeout(t); done(); };
      const self = this;
      function done() { self._cancels.delete(cancel); res(); }
      this._cancels.add(cancel);
    });
  }
  abort() { this.aborted = true; [...this._cancels].forEach((c) => c()); }

  _startClip(a, name, loopOverride) {
    const clip = CLIPS[name];
    if (!clip) return 0;
    a.current = name;
    a.clipStart = performance.now() / 1000;
    a.clipDur = clip.loop ? 100 : 1.6;
    a.loop = loopOverride ?? !!clip.loop;
    return a.clipDur;
  }

  _runObjectMove(objId, move) {
    const g = this.objects.get(objId);
    if (!g) return;
    if (move === 'appear') { g.visible = true; g.scale.setScalar(0.01); g.userData.grow = true; }
    if (move === 'disappear') { g.userData.shrink = true; }
    if (move === 'slideRight') g.userData.move = { from: g.position.x, to: g.userData.homeX + 2.5, t: 0, dur: 1.4 };
    if (move === 'slideLeft') g.userData.move = { from: g.position.x, to: g.userData.homeX - 2.5, t: 0, dur: 1.4 };
    if (move === 'spin') g.userData.spin = true;
    if (move === 'bob') g.userData.bob = true;
    if (move === 'throw') g.userData.move = { from: g.position.x, to: -g.position.x, t: 0, dur: 1.0 };
    if (move === 'scaleUp') g.userData.grow = true;
  }

  async runBeat(beat, key, voice) {
    const a = this.actors.get(beat.character);
    if (!a) return;
    const target = this.actors.get(beat.target) || this._nearestOther(a);
    let clipName = beat.clip;
    let clipMeta = CLIPS[clipName] || {};
    this.setShot(beat.camera || this.sceneCamera, a);

    let moveTime = 0;
    if (beat.move) {
      const X = { left: -2.8, center: 0, right: 2.8 };
      let dest;
      if (beat.move in X) dest = new THREE.Vector3(X[beat.move], 0, 0);
      else if (target) {
        const dir = new THREE.Vector3().subVectors(a.pos, target.pos); dir.y = 0;
        if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
        dir.normalize();
        dest = beat.move === 'toward' ? target.pos.clone().addScaledVector(dir, 1.4) : a.pos.clone().addScaledVector(dir, 3);
        dest.x = clamp(dest.x, -6, 6);
      } else dest = new THREE.Vector3(0, 0, 0);
      const dist = a.pos.distanceTo(dest);
      if (dist > 0.2) {
        if (!clipMeta.move) { clipName = 'Walk'; clipMeta = CLIPS.Walk; }
        moveTime = Math.max(0.7, dist / clipMeta.speed);
        a.move = { from: a.pos.clone(), to: dest, t: 0, dur: moveTime };
        if (clipMeta.fwd) a.targetAngle = Math.atan2(dest.x - a.pos.x, dest.z - a.pos.z);
        else if (target) a.targetAngle = Math.atan2(target.pos.x - a.pos.x, target.pos.z - a.pos.z);
      }
    } else if (target) {
      a.targetAngle = Math.atan2(target.pos.x - a.pos.x, target.pos.z - a.pos.z);
    }

    const looping = !!clipMeta.loop || (!!beat.line && !clipMeta.hold);
    const clipDur = this._startClip(a, clipName, looping ? true : false);

    let speech = 0;
    if (beat.line) {
      this.overlay.line = { name: a.name, text: beat.line, color: a.color };
      const buf = voice.buffers.get(key);
      if (buf) speech = audio.play(buf);
      else { speech = estimateSpeech(beat.line, a.member.rate); speakBrowser(beat.line, a.member); voice.silent++; }
    }

    if (beat.object) this._runObjectMove(beat.object, beat.objectMove);

    if (beat.reaction) {
      this.sleep(0.32).then(() => {
        if (this.aborted) return;
        const r = this.actors.get(beat.reaction.character);
        if (!r) return;
        r.targetAngle = Math.atan2(a.pos.x - r.pos.x, a.pos.z - r.pos.z);
        this._startClip(r, beat.reaction.clip, false);
      });
    }

    let dur;
    if (beat.line) dur = Math.max(speech + 0.35, moveTime);
    else if (moveTime) dur = moveTime;
    else if (looping) dur = beat.duration;
    else dur = clipDur + (clipMeta.hold ? 0.9 : 0.15);
    if (beat.reaction) dur = Math.max(dur, 0.32 + 0.75);

    await this.sleep(dur);
    this.overlay.line = null;
    if (this.aborted) return;
    if (clipMeta.move) {
      this._startClip(a, 'Idle_Neutral', true);
      if (target) a.targetAngle = Math.atan2(target.pos.x - a.pos.x, target.pos.z - a.pos.z);
    }
  }

  _nearestOther(a) {
    let best = null, d = Infinity;
    for (const o of this.actors.values()) {
      if (o === a) continue;
      const dd = a.pos.distanceToSquared(o.pos);
      if (dd < d) { d = dd; best = o; }
    }
    return best;
  }

  async run(script, voice, onProgress) {
    this.aborted = false;
    const total = script.scenes.reduce((n, s) => n + s.beats.length, 0) + 1;
    let done = 0;

    this.overlay.fade = 1; this.overlay.fadeTarget = 0;
    this.setBackground(script.scenes[0].background);
    this.sceneCamera = script.scenes[0].camera;
    this.setCast(script.cast);
    this.setObjects(script.objects);
    this.setShot('wide', null, true);
    this.overlay.title = script.title; this.overlay.titleDur = 2.2; this.overlay.titleT = 2.2;
    await this.sleep(2.2);
    onProgress?.(++done / total);

    for (let si = 0; si < script.scenes.length; si++) {
      if (this.aborted) return false;
      const sc = script.scenes[si];
      if (si > 0) {
        this.overlay.fadeTarget = 1; await this.sleep(0.35);
        this.setBackground(sc.background);
        this.setObjects(script.objects);
      }
      this.sceneCamera = sc.camera;
      this.setShot(sc.camera, null, true);
      this.overlay.fadeTarget = 0;
      await this.sleep(0.5);
      for (let bi = 0; bi < sc.beats.length; bi++) {
        if (this.aborted) return false;
        await this.runBeat(sc.beats[bi], `${si}:${bi}`, voice);
        onProgress?.(++done / total);
      }
      await this.sleep(0.3);
    }
    this.overlay.fadeTarget = 1;
    await this.sleep(0.6);
    this.overlay.fadeTarget = 0;
    return !this.aborted;
  }
}

/* =====================================================================
   RECORDING
   ===================================================================== */
function pickMime() {
  const list = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function startRecording(canvas) {
  if (!window.MediaRecorder) throw new Error('This browser cannot record video.');
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audio.dest.stream.getAudioTracks()]);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start(250);
  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: (mime || 'video/webm').split(';')[0] }));
      if (rec.state !== 'inactive') rec.stop(); else resolve(new Blob(chunks));
    }),
  };
}

/* =====================================================================
   UI
   ===================================================================== */
let stage = null;
let stageReady = false;

const VIEWS = ['auth', 'studio', 'library', 'settings'];
function currentRoute() {
  const r = (location.hash.replace(/^#\//, '') || 'studio').split(/[?/]/)[0];
  return VIEWS.includes(r) ? r : 'studio';
}
function route() {
  if (!state.authReady) return;
  const r = currentRoute();
  if (!state.user && r !== 'auth') { location.hash = '#/auth'; return; }
  if (state.user && r === 'auth') { location.hash = '#/studio'; return; }
  $$('.view').forEach((v) => { v.hidden = v.dataset.view !== r; });
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === r));
  $('#topbar').hidden = r === 'auth';
  stage?.setActive(r === 'studio' || state.busy);
  if (r === 'settings') fillSettings();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

let authMode = 'signin';
function setAuthMode(m) {
  authMode = m;
  $$('.auth-card .tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === m));
  $('#nameField').hidden = m !== 'signup';
  $('#authSubmit').textContent = m === 'signup' ? 'Create account' : 'Sign in';
  $('#authPass').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
  $('#authError').textContent = '';
}
function friendlyAuthError(e) {
  const code = e?.code || '';
  const map = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email. Try creating one.',
    'auth/email-already-in-use': 'That email already has an account.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'That email address looks wrong.',
    'auth/popup-closed-by-user': 'Google sign-in closed early.',
    'auth/popup-blocked': 'Your browser blocked the pop-up.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/unauthorized-domain': 'This domain is not authorised in Firebase.',
  };
  return map[code] || e?.message || 'Something went wrong.';
}
function initAuthUI() {
  $$('.auth-card .tab').forEach((t) => t.addEventListener('click', () => setAuthMode(t.dataset.mode)));
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
    if (!email || pass.length < 6) { $('#authError').textContent = 'Enter an email and a password of at least 6 characters.'; return; }
    const btn = $('#authSubmit'); btn.disabled = true; $('#authError').textContent = '';
    try {
      if (authMode === 'signup') await backend.signUp($('#authName').value.trim(), email, pass);
      else await backend.signIn(email, pass);
    } catch (err) { $('#authError').textContent = friendlyAuthError(err); }
    finally { btn.disabled = false; }
  });
  $('#googleBtn').addEventListener('click', async () => {
    try { await backend.google(); } catch (err) { $('#authError').textContent = friendlyAuthError(err); }
  });
  $('#demoBtn').addEventListener('click', () => backend.google());
  $('#signOutBtn').addEventListener('click', async () => {
    if (state.busy) return toast('Wait for the current render to finish.');
    await backend.signOut();
  });
  if (backend.mode === 'local') {
    $('#demoNote').hidden = false;
    $('#authForm').hidden = true;
    $('#demoBtn').hidden = false;
  }
}
function onAuthChange(user) {
  state.user = user;
  state.authReady = true;
  $('#splash').classList.add('gone');
  if (user) {
    $('#userName').textContent = user.displayName || user.email || '';
    $('#userAvatar').textContent = (user.displayName || user.email || '?').trim()[0].toUpperCase();
    backend.subscribeProjects((list) => { state.projects = list; renderLibrary(); });
  } else {
    state.projects = []; state.projectId = null; state.script = null;
    renderLibrary(); renderOutput();
  }
  route();
}

function scriptKeyNow() { return JSON.stringify([$('#idea').value.trim(), state.genre, state.length, state.cast]); }

function renderCast() {
  $('#castGrid').innerHTML = CAST.map((c) => {
    const idx = state.cast.indexOf(c.id);
    const img = getAvatarPreview(c);
    return `<button type="button" class="cast-card ${idx >= 0 ? 'on' : ''}" data-id="${c.id}" aria-pressed="${idx >= 0}">
      <img class="swatch" src="${img}" alt="">
      <span><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span>
      <span class="order">${idx + 1}</span>
    </button>`;
  }).join('');
}
function initComposer() {
  renderCast();
  $('#exampleChips').innerHTML = EXAMPLES.map((e) => `<button type="button" class="chip">${esc(e)}</button>`).join('');
  $('#exampleChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    $('#idea').value = chip.textContent; updateCount(); $('#idea').focus();
  });
  $('#castGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.cast-card'); if (!card || state.busy) return;
    const id = card.dataset.id, i = state.cast.indexOf(id);
    if (i >= 0) { if (state.cast.length === 1) return toast('Keep at least one character.'); state.cast.splice(i, 1); }
    else { if (state.cast.length >= 3) return toast('Up to 3 characters.'); state.cast.push(id); }
    renderCast();
    if (stageReady) stage.setCast(state.cast);
  });
  $$('.segmented').forEach((seg) => seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || state.busy) return;
    $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
    state[seg.dataset.seg] = b.dataset.value;
  }));
  $('#idea').addEventListener('input', updateCount);
  $('#btnPrompt').addEventListener('click', () => handleGenerate());
  $('#btnCreate').addEventListener('click', () => handleCreate());
  $('#btnPlay').addEventListener('click', () => handlePreview());
  $('#btnStop').addEventListener('click', () => { stage?.abort(); });
  $$('.output .tab').forEach((t) => t.addEventListener('click', () => {
    $$('.output .tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.output .pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === t.dataset.tab));
  }));
  $('#btnCopy').addEventListener('click', async () => {
    const tab = $('.output .tab.active').dataset.tab;
    const text = tab === 'json' ? JSON.stringify(state.script, null, 2) : promptText();
    try { await navigator.clipboard.writeText(text); toast('Copied.', 'ok', 1800); } catch { toast('Could not copy.', 'error'); }
  });
  $('#btnDlTxt').addEventListener('click', () => state.script && downloadBlob(`${slug(state.script.title)}-prompt.txt`, promptText(), 'text/plain'));
  $('#btnDlJson').addEventListener('click', () => state.script && downloadBlob(`${slug(state.script.title)}.json`, JSON.stringify(state.script, null, 2), 'application/json'));
  $('#modeHint').textContent = backend.mode === 'local'
    ? 'Local demo mode — projects stay in this browser.'
    : 'Tip: "Generate prompt" gives the script. "Create video" records the cartoon.';
}
function updateCount() { $('#charCount').textContent = `${$('#idea').value.length} / 600`; }

function promptText() {
  const s = state.script; if (!s) return '';
  const names = s.cast.map((id) => castById(id)?.name || id).join(', ');
  const idea = $('#idea').value.trim();
  const lines = [
    s.title.toUpperCase(), '='.repeat(Math.max(8, s.title.length)), '',
    'IDEA', idea, '',
    'LOGLINE', s.logline, '',
    'MASTER PROMPT', s.master_prompt || '(none)', '',
    `CAST: ${names}`,
    s.objects.length ? `OBJECTS: ${s.objects.map((o) => o.id).join(', ')}` : '',
    '', 'SHOT LIST',
  ];
  s.scenes.forEach((sc, i) => {
    lines.push(`\nSCENE ${i + 1} — ${sc.background}, ${sc.camera} shot`);
    sc.beats.forEach((b) => {
      const who = castById(b.character)?.name || b.character;
      const mv = b.move ? ` (moves ${b.move})` : '';
      lines.push(`  ${who} [${b.clip}]${mv}${b.line ? ` — "${b.line}"` : ''}${b.object ? ` ⇢ ${b.object}${b.objectMove ? ' (' + b.objectMove + ')' : ''}` : ''}${b.reaction ? `  → ${castById(b.reaction.character)?.name}: ${b.reaction.clip}` : ''}`);
    });
  });
  return lines.filter(Boolean).join('\n');
}

function renderOutput() {
  const s = state.script;
  $('#output').hidden = !s;
  $('#stageEmpty').hidden = !!s || !stageReady;
  if (!s) return;
  const sp = $('#paneScreenplay');
  sp.innerHTML = `
    <div class="sp-title">${esc(s.title)}</div>
    <div class="sp-logline">${esc(s.logline)}</div>
    ${s.scenes.map((sc, i) => `
      <div class="sp-scene">
        <h4>Scene ${i + 1} · ${esc(sc.background)} · ${esc(sc.camera)}</h4>
        ${sc.beats.map((b) => {
          const c = castById(b.character) || {};
          return `<div class="sp-beat">
            <span class="sp-who" style="color:${c.color || 'inherit'}">${esc(c.name || b.character)}</span>
            <span class="sp-clip">${esc(b.clip)}</span>
            ${b.move ? `<span class="sp-move">↦ ${esc(b.move)}</span>` : ''}
            ${b.line ? `<span class="sp-line">“${esc(b.line)}”</span>` : ''}
            ${b.object ? `<span class="sp-obj">⇢ ${esc(b.object)}</span>` : ''}
          </div>`;
        }).join('')}
      </div>`).join('')}`;
  $('#panePrompt').textContent = promptText();
  $('#paneJson').textContent = JSON.stringify(s, null, 2);
}

function setBusy(on, { canStop = false } = {}) {
  state.busy = on;
  ['#btnPrompt', '#btnCreate', '#btnPlay'].forEach((s) => { $(s).disabled = on; });
  $('#btnStop').disabled = !(on && canStop);
  $$('.cast-card, .segmented button, .chip').forEach((b) => { b.style.pointerEvents = on ? 'none' : ''; });
  stage?.setActive(on || currentRoute() === 'studio');
}
function setStatus(text, { rec = false } = {}) {
  const pill = $('#stagePill');
  pill.hidden = !text;
  pill.classList.toggle('rec', rec);
  $('#pillText').textContent = text || '';
}
const setProgress = (f) => { $('#progressBar').style.width = `${clamp(f, 0, 1) * 100}%`; };

function readIdea() {
  const idea = $('#idea').value.trim();
  if (idea.length < 8) { toast('Describe your idea in a sentence or two first.', 'error'); $('#idea').focus(); return null; }
  return idea;
}
async function ensureScript({ force = false } = {}) {
  const idea = readIdea(); if (!idea) return null;
  const key = scriptKeyNow();
  if (state.script && state.scriptKey === key && !force) return state.script;
  setStatus('Writing the script…');
  const script = await generateScript({ idea, genre: state.genre, length: state.length, cast: state.cast.slice() });
  state.script = script; state.scriptKey = key; state.projectId = null;
  renderOutput();
  try {
    state.projectId = await backend.createProject({
      idea, genre: state.genre, length: state.length, cast: script.cast,
      title: script.title, logline: script.logline, script,
    });
  } catch (e) { console.error(e); toast(`Script ready but couldn't save: ${e.message}`, 'error', 7000); }
  return script;
}
async function handleGenerate() {
  if (state.busy) return;
  if (!readIdea()) return;
  setBusy(true);
  try {
    const s = await ensureScript({ force: true });
    if (s) toast('Prompt ready.', 'ok');
  } catch (e) { toast(e.message, 'error', 7000); }
  finally { setStatus(''); setBusy(false); }
}
async function handlePreview() {
  if (state.busy) return;
  if (!state.script && !readIdea()) return;
  await produce({ record: false });
}
async function handleCreate() {
  if (state.busy) return;
  if (!readIdea()) return;
  await produce({ record: true });
}
async function produce({ record }) {
  if (!stageReady) return toast('Stage still loading. One moment.', 'error');
  audio.ensure();
  setBusy(true); setProgress(0); clearVideo();
  let recorder = null;
  try {
    const script = await ensureScript();
    if (!script) return;
    setStatus('Preparing voices…');
    const prep = await prepareVoices(script, (f) => setProgress(f * 0.25));
    if (record && prep.total && prep.failed) {
      toast(`Recording cancelled — ${prep.failed}/${prep.total} lines failed TTS. ${prep.firstError || ''} Fix Settings → Groq TTS model.`, 'error', 12000);
      return;
    }
    if (!record && prep.total && prep.failed) {
      toast(`${prep.firstError || 'TTS failed'} — preview will use browser voices (silent in exports).`, 'error', 9000);
    }
    const voice = { buffers: prep.buffers, silent: 0 };
    setBusy(true, { canStop: true });
    if (record) recorder = startRecording($('#stage'));
    setStatus(record ? 'Recording…' : 'Preview…', { rec: record });
    const ok = await stage.run(script, voice, (f) => setProgress(0.25 + f * 0.75));
    audio.stopAll();
    if (!ok) { if (recorder) await recorder.stop(); toast('Stopped.'); return; }
    if (!record) { toast('Preview finished.', 'ok', 2500); return; }
    setStatus('Finishing video…');
    const blob = await recorder.stop();
    recorder = null;
    state.videoBlob = blob;
    state.videoUrl = URL.createObjectURL(blob);
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const dl = $('#btnDownloadVideo');
    dl.href = state.videoUrl; dl.download = `${slug(script.title)}.${ext}`; dl.hidden = false;
    toast('Video ready.', 'ok');
    await uploadVideo(blob, script, ext);
  } catch (e) {
    console.error(e);
    toast(e.message || 'Something went wrong.', 'error', 8000);
    try { await recorder?.stop(); } catch { /* */ }
  } finally {
    audio.stopAll(); setStatus(''); setProgress(0); setBusy(false);
  }
}
async function uploadVideo(blob, script, ext) {
  if (!state.projectId) return;
  const { cloudName, uploadPreset } = state.settings;
  if (!cloudName || !uploadPreset) { toast('Video not saved to cloud — add Cloudinary details in Settings.', 'info', 7000); return; }
  try {
    setStatus('Uploading…');
    const res = await uploadToCloudinary(blob, `${slug(script.title)}.${ext}`, (f) => setProgress(f));
    await backend.updateProject(state.projectId, { videoUrl: res.secure_url, videoId: res.public_id, duration: res.duration || null });
    toast('Saved to library.', 'ok');
  } catch (e) { toast(`Upload failed: ${e.message}. Video still downloadable.`, 'error', 8000); }
}
function clearVideo() {
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = null; state.videoBlob = null;
  $('#btnDownloadVideo').hidden = true;
}

function projectDate(p) {
  const c = p.createdAt;
  const d = c?.toDate ? c.toDate() : c ? new Date(c) : new Date();
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function renderLibrary() {
  const grid = $('#projectGrid');
  $('#libraryEmpty').hidden = state.projects.length > 0;
  grid.innerHTML = state.projects.map((p) => `
    <article class="card" data-id="${esc(p.id)}">
      <div class="thumb">
        ${p.videoUrl ? `<img src="${esc(cloudThumb(p.videoUrl))}" alt="" loading="lazy" onerror="this.remove()">` : ''}
        <span class="ph">${esc((p.title || '?')[0])}</span>
        <span class="badge ${p.videoUrl ? 'video' : ''}">${p.videoUrl ? 'Video' : 'Script'}</span>
        ${p.videoUrl ? `<button class="play" data-act="play" aria-label="Play"><svg><use href="#i-play"/></svg></button>` : ''}
      </div>
      <div class="card-body">
        <h3>${esc(p.title || 'Untitled')}</h3>
        <p>${esc(p.logline || p.idea || '')}</p>
        <div class="card-meta">${esc(projectDate(p))} · ${(p.cast || []).map((id) => esc(castById(id)?.name || id)).join(', ')}</div>
      </div>
      <div class="card-actions">
        <button class="btn soft grow" data-act="open">Open</button>
        <button class="btn soft" data-act="json" title="Download script"><svg><use href="#i-download"/></svg></button>
        <button class="btn soft danger" data-act="delete" title="Delete"><svg><use href="#i-trash"/></svg></button>
      </div>
    </article>`).join('');
}
function initLibrary() {
  $('#projectGrid').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const id = btn.closest('.card').dataset.id;
    const p = state.projects.find((x) => x.id === id); if (!p) return;
    const act = btn.dataset.act;
    if (act === 'play') openVideo(p);
    if (act === 'json') downloadBlob(`${slug(p.title)}.json`, JSON.stringify(p.script, null, 2), 'application/json');
    if (act === 'open') openProject(p);
    if (act === 'delete') {
      if (!confirm(`Delete "${p.title || 'this project'}"?`)) return;
      try { await backend.deleteProject(id); if (state.projectId === id) state.projectId = null; toast('Deleted.', 'ok', 2000); }
      catch (err) { toast(`Could not delete: ${err.message}`, 'error'); }
    }
  });
  $('#dialogClose').addEventListener('click', () => $('#videoDialog').close());
  $('#videoDialog').addEventListener('close', () => { const v = $('#dialogVideo'); v.pause(); v.removeAttribute('src'); v.load(); });
  $('#videoDialog').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
}
function openVideo(p) {
  $('#dialogTitle').textContent = p.title || 'Video';
  $('#dialogVideo').src = p.videoUrl;
  $('#dialogDownload').href = cloudMp4(p.videoUrl);
  $('#videoDialog').showModal();
}
function openProject(p) {
  if (state.busy) return toast('Wait for the current render.');
  $('#idea').value = p.idea || '';
  state.cast = (p.cast || ['rex']).filter(castById).slice(0, 3);
  if (!state.cast.length) state.cast = ['rex'];
  state.genre = p.genre || 'action'; state.length = p.length || 'standard';
  $$('.segmented').forEach((seg) => $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.value === state[seg.dataset.seg])));
  renderCast(); updateCount();
  state.script = p.script || null;
  state.scriptKey = scriptKeyNow();
  state.projectId = p.id;
  clearVideo();
  renderOutput();
  if (stageReady && state.script) stage.setCast(state.script.cast);
  location.hash = '#/studio';
}

function fillSettings() {
  const s = state.settings;
  $('#setGroqKey').value = s.groqKey;

  const sel = $('#setChatModel');
  sel.innerHTML = '';
  GROQ_CHAT_MODELS.forEach((m) => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = m.label;
    sel.appendChild(o);
  });
  if (s.chatModel && !GROQ_CHAT_MODELS.some((m) => m.id === s.chatModel)) {
    const o = document.createElement('option');
    o.value = s.chatModel; o.textContent = `${s.chatModel} (custom)`;
    sel.appendChild(o);
  }
  sel.value = s.chatModel;

  $('#setTtsProvider').value = s.ttsProvider;
  $('#setTtsModel').value = s.ttsModel;
  $('#setCloudName').value = s.cloudName;
  $('#setUploadPreset').value = s.uploadPreset;
}
function initSettings() {
  $('#settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.settings = {
      groqKey: $('#setGroqKey').value.trim(),
      chatModel: $('#setChatModel').value,
      ttsProvider: $('#setTtsProvider').value,
      ttsModel: $('#setTtsModel').value.trim(),
      cloudName: $('#setCloudName').value.trim(),
      uploadPreset: $('#setUploadPreset').value.trim(),
    };
    saveSettings(state.settings);
    toast(`Saved. Chat model: ${state.settings.chatModel}`, 'ok', 3000);
  });
  $('#btnTestGroq').addEventListener('click', async () => {
    const key = $('#setGroqKey').value.trim();
    if (!key) return toast('Paste your Groq key first.', 'error');
    try {
      const r = await fetch(`${GROQ}/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(await groqError(r, 'Key check failed'));
      const j = await r.json();
      const ids = (j.data || []).map((m) => m.id);
      const chosen = $('#setChatModel').value;
      const tts = ids.filter((id) => /tts|orpheus|playai|speech/i.test(id));
      if (chosen && !ids.includes(chosen)) {
        toast(`Key works, but "${chosen}" not available. Available: ${ids.slice(0, 5).join(', ')}`, 'error', 10000);
      } else {
        toast(`Key works. "${chosen}" available. TTS models: ${tts.length ? tts.slice(0, 3).join(', ') : 'none found'}`, 'ok', 5000);
      }
    } catch (e) { toast(e.message, 'error', 6000); }
  });
  $('#btnDetectTTS')?.addEventListener('click', async () => {
    try {
      const m = await detectTTSModel();
      $('#setTtsModel').value = m;
      toast(`Detected TTS model: ${m}`, 'ok', 4000);
    } catch (e) { toast(e.message, 'error', 6000); }
  });
  $('#btnResetSettings')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!confirm('Clear saved settings?')) return;
    try { localStorage.removeItem(SETTINGS_KEY); } catch { /* */ }
    state.settings = loadSettings();
    fillSettings();
    toast('Cleared.', 'ok', 1500);
    setTimeout(() => location.reload(), 800);
  });
}

/* ---- Boot ---- */
async function boot() {
  initAuthUI(); initComposer(); initLibrary(); initSettings();
  updateCount();

  try {
    stage = new Stage($('#stage'));
    stage.setActive(true);
    stage.setCast(state.cast);
    stageReady = true;
    $('#stageLoading').hidden = true;
    renderOutput();
  } catch (e) {
    console.error(e);
    $('#stageLoading').innerHTML = `<span style="max-width:360px;text-align:center">Could not start the 3D stage. Serve over http (not file://). ${esc(e.message)}</span>`;
  }

  await backend.init(onAuthChange);
  if (!location.hash) location.hash = '#/studio';
  route();
}
boot();