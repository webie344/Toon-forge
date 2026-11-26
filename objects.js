/* =====================================================================
   objects.js — pre-built object library for Toonforge.
   ===================================================================== */

import * as THREE from 'three';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const OBJECT_LIBRARY = {
  pizza: {
    aliases: ['pizza slice', 'slice of pizza', 'pepperoni pizza', 'pizza pie'],
    build: (toon) => {
      const g = new THREE.Group();
      const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24), toon(0xe0b070));
      crust.rotation.x = Math.PI / 2; g.add(crust);
      const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.02, 24), toon(0xc0392b));
      sauce.rotation.x = Math.PI / 2; sauce.position.z = 0.06; g.add(sauce);
      for (let i = 0; i < 6; i++) {
        const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10), toon(0x8b1a1a));
        pep.rotation.x = Math.PI / 2;
        pep.position.set(Math.cos(i * 1.05) * 0.5, Math.sin(i * 1.05) * 0.5, 0.08);
        g.add(pep);
      }
      return g;
    },
  },
  cake: {
    aliases: ['birthday cake', 'slice of cake', 'cupcake', 'cake slice'],
    build: (toon) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20), toon(0xf2c9a0));
      base.position.y = 0.25; g.add(base);
      const icing = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 20), toon(0xff9ec4));
      icing.position.y = 0.55; g.add(icing);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), toon(0xffffff));
      candle.position.y = 0.72; g.add(candle);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(0xffd040));
      flame.position.y = 0.88; g.add(flame);
      return g;
    },
  },
  burger: {
    aliases: ['hamburger', 'cheeseburger', 'sandwich'],
    build: (toon) => {
      const g = new THREE.Group();
      const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.18, 16), toon(0xd9a45a));
      bunBottom.position.y = 0.09; g.add(bunBottom);
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), toon(0x5a2e12));
      patty.position.y = 0.25; g.add(patty);
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.0), toon(0xffc83a));
      cheese.position.y = 0.33; g.add(cheese);
      const bunTop = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd9a45a));
      bunTop.position.y = 0.36; g.add(bunTop);
      return g;
    },
  },
  apple: {
    aliases: ['red apple', 'fruit apple'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12), toon(0xd83030));
      body.scale.set(1, 1.05, 1); body.position.y = 0.35; g.add(body);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5), toon(0x6a3a1a));
      stem.position.y = 0.75; g.add(stem);
      return g;
    },
  },
  banana: {
    aliases: ['banana fruit'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 6, 8), toon(0xf5d040));
      body.rotation.z = 0.6; body.position.y = 0.3; g.add(body);
      return g;
    },
  },
  donut: {
    aliases: ['doughnut', 'donought'],
    build: (toon) => {
      const g = new THREE.Group();
      const dough = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.15, 12, 20), toon(0xe0b070));
      dough.rotation.x = Math.PI / 2; dough.position.y = 0.15; g.add(dough);
      const glaze = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.14, 12, 20), toon(0xff7fc0));
      glaze.rotation.x = Math.PI / 2; glaze.position.y = 0.17; g.add(glaze);
      return g;
    },
  },
  coffee: {
    aliases: ['cup of coffee', 'mug', 'coffee cup', 'tea', 'cup of tea'],
    build: (toon) => {
      const g = new THREE.Group();
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 16, 1, true), toon(0xffffff));
      cup.position.y = 0.2; g.add(cup);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), toon(0xffffff));
      handle.rotation.y = Math.PI / 2; handle.position.set(0.25, 0.22, 0); g.add(handle);
      const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.05, 16), toon(0x3a1a0a));
      coffee.position.y = 0.4; g.add(coffee);
      return g;
    },
  },
  icecream: {
    aliases: ['ice cream', 'ice cream cone', 'sundae', 'gelato'],
    build: (toon) => {
      const g = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), toon(0xd9a45a));
      cone.position.y = 0.2; g.add(cone);
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), toon(0xfff0c0));
      scoop.position.y = 0.55; g.add(scoop);
      const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(0xd02020));
      cherry.position.y = 0.85; g.add(cherry);
      return g;
    },
  },
  sword: {
    aliases: ['blade', 'katana', 'longsword', 'broadsword', 'rapier'],
    build: (toon) => {
      const g = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.02), toon(0xdfe8f0));
      blade.position.y = 0.9; g.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.06), toon(0xd0a020));
      guard.position.y = 0.2; g.add(guard);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), toon(0x3a1a0a));
      grip.position.y = 0.03; g.add(grip);
      return g;
    },
  },
  axe: {
    aliases: ['battle axe', 'hatchet'],
    build: (toon) => {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), toon(0x5a3a1a));
      handle.position.y = 0.6; g.add(handle);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.08), toon(0x9aa0aa));
      head.position.set(0.18, 1.05, 0); g.add(head);
      return g;
    },
  },
  bow: {
    aliases: ['bow and arrow', 'longbow', 'archery bow'],
    build: (toon) => {
      const g = new THREE.Group();
      const curve = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 32, Math.PI), toon(0x6a3a1a));
      curve.rotation.z = Math.PI / 2; curve.position.y = 0.7; g.add(curve);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.2, 4), toon(0xf0e8d0));
      string.position.y = 0.7; g.add(string);
      return g;
    },
  },
  shield: {
    aliases: ['round shield', 'knight shield'],
    build: (toon) => {
      const g = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24), toon(0x3a6aa0));
      face.rotation.x = Math.PI / 2; face.position.y = 0.5; g.add(face);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), toon(0xd0a020));
      boss.position.y = 0.5; boss.position.z = 0.05; g.add(boss);
      return g;
    },
  },
  gun: {
    aliases: ['pistol', 'handgun', 'revolver', 'laser gun', 'blaster', 'ray gun'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.06), toon(0x2a2a30));
      body.position.y = 0.3; g.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), toon(0x1a1a20));
      barrel.rotation.z = Math.PI / 2; barrel.position.set(0.3, 0.3, 0); g.add(barrel);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.06), toon(0x1a1a20));
      grip.position.set(-0.08, 0.16, 0); g.add(grip);
      return g;
    },
  },
  wand: {
    aliases: ['magic wand', 'scepter', 'staff'],
    build: (toon) => {
      const g = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.0, 8), toon(0x3a2a1a));
      rod.position.y = 0.5; g.add(rod);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), toon(0x80e0ff));
      tip.position.y = 1.05; g.add(tip);
      return g;
    },
  },
  canoe: {
    aliases: ['boat', 'kayak', 'skiff', 'dugout', 'pirogue', 'rowboat', 'rowing boat'],
    build: (toon) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 2.0, 10, 14), toon(0x8b5a2b));
      hull.rotation.z = Math.PI / 2; hull.scale.set(1, 0.55, 1.3); hull.position.y = 0.3; g.add(hull);
      const seat1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.7), toon(0x5a3a1a));
      seat1.position.set(0.5, 0.5, 0); g.add(seat1);
      const seat2 = seat1.clone(); seat2.position.x = -0.5; g.add(seat2);
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), toon(0xa07040));
      oar.position.set(1.0, 0.4, 0); oar.rotation.z = 0.4; g.add(oar);
      return g;
    },
  },
  car: {
    aliases: ['automobile', 'sedan', 'vehicle'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.0), toon(0xc03030));
      body.position.y = 0.45; g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.9), toon(0xc03030));
      cabin.position.set(-0.2, 0.9, 0); g.add(cabin);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.9), toon(0x6ab0e0));
      glass.position.set(-0.2, 0.9, 0); glass.scale.set(1.02, 0.92, 0.92); g.add(glass);
      for (const [x, z] of [[-0.7, 0.5], [0.7, 0.5], [-0.7, -0.5], [0.7, -0.5]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12), toon(0x111118));
        wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 0.22, z); g.add(wheel);
      }
      return g;
    },
  },
  truck: {
    aliases: ['lorry', 'pickup', 'van'],
    build: (toon) => {
      const g = new THREE.Group();
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), toon(0x3a5a80));
      cab.position.set(1.0, 0.9, 0); g.add(cab);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.0), toon(0x3a5a80));
      bed.position.set(-0.6, 0.75, 0); g.add(bed);
      for (const [x, z] of [[-1.2, 0.5], [0.2, 0.5], [1.2, 0.5], [-1.2, -0.5], [0.2, -0.5], [1.2, -0.5]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.16, 12), toon(0x111118));
        w.rotation.x = Math.PI / 2; w.position.set(x, 0.25, z); g.add(w);
      }
      return g;
    },
  },
  bike: {
    aliases: ['bicycle', 'cycle', 'pushbike'],
    build: (toon) => {
      const g = new THREE.Group();
      for (const x of [-0.4, 0.4]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 20), toon(0x1a1a20));
        wheel.position.set(x, 0.3, 0); g.add(wheel);
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), toon(0xd04040));
      frame.position.y = 0.5; g.add(frame);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.12), toon(0x222222));
      seat.position.set(-0.2, 0.6, 0); g.add(seat);
      const bars = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), toon(0x1a1a20));
      bars.position.set(0.35, 0.62, 0); g.add(bars);
      return g;
    },
  },
  rocket: {
    aliases: ['spaceship', 'spacecraft', 'ship', 'starship', 'missile'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 14), toon(0xdfe8f0));
      body.position.y = 0.9; g.add(body);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 14), toon(0xd03030));
      nose.position.y = 1.95; g.add(nose);
      for (let i = 0; i < 3; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.05), toon(0xd03030));
        fin.position.set(Math.cos(i * 2.1) * 0.35, 0.3, Math.sin(i * 2.1) * 0.35);
        fin.rotation.y = -i * 2.1; g.add(fin);
      }
      return g;
    },
  },
  plane: {
    aliases: ['airplane', 'aeroplane', 'jet', 'aircraft'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.6, 8, 10), toon(0xe0e6f0));
      body.rotation.z = Math.PI / 2; body.position.y = 0.6; g.add(body);
      const wings = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2.4), toon(0xe0e6f0));
      wings.position.y = 0.6; g.add(wings);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.06), toon(0xe0e6f0));
      tail.position.set(-0.9, 0.8, 0); g.add(tail);
      return g;
    },
  },
  helicopter: {
    aliases: ['chopper', 'heli'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), toon(0x3a5a40));
      body.scale.set(1.4, 0.9, 0.9); body.position.y = 0.7; g.add(body);
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.1), toon(0x1a1a20));
      rotor.position.y = 1.15; g.add(rotor);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), toon(0x3a5a40));
      tail.position.set(-1.1, 0.7, 0); g.add(tail);
      return g;
    },
  },
  skateboard: {
    aliases: ['skate board', 'deck'],
    build: (toon) => {
      const g = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.3), toon(0x3a2a1a));
      deck.position.y = 0.2; g.add(deck);
      for (const x of [-0.4, 0.4]) for (const z of [-0.1, 0.1]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), toon(0xe0a020));
        w.rotation.x = Math.PI / 2; w.position.set(x, 0.12, z); g.add(w);
      }
      return g;
    },
  },
  hoverboard: {
    aliases: ['hover board', 'levitating board'],
    build: (toon) => {
      const g = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.9, 6, 10), toon(0x9a9ae0));
      deck.rotation.z = Math.PI / 2; deck.position.y = 0.15; g.add(deck);
      return g;
    },
  },
  tree: {
    aliases: ['oak', 'pine', 'fir', 'tree trunk'],
    build: (toon) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 8), toon(0x6b4a2f));
      trunk.position.y = 0.5; g.add(trunk);
      const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 10), toon(0x2f7a3a));
      leaf1.position.y = 1.4; g.add(leaf1);
      const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 10), toon(0x3f9448));
      leaf2.position.y = 2.0; g.add(leaf2);
      return g;
    },
  },
  bush: {
    aliases: ['shrub', 'hedge'],
    build: (toon) => {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), toon(0x3f9448));
        s.position.set((i - 1) * 0.35, 0.35, Math.sin(i) * 0.2); g.add(s);
      }
      return g;
    },
  },
  rock: {
    aliases: ['stone', 'boulder', 'pebble'],
    build: (toon) => {
      const g = new THREE.Group();
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5), toon(0x7b8088));
      r.scale.set(1, 0.7, 1); r.position.y = 0.3; g.add(r);
      return g;
    },
  },
  log: {
    aliases: ['fallen log', 'tree log'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8), toon(0x6b4a2f));
      body.rotation.z = Math.PI / 2; body.position.y = 0.22; g.add(body);
      return g;
    },
  },
  flower: {
    aliases: ['bloom', 'rose', 'tulip', 'daisy'],
    build: (toon) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), toon(0x3a8a3a));
      stem.position.y = 0.3; g.add(stem);
      const petals = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), toon(0xff5c8a));
      petals.position.y = 0.65; g.add(petals);
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), toon(0xffd040));
      center.position.y = 0.75; g.add(center);
      return g;
    },
  },
  cactus: {
    aliases: ['saguaro', 'desert cactus'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.2, 8), toon(0x3a8a3a));
      body.position.y = 0.6; g.add(body);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.5, 8), toon(0x3a8a3a));
      arm.position.set(0.3, 0.7, 0); arm.rotation.z = -Math.PI / 4; g.add(arm);
      return g;
    },
  },
  mushroom: {
    aliases: ['toadstool', 'shroom'],
    build: (toon) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8), toon(0xf0e8d0));
      stem.position.y = 0.15; g.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd02020));
      cap.position.y = 0.3; g.add(cap);
      return g;
    },
  },
  cloud: {
    aliases: ['fluffy cloud', 'cloud puff'],
    build: (toon) => {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.sin(i) * 0.1, 12, 10), toon(0xffffff));
        s.position.set((i - 1.5) * 0.4, 0.4 + Math.cos(i) * 0.1, 0); g.add(s);
      }
      return g;
    },
  },
  sun: {
    aliases: ['the sun', 'sunshine'],
    build: (toon) => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), toon(0xffd040));
      ball.position.y = 1.0; g.add(ball);
      for (let i = 0; i < 10; i++) {
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), toon(0xffd040));
        ray.position.set(Math.cos(i * 0.628) * 1.0, 1.0 + Math.sin(i * 0.628) * 1.0, 0);
        ray.rotation.z = i * 0.628; g.add(ray);
      }
      return g;
    },
  },
  moon: {
    aliases: ['crescent moon', 'the moon'],
    build: (toon) => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), toon(0xf0e8c0));
      ball.position.y = 1.0; g.add(ball);
      return g;
    },
  },
  star: {
    aliases: ['twinkle star', 'shooting star'],
    build: (toon) => {
      const g = new THREE.Group();
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), toon(0xffd040));
      s.position.y = 1.0; g.add(s);
      return g;
    },
  },
  chair: {
    aliases: ['seat', 'stool'],
    build: (toon) => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), toon(0x8b5a2b));
      seat.position.y = 0.45; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), toon(0x8b5a2b));
      back.position.set(0, 0.7, -0.22); g.add(back);
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), toon(0x6a3a1a));
        leg.position.set(x, 0.22, z); g.add(leg);
      }
      return g;
    },
  },
  table: {
    aliases: ['desk', 'dining table'],
    build: (toon) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.7), toon(0x8b5a2b));
      top.position.y = 0.65; g.add(top);
      for (const [x, z] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.06), toon(0x6a3a1a));
        leg.position.set(x, 0.32, z); g.add(leg);
      }
      return g;
    },
  },
  bed: {
    aliases: ['cot', 'mattress'],
    build: (toon) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.9), toon(0x6a3a1a));
      frame.position.y = 0.15; g.add(frame);
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.85), toon(0xf0f0f0));
      sheet.position.y = 0.35; g.add(sheet);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.6), toon(0xd0d8e0));
      pillow.position.set(-0.5, 0.47, 0); g.add(pillow);
      return g;
    },
  },
  sofa: {
    aliases: ['couch', 'settee'],
    build: (toon) => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.8), toon(0x804a3a));
      seat.position.y = 0.35; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), toon(0x804a3a));
      back.position.set(0, 0.7, -0.3); g.add(back);
      for (const x of [-0.7, 0.7]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.8), toon(0x70402f));
        arm.position.set(x, 0.55, 0); g.add(arm);
      }
      return g;
    },
  },
  lamp: {
    aliases: ['desk lamp', 'floor lamp', 'light'],
    build: (toon) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), toon(0x2a2a30));
      base.position.y = 0.03; g.add(base);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), toon(0x2a2a30));
      stem.position.y = 0.35; g.add(stem);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 12, 1, true), toon(0xffe0a0));
      shade.position.y = 0.75; g.add(shade);
      return g;
    },
  },
  door: {
    aliases: ['doorway', 'wooden door'],
    build: (toon) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.08), toon(0x6a3a1a));
      frame.position.y = 1.0; g.add(frame);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.85, 0.02), toon(0x8b5a2b));
      panel.position.set(0, 1.0, 0.05); g.add(panel);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon(0xd0a020));
      knob.position.set(0.3, 0.95, 0.09); g.add(knob);
      return g;
    },
  },
  window: {
    aliases: ['glass window', 'pane'],
    build: (toon) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.05), toon(0xffffff));
      frame.position.y = 1.5; g.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.08, 0.02), toon(0x6ab0e0));
      glass.position.set(0, 1.5, 0.03); g.add(glass);
      return g;
    },
  },
  bookshelf: {
    aliases: ['bookcase', 'shelf', 'bookshelves'],
    build: (toon) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.3), toon(0x6a3a1a));
      frame.position.y = 0.8; g.add(frame);
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 5; i++) {
          const book = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.2),
            toon([0xd03030, 0x3a80d0, 0x30a050, 0xe0a020, 0xa030a0][i]));
          book.position.set(-0.4 + i * 0.16, 0.25 + row * 0.5, 0.02); g.add(book);
        }
      }
      return g;
    },
  },
  phone: {
    aliases: ['mobile', 'cell phone', 'smartphone', 'iphone', 'android'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.05), toon(0x1a1a20));
      body.position.y = 0.9; g.add(body);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.01), toon(0x6ab0e0));
      screen.position.set(0, 0.9, 0.03); g.add(screen);
      return g;
    },
  },
  laptop: {
    aliases: ['notebook computer', 'computer'],
    build: (toon) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.4), toon(0x2a2a30));
      base.position.y = 0.02; g.add(base);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.02), toon(0x1a1a20));
      screen.position.set(0, 0.22, -0.18); screen.rotation.x = -0.2; g.add(screen);
      return g;
    },
  },
  tv: {
    aliases: ['television', 'flat screen', 'monitor'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.08), toon(0x1a1a20));
      body.position.y = 0.9; g.add(body);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.01), toon(0x2a3a5a));
      screen.position.set(0, 0.9, 0.05); g.add(screen);
      return g;
    },
  },
  radio: {
    aliases: ['boombox', 'hifi', 'stereo'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.2), toon(0x3a3a40));
      body.position.y = 0.5; g.add(body);
      for (const x of [-0.25, 0.25]) {
        const spk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), toon(0x1a1a20));
        spk.rotation.x = Math.PI / 2; spk.position.set(x, 0.5, 0.1); g.add(spk);
      }
      return g;
    },
  },
  camera: {
    aliases: ['photo camera', 'dslr', 'point and shoot'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.2), toon(0x1a1a20));
      body.position.y = 0.75; g.add(body);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 16), toon(0x0a0a10));
      lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.75, 0.15); g.add(lens);
      return g;
    },
  },
  controller: {
    aliases: ['gamepad', 'joystick', 'game controller'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.18), toon(0x3a3a40));
      body.position.y = 0.5; g.add(body);
      for (const x of [-0.08, 0.08]) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), toon(0x1a1a20));
        stick.position.set(x, 0.56, 0.09); g.add(stick);
      }
      return g;
    },
  },
  drone: {
    aliases: ['quadcopter', 'uav'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), toon(0x2a2a30));
      body.position.y = 1.0; g.add(body);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.04), toon(0x1a1a20));
        arm.position.set(Math.cos(a) * 0.15, 1.0, Math.sin(a) * 0.15); arm.rotation.y = a; g.add(arm);
        const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 12), toon(0x6a6a70));
        rotor.position.set(Math.cos(a) * 0.3, 1.03, Math.sin(a) * 0.3); g.add(rotor);
      }
      return g;
    },
  },
  robot: {
    aliases: ['android', 'droid', 'bot'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), toon(0xc0c0c8));
      body.position.y = 0.7; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.3), toon(0xc0c0c8));
      head.position.y = 1.2; g.add(head);
      for (const x of [-0.1, 0.1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), toon(0xff3030));
        eye.position.set(x, 1.2, 0.16); g.add(eye);
      }
      return g;
    },
  },
  ball: {
    aliases: ['soccer ball', 'football', 'beach ball', 'sphere ball', 'play ball'],
    build: (toon) => {
      const g = new THREE.Group();
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), toon(0xffffff));
      s.position.y = 0.3; g.add(s);
      return g;
    },
  },
  bat: {
    aliases: ['baseball bat', 'cricket bat', 'club'],
    build: (toon) => {
      const g = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.8, 10), toon(0xc0a060));
      barrel.position.y = 0.5; barrel.rotation.z = -0.4; g.add(barrel);
      return g;
    },
  },
  racket: {
    aliases: ['tennis racket', 'badminton racket', 'paddle'],
    build: (toon) => {
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 20), toon(0x2a2a30));
      head.position.y = 0.7; g.add(head);
      const strings = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16), toon(0xf0f0f0));
      strings.position.y = 0.7; g.add(strings);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), toon(0x2a2a30));
      handle.position.y = 0.3; g.add(handle);
      return g;
    },
  },
  goalpost: {
    aliases: ['goal post', 'soccer goal', 'football goal'],
    build: (toon) => {
      const g = new THREE.Group();
      for (const x of [-0.7, 0.7]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), toon(0xffffff));
        post.position.set(x, 0.8, 0); g.add(post);
      }
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), toon(0xffffff));
      cross.rotation.z = Math.PI / 2; cross.position.y = 1.6; g.add(cross);
      return g;
    },
  },
  hoop: {
    aliases: ['basketball hoop', 'basket', 'basketball ring'],
    build: (toon) => {
      const g = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 20), toon(0xd04020));
      rim.rotation.x = Math.PI / 2; rim.position.y = 2.2; g.add(rim);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), toon(0xf0f0f0));
      board.position.set(0, 2.3, -0.3); g.add(board);
      return g;
    },
  },
  weights: {
    aliases: ['dumbbell', 'barbell', 'gym weights', 'dumbbells'],
    build: (toon) => {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), toon(0x2a2a30));
      bar.rotation.z = Math.PI / 2; bar.position.y = 0.4; g.add(bar);
      for (const x of [-0.38, 0.38]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), toon(0x1a1a20));
        w.rotation.z = Math.PI / 2; w.position.set(x, 0.4, 0); g.add(w);
      }
      return g;
    },
  },
  chest: {
    aliases: ['treasure chest', 'treasure', 'box of gold'],
    build: (toon) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), toon(0x6a3a1a));
      base.position.y = 0.2; g.add(base);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.7, 12, 1, false, 0, Math.PI), toon(0x8b5a2b));
      lid.rotation.z = Math.PI / 2; lid.position.y = 0.4; g.add(lid);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.02), toon(0xd0a020));
      lock.position.set(0, 0.35, 0.26); g.add(lock);
      return g;
    },
  },
  potion: {
    aliases: ['bottle', 'vial', 'magic potion', 'elixir'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toon(0xa030a0));
      body.position.y = 0.2; g.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8), toon(0xa030a0));
      neck.position.y = 0.38; g.add(neck);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8), toon(0xd0a020));
      cork.position.y = 0.48; g.add(cork);
      return g;
    },
  },
  crystal: {
    aliases: ['gem', 'diamond', 'jewel'],
    build: (toon) => {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), toon(0x60d0ff));
      c.position.y = 0.6; g.add(c);
      return g;
    },
  },
  portal: {
    aliases: ['magic portal', 'gateway', 'dimensional portal'],
    build: (toon) => {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.1, 12, 32), toon(0xa040ff));
      ring.position.y = 1.2; g.add(ring);
      const inside = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), toon(0x401080));
      inside.position.y = 1.2; inside.position.z = -0.02; g.add(inside);
      return g;
    },
  },
  egg: {
    aliases: ['dragon egg', 'mystery egg', 'big egg'],
    build: (toon) => {
      const g = new THREE.Group();
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), toon(0xf0e0c0));
      e.scale.set(1, 1.3, 1); e.position.y = 0.3; g.add(e);
      return g;
    },
  },
  guitar: {
    aliases: ['acoustic guitar', 'electric guitar'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12), toon(0xc05020));
      body.scale.set(1, 1.2, 0.4); body.position.y = 0.6; g.add(body);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.05), toon(0x3a1a0a));
      neck.position.y = 1.3; g.add(neck);
      return g;
    },
  },
  drum: {
    aliases: ['snare drum', 'bass drum', 'drum kit'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 20), toon(0xd04020));
      body.position.y = 0.3; g.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.02, 20), toon(0xf0e0c0));
      top.position.y = 0.48; g.add(top);
      return g;
    },
  },
  piano: {
    aliases: ['keyboard', 'grand piano', 'upright piano'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.4), toon(0x1a1a20));
      body.position.y = 0.7; g.add(body);
      for (let i = 0; i < 12; i++) {
        const k = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.2), toon(i % 7 === 2 || i % 7 === 6 ? 0x000000 : 0xffffff));
        k.position.set(-0.5 + i * 0.09, 0.79, 0.05); g.add(k);
      }
      return g;
    },
  },
  trumpet: {
    aliases: ['horn', 'brass instrument'],
    build: (toon) => {
      const g = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), toon(0xd0a020));
      tube.rotation.z = Math.PI / 2; tube.position.y = 0.8; g.add(tube);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 16, 1, true), toon(0xd0a020));
      bell.rotation.z = -Math.PI / 2; bell.position.set(0.4, 0.8, 0); g.add(bell);
      return g;
    },
  },
  microphone: {
    aliases: ['mic', 'stand mic'],
    build: (toon) => {
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), toon(0x2a2a30));
      head.position.y = 1.4; g.add(head);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6), toon(0x2a2a30));
      stand.position.y = 0.7; g.add(stand);
      return g;
    },
  },
  bucket: {
    aliases: ['pail', 'water bucket'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 16, 1, true), toon(0x3a80d0));
      body.position.y = 0.18; g.add(body);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 16, Math.PI), toon(0x1a1a20));
      handle.position.y = 0.36; g.add(handle);
      return g;
    },
  },
  broom: {
    aliases: ['sweeping brush'],
    build: (toon) => {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), toon(0x8b5a2b));
      handle.position.y = 0.8; g.add(handle);
      const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 12), toon(0xc0a060));
      bristles.position.y = 0.2; bristles.rotation.x = Math.PI; g.add(bristles);
      return g;
    },
  },
  cup: {
    aliases: ['glass', 'tumbler'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.25, 14, 1, true), toon(0xc0e8ff));
      body.position.y = 0.15; g.add(body);
      return g;
    },
  },
  plate: {
    aliases: ['dish', 'dinner plate'],
    build: (toon) => {
      const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.03, 24), toon(0xf0f0f0));
      p.position.y = 0.02; g.add(p);
      return g;
    },
  },
  key: {
    aliases: ['keys', 'door key'],
    build: (toon) => {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), toon(0xd0a020));
      shaft.rotation.z = Math.PI / 2; shaft.position.y = 0.5; g.add(shaft);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), toon(0xd0a020));
      ring.position.set(-0.2, 0.5, 0); g.add(ring);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.02), toon(0xd0a020));
      tooth.position.set(0.2, 0.45, 0); g.add(tooth);
      return g;
    },
  },
  clock: {
    aliases: ['wall clock', 'alarm clock', 'timepiece'],
    build: (toon) => {
      const g = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), toon(0xf0f0f0));
      face.rotation.x = Math.PI / 2; face.position.y = 1.3; g.add(face);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.01), toon(0x101015));
      h.position.set(0, 1.35, 0.05); g.add(h);
      return g;
    },
  },
  backpack: {
    aliases: ['bag', 'rucksack', 'school bag'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.25), toon(0xc03030));
      body.position.y = 0.5; g.add(body);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 16, Math.PI), toon(0x1a1a20));
      strap.position.set(0, 0.7, -0.05); strap.rotation.x = Math.PI / 2; g.add(strap);
      return g;
    },
  },
  umbrella: {
    aliases: ['rain umbrella', 'parasol'],
    build: (toon) => {
      const g = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), toon(0x2a2a30));
      stick.position.y = 0.6; g.add(stick);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.35, 12), toon(0xd03030));
      canopy.position.y = 1.2; g.add(canopy);
      return g;
    },
  },
  toolbox: {
    aliases: ['tool box', 'tool chest'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), toon(0xd04020));
      body.position.y = 0.13; g.add(body);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI), toon(0x1a1a20));
      handle.position.y = 0.28; g.add(handle);
      return g;
    },
  },
  book: {
    aliases: ['novel', 'textbook', 'notebook'],
    build: (toon) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.1), toon(0x3a80d0));
      b.position.y = 0.35; g.add(b);
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.64, 0.08), toon(0xf0e8d0));
      pages.position.set(0, 0.35, 0.01); g.add(pages);
      return g;
    },
  },
  pencil: {
    aliases: ['pen', 'writing implement'],
    build: (toon) => {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), toon(0xf0c020));
      shaft.rotation.z = Math.PI / 2; shaft.position.y = 0.6; g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 6), toon(0x1a1a20));
      tip.rotation.z = -Math.PI / 2; tip.position.set(-0.34, 0.6, 0); g.add(tip);
      return g;
    },
  },
  paper: {
    aliases: ['sheet of paper', 'document', 'page'],
    build: (toon) => {
      const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.7), toon(0xffffff));
      p.position.y = 0.01; g.add(p);
      return g;
    },
  },
  whiteboard: {
    aliases: ['marker board', 'blackboard', 'chalkboard'],
    build: (toon) => {
      const g = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.05), toon(0xf0f0f0));
      board.position.y = 2.0; g.add(board);
      return g;
    },
  },
  stapler: {
    aliases: ['stapler tool'],
    build: (toon) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.12), toon(0x2a2a30));
      body.position.y = 0.55; g.add(body);
      return g;
    },
  },
  folder: {
    aliases: ['file folder', 'binder'],
    build: (toon) => {
      const g = new THREE.Group();
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.4), toon(0xe0a020));
      f.position.y = 0.05; g.add(f);
      return g;
    },
  },
  balloon: {
    aliases: ['party balloon', 'helium balloon'],
    build: (toon) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), toon(0xd03030));
      b.scale.set(1, 1.2, 1); b.position.y = 1.0; g.add(b);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), toon(0xa02020));
      knot.position.y = 0.7; knot.rotation.x = Math.PI; g.add(knot);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 4), toon(0xf0f0f0));
      string.position.y = 0.4; g.add(string);
      return g;
    },
  },
  kite: {
    aliases: ['flying kite'],
    build: (toon) => {
      const g = new THREE.Group();
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), toon(0xff5050));
      diamond.scale.set(1, 1.4, 0.1); diamond.position.y = 1.2; g.add(diamond);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.02), toon(0xff5050));
      tail.position.y = 0.6; g.add(tail);
      return g;
    },
  },
  flag: {
    aliases: ['banner', 'pennant'],
    build: (toon) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), toon(0x8b8b90));
      pole.position.y = 0.75; g.add(pole);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.02), toon(0xd03030));
      cloth.position.set(0.32, 1.2, 0); g.add(cloth);
      return g;
    },
  },
  sign: {
    aliases: ['signpost', 'sign board', 'road sign'],
    build: (toon) => {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), toon(0x6a3a1a));
      post.position.y = 0.5; g.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.04), toon(0xf0e8c0));
      board.position.y = 1.15; g.add(board);
      return g;
    },
  },
  barrel: {
    aliases: ['keg', 'cask'],
    build: (toon) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 14), toon(0x8b5a2b));
      b.position.y = 0.4; g.add(b);
      for (const y of [0.15, 0.4, 0.65]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.02, 8, 20), toon(0x3a1a0a));
        ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
      }
      return g;
    },
  },
  rope: {
    aliases: ['cord', 'line rope'],
    build: (toon) => {
      const g = new THREE.Group();
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 24), toon(0xc0a060));
      r.rotation.x = Math.PI / 2; r.position.y = 0.05; g.add(r);
      return g;
    },
  },
  ladder: {
    aliases: ['step ladder'],
    build: (toon) => {
      const g = new THREE.Group();
      for (const x of [-0.2, 0.2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.04), toon(0x8b5a2b));
        rail.position.set(x, 0.8, 0); g.add(rail);
      }
      for (let i = 0; i < 5; i++) {
        const rung = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), toon(0x6a3a1a));
        rung.position.y = 0.2 + i * 0.3; g.add(rung);
      }
      return g;
    },
  },
  mirror: {
    aliases: ['looking glass', 'hand mirror'],
    build: (toon) => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), toon(0xd0a020));
      frame.rotation.x = Math.PI / 2; frame.position.y = 1.5; g.add(frame);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.01, 24), toon(0xa0d0ff));
      glass.rotation.x = Math.PI / 2; glass.position.set(0, 1.5, 0.03); g.add(glass);
      return g;
    },
  },
};

const ALIAS_INDEX = new Map();
for (const [key, def] of Object.entries(OBJECT_LIBRARY)) {
  ALIAS_INDEX.set(norm(key), key);
  for (const a of def.aliases || []) ALIAS_INDEX.set(norm(a), key);
}

export function resolveObject(name) {
  const n = norm(name);
  if (!n) return null;
  if (ALIAS_INDEX.has(n)) return ALIAS_INDEX.get(n);
  for (const [alias, key] of ALIAS_INDEX) {
    if (n.includes(alias) || alias.includes(n)) return key;
  }
  return null;
}

export function buildObject(name, toon, fallbackColor = 0x888888) {
  const key = resolveObject(name);
  if (key) {
    const g = OBJECT_LIBRARY[key].build(toon);
    g.userData.resolved = key;
    return g;
  }
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), toon(fallbackColor));
  box.position.y = 0.25; g.add(box);
  g.userData.resolved = null;
  g.userData.requested = name;
  return g;
}

export const OBJECT_NAMES = Object.keys(OBJECT_LIBRARY);