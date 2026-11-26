/* =====================================================================
   Toonforge — idea → script → animated cartoon, directed in the browser.

   SETUP (details in the notes that came with this file)
   1. Paste your Firebase web config and Cloudinary details into CONFIG below.
   2. Serve this folder over http (e.g. `npx serve` or VS Code Live Server).
      Opening index.html straight from disk will not load the 3D model.
   3. Add your Groq key in the app under Settings.

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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

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
,
  cloudinary: {
    cloudName: 'ddtdqrh1b',
    uploadPreset: 'profile-pictures', // must be an *unsigned* preset
    
  },
  groq: {
    chatModel: 'llama-3.3-70b-versatile',
    ttsModel: 'canopylabs/orpheus-v1-english', // check Groq's current TTS models; change in Settings
  },
  modelUrl: 'Soldier.glb',
};

/* ---------------------------------------------------------------------
   Small helpers
   --------------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isPlaceholder = (v) => !v || /^YOUR_/i.test(v);

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
   Settings (browser only)
   --------------------------------------------------------------------- */
const SETTINGS_KEY = 'toonforge.settings.v1';
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
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }

/* ---------------------------------------------------------------------
   Domain data: clips, cast, backgrounds
   --------------------------------------------------------------------- */
// The 24 clips inside Soldier.glb. `loop`: repeats. `move`: travels across the stage.
// `fwd`: the character faces where it is going. `speed`: world units per second.
const CLIPS = {
  Idle:               { loop: 1, desc: 'standing alert' },
  Idle_Neutral:       { loop: 1, desc: 'relaxed standing, best for talking' },
  Idle_Gun:           { loop: 1, desc: 'arms raised as if holding a gun (no gun visible)' },
  Idle_Gun_Pointing:  { loop: 1, desc: 'pointing forward with arms raised' },
  Idle_Sword:         { loop: 1, desc: 'sword-ready stance (no sword visible)' },
  Walk:               { loop: 1, move: 1, fwd: 1, speed: 1.5, desc: 'walking' },
  Run:                { loop: 1, move: 1, fwd: 1, speed: 4.2, desc: 'running' },
  Run_Back:           { loop: 1, move: 1, speed: 2.6, desc: 'backing away while facing forward' },
  Run_Left:           { loop: 1, move: 1, speed: 3.6, desc: 'strafing left' },
  Run_Right:          { loop: 1, move: 1, speed: 3.6, desc: 'strafing right' },
  Run_Shoot:          { loop: 1, move: 1, fwd: 1, speed: 4.0, desc: 'running while shooting' },
  Roll:               { desc: 'dodge roll' },
  Punch_Left:         { desc: 'left punch' },
  Punch_Right:        { desc: 'right punch' },
  Kick_Left:          { desc: 'left kick' },
  Kick_Right:         { desc: 'right kick' },
  Sword_Slash:        { desc: 'sword slash (no sword visible)' },
  Gun_Shoot:          { desc: 'shooting a gun (no gun visible)' },
  Idle_Gun_Shoot:     { desc: 'shooting from a standing gun pose (no gun visible)' },
  HitRecieve:         { desc: 'flinching from being hit' },
  HitRecieve_2:       { desc: 'a different flinch from being hit' },
  Death:              { hold: 1, desc: 'falls to the ground and stays down' },
  Wave:               { loop: 1, desc: 'friendly wave' },
  Interact:           { desc: 'pressing or using something, a gesture' },
};
const clipKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').replace('receive', 'recieve');
const CLIP_LOOKUP = Object.fromEntries(Object.keys(CLIPS).map((k) => [clipKey(k), k]));
const resolveClip = (s) => CLIP_LOOKUP[clipKey(s || '')] || null;

const BACKGROUNDS = ['city', 'forest', 'desert', 'snow', 'arena'];
const CAMERAS = ['wide', 'medium', 'close', 'low', 'side'];
const MOVES = ['left', 'center', 'right', 'toward', 'away'];

// Voices are Groq/Orpheus voice names; `pitch`/`rate` only apply to the browser-voice fallback.
const CAST = [
  { id: 'rex',   name: 'Sgt. Rex', role: 'Gruff, by-the-book leader',  color: '#4f7a3a', skin: '#c68a5e', hair: '#2b1d14', voice: 'troy',   pitch: 0.7,  rate: 0.95 },
  { id: 'nova',  name: 'Nova',     role: 'Quick-witted ace',           color: '#2f6fd0', skin: '#8d5a3b', hair: '#111111', voice: 'hannah', pitch: 1.3,  rate: 1.05 },
  { id: 'viper', name: 'Viper',    role: 'Cool, sarcastic rival',      color: '#7d3fa8', skin: '#f0c29b', hair: '#d8b45a', voice: 'daniel', pitch: 0.9,  rate: 1.0 },
  { id: 'blaze', name: 'Blaze',    role: 'Hot-headed rookie',          color: '#d4561f', skin: '#e0a77d', hair: '#7a2f12', voice: 'austin', pitch: 1.1,  rate: 1.12 },
  { id: 'frost', name: 'Frost',    role: 'Calm, dry-witted medic',     color: '#1b8a9c', skin: '#f3d2b3', hair: '#e8e8ec', voice: 'diana',  pitch: 1.15, rate: 0.95 },
  { id: 'ash',   name: 'Ash',      role: 'Silent type, sharp one-liners', color: '#5b5f6b', skin: '#a86f4a', hair: '#3a2a1a', voice: 'autumn', pitch: 1.0, rate: 0.9 },
];
const castById = (id) => CAST.find((c) => c.id === id);

