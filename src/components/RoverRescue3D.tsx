import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, ChevronsUp, Flag, Gauge, Octagon, ShieldCheck, Timer, Zap } from 'lucide-react';
import { ROVER_RESCUE_BONUS, useGameStore } from '../store/useGameStore';
import type { MissionDifficulty } from '../types/game';
import { tr } from '../i18n/core';
import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import { playErrorBuzz, playPickup, playSuccess } from '../utils/soundEffects';

/**
 * Minijuego 3D final (solo en partidas ganadas): Leo, Vega y el tercer cadete conducen el rover por el
 * Cráter Jezero hasta el Cohete de Retorno a la Tierra (ERV-1), donde les espera el equipo de rescate. 100 % procedural (sin modelos externos).
 * - Se abre tras las viñetas 'rescue_intro' y, al llegar, el store abre la viñeta 'rescue_complete' → GameOverScreen.
 * - Solo teclado (W/S acelerar-frenar, A/D girar, o flechas). No se puede saltar.
 * - Chocar con una roca frena el rover 1,5 s y baja su integridad. Rescate fallido si la integridad llega al 0 %
 *   o si no se llega en 60 s: sin bonus, pero la partida sigue siendo una victoria (ya se sobrevivió a todos los Soles).
 * - Balizas verdes: impulso de velocidad y +1 punto de ciencia.
 * - Dificultad según el modo de la partida (ROVER_TUNING).
 */

const TOTAL_DISTANCE = 800; // metros (1 unidad = 1 m)
const HIT_SLOW_SECONDS = 1.5;
const BOOST_SECONDS = 1.5;
const INTRO_SECONDS = 2.6;
const ARRIVAL_SECONDS = 1.8; // cinemática de llegada / fallo antes de la viñeta final
/** Tiempo máximo para llegar al cohete de retorno (s). Sin prisas el rover tarda ~25-30 s, así que hay margen de sobra. */
const RESCUE_TIME_LIMIT = 60;

/** Solo en desarrollo: #qa-rover-timeout (límite de 6 s) y #qa-rover-crash (el primer choque destruye el rover). */
function devRoverOverrides(): { timeLimit?: number; oneHitDestroys?: boolean } {
  if (!import.meta.env.DEV) return {};
  const h = window.location.hash;
  if (h === '#qa-rover-timeout') return { timeLimit: 6 };
  if (h === '#qa-rover-crash') return { oneHitDestroys: true };
  return {};
}
const ROAD_LIMIT = 6;
const CHUNK_W = 150;
const CHUNK_L = 200;
const STOP_GAP = 16; // el rover se detiene a esta distancia de la cúpula

/** Ajustes de conducción por modo: el Explorador (7 años) es claramente más fácil que el Comandante. */
interface DriveTuning {
  cruise: number; // velocidad sin tocar nada (m/s)
  max: number; // con W / flecha arriba
  brake: number; // con S / flecha abajo
  boost: number; // tras pasar por una baliza
  slow: number; // tras chocar
  rowGap: [number, number]; // separación entre filas de rocas (m)
  doubleChance: number; // probabilidad de 2 rocas en la misma fila
  beaconChance: number;
  steer: number; // velocidad lateral
  hitDamage: number; // % de integridad por choque
  hitbox: number; // margen de choque (negativo = más permisivo)
}
const ROVER_TUNING: Record<MissionDifficulty, DriveTuning> = {
  explorer: { cruise: 28, max: 42, brake: 10, boost: 50, slow: 12, rowGap: [36, 48], doubleChance: 0.08, beaconChance: 0.6, steer: 15, hitDamage: 8, hitbox: -0.3 },
  commander: { cruise: 34, max: 52, brake: 10, boost: 60, slow: 12, rowGap: [22, 31], doubleChance: 0.4, beaconChance: 0.35, steer: 12.5, hitDamage: 12, hitbox: 0 },
};

type Stage = 'waiting' | 'intro' | 'drive' | 'arrived' | 'destroyed' | 'timeout';
type RoverStatus = 'ready' | 'cruise' | 'fast' | 'brake' | 'boost' | 'hit' | 'arrived' | 'destroyed' | 'timeout';

interface Hud {
  remaining: number;
  elapsed: number;
  timeLeft: number;
  status: RoverStatus;
  beacons: number;
  countdown: number;
  integrity: number;
}

const CREW_COLORS = { leo: '#f97316', vega: '#22c55e', third: '#3b82f6' } as const;

// ------------------------------------------------------------
// Terreno: función de altura periódica en z (los tramos encajan sin costuras)
// ------------------------------------------------------------
const TAU = Math.PI * 2;
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function terrainHeight(x: number, z: number): number {
  const pz = (z / CHUNK_L) * TAU;
  const ax = Math.abs(x);
  const bumps = 0.12 * Math.sin(x * 1.3 + pz * 9) * Math.cos(pz * 14 + x * 0.7);
  const dunes = 1.6 * Math.sin(x * 0.09 + pz * 2) + 0.9 * Math.cos(x * 0.17 - pz * 3);
  const walls = smoothstep(10, 55, ax) * (16 + 6 * Math.sin(pz * 4 + x * 0.05) + 4 * Math.cos(pz * 7 - x * 0.11));
  const ridges = smoothstep(14, 40, ax) * 1.8 * Math.sin(x * 0.6 + pz * 5) * Math.cos(x * 0.33 + pz * 6);
  const side = smoothstep(7.5, 16, ax);
  return bumps + side * dunes + walls + ridges;
}

function buildTerrainGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(CHUNK_W, CHUNK_L, 90, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const low = new THREE.Color('#c2643a');
  const high = new THREE.Color('#7b3220');
  const dust = new THREE.Color('#d98a5a');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const k = Math.min(1, Math.max(0, h / 20));
    c.copy(low).lerp(high, k);
    const speck = 0.5 + 0.5 * Math.sin(x * 3.1 + Math.sin((z / CHUNK_L) * TAU * 23) * 4);
    c.lerp(dust, speck * 0.18 * (1 - k));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// ------------------------------------------------------------
// Rover de rescate con 3 astronautas
// ------------------------------------------------------------
interface RoverParts {
  group: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Mesh[];
  struts: THREE.Mesh[];
  leds: THREE.MeshStandardMaterial;
}

function buildAstronaut(stripe: string): THREE.Group {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.32, 6, 12), suit);
  torso.position.y = 0.32;
  torso.castShadow = true;
  g.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.18), new THREE.MeshStandardMaterial({ color: '#dcdcd8', roughness: 0.7 }));
  pack.position.set(0, 0.38, 0.24);
  g.add(pack);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16), new THREE.MeshStandardMaterial({ color: stripe, roughness: 0.5 }));
  band.position.y = 0.44;
  g.add(band);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }));
  helmet.position.y = 0.82;
  helmet.castShadow = true;
  g.add(helmet);
  // Visor dorado: casquete frontal (el rover mira hacia -z)
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.265, 20, 14, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.28, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: '#e0a526', metalness: 0.95, roughness: 0.18, emissive: '#5a3a00', emissiveIntensity: 0.35 }),
  );
  visor.rotation.y = Math.PI; // casquete hacia delante
  visor.position.y = 0.82;
  g.add(visor);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), suit);
    arm.position.set(side * 0.3, 0.36, -0.12);
    arm.rotation.x = -0.9;
    g.add(arm);
  }
  return g;
}

function buildRover(scene: THREE.Scene): RoverParts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const white = new THREE.MeshStandardMaterial({ color: '#f7f7f4', roughness: 0.45, metalness: 0.05, emissive: '#3a3d46', emissiveIntensity: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d4a12a', roughness: 0.3, metalness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.7, metalness: 0.3 });
  const tire = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.9 });
  const blue = new THREE.MeshStandardMaterial({ color: '#0B3D91', roughness: 0.5 });
  const leds = new THREE.MeshStandardMaterial({ color: '#e8fbff', emissive: '#9be7ff', emissiveIntensity: 2.2 });

  // Chasis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.42, 4.2), white);
  chassis.position.y = 0.98;
  chassis.castShadow = true;
  body.add(chassis);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 3.8), gold);
  belly.position.y = 0.68;
  body.add(belly);
  // Paneles laterales de aislante térmico dorado
  for (const side of [-1, 1]) {
    const foil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 3.6), gold);
    foil.position.set(side * 1.28, 0.98, 0);
    body.add(foil);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 3.0), blue);
    stripe.position.set(side * 1.29, 1.16, 0);
    body.add(stripe);
  }
  // Cabina abierta: muretes bajos + arco antivuelco
  const wallMat = white;
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.38, 0.12), wallMat);
  frontWall.position.set(0, 1.38, -1.55);
  body.add(frontWall);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.4), dark);
  dash.position.set(0, 1.5, -1.35);
  dash.rotation.x = -0.4;
  body.add(dash);
  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 3.2), wallMat);
    sideWall.position.set(side * 1.2, 1.32, 0);
    body.add(sideWall);
  }
  const rollBar = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 8, 24, Math.PI), dark);
  rollBar.position.set(0, 1.2, 0.15);
  body.add(rollBar);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 3.0), dark);
  floor.position.set(0, 1.21, 0.05);
  body.add(floor);

  // 3 ocupantes: la Comandante Elena (franja roja) y dos ingenieros (franja azul)
  const crew: Array<[number, number, string]> = [
    [-0.55, -0.55, CREW_COLORS.leo],
    [0.55, -0.55, CREW_COLORS.vega],
    [0, 0.8, CREW_COLORS.third],
  ];
  for (const [x, z, stripe] of crew) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.12), dark);
    seat.position.set(x, 1.5, z + 0.32);
    body.add(seat);
    const a = buildAstronaut(stripe);
    a.position.set(x, 1.22, z);
    body.add(a);
  }

  // Mastcam frontal con luces LED
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 10), white);
  mast.position.set(0.95, 1.8, -1.75);
  body.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.26), white);
  head.position.set(0.95, 2.45, -1.78);
  body.add(head);
  for (const dx of [-0.11, 0.11]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), dark);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0.95 + dx, 2.45, -1.93);
    body.add(lens);
  }
  // Barra de LEDs frontal
  const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.06), leds);
  ledBar.position.set(0, 1.06, -2.13);
  body.add(ledBar);
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14), leds);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(side * 0.85, 1.32, -1.63);
    body.add(lamp);
    const spot = new THREE.SpotLight('#dff6ff', 30, 45, 0.5, 0.45, 1.4);
    spot.position.set(side * 0.85, 1.4, -1.8);
    spot.target.position.set(side * 0.6, 0, -16);
    body.add(spot);
    body.add(spot.target);
  }

  // Antena parabólica trasera
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8), white);
  pole.position.set(-1.0, 1.65, 1.85);
  body.add(pole);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 10, 0, TAU, 0, Math.PI * 0.32),
    new THREE.MeshStandardMaterial({ color: '#f7f7f4', roughness: 0.35, side: THREE.DoubleSide }),
  );
  dish.position.set(-1.0, 2.35, 1.85);
  dish.rotation.x = Math.PI + 0.6;
  body.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), dark);
  feed.position.set(-1.0, 2.2, 1.73);
  feed.rotation.x = 0.6;
  body.add(feed);
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12), dark);
  rtg.rotation.x = Math.PI / 2 - 0.5;
  rtg.position.set(0.5, 1.25, 2.3);
  body.add(rtg);

  // 6 ruedas con suspensión (rocker-bogie simplificada)
  const wheels: THREE.Mesh[] = [];
  const struts: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.42, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.45, 10);
  hubGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of [-1.5, 0, 1.5]) {
      const w = new THREE.Mesh(wheelGeo, tire);
      w.position.set(side * 1.5, 0.48, z);
      w.castShadow = true;
      const hub = new THREE.Mesh(hubGeo, gold);
      w.add(hub);
      // Tacos de la rueda (para que se note el giro)
      for (let k = 0; k < 6; k++) {
        const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.16), dark);
        const a = (k / 6) * TAU;
        cleat.position.set(0, Math.cos(a) * 0.48, Math.sin(a) * 0.48);
        cleat.rotation.x = -a;
        w.add(cleat);
      }
      group.add(w);
      wheels.push(w);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), dark);
      strut.position.set(side * 1.36, 0.75, z);
      group.add(strut);
      struts.push(strut);
    }
    const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.3), dark);
    rocker.position.set(side * 1.36, 0.98, 0);
    body.add(rocker);
  }

  scene.add(group);
  return { group, body, wheels, struts, leds };
}

