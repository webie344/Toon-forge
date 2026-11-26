/* =====================================================================
   avatars.js — procedural cartoon avatars for Toonforge.
   ===================================================================== */

import * as THREE from 'three';

/* ---------------------------------------------------------------------
   Coordinate system:
     +Y up, +Z forward (facing direction), feet at y = 0.
     height is member.height (metres, ~1.85–2.0).
   ===================================================================== */

const D = Math.PI / 180;

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

const neutralPose = () => ({
  hips:      { x: 0, y: 0, z: 0, py: 0 },
  spine:     { x: 0, y: 0, z: 0 },
  head:      { x: 0, y: 0, z: 0 },
  shoulderL: { x: 0, y: 0, z: -8 * D },
  elbowL:    { x: 10 * D, y: 0, z: 0 },
  shoulderR: { x: 0, y: 0, z:  8 * D },
  elbowR:    { x: 10 * D, y: 0, z: 0 },
  hipL:      { x: 0, y: 0, z: -3 * D },
  kneeL:     { x: 3 * D, y: 0, z: 0 },
  hipR:      { x: 0, y: 0, z:  3 * D },
  kneeR:     { x: 3 * D, y: 0, z: 0 },
  footL:     { x: 0, y: 0, z: 0 },
  footR:     { x: 0, y: 0, z: 0 },
});

/* =====================================================================
   makeAvatar — build a character out of primitives
   ===================================================================== */
