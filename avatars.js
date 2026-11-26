/* =====================================================================
   avatars.js — procedural cartoon avatars for Toonforge.
   ===================================================================== */

import * as THREE from 'three';

const D = Math.PI / 180;
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

const neutralPose = () => ({
  hips:      { x: 0, y: 0, z: 0, py: 0 },
  spine:     { x: 0, y: 0, z: 0 },
  head:      { x: 0, y: 0, z: 0 },
  shoulderL: { x: 0, y: 0, z: -12 * D },
  elbowL:    { x: 15 * D, y: 0, z: 0 },
  shoulderR: { x: 0, y: 0, z:  12 * D },
  elbowR:    { x: 15 * D, y: 0, z: 0 },
  hipL:      { x: 0, y: 0, z: -4 * D },
  kneeL:     { x: 4 * D, y: 0, z: 0 },
  hipR:      { x: 0, y: 0, z:  4 * D },
  kneeR:     { x: 4 * D, y: 0, z: 0 },
  footL:     { x: 0, y: 0, z: 0 },
  footR:     { x: 0, y: 0, z: 0 },
});

export function makeAvatar(member, toon) {
  const skin  = toon(new THREE.Color(member.skin));
  const hair  = toon(new THREE.Color(member.hair));
  const shirt = toon(new THREE.Color(member.color));
  const pants = toon(new THREE.Color(member.color).multiplyScalar(0.55));
  const shoe  = toon(0x1a1a1f);
  const eyeW  = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeB  = new THREE.MeshBasicMaterial({ color: 0x101015 });
  const mouthM = new THREE.MeshBasicMaterial({ color: 0x2a1012 });

  const female = member.gender === 'female';
  const H = member.height || 1.9;

  const footH     = 0.09;
  const hipY      = 0.52 * H;
  const kneeY     = 0.28 * H;
  const shoulderY = 0.78 * H;
  
  // Give them a proper neck and head placement
  const neckLen   = 0.08 * H;
  const headR     = 0.14 * H;
  const headY     = shoulderY + neckLen + (headR * 0.8);

  const torsoLen   = shoulderY - hipY;
  const shoulderW  = (female ? 0.18 : 0.22) * H;
  const hipW       = (female ? 0.19 : 0.17) * H;
  const armLen     = 0.28 * H;
  const thighLen   = hipY - kneeY;
  const shinLen    = kneeY - footH;

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);

  // Pelvis (rounded)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(hipW * 0.9, 16, 12), pants);
  pelvis.scale.set(1, 0.6, 0.7);
  pelvis.position.y = 0.02 * H;
  hips.add(pelvis);

  const spine = new THREE.Group();
  hips.add(spine);

  // Torso (tapered to look human, not boxy)
  const torsoGeo = new THREE.CylinderGeometry(shoulderW, hipW * 0.9, torsoLen, 16);
  const torso = new THREE.Mesh(torsoGeo, shirt);
  torso.position.y = torsoLen / 2;
  torso.scale.set(1, 1, 0.65); // Flatten front-to-back for a cartoon look
  spine.add(torso);

  // Collar / shoulder area
  const collar = new THREE.Mesh(new THREE.SphereGeometry(shoulderW, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), shirt);
  collar.scale.set(1, 0.5, 0.65);
  collar.position.y = torsoLen;
  spine.add(collar);

  // VISIBLE NECK
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * H, 0.055 * H, neckLen, 12), skin);
  neck.position.y = torsoLen + neckLen / 2;
  neck.scale.set(1, 1, 0.9);
  spine.add(neck);

  // Head
  const head = new THREE.Group();
  head.position.y = torsoLen + neckLen + (headR * 0.8);
  spine.add(head);

  // Skull (slightly egg-shaped)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), skin);
  skull.scale.set(0.95, 1.05, 0.95);
  head.add(skull);

  // Jaw / Chin
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.85, 16, 12), skin);
  jaw.scale.set(0.85, 0.6, 0.9);
  jaw.position.set(0, -headR * 0.4, headR * 0.1);
  head.add(jaw);

  // Face Features
  const eyeR = headR * 0.13;
  const eyeLm = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 10), eyeW);
  const eyeRm = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 10), eyeW);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.6, 10, 8), eyeB);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.6, 10, 8), eyeB);
  
  eyeLm.position.set(-headR * 0.35, headR * 0.1, headR * 0.85);
  eyeRm.position.set( headR * 0.35, headR * 0.1, headR * 0.85);
  pupilL.position.copy(eyeLm.position).add(new THREE.Vector3(0, 0, eyeR * 0.5));
  pupilR.position.copy(eyeRm.position).add(new THREE.Vector3(0, 0, eyeR * 0.5));
  head.add(eyeLm, eyeRm, pupilL, pupilR);

  // Brows
  const browGeo = new THREE.BoxGeometry(headR * 0.3, headR * 0.06, headR * 0.08);
  const browL = new THREE.Mesh(browGeo, hair);
  const browR = new THREE.Mesh(browGeo, hair);
  browL.position.set(-headR * 0.35, headR * 0.28, headR * 0.85);
  browR.position.set( headR * 0.35, headR * 0.28, headR * 0.85);
  head.add(browL, browR);

  // Mouth (flattened sphere we can scale)
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.15, 12, 8), mouthM);
  mouth.scale.set(1.4, 0.55, 0.3);
  mouth.position.set(0, -headR * 0.35, headR * 0.85);
  head.add(mouth);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.1, 8, 6), skin);
  nose.scale.set(1, 0.8, 1.2);
  nose.position.set(0, -headR * 0.05, headR * 0.95);
  head.add(nose);

  // Hair
  if (female) {
    const bob = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65), hair);
    bob.position.set(0, headR * 0.15, -headR * 0.05);
    bob.scale.set(1.05, 1, 1.05);
    head.add(bob);
    
    // Side locks
    const lockGeo = new THREE.CapsuleGeometry(headR * 0.15, headR * 0.8, 6, 8);
    const lockL = new THREE.Mesh(lockGeo, hair);
    const lockR = new THREE.Mesh(lockGeo, hair);
    lockL.position.set(-headR * 0.9, -headR * 0.2, -headR * 0.1);
    lockR.position.set( headR * 0.9, -headR * 0.2, -headR * 0.1);
    lockL.rotation.z = 5 * D; lockR.rotation.z = -5 * D;
    head.add(lockL, lockR);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
    cap.position.y = headR * 0.05;
    cap.scale.set(1, 1, 1.02);
    head.add(cap);
  }

  // Arms
  function makeArm(side) {
    const s = side === 'L' ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(s * shoulderW * 0.85, torsoLen - 0.02 * H, 0);
    spine.add(shoulder);

    // Upper arm
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * H, armLen * 0.55, 8, 12), shirt);
    upper.position.y = -armLen * 0.3;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -armLen * 0.55;
    shoulder.add(elbow);

    // Forearm
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * H, armLen * 0.5, 8, 12), skin);
    fore.position.y = -armLen * 0.28;
    elbow.add(fore);

    const hand = new THREE.Group();
    hand.position.y = -armLen * 0.55;
    elbow.add(hand);

    // Hand
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.055 * H, 12, 10), skin);
    palm.scale.set(0.9, 1.1, 0.6);
    hand.add(palm);

    return { shoulder, elbow, hand };
  }
  const armL = makeArm('L');
  const armR = makeArm('R');

  // Legs
  function makeLeg(side) {
    const s = side === 'L' ? -1 : 1;
    const hip = new THREE.Group();
    hip.position.set(s * hipW * 0.45, -0.02 * H, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.065 * H, thighLen * 0.9, 8, 12), pants);
    thigh.position.y = -thighLen * 0.5;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -thighLen;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055 * H, shinLen * 0.9, 8, 12), pants);
    shin.position.y = -shinLen * 0.5;
    knee.add(shin);

    const foot = new THREE.Group();
    foot.position.y = -shinLen;
    knee.add(foot);

    // Shoe
    const shoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1 * H, footH, 0.18 * H), shoe);
    shoeMesh.position.set(0, -footH / 2, 0.04 * H);
    // Round the shoe slightly
    shoeMesh.geometry.translate(0, 0, 0.02); 
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