// ------------------------------------------------------------
// Cohete de Retorno a la Tierra (ERV-1) vertical en su plataforma de lanzamiento, con torre de servicio,
// rampa de embarque iluminada mirando al rover (+z) y haz de luz cian visible desde lejos
// ------------------------------------------------------------
function buildBase(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f5f6f8', roughness: 0.35, emissive: '#3a4a60', emissiveIntensity: 0.22 });
  const grey = new THREE.MeshStandardMaterial({ color: '#8a929e', roughness: 0.7, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a3140', roughness: 0.6, metalness: 0.4 });
  const blue = new THREE.MeshStandardMaterial({ color: '#0B3D91', roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: '#FC3D21', roughness: 0.4 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#e6f9ff', emissive: '#22d3ee', emissiveIntensity: 1.4 });
  const cyan = new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 1.2 });

  // Plataforma de lanzamiento con borde amarillo de seguridad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, 1.4, 40), grey);
  pad.position.y = 0.7;
  pad.receiveShadow = true;
  g.add(pad);
  const padRing = new THREE.Mesh(
    new THREE.CylinderGeometry(11.05, 11.05, 0.3, 40),
    new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#a16207', emissiveIntensity: 0.4 }),
  );
  padRing.position.y = 1.35;
  g.add(padRing);

  // Cohete vertical
  const rocket = new THREE.Group();
  rocket.position.y = 1.4;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 2.6, 24, 1, true), dark);
  bell.position.y = 1.9;
  rocket.add(bell);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 24, 32), white);
  body.position.y = 15.2;
  body.castShadow = true;
  rocket.add(body);
  const bands: [number, THREE.Material][] = [
    [5.2, blue],
    [6.0, red],
    [21.5, blue],
  ];
  for (const [y, mat] of bands) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.65, 0.6, 32), mat);
    band.position.y = y;
    rocket.add(band);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 32), white);
  nose.position.y = 30.7;
  nose.castShadow = true;
  rocket.add(nose);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 20), red);
  tip.position.y = 33.4;
  rocket.add(tip);
  // 4 aletas (en diagonal, para no tapar la escotilla)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6, 3.4), red);
    fin.position.set(Math.sin(a) * 3.6, 5, Math.cos(a) * 3.6);
    fin.rotation.y = a;
    rocket.add(fin);
  }
  // Ojos de buey de la cápsula
  for (const y of [24, 26.4]) {
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 20), glowMat);
    win.rotation.x = Math.PI / 2;
    win.position.set(0, y, 2.62);
    rocket.add(win);
  }
  // Escotilla abierta e iluminada (mira al rover)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.3), glowMat);
  hatch.position.set(0, 9.5, 2.62);
  rocket.add(hatch);
  g.add(rocket);

  // Rampa de embarque desde el suelo hasta la escotilla
  const rampTop = new THREE.Vector3(0, 10, 2.8);
  const rampBottom = new THREE.Vector3(0, 1.4, 11.5);
  const rampLen = rampTop.distanceTo(rampBottom);
  const rampMid = rampTop.clone().add(rampBottom).multiplyScalar(0.5);
  const tilt = Math.atan2(rampTop.y - rampBottom.y, rampBottom.z - rampTop.z);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, rampLen), grey);
  ramp.position.copy(rampMid);
  ramp.rotation.x = tilt;
  g.add(ramp);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, rampLen), cyan);
    rail.position.set(side * 1.15, rampMid.y + 0.8, rampMid.z);
    rail.rotation.x = tilt;
    g.add(rail);
  }

  // Torre de servicio a un lado (estructura roja con plataformas y brazos)
  const tower = new THREE.Group();
  tower.position.set(-8, 1.4, -1);
  const posts: [number, number][] = [
    [-1.2, -1.2],
    [1.2, -1.2],
    [-1.2, 1.2],
    [1.2, 1.2],
  ];
  for (const [x, z] of posts) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 32, 0.35), red);
    post.position.set(x, 16, z);
    tower.add(post);
  }
  for (let y = 2; y < 32; y += 3) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.8), dark);
    deck.position.y = y;
    tower.add(deck);
  }
  for (const y of [12, 26]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 0.8), grey);
    arm.position.set(3.4, y, 0);
    tower.add(arm);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff5a3c' }));
  beacon.position.y = 32.6;
  tower.add(beacon);
  g.add(tower);

  // Haz vertical cian visible desde muy lejos (ignora la niebla), por encima de la punta del cohete
  const beamMat = new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.45, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 320, 20, 1, true), beamMat);
  beam.position.y = 195;
  g.add(beam);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 320, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ecfeff', transparent: true, opacity: 0.8, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  core.position.y = 195;
  g.add(core);
  const glow = new THREE.PointLight('#67e8f9', 60, 60, 1.5);
  glow.position.set(0, 10, 12);
  g.add(glow);
  scene.add(g);
  return g;
}