export function makeAvatar(member, toon) {
  const skin  = toon(new THREE.Color(member.skin));
  const hair  = toon(new THREE.Color(member.hair));
  const shirt = toon(new THREE.Color(member.color));
  const pants = toon(new THREE.Color(member.color).multiplyScalar(0.55));
  const shoe  = toon(0x1a1a1f);
  const eyeW  = toon(0xffffff);
  const eyeB  = new THREE.MeshBasicMaterial({ color: 0x101015 });
  const mouthM = new THREE.MeshBasicMaterial({ color: 0x2a1012 });

  const female = member.gender === 'female';
  const H = member.height || 1.9;

  const footH     = 0.09;
  const hipY      = 0.55 * H;
  const kneeY     = 0.30 * H;
  const shoulderY = 0.82 * H;
  const headR     = 0.13 * H;

  const torsoLen   = shoulderY - hipY;
  const shoulderW  = (female ? 0.20 : 0.24) * H;
  const hipW       = (female ? 0.20 : 0.18) * H;
  const armLen     = 0.28 * H;
  const thighLen   = hipY - kneeY;
  const shinLen    = kneeY - footH;

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(hipW, 0.14 * H, 0.18 * H), pants);
  pelvis.position.y = 0.02 * H;
  hips.add(pelvis);

  const spine = new THREE.Group();
  hips.add(spine);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(shoulderW, torsoLen, 0.19 * H), shirt);
  torso.position.y = torsoLen / 2 + 0.02 * H;
  spine.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.98, 0.035 * H, 0.20 * H), toon(0x2a2a2e));
  belt.position.y = 0.08 * H;
  spine.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * H, 0.05 * H, 0.06 * H, 8), skin);
  neck.position.y = torsoLen + 0.03 * H;
  spine.add(neck);

  const head = new THREE.Group();
  head.position.y = torsoLen + 0.06 * H;
  spine.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), skin);
  skull.scale.set(1, 1.08, 1.02);
  head.add(skull);

  const eyeR = headR * 0.14;
  const eyeLm = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 10), eyeW);
  const eyeRm = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 10), eyeW);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 10, 8), eyeB);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 10, 8), eyeB);
  eyeLm.position.set(-headR * 0.34, headR * 0.10, headR * 0.92);
  eyeRm.position.set( headR * 0.34, headR * 0.10, headR * 0.92);
  pupilL.position.copy(eyeLm.position).add(new THREE.Vector3(0, 0, eyeR * 0.55));
  pupilR.position.copy(eyeRm.position).add(new THREE.Vector3(0, 0, eyeR * 0.55));
  head.add(eyeLm, eyeRm, pupilL, pupilR);

  const browGeo = new THREE.BoxGeometry(headR * 0.28, headR * 0.05, headR * 0.08);
  const browL = new THREE.Mesh(browGeo, hair);
  const browR = new THREE.Mesh(browGeo, hair);
  browL.position.set(-headR * 0.34, headR * 0.28, headR * 0.90);
  browR.position.set( headR * 0.34, headR * 0.28, headR * 0.90);
  head.add(browL, browR);

  const mouth = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 12, 8), mouthM);
  mouth.scale.set(1.6, 0.55, 0.4);
  mouth.position.set(0, -headR * 0.30, headR * 0.94);
  head.add(mouth);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.08, 8, 6), skin);
  nose.position.set(0, -headR * 0.02, headR * 1.02);
  head.add(nose);

  if (female) {
    const bob = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.06, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.7),
      hair
    );
    bob.position.set(0, headR * 0.18, -headR * 0.12);
    head.add(bob);
    const lockGeo = new THREE.BoxGeometry(headR * 0.22, headR * 0.9, headR * 0.22);
    const lockL = new THREE.Mesh(lockGeo, hair);
    const lockR = new THREE.Mesh(lockGeo, hair);
    lockL.position.set(-headR * 0.92, -headR * 0.15, -headR * 0.15);
    lockR.position.set( headR * 0.92, -headR * 0.15, -headR * 0.15);
    head.add(lockL, lockR);
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.03, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hair
    );
    cap.position.y = headR * 0.05;
    head.add(cap);
  }

  function makeArm(side) {
    const s = side === 'L' ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(s * shoulderW * 0.55, torsoLen - 0.02 * H, 0);
    spine.add(shoulder);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * H, armLen * 0.55, 6, 8), shirt);
    upper.position.y = -armLen * 0.30;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -armLen * 0.55;
    shoulder.add(elbow);

    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * H, armLen * 0.50, 6, 8), skin);
    fore.position.y = -armLen * 0.28;
    elbow.add(fore);

    const hand = new THREE.Group();
    hand.position.y = -armLen * 0.55;
    elbow.add(hand);

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.055 * H, 10, 8), skin);
    palm.scale.set(1, 0.85, 0.65);
    hand.add(palm);

    return { shoulder, elbow, hand };
  }
  const armL = makeArm('L');
  const armR = makeArm('R');

  function makeLeg(side) {
    const s = side === 'L' ? -1 : 1;
    const hip = new THREE.Group();
    hip.position.set(s * hipW * 0.42, 0, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06 * H, thighLen * 0.9, 6, 8), pants);
    thigh.position.y = -thighLen * 0.5;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -thighLen;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * H, shinLen * 0.9, 6, 8), pants);
    shin.position.y = -shinLen * 0.5;
    knee.add(shin);

    const foot = new THREE.Group();
    foot.position.y = -shinLen;
    knee.add(foot);

    const shoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09 * H, footH, 0.16 * H), shoe);
    shoeMesh.position.set(0, -footH / 2, 0.03 * H);
    foot.add(shoeMesh);

    return { hip, knee, foot };
  }
  const legL = makeLeg('L');
  const legR = makeLeg('R');

  root.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return {
    root, hips, spine, head,
    shoulderL: armL.shoulder, elbowL: armL.elbow, handL: armL.hand,
    shoulderR: armR.shoulder, elbowR: armR.elbow, handR: armR.hand,
    hipL: legL.hip, kneeL: legL.knee, footL: legL.foot,
    hipR: legR.hip, kneeR: legR.knee, footR: legR.foot,
    mouth, browL, browR,
    height: H,
  };
}

/* =====================================================================
   applyPose
   ===================================================================== */