const EXAMPLES = [
  'Two rival sergeants fight over the last slice of pizza in the barracks',
  'A rookie tries to impress the squad and trips into a surprise sparring match',
  'Two soldiers race across the snow to grab the flag, then settle it with kicks',
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
  cast: ['rex', 'viper'],
  genre: 'action',
  length: 'standard',
  script: null,
  scriptKey: '',
  busy: false,
  videoBlob: null,
  videoUrl: null,
};

/* =====================================================================
   BACKEND — Firebase when configured, local-only demo mode otherwise
   ===================================================================== */
const firebaseReady = !isPlaceholder(CONFIG.firebase.apiKey) && !isPlaceholder(CONFIG.firebase.projectId);

const backend = {
  mode: firebaseReady ? 'firebase' : 'local',
  _authCb: null,
  _projCb: null,
  _unsub: null,
  fb: null,

  async init(onAuth) {
    this._authCb = onAuth;
    if (this.mode === 'firebase') {
      try { await this._initFirebase(); return; }
      catch (e) {
        console.error(e);
        toast('Could not reach Firebase, switching to local demo mode.', 'error', 7000);
        this.mode = 'local';
      }
    }
    // local demo mode
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

  /* ---- projects ---- */
  _unsubscribe() { if (this._unsub) { this._unsub(); this._unsub = null; } },

  subscribeProjects(cb) {
    this._unsubscribe();
    this._projCb = cb;
    if (this.mode === 'firebase') {
      const { fs, db } = this.fb;
      const q = fs.query(fs.collection(db, 'users', state.user.uid, 'projects'), fs.orderBy('createdAt', 'desc'));
      this._unsub = fs.onSnapshot(q,
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
        (err) => { console.error(err); toast(`Could not load your library: ${err.message}`, 'error', 7000); });
    } else {
      cb(this._localList());
    }
  },
  _localList() {
    try { return JSON.parse(localStorage.getItem('toonforge.local.projects') || '[]').sort((a, b) => b.createdAt - a.createdAt); }
    catch { return []; }
  },
  _localWrite(list) {
    try { localStorage.setItem('toonforge.local.projects', JSON.stringify(list)); } catch { toast('Browser storage is full or blocked.', 'error'); }
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
   CLOUDINARY upload (unsigned preset, with progress)
   ===================================================================== */
function uploadToCloudinary(blob, filename, onProgress) {
  return new Promise((resolve, reject) => {
    const { cloudName, uploadPreset } = state.settings;
    if (!cloudName || !uploadPreset) return reject(new Error('Cloudinary is not configured (Settings → Cloudinary).'));
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('upload_preset', uploadPreset);
    if (CONFIG.cloudinary.folder) fd.append('folder', CONFIG.cloudinary.folder);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let j = {};
      try { j = JSON.parse(xhr.responseText); } catch { /* */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(j);
      else reject(new Error(j.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.send(fd);
  });
}
const cloudThumb = (url) => url.replace('/upload/', '/upload/so_1,w_640,c_fill,ar_16:9/').replace(/\.\w+$/, '.jpg');
const cloudMp4 = (url) => url.replace('/upload/', '/upload/fl_attachment,f_mp4,q_auto/').replace(/\.\w+$/, '.mp4');

/* =====================================================================
   GROQ — script generation + text-to-speech
   ===================================================================== */
const GROQ = 'https://api.groq.com/openai/v1';

function buildSystemPrompt(castIds, genre, length) {
  const sceneCount = { short: 'exactly 2', standard: '3 or 4', long: '5 or 6' }[length] || '3 or 4';
  const castList = castIds.map((id) => `- "${id}": ${castById(id).name} — ${castById(id).role}`).join('\n');
  const clipList = Object.entries(CLIPS).map(([k, v]) => `- ${k}: ${v.desc}`).join('\n');
  return `You are the director of a short, fun ${genre} cartoon. A 3D engine will act out your script, so you may ONLY use the characters, clips, backgrounds and cameras listed below.

CAST (use these ids):
${castList}

ALLOWED ANIMATION CLIPS (use these exact names):
${clipList}

BACKGROUNDS: ${BACKGROUNDS.join(', ')}
CAMERAS: ${CAMERAS.join(', ')}
MOVES (optional, makes the character travel): left, center, right, toward (walk up to "target"), away (retreat from "target")

Return ONLY a JSON object, no markdown, in exactly this shape:
{
  "title": "catchy title, max 6 words",
  "logline": "one sentence summary",
  "master_prompt": "one rich paragraph (80-140 words) describing the whole cartoon visually and emotionally, written so it can be pasted into any text-to-video tool",
  "scenes": [
    {
      "background": "one of the backgrounds",
      "camera": "opening camera for the scene",
      "beats": [
        {
          "character": "cast id",
          "clip": "allowed clip name",
          "line": "spoken dialogue, or empty string",
          "move": "left|center|right|toward|away or null",
          "target": "cast id this character faces or approaches, or empty string",
          "camera": "optional camera change for this beat, or empty string",
          "duration": 1.5,
          "reaction": null
        }
      ]
    }
  ]
}
"reaction" is either null or {"character": "cast id", "clip": "allowed clip name"} for a second character reacting at the same moment (for example HitRecieve when punched).

RULES
- Use ${sceneCount} scenes with 3 to 6 beats each.
- Dialogue: short, funny or punchy, at most 18 words per line, and nothing the character wouldn't say. Every cast member should speak at least once if there is more than one.
- Beats with a "line" should use a talking-friendly clip (Idle_Neutral, Idle, Wave, Interact, Idle_Gun_Pointing).
- Action beats (punch, kick, roll, hits) usually have an empty line. After an attack, give the other character a HitRecieve reaction.
- "duration" only matters for looping clips without a line (Idle*, Walk, Run, Wave). Use 1 to 4 seconds.
- Gun and sword clips show no weapon, so prefer fists, kicks, running and rolling. Use gun or sword clips rarely.
- Death: only as a character's final beat, and a fallen character must not act again. Keep everything cartoon-style and non-graphic.
- Walking or running from one place to another: set "move" and optionally "target".
- Write dialogue in the same language as the user's idea.
- Output valid JSON only.`;
}

function normalizeScript(raw, castIds, idea) {
  const cast = castIds.slice();
  const pickChar = (id) => (cast.includes(String(id || '').toLowerCase()) ? String(id).toLowerCase() : null);
  const scenes = (Array.isArray(raw?.scenes) ? raw.scenes : []).slice(0, 6).map((sc) => {
    const beats = (Array.isArray(sc?.beats) ? sc.beats : []).slice(0, 8).map((b) => {
      const character = pickChar(b?.character) || cast[0];
      let clip = resolveClip(b?.clip) || 'Idle_Neutral';
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
      return { character, clip, line, move, target, camera, duration, reaction };
    });
    return {
      background: BACKGROUNDS.includes(String(sc?.background || '').toLowerCase()) ? String(sc.background).toLowerCase() : 'city',
      camera: CAMERAS.includes(String(sc?.camera || '').toLowerCase()) ? String(sc.camera).toLowerCase() : 'wide',
      beats,
    };
  }).filter((s) => s.beats.length);

  if (!scenes.length) throw new Error('The AI returned a script with no scenes. Try again.');
  return {
    title: String(raw?.title || 'Untitled Toon').slice(0, 80),
    logline: String(raw?.logline || idea).slice(0, 300),
    master_prompt: String(raw?.master_prompt || '').slice(0, 1600),
    cast,
    scenes,
  };
}

async function generateScript({ idea, genre, length, cast }) {
  const { groqKey, chatModel } = state.settings;
  if (!groqKey) {
    toast('No Groq key yet, so this is a demo script. Add your key in Settings for real AI scripts.', 'info', 6500);
    return demoScript(idea, cast);
  }
  const res = await fetch(`${GROQ}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: chatModel,
      temperature: 0.85,
      max_tokens: 3500,
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
  catch { throw new Error('The AI returned something that was not valid JSON. Try again.'); }
  return normalizeScript(parsed, cast, idea);
}

async function groqError(res, prefix) {
  let msg = `${res.status}`;
  try { const j = await res.json(); msg = j.error?.message || msg; } catch { /* */ }
  if (res.status === 401) msg = 'Groq rejected the API key. Check it in Settings.';
  if (res.status === 429) msg = 'Groq rate limit reached. Wait a moment and try again.';
  return `${prefix}: ${msg}`;
}

// Works with no API key so the whole pipeline can be tried immediately.
function demoScript(idea, cast) {
  const [a, b, c] = cast;
  const short = idea.length > 110 ? idea.slice(0, 107) + '…' : idea;
  const beat = (character, clip, line = '', extra = {}) => ({ character, clip, line, move: null, target: '', camera: '', duration: 1.6, reaction: null, ...extra });
  const scenes = [];
  if (!b) {
    scenes.push({ background: 'city', camera: 'wide', beats: [
      beat(a, 'Walk', '', { move: 'center' }),
      beat(a, 'Wave', `Hello! Today's story: ${short}`, { camera: 'medium' }),
      beat(a, 'Roll', ''),
      beat(a, 'Punch_Right', 'Let me show you.', { camera: 'close' }),
    ] });
  } else {
    scenes.push({ background: 'city', camera: 'wide', beats: [
      beat(a, 'Idle_Neutral', `Listen up. ${short}`, { target: b, camera: 'medium' }),
      beat(b, 'Idle_Neutral', "That's not how I remember it.", { target: a, camera: 'close' }),
      beat(a, 'Run', '', { move: 'toward', target: b, camera: 'wide' }),
    ] });
    scenes.push({ background: 'arena', camera: 'side', beats: [
      beat(a, 'Punch_Right', '', { target: b, reaction: { character: b, clip: 'HitRecieve' } }),
      beat(b, 'Kick_Left', 'Nice try!', { target: a, reaction: { character: a, clip: 'HitRecieve_2' }, camera: 'medium' }),
      beat(a, 'Roll', ''),
      beat(a, 'Idle_Neutral', 'Okay. That was fun. Rematch tomorrow?', { target: b, camera: 'close' }),
      beat(b, 'Wave', 'Deal.', { target: a }),
    ] });
    if (c) scenes.push({ background: 'forest', camera: 'wide', beats: [
      beat(c, 'Walk', '', { move: 'center' }),
      beat(c, 'Interact', 'You two are going to explain this to me later.', { camera: 'close' }),
    ] });
  }
  return {
    title: 'Demo Toon',
    logline: short,
    master_prompt: `A short, energetic 3D cartoon. ${short} Chunky soldier characters in bright uniforms act out the story across a stylised city and a glowing arena, with quick camera cuts, comic timing and exaggerated reactions.`,
    cast,
    scenes,
  };
}

/* ---- Text-to-speech ---- */
async function groqTTS(text, member, tries = 2) {
  const { groqKey, ttsModel } = state.settings;
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
  if (!res.ok) throw new Error(await groqError(res, 'Voice generation failed'));
  return audio.decode(await res.arrayBuffer());
}

/* ---- Audio graph (what we hear AND what gets recorded) ---- */
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
  } catch { /* speech not supported */ }
}
const estimateSpeech = (text, rate = 1) => Math.max(1.3, (text.trim().split(/\s+/).length * 0.4) / rate);

// Pre-generates every line so playback never stalls waiting on the network.
async function prepareVoices(script, onProgress) {
  const jobs = [];
  script.scenes.forEach((sc, si) => sc.beats.forEach((b, bi) => { if (b.line) jobs.push({ key: `${si}:${bi}`, text: b.line, member: castById(b.character) }); }));
  const buffers = new Map();
  let failed = 0, done = 0, firstError = '';
  const useGroq = state.settings.ttsProvider === 'groq' && !!state.settings.groqKey;
  if (useGroq && jobs.length) {
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
  return { buffers, failed: useGroq ? failed : jobs.length, firstError, total: jobs.length };
}

/* =====================================================================
   3D STAGE
   ===================================================================== */
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const THEMES = {
  city:   { sky: 0x1d2440, fog: [28, 70], ground: 0x2b2f3f, hemi: [0x9db4ff, 0x20222f, 1.0], sun: [0xffd6a0, 1.5] },
  forest: { sky: 0xa6dca4, fog: [20, 60], ground: 0x4d8a45, hemi: [0xe6ffd8, 0x35572f, 1.1], sun: [0xfff2c4, 1.6] },
  desert: { sky: 0xf4c98e, fog: [26, 80], ground: 0xdcae68, hemi: [0xfff0d0, 0x8a6a3a, 1.1], sun: [0xffe2a8, 1.9] },
  snow:   { sky: 0xcfe2f4, fog: [18, 60], ground: 0xeef4fb, hemi: [0xffffff, 0x9bb2cc, 1.2], sun: [0xffffff, 1.3] },
  arena:  { sky: 0x140b26, fog: [22, 60], ground: 0x2b1a4a, hemi: [0x9a7bff, 0x180d2e, 0.9], sun: [0xff9ad1, 1.2] },
};

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
    this.camera = new THREE.PerspectiveCamera(38, this.W / this.H, 0.1, 300);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.position.set(7, 12, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.propsGroup = new THREE.Group();
    this.scene.add(this.propsGroup);

    const grad = new Uint8Array([95, 175, 255]);
    this.gradient = new THREE.DataTexture(grad, 3, 1, THREE.RedFormat);
    this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter;
    this.gradient.needsUpdate = true;

    this.actors = new Map();
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

  /* ----- model ----- */
  async loadModel(url) {
    const gltf = await new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const h = box.max.y - box.min.y || 1.8;
    this.modelScale = 1.8 / h;
    this.modelY = -box.min.y * this.modelScale;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const conv = (m) => new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : new THREE.Color(0xffffff), map: m.map || null, gradientMap: this.gradient, name: m.name });
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    });
    this.gltf = gltf;
    return gltf.animations.map((a) => a.name);
  }

  /* ----- cast ----- */
  setCast(ids) {
    for (const a of this.actors.values()) this.disposeActor(a);
    this.actors.clear();
    const xs = ids.length === 1 ? [0] : ids.length === 2 ? [-2.2, 2.2] : [-3.2, 0, 3.2];
    ids.forEach((id, i) => this.actors.set(id, this.spawn(castById(id), xs[i] ?? 0)));
    this.resetActors();
  }

  spawn(member, x) {
    const model = SkeletonUtils.clone(this.gltf.scene);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const tint = (m) => {
        const c = m.clone();
        if (c.name === 'Swat') c.color.set(member.color);
        else if (c.name === 'Skin') c.color.set(member.skin);
        else if (c.name === 'Hair_Brown') c.color.set(member.hair);
        return c;
      };
      o.material = Array.isArray(o.material) ? o.material.map(tint) : tint(o.material);
    });
    model.scale.setScalar(this.modelScale);
    model.position.y = this.modelY;
    const root = new THREE.Group();
    root.add(model);
    this.scene.add(root);

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of this.gltf.animations) actions[clip.name] = mixer.clipAction(clip);
    const actor = {
      id: member.id, name: member.name, color: member.color, member, root, model, mixer, actions,
      current: null, home: x, pos: new THREE.Vector3(x, 0, 0), angle: 0, targetAngle: 0, move: null, returnIdle: true,
    };
    mixer.addEventListener('finished', (e) => {
      if (actor.returnIdle && e.action === actor.current) this.play(actor, 'Idle_Neutral', { loop: true, fade: 0.3 });
    });
    return actor;
  }

  disposeActor(a) {
    this.scene.remove(a.root);
    a.mixer.stopAllAction();
    a.model.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
  }

  actorList() { return [...this.actors.values()]; }

  resetActors() {
    const list = this.actorList();
    for (const a of list) {
      a.mixer.stopAllAction();
      a.current = null; a.move = null; a.returnIdle = true;
      a.pos.set(a.home, 0, 0);
      this.play(a, 'Idle_Neutral', { loop: true, fade: 0 });
    }
    for (const a of list) {
      const other = this.nearestOther(a);
      a.targetAngle = other ? this.angleTo(a.pos, other.pos) : 0;
      a.angle = a.targetAngle;
    }
  }

  nearestOther(a) {
    let best = null, d = Infinity;
    for (const o of this.actors.values()) {
      if (o === a) continue;
      const dd = a.pos.distanceToSquared(o.pos);
      if (dd < d) { d = dd; best = o; }
    }
    return best;
  }

  angleTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); }

  play(actor, name, { loop = true, fade = 0.25, clamp: clampEnd = false } = {}) {
    const next = actor.actions[name];
    if (!next) return 0;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(1);
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = clampEnd;
    if (actor.current && actor.current !== next && fade > 0) next.crossFadeFrom(actor.current, fade, false);
    else if (actor.current && actor.current !== next) actor.current.stop();
    next.play();
    actor.current = next;
    return next.getClip().duration;
  }

  /* ----- backgrounds ----- */
  setBackground(name) {
    if (this.bgName === name) return;
    this.bgName = name;
    const th = THEMES[name] || THEMES.city;
    // clear old props
    for (const child of [...this.propsGroup.children]) {
      this.propsGroup.remove(child);
      child.traverse((o) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    }
    this.scene.background = new THREE.Color(th.sky);
    this.scene.fog = new THREE.Fog(th.sky, th.fog[0], th.fog[1]);
    this.hemi.color.set(th.hemi[0]); this.hemi.groundColor.set(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.sun.color.set(th.sun[0]); this.sun.intensity = th.sun[1];

    const rnd = mulberry32(name.length * 9973 + name.charCodeAt(0));
    const toon = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: this.gradient, ...extra });
    const add = (geo, mat, x, y, z, { cast = true, rx = 0, ry = 0, rz = 0 } = {}) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = cast; m.receiveShadow = true;
      this.propsGroup.add(m);
      return m;
    };

    const ground = add(new THREE.CircleGeometry(60, 48), toon(th.ground), 0, 0, 0, { cast: false, rx: -Math.PI / 2 });
    ground.receiveShadow = true;

    if (name === 'city') {
      add(new THREE.PlaneGeometry(60, 6), toon(0x20232f), 0, 0.01, -3, { cast: false, rx: -Math.PI / 2 });
      for (let i = -9; i <= 9; i++) add(new THREE.PlaneGeometry(1.2, 0.18), toon(0xf2c94c), i * 2.6, 0.02, -3, { cast: false, rx: -Math.PI / 2 });
      const pal = [0x39425f, 0x4b3b63, 0x2f4a5c, 0x5a4a4a, 0x3a4f4a];
      for (let i = 0; i < 22; i++) {
        const w = 3 + rnd() * 3, h = 6 + rnd() * 14, d = 3 + rnd() * 2;
        const x = -36 + i * 3.4 + rnd() * 1.2, z = -9 - rnd() * 10;
        add(new THREE.BoxGeometry(w, h, d), toon(pal[Math.floor(rnd() * pal.length)]), x, h / 2, z);
        const wm = new THREE.MeshBasicMaterial({ color: 0xffd98a });
        for (let r = 0; r < Math.floor(h / 2.2); r++) for (let c = 0; c < 3; c++) {
          if (rnd() < 0.55) add(new THREE.PlaneGeometry(0.6, 0.8), wm, x - w / 3 + c * (w / 3), 1.4 + r * 2.1, z + d / 2 + 0.02, { cast: false });
        }
      }
      for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.9, 0.9, 0.9), toon(0x8a6a3a), -7 + i * 2.8 + rnd(), 0.45, 3.2 + rnd() * 1.5, { ry: rnd() });
    } else if (name === 'forest' || name === 'snow') {
      const snow = name === 'snow';
      const leaf = snow ? 0xdfeef8 : 0x2f7a3a, leaf2 = snow ? 0xc4dcee : 0x3f9448, trunk = 0x6b4a2f;
      for (let i = 0; i < 46; i++) {
        const x = (rnd() - 0.5) * 60, z = -5 - rnd() * 24;
        if (Math.abs(x) < 3 && z > -9) continue;
        const s = 0.8 + rnd() * 1.1;
        add(new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 1.4 * s, 6), toon(trunk), x, 0.7 * s, z);
        add(new THREE.ConeGeometry(1.5 * s, 2.6 * s, 7), toon(leaf), x, 2.4 * s, z);
        add(new THREE.ConeGeometry(1.1 * s, 2.2 * s, 7), toon(leaf2), x, 3.7 * s, z);
      }
      for (let i = 0; i < 12; i++) add(new THREE.DodecahedronGeometry(0.4 + rnd() * 0.5), toon(snow ? 0xaec6dc : 0x7b8088), (rnd() - 0.5) * 30, 0.25, 2.5 + rnd() * 3);
    } else if (name === 'desert') {
      add(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false }), -14, 16, -45, { cast: false });
      for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(7 + rnd() * 6, 18, 12), toon(0xd6a45e), -40 + i * 10 + rnd() * 4, -3.5, -18 - rnd() * 14, { cast: false });
      for (let i = 0; i < 4; i++) {
        const x = -22 + i * 14 + rnd() * 4, z = -22 - rnd() * 6, h = 5 + rnd() * 4;
        add(new THREE.CylinderGeometry(2 + rnd(), 3 + rnd(), h, 5), toon(0xb9733f), x, h / 2, z);
      }
      for (let i = 0; i < 9; i++) {
        const x = (rnd() - 0.5) * 36, z = -2 - rnd() * 12;
        if (Math.abs(x) < 2.5 && z > -5) continue;
        const h = 1.4 + rnd() * 1.4, g = toon(0x4f9a52);
        add(new THREE.CylinderGeometry(0.22, 0.26, h, 8), g, x, h / 2, z);
        add(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8), g, x - 0.4, h * 0.6, z, { rz: Math.PI / 2 });
        add(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8), g, x - 0.7, h * 0.6 + 0.3, z);
      }
    } else if (name === 'arena') {
      const neon = new THREE.MeshBasicMaterial({ color: 0xff5cc8 });
      add(new THREE.TorusGeometry(4.6, 0.07, 8, 64), neon, 0, 0.05, 0, { cast: false, rx: Math.PI / 2 });
      add(new THREE.TorusGeometry(7.5, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: 0x57d7ff }), 0, 0.05, 0, { cast: false, rx: Math.PI / 2 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = 16;
        const h = 4 + rnd() * 4;
        add(new THREE.CylinderGeometry(0.7, 0.9, h, 6), toon(0x2c2250), Math.cos(a) * r, h / 2, Math.sin(a) * r - 6);
        add(new THREE.SphereGeometry(0.45, 12, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff5cc8 : 0x57d7ff }), Math.cos(a) * r, h + 0.5, Math.sin(a) * r - 6, { cast: false });
      }
    }
  }

  /* ----- camera ----- */
  shot(kind, actor) {
    const list = this.actorList();
    const mid = list.reduce((v, a) => v.add(a.pos), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, list.length));
    const p = actor ? actor.pos : mid;
    switch (kind) {
      case 'close': return { pos: new THREE.Vector3(p.x + Math.sin(actor?.angle || 0) * 1.2, 1.7, p.z + 2.6), look: new THREE.Vector3(p.x, 1.45, p.z) };
      case 'medium': return { pos: new THREE.Vector3(mid.x * 0.8, 1.8, 5.6), look: new THREE.Vector3(mid.x, 1.15, 0) };
      case 'low': return { pos: new THREE.Vector3(mid.x * 0.8, 0.5, 6.2), look: new THREE.Vector3(mid.x, 1.6, 0) };
      case 'side': return { pos: new THREE.Vector3(mid.x + 6.5, 1.5, 3.2), look: new THREE.Vector3(mid.x, 1.1, 0) };
      default: return { pos: new THREE.Vector3(mid.x * 0.6, 2.5, 9.2), look: new THREE.Vector3(mid.x, 1.2, 0) };
    }
  }
  setShot(kind, actor, snap = false) {
    const s = this.shot(kind, actor);
    this.camPosT.copy(s.pos); this.camLookT.copy(s.look);
    if (snap) { this.camPos.copy(s.pos); this.camLook.copy(s.look); }
  }

  /* ----- frame loop ----- */
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
    for (const a of this.actors.values()) {
      a.mixer.update(dt);
      if (a.move) {
        a.move.t += dt;
        const k = clamp(a.move.t / a.move.dur, 0, 1);
        a.pos.lerpVectors(a.move.from, a.move.to, k);
        if (k >= 1) a.move = null;
      }
      const d = ((a.targetAngle - a.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      a.angle += d * (1 - Math.exp(-dt * 10));
      a.root.position.copy(a.pos);
      a.root.rotation.y = a.angle;
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

  /* ----- 2D compositing: 3D frame + subtitles + title + fade ----- */
  composite() {
    const { ctx, W, H, overlay: o } = this;
    ctx.drawImage(this.gl.domElement, 0, 0, W, H);

    if (o.titleT > 0 && o.title) {
      const a = clamp(Math.min(o.titleT, o.titleDur - o.titleT) * 2.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
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
      // name tag
      ctx.font = '800 20px "DM Sans", system-ui, sans-serif';
      const tw = ctx.measureText(name).width + 28;
      ctx.fillStyle = color;
      this.roundRect(x + 18, y - 17, tw, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(name, x + 32, y + 1);
      // text
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

  /* ----- playback ----- */
  sleep(sec) {
    return new Promise((res) => {
      const t = setTimeout(done, sec * 1000);
      const cancel = () => { clearTimeout(t); done(); };
      const self = this;
      function done() { self._cancels.delete(cancel); res(); }
      this._cancels.add(cancel);
    });
  }
  abort() {
    this.aborted = true;
    [...this._cancels].forEach((c) => c());
  }

  destFor(a, move, target) {
    const X = { left: -2.8, center: 0, right: 2.8 };
    if (move in X) return new THREE.Vector3(X[move], 0, 0);
    if (!target) return new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3().subVectors(a.pos, target.pos); dir.y = 0;
    if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
    dir.normalize();
    if (move === 'toward') return target.pos.clone().addScaledVector(dir, 1.25);
    const p = a.pos.clone().addScaledVector(dir, 3);
    p.x = clamp(p.x, -6, 6);
    return p;
  }

  async runBeat(beat, key, voice) {
    const a = this.actors.get(beat.character);
    if (!a) return;
    const target = this.actors.get(beat.target) || this.nearestOther(a);
    let clipName = beat.clip;
    let meta = CLIPS[clipName] || {};
    this.setShot(beat.camera || this.sceneCamera, a);

    let dur = 0, moveTime = 0;

    // movement
    if (beat.move) {
      const dest = this.destFor(a, beat.move, this.actors.get(beat.target) || this.nearestOther(a));
      const dist = a.pos.distanceTo(dest);
      if (dist > 0.25) {
        if (!meta.move) { clipName = 'Walk'; meta = CLIPS.Walk; }
        moveTime = Math.max(0.7, dist / meta.speed);
        a.move = { from: a.pos.clone(), to: dest, t: 0, dur: moveTime };
        if (meta.fwd) a.targetAngle = this.angleTo(a.pos, dest);
        else if (target) a.targetAngle = this.angleTo(a.pos, target.pos);
      }
    } else if (target) {
      a.targetAngle = this.angleTo(a.pos, target.pos);
    }

    // animation
    const looping = !!meta.loop || (!!beat.line && !meta.hold);
    a.returnIdle = !meta.hold && !looping;
    const clipDur = this.play(a, clipName, { loop: looping, clamp: !!meta.hold, fade: 0.2 });

    // speech
    let speech = 0;
    if (beat.line) {
      this.overlay.line = { name: a.name, text: beat.line, color: a.color };
      const buf = voice.buffers.get(key);
      if (buf) speech = audio.play(buf);
      else { speech = estimateSpeech(beat.line, a.member.rate); speakBrowser(beat.line, a.member); voice.silent++; }
    }

    // simultaneous reaction (e.g. the victim of a punch)
    if (beat.reaction) {
      this.sleep(0.32).then(() => {
        if (this.aborted) return;
        const r = this.actors.get(beat.reaction.character);
        if (!r) return;
        const rm = CLIPS[beat.reaction.clip] || {};
        r.targetAngle = this.angleTo(r.pos, a.pos);
        r.returnIdle = !rm.hold;
        this.play(r, beat.reaction.clip, { loop: false, clamp: !!rm.hold, fade: 0.1 });
      });
    }

    // how long the beat lasts
    if (beat.line) dur = Math.max(speech + 0.35, moveTime);
    else if (moveTime) dur = moveTime;
    else if (looping) dur = beat.duration;
    else dur = clipDur + (meta.hold ? 0.9 : 0.15);
    if (beat.reaction) dur = Math.max(dur, 0.32 + 0.75);

    await this.sleep(dur);
    this.overlay.line = null;
    if (this.aborted) return;
    if (meta.move) {
      this.play(a, 'Idle_Neutral', { loop: true, fade: 0.2 });
      a.returnIdle = true;
      if (target) a.targetAngle = this.angleTo(a.pos, target.pos);
    }
  }

  async run(script, voice, onProgress) {
    this.aborted = false;
    const total = script.scenes.reduce((n, s) => n + s.beats.length, 0) + 1;
    let done = 0;

    this.overlay.fade = 1; this.overlay.fadeTarget = 0;
    this.setBackground(script.scenes[0].background);
    this.sceneCamera = script.scenes[0].camera;
    this.resetActors();
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
        this.resetActors();
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
  if (!window.MediaRecorder) throw new Error('This browser cannot record video. Try Chrome, Edge or Firefox.');
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

/* ---------- Router ---------- */
const VIEWS = ['auth', 'studio', 'library', 'settings'];
function currentRoute() {
  const r = (location.hash.replace(/^#\//, '') || 'studio').split(/[?/]/)[0];
  return VIEWS.includes(r) ? r : 'studio';
}
function route() {
  if (!state.authReady) return;
  let r = currentRoute();
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

/* ---------- Auth ---------- */
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
    'auth/email-already-in-use': 'That email already has an account. Try signing in.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in pop-up.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in your Firebase console yet.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/unauthorized-domain': 'This domain is not authorised in Firebase (Authentication → Settings → Authorised domains).',
  };
  return map[code] || e?.message || 'Something went wrong. Try again.';
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
    if (state.busy) return toast('Wait for the current render to finish first.');
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

/* ---------- Studio: composer ---------- */
function scriptKeyNow() { return JSON.stringify([$('#idea').value.trim(), state.genre, state.length, state.cast]); }

function renderCast() {
  $('#castGrid').innerHTML = CAST.map((c) => {
    const idx = state.cast.indexOf(c.id);
    return `<button type="button" class="cast-card ${idx >= 0 ? 'on' : ''}" data-id="${c.id}" aria-pressed="${idx >= 0}">
      <span class="swatch" style="background:${c.color}">${esc(c.name.replace(/^Sgt\. /, '')[0])}</span>
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
    else { if (state.cast.length >= 3) return toast('Up to 3 characters per cartoon.'); state.cast.push(id); }
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

  // output tabs + actions
  $$('.output .tab').forEach((t) => t.addEventListener('click', () => {
    $$('.output .tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.output .pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === t.dataset.tab));
  }));
  $('#btnCopy').addEventListener('click', async () => {
    const tab = $('.output .tab.active').dataset.tab;
    const text = tab === 'json' ? JSON.stringify(state.script, null, 2) : promptText();
    try { await navigator.clipboard.writeText(text); toast('Copied.', 'ok', 1800); } catch { toast('Could not copy. Select the text instead.', 'error'); }
  });
  $('#btnDlTxt').addEventListener('click', () => state.script && downloadBlob(`${slug(state.script.title)}-prompt.txt`, promptText(), 'text/plain'));
  $('#btnDlJson').addEventListener('click', () => state.script && downloadBlob(`${slug(state.script.title)}.json`, JSON.stringify(state.script, null, 2), 'application/json'));

  $('#modeHint').textContent = backend.mode === 'local'
    ? 'Local demo mode: projects stay in this browser until Firebase is configured.'
    : 'Tip: "Generate prompt" gives you the script and a downloadable prompt. "Create video" records the full cartoon.';
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
    'MASTER PROMPT (paste into any AI video tool)', s.master_prompt || '(none)', '',
    `CAST: ${names}`, '', 'SHOT LIST',
  ];
  s.scenes.forEach((sc, i) => {
    lines.push(`\nSCENE ${i + 1} — ${sc.background}, ${sc.camera} shot`);
    sc.beats.forEach((b) => {
      const who = castById(b.character)?.name || b.character;
      const mv = b.move ? ` (moves ${b.move}${b.target ? ' ' + (castById(b.target)?.name || b.target) : ''})` : '';
      lines.push(`  ${who} [${b.clip}]${mv}${b.line ? ` — "${b.line}"` : ''}${b.reaction ? `  → ${castById(b.reaction.character)?.name}: ${b.reaction.clip}` : ''}`);
    });
  });
  return lines.join('\n');
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
          </div>`;
        }).join('')}
      </div>`).join('')}`;
  $('#panePrompt').textContent = promptText();
  $('#paneJson').textContent = JSON.stringify(s, null, 2);
}

/* ---------- Studio: busy / status ---------- */
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

/* ---------- Studio: actions ---------- */
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
  } catch (e) { console.error(e); toast(`Script is ready but could not be saved: ${e.message}`, 'error', 7000); }
  return script;
}

async function handleGenerate() {
  if (state.busy) return;
  if (!readIdea()) return;
  setBusy(true);
  try {
    const s = await ensureScript({ force: true });
    if (s) { toast('Prompt ready. Download it from the panel below.', 'ok'); $('#output').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
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
  if (!stageReady) return toast('The 3D stage is still loading. One moment.', 'error');
  audio.ensure();
  setBusy(true);
  setProgress(0);
  clearVideo();
  let recorder = null;
  try {
    const script = await ensureScript();
    if (!script) return;
    stage.setCast(script.cast);

    // voices
    setStatus('Recording voices…');
    const prep = await prepareVoices(script, (f) => setProgress(f * 0.25));
    const voice = { buffers: prep.buffers, silent: 0 };
    if (prep.total && prep.failed) {
      const why = prep.firstError || (state.settings.groqKey ? 'Voices are set to browser mode.' : 'No Groq key yet, so voices use the browser.');
      toast(record
        ? `${why} Those lines will use browser voices, which cannot be recorded, so the video will be silent there.`
        : `${why} Using browser voices for the preview.`, 'error', 9000);
    }

    // record
    setBusy(true, { canStop: true });
    if (record) recorder = startRecording($('#stage'));
    setStatus(record ? 'Recording…' : 'Playing preview…', { rec: record });
    const ok = await stage.run(script, voice, (f) => setProgress(0.25 + f * 0.75));
    audio.stopAll();

    if (!ok) {
      if (recorder) await recorder.stop();
      toast('Stopped.');
      return;
    }
    if (!record) { toast('Preview finished.', 'ok', 2500); return; }

    setStatus('Finishing video…');
    const blob = await recorder.stop();
    recorder = null;
    state.videoBlob = blob;
    state.videoUrl = URL.createObjectURL(blob);
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const dl = $('#btnDownloadVideo');
    dl.href = state.videoUrl; dl.download = `${slug(script.title)}.${ext}`; dl.hidden = false;
    toast('Your video is ready.', 'ok');
    await uploadVideo(blob, script, ext);
  } catch (e) {
    console.error(e);
    toast(e.message || 'Something went wrong.', 'error', 8000);
    try { await recorder?.stop(); } catch { /* */ }
  } finally {
    audio.stopAll();
    setStatus(''); setProgress(0); setBusy(false);
  }
}

async function uploadVideo(blob, script, ext) {
  if (!state.projectId) return;
  const { cloudName, uploadPreset } = state.settings;
  if (!cloudName || !uploadPreset) {
    toast('Video not saved to the cloud: add your Cloudinary details in Settings. You can still download it.', 'info', 7000);
    return;
  }
  try {
    setStatus('Uploading to Cloudinary…');
    const res = await uploadToCloudinary(blob, `${slug(script.title)}.${ext}`, (f) => setProgress(f));
    await backend.updateProject(state.projectId, { videoUrl: res.secure_url, videoId: res.public_id, duration: res.duration || null });
    toast('Saved to your library.', 'ok');
  } catch (e) {
    toast(`Upload failed: ${e.message}. Your video is still available to download.`, 'error', 8000);
  }
}

function clearVideo() {
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = null; state.videoBlob = null;
  $('#btnDownloadVideo').hidden = true;
}

/* ---------- Library ---------- */
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
        ${p.videoUrl ? `<button class="play" data-act="play" aria-label="Play video"><svg><use href="#i-play"/></svg></button>` : ''}
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
      if (!confirm(`Delete "${p.title || 'this project'}"? The video file stays in your Cloudinary account.`)) return;
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
  if (state.busy) return toast('Wait for the current render to finish.');
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

/* ---------- Settings ---------- */
function fillSettings() {
  const s = state.settings;
  $('#setGroqKey').value = s.groqKey; $('#setChatModel').value = s.chatModel;
  $('#setTtsProvider').value = s.ttsProvider; $('#setTtsModel').value = s.ttsModel;
  $('#setCloudName').value = s.cloudName; $('#setUploadPreset').value = s.uploadPreset;
}
function initSettings() {
  $('#settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.settings = {
      groqKey: $('#setGroqKey').value.trim(),
      chatModel: $('#setChatModel').value.trim() || CONFIG.groq.chatModel,
      ttsProvider: $('#setTtsProvider').value,
      ttsModel: $('#setTtsModel').value.trim() || CONFIG.groq.ttsModel,
      cloudName: $('#setCloudName').value.trim(),
      uploadPreset: $('#setUploadPreset').value.trim(),
    };
    saveSettings(state.settings);
    toast('Settings saved.', 'ok', 2500);
  });
  $('#btnTestGroq').addEventListener('click', async () => {
    const key = $('#setGroqKey').value.trim();
    if (!key) return toast('Paste your Groq key first.', 'error');
    try {
      const r = await fetch(`${GROQ}/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(await groqError(r, 'Key check failed'));
      toast('Groq key works.', 'ok');
    } catch (e) { toast(e.message, 'error', 6000); }
  });
}

/* ---------- Boot ---------- */
async function boot() {
  initAuthUI(); initComposer(); initLibrary(); initSettings();
  updateCount();

  // stage first so it is ready by the time the user signs in
  try {
    stage = new Stage($('#stage'));
    stage.setActive(true);
    await stage.loadModel(CONFIG.modelUrl);
    stage.setCast(state.cast);
    stageReady = true;
    $('#stageLoading').hidden = true;
    renderOutput();
  } catch (e) {
    console.error(e);
    $('#stageLoading').innerHTML = `<span style="max-width:360px;text-align:center">Could not load the 3D stage. Serve this folder over http (not file://) and make sure <code>${esc(CONFIG.modelUrl)}</code> sits next to index.html.</span>`;
  }

  await backend.init(onAuthChange);
  if (!location.hash) location.hash = '#/studio';
  route();
}
boot();