// ------------------------------------------------------------
// Componente
// ------------------------------------------------------------
export default function RoverRescue3D() {
  useAriaScreenReady();
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef({ left: false, right: false, up: false, down: false });
  const finishedRef = useRef(false);
  const beaconsRef = useRef(0);
  // Mientras las viñetas del rescate estén abiertas, el rover espera (la carrera empieza al cerrarlas)
  const storyOpen = useGameStore((s) => s.storyScene !== null);
  const storyOpenRef = useRef(storyOpen);
  storyOpenRef.current = storyOpen;
  const [hud, setHud] = useState<Hud>({ remaining: TOTAL_DISTANCE, elapsed: 0, timeLeft: RESCUE_TIME_LIMIT, status: 'ready', beacons: 0, countdown: 3, integrity: 100 });
  const [stage, setStage] = useState<Stage>('waiting');
  const [webglFailed, setWebglFailed] = useState(false);

  /** Llegada al cohete de retorno: el store suma la ciencia (una sola vez) y abre la viñeta "Rescate completado". */
  const complete = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    useGameStore.getState().completeRoverRescue(beaconsRef.current);
  };
  /** Rover destruido o tiempo agotado: rescate fallido (sin bonus) → viñeta → pantalla final. */
  const fail = (reason: 'destroyed' | 'timeout') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    useGameStore.getState().failRoverRescue(reason);
  };

  useEffect(() => {
    // Se dice al cerrar las viñetas de introducción (la historia retiene la voz del juego)
    useGameStore
      .getState()
      .ariaSay(
        tr(
          '¡Al volante, cadetes! Tenéis 60 segundos para llegar al Cohete de Retorno que os llevará a la Tierra. El rover solo avanza mientras mantienes pulsado ACELERAR o la tecla W. Frena con S y gira con las flechas o con A y D. Si chocáis con muchas rocas, el rover se averiará.',
          'At the wheel, cadets! You have 60 seconds to reach the Return Rocket that will take you back to Earth. The rover only moves while you hold GO or the W key. Brake with S and steer with the arrows or A and D. Hit too many rocks and the rover will break down.',
        ),
      );
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const dev = devRoverOverrides();
    const tuning = ROVER_TUNING[useGameStore.getState().missionDifficulty] ?? ROVER_TUNING.explorer;
    const timeLimit = dev.timeLimit ?? RESCUE_TIME_LIMIT;
    mount.dataset.roverDifficulty = useGameStore.getState().missionDifficulty;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const scene = new THREE.Scene();
    const horizon = new THREE.Color('#b8683f');
    scene.background = horizon;
    scene.fog = new THREE.FogExp2(horizon.getHex(), 0.0062);

    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 1600);

    // Cielo: degradado polvo marciano -> noche estrellada
    const skyGeo = new THREE.SphereGeometry(1200, 32, 16);
    const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
    const top = new THREE.Color('#1b1030');
    const mid = new THREE.Color('#6b2f2a');
    const tmp = new THREE.Color();
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
      const y = skyGeo.attributes.position.getY(i) / 1200;
      if (y < 0.05) tmp.copy(horizon);
      else if (y < 0.3) tmp.copy(horizon).lerp(mid, (y - 0.05) / 0.25);
      else tmp.copy(mid).lerp(top, Math.min(1, (y - 0.3) / 0.5));
      skyColors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    scene.add(sky);

    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * TAU;
      const phi = Math.acos(0.25 + Math.random() * 0.75);
      starPos.set([Math.sin(phi) * Math.cos(theta) * 1100, Math.cos(phi) * 1100, Math.sin(phi) * Math.sin(theta) * 1100], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffe9d6', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false }));
    scene.add(stars);

    // Luces: sol bajo y cálido + rebote del suelo rojizo
    scene.add(new THREE.HemisphereLight('#ffd9b8', '#5a2616', 0.9));
    const sun = new THREE.DirectionalLight('#ffb27a', 2.4);
    sun.position.set(-30, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -12;
    sc.right = 12;
    sc.top = 12;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 120;
    scene.add(sun);
    scene.add(sun.target);

    // Terreno: 2 tramos que se reciclan
    const terrainGeo = buildTerrainGeometry();
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    const chunks: THREE.Mesh[] = [0, 1].map((i) => {
      const m = new THREE.Mesh(terrainGeo, terrainMat);
      m.position.z = -i * CHUNK_L;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    });

    const rover = buildRover(scene);
    const base = buildBase(scene);

    // Rocas poliédricas (reutilizadas)
    const rockGeos = [0.7, 1.0, 1.3].map((r) => new THREE.DodecahedronGeometry(r, 0));
    const rockMats = ['#8a3b22', '#6e2f1d', '#a14a2a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
    interface Rock { mesh: THREE.Mesh; r: number; active: boolean; hit: boolean }
    const rocks: Rock[] = [];
    for (let i = 0; i < 26; i++) {
      const gi = i % 3;
      const mesh = new THREE.Mesh(rockGeos[gi], rockMats[i % rockMats.length]);
      mesh.castShadow = true;
      mesh.visible = false;
      scene.add(mesh);
      rocks.push({ mesh, r: [0.7, 1.0, 1.3][gi], active: false, hit: false });
    }
    // Rocas decorativas en los márgenes (no chocan)
    const decoRocks: THREE.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(rockGeos[i % 3], rockMats[(i + 1) % 3]);
      const side = i % 2 ? 1 : -1;
      mesh.position.set(side * (9 + Math.random() * 14), 0, -Math.random() * CHUNK_L * 2 + 20);
      mesh.position.y = terrainHeight(mesh.position.x, mesh.position.z) + 0.2;
      mesh.scale.setScalar(0.8 + Math.random() * 1.6);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      scene.add(mesh);
      decoRocks.push(mesh);
    }

    // Balizas verdes de impulso
    interface Beacon { group: THREE.Group; ring: THREE.Mesh; active: boolean }
    const beaconPad = new THREE.CylinderGeometry(1.3, 1.5, 0.12, 24);
    const beaconRing = new THREE.TorusGeometry(1.0, 0.09, 8, 28);
    const beaconPadMat = new THREE.MeshStandardMaterial({ color: '#166534', emissive: '#22c55e', emissiveIntensity: 1.2 });
    const beaconRingMat = new THREE.MeshBasicMaterial({ color: '#86efac', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const beaconArrowMat = new THREE.MeshBasicMaterial({ color: '#dcfce7' });
    const arrowGeo = new THREE.ConeGeometry(0.35, 0.6, 3);
    arrowGeo.rotateX(-Math.PI / 2);
    const beacons: Beacon[] = [];
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const pad = new THREE.Mesh(beaconPad, beaconPadMat);
      pad.position.y = 0.08;
      group.add(pad);
      const ring = new THREE.Mesh(beaconRing, beaconRingMat);
      ring.position.y = 1.2;
      group.add(ring);
      const arrow = new THREE.Mesh(arrowGeo, beaconArrowMat);
      arrow.position.y = 0.25;
      group.add(arrow);
      group.visible = false;
      scene.add(group);
      beacons.push({ group, ring, active: false });
    }

    // Chispas de choque
    const SPARKS = 90;
    const sparkPos = new Float32Array(SPARKS * 3);
    const sparkVel = new Float32Array(SPARKS * 3);
    const sparkLife = new Float32Array(SPARKS);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: '#ffb347', size: 0.16, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparks.frustumCulled = false;
    scene.add(sparks);
    for (let i = 0; i < SPARKS; i++) sparkPos[i * 3 + 1] = -100;
    const emitSparks = (x: number, y: number, z: number) => {
      for (let i = 0; i < SPARKS; i++) {
        sparkPos.set([x + (Math.random() - 0.5), y + Math.random() * 0.5, z], i * 3);
        sparkVel.set([(Math.random() - 0.5) * 9, 2 + Math.random() * 6, 2 + Math.random() * 6], i * 3);
        sparkLife[i] = 0.4 + Math.random() * 0.5;
      }
    };

    // Polvo en suspensión
    const DUST = 300;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) dustPos.set([(Math.random() - 0.5) * 60, Math.random() * 12, -Math.random() * 120 + 10], i * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#f0b48a', size: 0.12, transparent: true, opacity: 0.55, depthWrite: false }));
    dust.frustumCulled = false;
    scene.add(dust);

    // ---------- Estado de la carrera ----------
    let stage: Stage = 'waiting';
    let integrity = 100;
    let elapsedIntro = 0;
    let elapsedDrive = 0;
    let traveled = 0;
    let speed = 0;
    let roverX = 0;
    let steerVel = 0;
    let slowTimer = 0;
    let boostTimer = 0;
    let shake = 0;
    let nextRowZ = -55; // z (relativo al rover) de la siguiente fila de obstáculos
    let arrivedAt = 0;
    let lastHud = 0;
    let wheelSpin = 0;
    let clockT = 0;
    const lanes = [-4.2, 0, 4.2];

    const spawnRow = (z: number) => {
      const remainingAtRow = TOTAL_DISTANCE - traveled - -z;
      if (remainingAtRow < 55) return; // tramo final despejado
      const free = Math.floor(Math.random() * 3);
      const count = Math.random() < tuning.doubleChance ? 2 : 1;
      const order = [0, 1, 2].filter((l) => l !== free).sort(() => Math.random() - 0.5).slice(0, count);
      for (const lane of order) {
        const rock = rocks.find((r) => !r.active);
        if (!rock) break;
        rock.active = true;
        rock.hit = false;
        rock.mesh.visible = true;
        rock.mesh.scale.setScalar(1);
        const x = lanes[lane] + (Math.random() - 0.5) * 1.4;
        rock.mesh.position.set(x, rock.r * 0.55, z + (Math.random() - 0.5) * 3);
        rock.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      }
      if (Math.random() < tuning.beaconChance) {
        const b = beacons.find((bb) => !bb.active);
        if (b) {
          b.active = true;
          b.group.visible = true;
          b.group.position.set(lanes[free], 0, z);
        }
      }
    };

    const onResize = () => {
      const w = mount.clientWidth;
      const h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // En pantallas estrechas, más campo de visión para ver los carriles
      camera.fov = w / h < 0.9 ? 72 : 58;
      camera.updateProjectionMatrix();
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Controles: W/flecha arriba acelerar · S/flecha abajo frenar · A/flecha izquierda · D/flecha derecha
    const KEY_MAP: Record<string, 'left' | 'right' | 'up' | 'down'> = {
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right',
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      // Con las viñetas abiertas, las teclas son de la historia (Enter / flecha derecha = siguiente)
      if (storyOpenRef.current) return;
      const dir = KEY_MAP[e.key.toLowerCase()];
      if (!dir) return;
      inputRef.current[dir] = down;
      e.preventDefault();
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);
    const onBlur = () => {
      inputRef.current = { left: false, right: false, up: false, down: false };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const camPos = new THREE.Vector3(0, 2.4, -8);
    const camLook = new THREE.Vector3(0, 1.6, 0);
    const desiredPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());
      clockT += dt;

      // ----- Velocidad y dirección -----
      if (stage === 'waiting' && !storyOpenRef.current) {
        stage = 'intro';
        setStage('intro');
        onBlur();
      }
      if (stage === 'intro') {
        elapsedIntro += dt;
        if (elapsedIntro >= INTRO_SECONDS) {
          stage = 'drive';
          setStage('drive');
        }
      } else if (stage === 'drive') {
        elapsedDrive = Math.min(timeLimit, elapsedDrive + dt);
        if (elapsedDrive >= timeLimit) {
          stage = 'timeout';
          setStage('timeout');
          playErrorBuzz();
        }
      }

      let target = 0;
      if (stage === 'drive') {
        slowTimer = Math.max(0, slowTimer - dt);
        boostTimer = Math.max(0, boostTimer - dt);
        const { up, down } = inputRef.current;
        // SIN acelerador automático: solo avanza mientras se mantiene W / flecha arriba / pedal táctil
        target = down || !up ? 0 : slowTimer > 0 ? tuning.slow : boostTimer > 0 ? tuning.boost : tuning.max;
      }
      const braking = stage === 'drive' && inputRef.current.down && slowTimer <= 0 && boostTimer <= 0;
      const ended = stage === 'arrived' || stage === 'destroyed' || stage === 'timeout';
      const coasting = stage === 'drive' && !inputRef.current.up && !braking;
      const accel = ended ? 4 : slowTimer > 0 || braking ? 5 : coasting ? 1.2 : 1.6;
      speed += (target - speed) * Math.min(1, accel * dt);

      const input = stage === 'drive' ? (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0) : 0;
      const steerTarget = stage === 'arrived' ? -roverX * 2 : input * tuning.steer;
      steerVel += (steerTarget - steerVel) * Math.min(1, 8 * dt);
      roverX = Math.max(-ROAD_LIMIT, Math.min(ROAD_LIMIT, roverX + steerVel * dt));
      if (Math.abs(roverX) >= ROAD_LIMIT) steerVel *= 0.5;

      let step = stage === 'arrived' ? 0 : speed * dt;
      const remainingBefore = TOTAL_DISTANCE - traveled;
      if (stage === 'drive' && step >= remainingBefore) {
        step = Math.max(0, remainingBefore);
        stage = 'arrived';
        arrivedAt = clockT;
        setStage('arrived');
        playSuccess();
      }
      // Al fallar, el rover se detiene poco a poco donde está (sin llegar al cohete)
      if (stage === 'destroyed' || stage === 'timeout') step = Math.min(step, Math.max(0, TOTAL_DISTANCE - traveled - 1));
      traveled = Math.min(TOTAL_DISTANCE, traveled + step);
      const remaining = TOTAL_DISTANCE - traveled;

      // ----- Mundo que avanza hacia el rover -----
      for (const c of chunks) {
        c.position.z += step;
        if (c.position.z - CHUNK_L / 2 > 30) c.position.z -= CHUNK_L * 2;
      }
      for (const d of decoRocks) {
        d.position.z += step;
        if (d.position.z > 25) {
          d.position.z -= CHUNK_L * 2;
          d.position.x = (d.position.x > 0 ? 1 : -1) * (9 + Math.random() * 14);
        }
      }
      nextRowZ += step;
      if (stage === 'drive') {
        while (nextRowZ > -190) {
          spawnRow(nextRowZ); // nueva fila en el horizonte
          nextRowZ -= tuning.rowGap[0] + Math.random() * (tuning.rowGap[1] - tuning.rowGap[0]);
        }
      }
      base.position.set(0, 0, -(remaining + STOP_GAP + 9));

      // ----- Rocas y colisiones -----
      for (const r of rocks) {
        if (!r.active) continue;
        r.mesh.position.z += step;
        if (r.hit) {
          r.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 3));
          r.mesh.position.y -= dt * 0.8;
        }
        if (r.mesh.position.z > 14) {
          r.active = false;
          r.mesh.visible = false;
          continue;
        }
        if (!r.hit && stage === 'drive') {
          const dz = Math.abs(r.mesh.position.z);
          const dx = Math.abs(r.mesh.position.x - roverX);
          if (dz < 2.1 + r.r * 0.5 + tuning.hitbox && dx < 1.45 + r.r * 0.6 + tuning.hitbox) {
            r.hit = true;
            slowTimer = HIT_SLOW_SECONDS;
            integrity = dev.oneHitDestroys ? 0 : Math.max(0, integrity - tuning.hitDamage);
            boostTimer = 0;
            shake = reducedMotion ? 0.1 : 0.6;
            speed *= 0.5;
            emitSparks(roverX, 1.0, -1.8);
            playErrorBuzz();
            if (integrity <= 0) {
              stage = 'destroyed';
              setStage('destroyed');
            }
          }
        }
      }
      for (const b of beacons) {
        if (!b.active) continue;
        b.group.position.z += step;
        b.ring.rotation.x = Math.PI / 2;
        b.ring.rotation.z += dt * 3;
        b.ring.position.y = 1.2 + Math.sin(clockT * 4) * 0.2;
        if (b.group.position.z > 14) {
          b.active = false;
          b.group.visible = false;
          continue;
        }
        if (stage === 'drive' && Math.abs(b.group.position.z) < 2.2 && Math.abs(b.group.position.x - roverX) < 1.9) {
          b.active = false;
          b.group.visible = false;
          boostTimer = BOOST_SECONDS;
          slowTimer = 0;
          beaconsRef.current += 1;
          playPickup();
        }
      }

      // ----- Rover: ruedas, suspensión, inclinación -----
      wheelSpin += step / 0.48;
      const speedFactor = Math.min(1, speed / tuning.cruise);
      rover.group.position.x = roverX;
      rover.wheels.forEach((w, i) => {
        w.rotation.x = -wheelSpin;
        const bump = Math.sin(clockT * 17 + i * 1.9) * 0.05 * speedFactor + Math.sin(clockT * 31 + i) * 0.02 * speedFactor;
        w.position.y = 0.48 + bump;
        rover.struts[i].position.y = 0.75 + bump * 0.6;
      });
      rover.body.position.y = Math.sin(clockT * 23) * 0.035 * speedFactor + (slowTimer > 0 ? Math.sin(clockT * 60) * 0.05 : 0);
      rover.body.rotation.z = -steerVel * 0.012 + Math.sin(clockT * 9) * 0.008 * speedFactor;
      rover.body.rotation.x = Math.sin(clockT * 7) * 0.01 * speedFactor - (boostTimer > 0 ? 0.03 : 0);
      rover.group.rotation.y = -steerVel * 0.022;
      rover.leds.emissiveIntensity = boostTimer > 0 ? 3.5 : 2.2 + Math.sin(clockT * 6) * 0.2;

      // ----- Chispas y polvo -----
      for (let i = 0; i < SPARKS; i++) {
        if (sparkLife[i] <= 0) continue;
        sparkLife[i] -= dt;
        sparkVel[i * 3 + 1] -= 14 * dt;
        sparkPos[i * 3] += sparkVel[i * 3] * dt;
        sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
        sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
        if (sparkLife[i] <= 0) sparkPos[i * 3 + 1] = -100;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      for (let i = 0; i < DUST; i++) {
        dustPos[i * 3 + 2] += step * 0.9 + dt * 1.5;
        dustPos[i * 3] += dt * 1.2;
        if (dustPos[i * 3 + 2] > 12) {
          dustPos[i * 3 + 2] = -110 - Math.random() * 10;
          dustPos[i * 3] = (Math.random() - 0.5) * 60;
        }
      }
      dustGeo.attributes.position.needsUpdate = true;

      // ----- Cámara -----
      if (stage === 'intro' || stage === 'waiting') {
        // Plano frontal para ver a los 3 astronautas y luego giro hasta detrás del rover
        const t = smoothstep(0.6, INTRO_SECONDS, elapsedIntro);
        const ang = t * Math.PI;
        desiredPos.set(Math.sin(ang) * 7 + roverX, 2.6 + t * 1.8, -Math.cos(ang) * 7 + t * 2);
        desiredLook.set(roverX, 1.7 - t * 0.6, -t * 8);
        camPos.copy(desiredPos);
        camLook.copy(desiredLook);
      } else if (stage === 'drive' || stage === 'destroyed' || stage === 'timeout') {
        desiredPos.set(roverX * 0.75, 5.6, 9.5);
        desiredLook.set(roverX * 0.85, 0.9, -10);
        camPos.lerp(desiredPos, Math.min(1, 5 * dt));
        camLook.lerp(desiredLook, Math.min(1, 5 * dt));
      } else {
        // Llegada: la cámara se eleva y enseña el cohete de retorno de abajo arriba
        const t = Math.min(1, (clockT - arrivedAt) / 2.5);
        desiredPos.set(roverX + 9 * Math.sin(t * 0.9), 4.4 + t * 5, 9 - t);
        desiredLook.set(0, 2 + t * 12, -STOP_GAP - 9);
        camPos.lerp(desiredPos, Math.min(1, 3 * dt));
        camLook.lerp(desiredLook, Math.min(1, 3 * dt));
      }
      camera.position.copy(camPos);
      if (shake > 0) {
        shake = Math.max(0, shake - dt * 1.2);
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
      }
      camera.lookAt(camLook);

      sun.position.set(roverX - 30, 40, 20);
      sun.target.position.set(roverX, 0, 0);
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);

      renderer.render(scene, camera);

      // ----- HUD (10 veces por segundo) -----
      if (clockT - lastHud > 0.1) {
        lastHud = clockT;
        const status: RoverStatus =
          stage === 'intro' || stage === 'waiting'
            ? 'ready'
            : stage === 'arrived' || stage === 'destroyed' || stage === 'timeout'
              ? stage
              : slowTimer > 0
                ? 'hit'
                : boostTimer > 0
                  ? 'boost'
                  : inputRef.current.down
                    ? 'brake'
                    : inputRef.current.up
                      ? 'fast'
                      : 'cruise';
        setHud({
          remaining,
          elapsed: elapsedDrive,
          timeLeft: Math.max(0, timeLimit - elapsedDrive),
          status,
          beacons: beaconsRef.current,
          countdown: Math.max(0, Math.ceil(INTRO_SECONDS - elapsedIntro)),
          integrity,
        });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      const geos = new Set<THREE.BufferGeometry>();
      const mats = new Set<THREE.Material>();
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh;
        if (o.geometry) geos.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
        if ((obj as THREE.Light).isLight) (obj as THREE.Light).dispose();
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);


  // Cinemática de llegada / fallo: tras unos segundos se abre la viñeta del desenlace
  useEffect(() => {
    if (stage !== 'arrived' && stage !== 'destroyed' && stage !== 'timeout') return;
    const t = setTimeout(() => (stage === 'arrived' ? complete() : fail(stage)), ARRIVAL_SECONDS * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const progress = Math.min(1, 1 - hud.remaining / TOTAL_DISTANCE);
  // Cronómetro de rescate: cuenta atrás desde 01:00
  const left = Math.ceil(hud.timeLeft);
  const mm = Math.floor(left / 60);
  const ss = left % 60;
  const timeColor = left <= 10 && stage === 'drive' ? 'text-nasa-red' : 'text-slate-700';
  const statusText: Record<RoverStatus, string> = {
    ready: tr('Preparando motores', 'Warming up engines'),
    cruise: tr('Parado: mantén ACELERAR o W', 'Stopped: hold GO or W'),
    fast: tr('Acelerando', 'Speeding up'),
    brake: tr('Frenando', 'Braking'),
    boost: tr('¡Impulso!', 'Boost!'),
    hit: tr('¡Choque! Tracción reducida', 'Bump! Reduced traction'),
    arrived: tr('Llegada al cohete', 'Arrived at the rocket'),
    destroyed: tr('Rover averiado', 'Rover broken down'),
    timeout: tr('Tiempo agotado', 'Out of time'),
  };
  const statusColor = hud.status === 'hit' || hud.status === 'destroyed' || hud.status === 'timeout' ? 'text-nasa-red' : hud.status === 'boost' ? 'text-emerald-600' : 'text-nasa-blue';
  const integrityColor = hud.integrity >= 70 ? 'bg-emerald-500' : hud.integrity >= 45 ? 'bg-amber-500' : 'bg-nasa-red';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#b8683f] select-none">
      <div ref={mountRef} className="absolute inset-0" />

      {webglFailed && (
        /* Sin WebGL no se puede conducir: la misión se da por completada para no dejar la pantalla en blanco */
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6">
          <div className="hw-panel max-w-md p-6 text-center">
            <p className="font-display text-lg font-black text-nasa-blue">{tr('Conexión con el rover perdida', 'Rover link lost')}</p>
            <p className="mt-2 text-sm text-slate-600">
              {tr(
                'Este navegador no puede mostrar la escena 3D, pero el piloto automático del rover os lleva al Cohete de Retorno a la Tierra.',
                'This browser cannot show the 3D scene, but the rover autopilot takes you to the Earth Return Rocket.',
              )}
            </p>
            <button type="button" onClick={complete} className="font-display mt-4 rounded-xl bg-nasa-red px-6 py-3 text-base font-black tracking-wider text-white">
              {tr('Continuar', 'Continue')}
            </button>
          </div>
        </div>
      )}

      {/* HUD superior: distancia, cronómetro, estado e integridad del rover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="hw-panel w-full max-w-xl bg-white/90 px-4 py-3 backdrop-blur sm:w-auto sm:min-w-[26rem]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display flex items-center gap-2 text-sm font-black tracking-wider text-nasa-blue sm:text-base">
              <Flag size={18} strokeWidth={1.75} />
              {tr('Distancia al cohete', 'Distance to rocket')}: {Math.ceil(hud.remaining)} m
            </p>
            <p className={`font-display flex items-center gap-1 text-sm font-bold ${timeColor}`}>
              <Timer size={16} strokeWidth={1.75} /> {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </p>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-nasa-blue via-sky-500 to-cyan-400 transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="flex shrink-0 items-center gap-1 font-bold text-slate-700">
              <ShieldCheck size={16} strokeWidth={1.75} /> {tr('Integridad', 'Integrity')}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full transition-[width] duration-300 ${integrityColor}`} style={{ width: `${hud.integrity}%` }} />
            </div>
            <span className="w-11 shrink-0 text-right font-bold text-slate-700">{Math.round(hud.integrity)}%</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className={`flex items-center gap-1 font-bold ${statusColor}`}>
              <Gauge size={16} strokeWidth={1.75} /> {tr('Rover', 'Rover')}: {statusText[hud.status]}
            </span>
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <Zap size={16} strokeWidth={1.75} /> {tr('Balizas', 'Beacons')}: {hud.beacons}
            </span>
          </div>
        </div>
      </div>

      {/* Cuenta atrás de salida */}
      {stage === 'intro' && !webglFailed && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 px-4 text-center">
          <p className="font-display text-base font-black tracking-[0.2em] text-white drop-shadow-lg sm:text-xl">{tr('RUMBO AL COHETE DE RETORNO', 'HEADING TO THE RETURN ROCKET')}</p>
          <p className="font-display text-6xl font-black text-white drop-shadow-xl sm:text-8xl">{hud.countdown > 0 ? hud.countdown : tr('¡YA!', 'GO!')}</p>
          <p className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-semibold text-white">
            {tr('Tenéis 60 segundos. Mantén ACELERAR (o W) para avanzar · FRENO (o S) · flechas para girar. ¡Cuidado con las rocas!', 'You have 60 seconds. Hold GO (or W) to move · BRAKE (or S) · arrows to steer. Watch out for rocks!')}
          </p>
        </div>
      )}

      {/* Recordatorio de controles durante la conducción */}
      {stage === 'drive' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [@media(pointer:coarse)]:hidden">
          <p className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
            {tr('W / ↑ acelerar · S / ↓ frenar · A / ← · D / → girar', 'W / ↑ speed up · S / ↓ brake · A / ← · D / → steer')}
          </p>
        </div>
      )}

      {/* Mandos táctiles (móvil y ratón): girar a la izquierda, frenar y ACELERAR (hay que mantenerlo pulsado) */}
      {(stage === 'intro' || stage === 'drive') && !webglFailed && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5 [@media(pointer:fine)]:pb-16">
          <div className="flex gap-3">
            <TouchPad dir="left" inputRef={inputRef} label={tr('Girar a la izquierda', 'Steer left')} className="h-20 w-20 sm:h-24 sm:w-24">
              <ChevronLeft className="h-10 w-10" strokeWidth={2.5} />
            </TouchPad>
            <TouchPad dir="right" inputRef={inputRef} label={tr('Girar a la derecha', 'Steer right')} className="h-20 w-20 sm:h-24 sm:w-24">
              <ChevronRight className="h-10 w-10" strokeWidth={2.5} />
            </TouchPad>
          </div>
          <div className="flex items-end gap-3">
            <TouchPad dir="down" inputRef={inputRef} label={tr('Frenar', 'Brake')} className="h-16 w-16 sm:h-20 sm:w-20" tone="brake">
              <span className="flex flex-col items-center text-xs font-black">
                <Octagon className="h-6 w-6" strokeWidth={2.25} />
                {tr('FRENO', 'BRAKE')}
              </span>
            </TouchPad>
            <TouchPad dir="up" inputRef={inputRef} label={tr('Acelerar (mantener pulsado)', 'Go (hold)')} className="h-24 w-24 sm:h-28 sm:w-28" tone="go">
              <span className="flex flex-col items-center text-sm font-black">
                <ChevronsUp className="h-9 w-9" strokeWidth={2.5} />
                {tr('ACELERAR', 'GO')}
              </span>
            </TouchPad>
          </div>
        </div>
      )}

      {/* Fallo (breve): luego se abre la viñeta "Rescate fallido" */}
      {(stage === 'destroyed' || stage === 'timeout') && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 px-4 text-center">
          <p className="font-display text-3xl font-black tracking-wider text-white drop-shadow-xl sm:text-5xl">
            {stage === 'destroyed' ? tr('¡ROVER AVERIADO!', 'ROVER BROKEN DOWN!') : tr('¡TIEMPO AGOTADO!', 'OUT OF TIME!')}
          </p>
          <p className="rounded-full bg-black/45 px-4 py-1.5 text-sm font-semibold text-white">
            {stage === 'destroyed'
              ? tr('La integridad del rover ha llegado al 0 %.', 'The rover integrity has reached 0%.')
              : tr('No habéis llegado al cohete en 60 segundos.', 'You did not reach the rocket within 60 seconds.')}
          </p>
        </div>
      )}

      {/* Llegada (breve): luego se abre la viñeta "Rescate completado" */}
      {stage === 'arrived' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 px-4 text-center">
          <p className="font-display text-3xl font-black tracking-wider text-white drop-shadow-xl sm:text-5xl">{tr('¡A BORDO DEL COHETE!', 'ALL ABOARD THE ROCKET!')}</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50/95 px-4 py-1.5 text-sm font-bold text-emerald-700">
            <Zap size={16} strokeWidth={1.75} />
            {tr(`+${ROVER_RESCUE_BONUS} de ciencia por el rescate`, `+${ROVER_RESCUE_BONUS} science for the rescue`)}
            {hud.beacons > 0 && tr(` · +${hud.beacons} por balizas`, ` · +${hud.beacons} from beacons`)}
          </p>
        </div>
      )}
    </div>
  );
}