export function applyPose(avatar, pose) {
  if (!pose) return;
  const J = pose.joints || pose;

  const set = (obj, x, y, z) => obj.rotation.set(x || 0, y || 0, z || 0);

  if (J.hips) {
    set(avatar.hips, J.hips.x, J.hips.y, J.hips.z);
    avatar.hips.position.y = (avatar.hipsBaseY || (avatar.hipsBaseY = avatar.hips.position.y)) + (J.hips.py || 0);
  }
  if (J.spine) set(avatar.spine, J.spine.x, J.spine.y, J.spine.z);
  if (J.head)  set(avatar.head,  J.head.x,  J.head.y,  J.head.z);

  if (J.shoulderL) set(avatar.shoulderL, J.shoulderL.x, J.shoulderL.y, J.shoulderL.z);
  if (J.elbowL)    set(avatar.elbowL,    J.elbowL.x,    J.elbowL.y,    J.elbowL.z);
  if (J.shoulderR) set(avatar.shoulderR, J.shoulderR.x, J.shoulderR.y, J.shoulderR.z);
  if (J.elbowR)    set(avatar.elbowR,    J.elbowR.x,    J.elbowR.y,    J.elbowR.z);

  if (J.hipL)  set(avatar.hipL,  J.hipL.x,  J.hipL.y,  J.hipL.z);
  if (J.kneeL) set(avatar.kneeL, J.kneeL.x, J.kneeL.y, J.kneeL.z);
  if (J.hipR)  set(avatar.hipR,  J.hipR.x,  J.hipR.y,  J.hipR.z);
  if (J.kneeR) set(avatar.kneeR, J.kneeR.x, J.kneeR.y, J.kneeR.z);
  if (J.footL) set(avatar.footL, J.footL.x, J.footL.y, J.footL.z);
  if (J.footR) set(avatar.footR, J.footR.x, J.footR.y, J.footR.z);

  const targetMouth = 0.55 + (pose.mouthOpen ?? 0) * 0.85;
  avatar.mouth.scale.y = lerp(avatar.mouth.scale.y, targetMouth, 0.4);
  const targetBrow = (pose.brow ?? 0) * 0.04 * (avatar.height * 0.13);
  avatar.browL.position.y = lerp(avatar.browL.position.y, avatar.browBaseL ?? (avatar.browBaseL = avatar.browL.position.y) + targetBrow, 0.4);
  avatar.browR.position.y = lerp(avatar.browR.position.y, avatar.browBaseR ?? (avatar.browBaseR = avatar.browR.position.y) + targetBrow, 0.4);
}

/* =====================================================================
   CLIPS — pure pose functions
   ===================================================================== */