export const CLIPS = {
  Idle: {
    loop: true, desc: 'standing alert',
    pose(t) {
      const p = neutralPose();
      const s = Math.sin(t * 1.5);
      p.spine.x = -3 * D + s * 1 * D;
      p.shoulderL.x = -10 * D; p.elbowL.x = 25 * D;
      p.shoulderR.x = -10 * D; p.elbowR.x = 25 * D;
      p.head.y = Math.sin(t * 0.5) * 6 * D;
      p.hips.py = s * 0.005;
      return { joints: p };
    },
  },
  Idle_Neutral: {
    loop: true, desc: 'relaxed standing',
    pose(t) {
      const p = neutralPose();
      const breathe = Math.sin(t * 1.8);
      p.hips.py = breathe * 0.01;
      p.spine.x = breathe * 1.5 * D;
      p.head.y = Math.sin(t * 0.8) * 8 * D;
      p.shoulderL.z = -12 * D - breathe * 2 * D;
      p.shoulderR.z =  12 * D + breathe * 2 * D;
      return { joints: p };
    },
  },
  Idle_Gun: {
    loop: true, desc: 'arms raised',
    pose(t) {
      const p = neutralPose();
      p.shoulderR.x = -95 * D; p.elbowR.x = 15 * D;
      p.shoulderL.x = -80 * D; p.elbowL.x = 35 * D; p.shoulderL.z = -30 * D;
      p.spine.y = -10 * D;
      p.head.y = 5 * D;
      p.hips.py = Math.sin(t * 1.5) * 0.005;
      return { joints: p };
    },
  },
  Idle_Gun_Pointing: {
    loop: true, desc: 'pointing',
    pose() {
      const p = neutralPose();
      p.shoulderR.x = -90 * D; p.elbowR.x = 5 * D;
      p.shoulderL.x = -45 * D; p.elbowL.x = 60 * D; p.shoulderL.z = -20 * D;
      return { joints: p };
    },
  },
  Idle_Sword: {
    loop: true, desc: 'sword stance',
    pose() {
      const p = neutralPose();
      p.shoulderR.x = -60 * D; p.elbowR.x = 45 * D; p.shoulderR.z = 30 * D;
      p.shoulderL.x = -30 * D; p.elbowL.x = 55 * D; p.shoulderL.z = -20 * D;
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
      p.hipL.x = s * 30 * D; p.kneeL.x = Math.max(0, -s) * 40 * D;
      p.hipR.x = -s * 30 * D; p.kneeR.x = Math.max(0, s) * 40 * D;
      p.shoulderL.x = -s * 25 * D; p.shoulderR.x = s * 25 * D;
      p.elbowL.x = 20 * D + Math.max(0, s) * 25 * D;
      p.elbowR.x = 20 * D + Math.max(0, -s) * 25 * D;
      p.hips.py = Math.abs(Math.cos(t * 6)) * 0.03;
      return { joints: p };
    },
  },
  Run: {
    loop: true, move: true, fwd: true, speed: 4.2, desc: 'running',
    pose(t) {
      const p = neutralPose();
      const s = Math.sin(t * 12);
      p.hipL.x = s * 50 * D; p.kneeL.x = Math.max(0, -s) * 65 * D;
      p.hipR.x = -s * 50 * D; p.kneeR.x = Math.max(0, s) * 65 * D;
      p.shoulderL.x = -s * 65 * D; p.elbowL.x = 80 * D;
      p.shoulderR.x = s * 65 * D; p.elbowR.x = 80 * D;
      p.spine.x = -15 * D;
      p.hips.py = 0.04;
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
      const w = t * 12;
      p.hipL.z = Math.sin(w) * 30 * D;
      p.hipR.z = Math.sin(w) * 30 * D;
      p.spine.z = Math.sin(w) * 8 * D;
      p.shoulderL.z = -25 * D; p.shoulderR.z = 25 * D;
      p.elbowL.x = 70 * D; p.elbowR.x = 70 * D;
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
    loop: true, move: true, fwd: true, speed: 4.0, desc: 'running and shooting',
    pose(t) {
      const p = CLIPS.Run.pose(t).joints;
      p.shoulderR.x = -95 * D; p.elbowR.x = 15 * D;
      p.shoulderL.x = -85 * D; p.elbowL.x = 25 * D; p.shoulderL.z = -30 * D;
      return { joints: p };
    },
  },
  Roll: {
    desc: 'dodge roll',
    pose(t, dur) {
      const p = neutralPose();
      const k = Math.min(1, t / (dur || 1));
      const crouch = Math.sin(k * Math.PI);
      p.hips.py = -crouch * 0.4;
      p.hipL.x = 80 * D * crouch; p.hipR.x = 80 * D * crouch;
      p.kneeL.x = 100 * D * crouch; p.kneeR.x = 100 * D * crouch;
      p.spine.x = 50 * D * crouch;
      p.shoulderL.x = -40 * D * crouch; p.shoulderR.x = -40 * D * crouch;
      p.head.x = -25 * D * crouch;
      return { joints: p };
    },
  },
  Punch_Left: {
    desc: 'left punch',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderL.x = -90 * D * s;
      p.elbowL.x = (1 - s) * 120 * D;
      p.spine.y = 25 * D * s;
      p.head.y = 12 * D * s;
      return { joints: p };
    },
  },
  Punch_Right: {
    desc: 'right punch',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderR.x = -90 * D * s;
      p.elbowR.x = (1 - s) * 120 * D;
      p.spine.y = -25 * D * s;
      p.head.y = -12 * D * s;
      return { joints: p };
    },
  },
  Kick_Left: {
    desc: 'left kick',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.hipL.x = -90 * D * s; p.kneeL.x = Math.max(0, (1 - s)) * 50 * D;
      p.spine.x = -20 * D * s;
      p.shoulderL.x = 35 * D * s; p.shoulderR.x = -25 * D * s;
      return { joints: p };
    },
  },
  Kick_Right: {
    desc: 'right kick',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.hipR.x = -90 * D * s; p.kneeR.x = Math.max(0, (1 - s)) * 50 * D;
      p.spine.x = -20 * D * s;
      p.shoulderR.x = 35 * D * s; p.shoulderL.x = -25 * D * s;
      return { joints: p };
    },
  },
  Sword_Slash: {
    desc: 'sword slash',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderR.x = -150 * D * s; p.elbowR.x = 25 * D;
      p.shoulderL.x = -70 * D * s;
      p.spine.y = -35 * D * s;
      p.head.y = -20 * D * s;
      return { joints: p };
    },
  },
  Gun_Shoot: {
    desc: 'shooting',
    pose(t) {
      const p = neutralPose();
      const recoil = Math.exp(-t * 10);
      p.shoulderR.x = -95 * D - recoil * 15 * D;
      p.elbowR.x = 15 * D;
      p.shoulderL.x = -85 * D; p.elbowL.x = 25 * D; p.shoulderL.z = -30 * D;
      return { joints: p };
    },
  },
  Idle_Gun_Shoot: {
    desc: 'shooting standing',
    pose(t) {
      const p = neutralPose();
      const recoil = Math.exp(-t * 10) * 15 * D;
      p.shoulderR.x = -95 * D + recoil; p.elbowR.x = 15 * D;
      p.shoulderL.x = -85 * D + recoil; p.elbowL.x = 25 * D; p.shoulderL.z = -30 * D;
      return { joints: p };
    },
  },
  HitRecieve: {
    desc: 'flinch',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.spine.x = 30 * D * s;
      p.head.x = 20 * D * s; p.head.y = -25 * D * s;
      p.shoulderL.x = 25 * D * s; p.shoulderR.x = 25 * D * s;
      p.hips.py = -0.08 * s;
      return { joints: p };
    },
  },
  HitRecieve_2: {
    desc: 'flinch 2',
    pose(t, dur) {
      const p = CLIPS.HitRecieve.pose(t, dur).joints;
      p.head.y = -p.head.y;
      return { joints: p };
    },
  },
  Death: {
    hold: true, desc: 'falls down',
    pose(t, dur) {
      const p = neutralPose();
      const s = smooth(Math.min(1, t / (dur || 1)));
      p.hips.py = -0.7 * s;
      p.hipL.x = 90 * D * s; p.hipR.x = 90 * D * s;
      p.kneeL.x = 100 * D * s; p.kneeR.x = 100 * D * s;
      p.spine.x = 90 * D * s;
      p.head.x = 30 * D * s;
      p.shoulderL.x = -70 * D * s; p.shoulderR.x = -70 * D * s;
      p.elbowL.x = 40 * D * s; p.elbowR.x = 40 * D * s;
      return { joints: p };
    },
  },
  Wave: {
    loop: true, desc: 'wave',
    pose(t) {
      const p = neutralPose();
      p.shoulderR.x = -170 * D; p.shoulderR.z = 25 * D;
      p.elbowR.x = 25 * D + Math.sin(t * 10) * 25 * D;
      p.head.y = 8 * D;
      p.head.z = 5 * D;
      return { joints: p, mouthOpen: 0.3 };
    },
  },
  Interact: {
    desc: 'interact',
    pose(t, dur) {
      const p = neutralPose();
      const s = Math.sin(Math.PI * Math.min(1, t / (dur || 1)));
      p.shoulderR.x = -80 * D * s; p.elbowR.x = 50 * D * s;
      p.spine.x = 20 * D * s;
      p.head.x = 15 * D * s;
      return { joints: p };
    },
  },
};

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