type Dir = 'left' | 'right' | 'up' | 'down';

/**
 * Botón táctil que mantiene pulsada una dirección mientras el dedo (o el ratón) está encima.
 * Usa pointer capture para no perder el "soltar" aunque el dedo se deslice fuera del botón.
 */
function TouchPad({
  dir,
  inputRef,
  label,
  className = '',
  tone = 'steer',
  children,
}: {
  dir: Dir;
  inputRef: { current: Record<Dir, boolean> };
  label: string;
  className?: string;
  tone?: 'steer' | 'go' | 'brake';
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const set = (v: boolean) => {
    inputRef.current[dir] = v;
    setPressed(v);
  };
  const palette =
    tone === 'go'
      ? pressed
        ? 'bg-emerald-500 border-emerald-200'
        : 'bg-emerald-600/85 border-emerald-300'
      : tone === 'brake'
        ? pressed
          ? 'bg-nasa-red border-red-200'
          : 'bg-nasa-red/80 border-red-300'
        : pressed
          ? 'bg-nasa-blue border-sky-200'
          : 'bg-slate-900/55 border-white/60';
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid shrink-0 touch-none select-none place-items-center rounded-full border-[3px] text-white shadow-xl backdrop-blur transition-transform [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] ${pressed ? 'scale-95' : ''} ${palette} ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