export const CLIPS = {
  Idle: {
    loop: true, desc: 'standing alert',
    pose() {
      const p = neutralPose();
      p.spine.x = -2 * D;
      p.shoulderL.x = -10 * D; p.elbowL.x = 20 * D;
      p.shoulderR.x = -10 * D; p.elbowR.x = 20 * D;
      return { joints: p };
    },
  },
  Idle_Neutral: {
    loop: true, desc: 'relaxed standing, best for talking',
    pose(t) {
      const p = neutralPose();
      const breathe = Math.sin(t * 1.6) * 0.5 + 0.5;
      p.hips.py = Math.sin(t * 1.6) * 0.008;
      p.spine.x = Math.sin(t * 1.6) * 0.01;
      p.head.y = Math.sin(t * 0.7) * 5 * D;
      p.shoulderL.z = -8 * D - 2 * D * breathe;
      p.shoulderR.z =  8 * D + 2 * D * breathe;
      return { joints: p };
    },
  },
  Idle_Gun: {
    loop: true, desc: 'arms raised as if holding a gun',
    pose() {
      const p = neutralPose();
      p.shoulderR.x = -95 * D; p.elbowR.x = 10 * D;
      p.shoulderL.x = -80 * D; p.elbowL.x = 30 * D; p.shoulderL.z = -30 * D;
      p.spine.y = -8 * D;
      return { joints: p };
    },
  },
  Idle_Gun_Pointing: {
    loop: true, desc: 'pointing forward with arms raised',
    pose() {
      const p = neutralPose();
      p.shoulderR.x = -90 * D; p.elbowR.x = 0;
      p.shoulderL.x = -45 * D; p.elbowL.x = 60 * D; p.shoulderL.z = -20 * D;
      return { joints: p };
    },
  },
  Idle_Sword: {
    loop: true, desc: 'sword-ready stance',
    pose() {
      const p = neutralPose();
      p.shoulderR.x = -60 * D; p.elbowR.x = 40 * D; p.shoulderR.z = 30 * D;
      p.shoulderL.x = -30 * D; p.elbowL.x = 50 * D; p.shoulderL.z = -20 * D;
      p.hipR.x = -10 * D; p.kneeR.x = 10 * D;
      p.spine.y = 15 * D;
      return { joints: p };
    },
  },
  Walk: {
    loop: true, move: true, fwd: true, speed: 1.5, desc: 'walking',
    pose(t) {
      const p = neutralPose();
      const s = Math.sin(t * 6);
      p.hipL.x = s * 25 * D; p.kneeL.x = Math.max(0, -s) * 35 * D;
      p.hipR.x = -s * 25 * D; p.kneeR.x = Math.max(0, s) * 35 * D;
      p.shoulderL.x = -s * 20 * D; p.shoulderR.x = s * 20 * D;
      p.elbowL.x = 15 * D + Math.max(0, s) * 20 * D;
      p.elbowR.x = 15 * D + Math.max(0, -s) * 20 * D;
      p.hips.py = Math.abs(Math.cos(t * 6)) * 0.02;
      return { joints: p };
    },
  },
  Run: {
    loop: true, move: true, fwd: true, speed: 4.2, desc: 'running',
    pose(t) {
      const p = neutralPose();
      const s = Math.sin(t * 11);
      p.hipL.x = s * 45 * D; p.kneeL.x = Math.max(0, -s) * 55 * D;
      p.hipR.x = -s * 45 * D; p.kneeR.x = Math.max(0, s) * 55 * D;
      p.shoulderL.x = -s * 55 * D; p.elbowL.x = 70 * D;
      p.shoulderR.x = s * 55 * D; p.elbowR.x = 70 * D;
      p.spine.x = -10 * D;
      p.hips.py = 0.02;
      return { joints: p };
    },
  },
  Run_Back: {
    loop: true, move: true, speed: 2.6, desc: 'backing away',
    pose(t) {
      const p = CLIPS.Run.pose(t).joints;
      p.hipL.x = -p.hipL.x; p.hipR.x = -p.hipR.x;
      return { joints: p };
    },
  },
  Run_Left: {
    loop: true, move: true, speed: 3.6, desc: 'strafing left',
    pose(t) {
      const p = neutralPose();
      const w = t * 10;
      p.hipL.z = Math.sin(w) * 25 * D;
      p.hipR.z = Math.sin(w) * 25 * D;
      p.spine.z = Math.sin(w) * 6 * D;
      p.shoulderL.z = -20 * D; p.shoulderR.z = 20 * D;
      p.elbowL.x = 60 * D; p.elbowR.x = 60 * D;
      return { joints: p };
    },
  },
  Run_Right: {
    loop: true, move: true, speed: 3.6, desc: 'strafing right',
    pose(t) {
      const p = CLIPS.Run_Left.pose(t).joints;
      p.hipL.z = -p.hipL.z; p.hipR.z = -p.hipR.z; p.spine.z = -p.spine.z;
      return { joints: p };
    },
  },
  Run_Shoot: {
    loop: true, move: true, fwd: true, speed: 4.0, desc: 'running while shooting',
    pose(t) {
      const p = CLIPS.Run.pose(t).joints;
      p.shoulderR.x = -95 * D; p.elbowR.x = 10 * D;
      p.shoulderL.x = -85 * D; p.elbowL.x = 20 * D; p.shoulderL.z = -30 * D;
      return { joints: p };
    },
  },
  Roll: {
    desc: 'dodge roll',
    pose(t, dur) {
      const p = neutralPose();
      const k = Math.min(1, t / (dur || 1));
      const crouch = Math.sin(k * Math.PI);
      p.hips.py = -crouch * 0.35;
      p.hipL.x = 70 * D * crouch; p.hipR.x = 70 * D * crouch;
      p.kneeL.x = 90 * D * crouch; p.kneeR.x = 90 * D * crouch;
      p.spine.x = 45 * D * crouch;
      p.shoulderL.x = -30 * D; p.shoulderR.x = -30 * D;
      p.head.x = -20 * D * crouch;
      return { joints: p };
    },
  },
  Punch_Left: {
    desc: 'left punch',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderL.x = -80 * D * s;
      p.elbowL.x = (1 - s) * 100 * D;
      p.spine.y = 20 * D * s;
      p.head.y = 10 * D * s;
      return { joints: p };
    },
  },
  Punch_Right: {
    desc: 'right punch',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderR.x = -80 * D * s;
      p.elbowR.x = (1 - s) * 100 * D;
      p.spine.y = -20 * D * s;
      p.head.y = -10 * D * s;
      return { joints: p };
    },
  },
  Kick_Left: {
    desc: 'left kick',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.hipL.x = -80 * D * s; p.kneeL.x = Math.max(0, (1 - s)) * 40 * D;
      p.spine.x = -15 * D * s;
      p.shoulderL.x = 30 * D * s; p.shoulderR.x = -20 * D * s;
      return { joints: p };
    },
  },
  Kick_Right: {
    desc: 'right kick',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.hipR.x = -80 * D * s; p.kneeR.x = Math.max(0, (1 - s)) * 40 * D;
      p.spine.x = -15 * D * s;
      p.shoulderR.x = 30 * D * s; p.shoulderL.x = -20 * D * s;
      return { joints: p };
    },
  },
  Sword_Slash: {
    desc: 'sword slash',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderR.x = -140 * D * s; p.elbowR.x = 20 * D;
      p.shoulderL.x = -60 * D * s;
      p.spine.y = -30 * D * s;
      p.head.y = -15 * D * s;
      return { joints: p };
    },
  },
  Gun_Shoot: {
    desc: 'shooting a gun',
    pose(t) {
      const p = neutralPose();
      const recoil = Math.exp(-t * 8);
      p.shoulderR.x = -90 * D - recoil * 10 * D;
      p.elbowR.x = 10 * D;
      p.shoulderL.x = -80 * D; p.elbowL.x = 25 * D; p.shoulderL.z = -30 * D;
      return { joints: p };
    },
  },
  Idle_Gun_Shoot: {
    desc: 'shooting from a standing gun pose',
    pose(t) {
      const p = neutralPose();
      const recoil = Math.exp(-t * 8) * 10 * D;
      p.shoulderR.x = -95 * D + recoil; p.elbowR.x = 15 * D;
      p.shoulderL.x = -85 * D + recoil; p.elbowL.x = 25 * D; p.shoulderL.z = -30 * D;
      return { joints: p };
    },
  },
  HitRecieve: {
    desc: 'flinching from being hit',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.spine.x = 25 * D * s;
      p.head.x = 15 * D * s; p.head.y = -20 * D * s;
      p.shoulderL.x = 20 * D * s; p.shoulderR.x = 20 * D * s;
      p.hips.py = -0.05 * s;
      return { joints: p };
    },
  },
  HitRecieve_2: {
    desc: 'a different flinch',
    pose(t, dur) {
      const p = CLIPS.HitRecieve.pose(t, dur).joints;
      p.head.y = -p.head.y;
      return { joints: p };
    },
  },
  Death: {
    hold: true, desc: 'falls to the ground and stays down',
    pose(t, dur) {
      const p = neutralPose();
      const s = smooth(Math.min(1, t / (dur || 1)));
      p.hips.py = -0.65 * s;
      p.hipL.x = 80 * D * s; p.hipR.x = 80 * D * s;
      p.kneeL.x = 90 * D * s; p.kneeR.x = 90 * D * s;
      p.spine.x = 80 * D * s;
      p.head.x = 20 * D * s;
      p.shoulderL.x = -60 * D * s; p.shoulderR.x = -60 * D * s;
      p.elbowL.x = 30 * D * s; p.elbowR.x = 30 * D * s;
      return { joints: p };
    },
  },
  Wave: {
    loop: true, desc: 'friendly wave',
    pose(t) {
      const p = neutralPose();
      p.shoulderR.x = -160 * D; p.shoulderR.z = 20 * D;
      p.elbowR.x = 20 * D + Math.sin(t * 8) * 20 * D;
      p.head.y = 5 * D;
      return { joints: p, mouthOpen: 0.3 };
    },
  },
  Interact: {
    desc: 'pressing or using something',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderR.x = -70 * D * s; p.elbowR.x = 40 * D * s;
      p.spine.x = 15 * D * s;
      p.head.x = 10 * D * s;
      return { joints: p };
    },
  },
};

/* ---- alias lookup ---- */
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const CLIP_LOOKUP = Object.fromEntries(Object.keys(CLIPS).map((k) => [norm(k), k]));
export function resolveClip(name) {
  const n = norm(name);
  if (CLIP_LOOKUP[n]) return CLIP_LOOKUP[n];
  for (const [alias, key] of Object.entries(CLIP_LOOKUP)) {
    if (n.includes(alias) || alias.includes(n)) return key;
  }
  return null;
}
export const CLIP_NAMES = Object.keys(CLIPS);