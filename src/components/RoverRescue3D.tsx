import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ArrowRight, FastForward, Flag, Gauge, Timer, Zap } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { tr } from '../i18n/core';
import { useAriaScreenReady } from '../utils/useAriaVoiceState';
import { playButtonClick, playErrorBuzz, playPickup, playSuccess } from '../utils/soundEffects';

/**
 * Minijuego 3D final: la Comandante Elena y su equipo conducen el Rover de Rescate por el
 * Cráter Jezero hasta la base Ares-IV. 100 % procedural (sin modelos externos).
 * - Sin "Game Over": chocar con una roca solo frena el rover 1,5 s (chispas + vibración).
 * - Balizas verdes: impulso de velocidad y +1 punto de ciencia.
 * - Llegada: +5 de ciencia por rescate rápido y paso a la pantalla final.
 */

const TOTAL_DISTANCE = 800; // metros (1 unidad = 1 m)
const BASE_SPEED = 38;
const BOOST_SPEED = 58;
const SLOW_SPEED = 13;
const HIT_SLOW_SECONDS = 1.5;
const BOOST_SECONDS = 1.5;
const INTRO_SECONDS = 2.6;
const RESCUE_BONUS = 5;
const ROAD_LIMIT = 6;
const CHUNK_W = 150;
const CHUNK_L = 200;
const STOP_GAP = 16; // el rover se detiene a esta distancia de la cúpula

type Stage = 'intro' | 'drive' | 'arrived';
type RoverStatus = 'ready' | 'cruise' | 'boost' | 'hit' | 'arrived';

interface Hud {
  remaining: number;
  elapsed: number;
  status: RoverStatus;
  beacons: number;
  countdown: number;
}

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
    [-0.55, -0.55, '#FC3D21'],
    [0.55, -0.55, '#0B3D91'],
    [0, 0.8, '#0B3D91'],
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
// Base Ares-IV con cúpula y haz de luz cian
// ------------------------------------------------------------
function buildBase(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f5f6f8', roughness: 0.4, emissive: '#3a4a60', emissiveIntensity: 0.25 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 36, 18, 0, TAU, 0, Math.PI / 2), white);
  dome.position.y = 1.5;
  dome.castShadow = true;
  g.add(dome);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.8, 1.6, 36), new THREE.MeshStandardMaterial({ color: '#cfd4db', roughness: 0.5 }));
  ring.position.y = 0.8;
  g.add(ring);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(9.45, 9.45, 0.3, 36), new THREE.MeshStandardMaterial({ color: '#0B3D91' }));
  band.position.y = 1.5;
  g.add(band);
  const windowMat = new THREE.MeshStandardMaterial({ color: '#bff7ff', emissive: '#22d3ee', emissiveIntensity: 1.6 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.2), windowMat);
    win.position.set(Math.sin(a) * 8.1, 4.2, Math.cos(a) * 8.1);
    win.lookAt(0, 4.2, 0);
    g.add(win);
  }
  // Puerta (mira hacia el rover, +z)
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 0.4), new THREE.MeshStandardMaterial({ color: '#e6f9ff', emissive: '#22d3ee', emissiveIntensity: 0.9 }));
  door.position.set(0, 2.1, 9.3);
  g.add(door);
  // Módulos auxiliares
  for (const side of [-1, 1]) {
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 7, 20), white);
    mod.rotation.z = Math.PI / 2;
    mod.position.set(side * 13, 2.4, 0);
    g.add(mod);
  }
  // Haz vertical cian visible desde muy lejos (ignora la niebla)
  const beamMat = new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.45, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 320, 20, 1, true), beamMat);
  beam.position.y = 160;
  g.add(beam);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 320, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ecfeff', transparent: true, opacity: 0.8, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  core.position.y = 160;
  g.add(core);
  const glow = new THREE.PointLight('#67e8f9', 60, 60, 1.5);
  glow.position.set(0, 10, 10);
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
  const inputRef = useRef({ left: false, right: false });
  const finishedRef = useRef(false);
  const beaconsRef = useRef(0);
  const [hud, setHud] = useState<Hud>({ remaining: TOTAL_DISTANCE, elapsed: 0, status: 'ready', beacons: 0, countdown: 3 });
  const [stage, setStage] = useState<Stage>('intro');
  const [webglFailed, setWebglFailed] = useState(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    useGameStore.getState().finishRoverRescue(RESCUE_BONUS + beaconsRef.current);
  };

  useEffect(() => {
    useGameStore
      .getState()
      .ariaSay(
        tr(
          '¡El rover de la Comandante Elena viene a buscaros! Esquiva las rocas con las flechas y pasa por las balizas verdes para ir más rápido.',
          "Commander Elena's rover is coming for you! Dodge the rocks with the arrow keys and drive over the green beacons to go faster.",
        ),
      );
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

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
    let stage: Stage = 'intro';
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
      const count = Math.random() < 0.35 ? 2 : 1;
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
      if (Math.random() < 0.4) {
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

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        inputRef.current.left = down;
        e.preventDefault();
      } else if (k === 'arrowright' || k === 'd') {
        inputRef.current.right = down;
        e.preventDefault();
      }
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);
    const onBlur = () => {
      inputRef.current.left = false;
      inputRef.current.right = false;
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
      if (stage === 'intro') {
        elapsedIntro += dt;
        if (elapsedIntro >= INTRO_SECONDS) {
          stage = 'drive';
          setStage('drive');
        }
      } else if (stage === 'drive') {
        elapsedDrive += dt;
      }

      let target = 0;
      if (stage === 'drive') {
        slowTimer = Math.max(0, slowTimer - dt);
        boostTimer = Math.max(0, boostTimer - dt);
        target = slowTimer > 0 ? SLOW_SPEED : boostTimer > 0 ? BOOST_SPEED : BASE_SPEED;
      }
      const accel = stage === 'arrived' ? 4 : slowTimer > 0 ? 6 : 1.6;
      speed += (target - speed) * Math.min(1, accel * dt);

      const input = stage === 'drive' ? (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0) : 0;
      const steerTarget = stage === 'arrived' ? -roverX * 2 : input * 13;
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
          nextRowZ -= 24 + Math.random() * 10;
        }
      }
      base.position.set(0, 0, -(remaining + STOP_GAP + 9));
      base.rotation.y += dt * 0.02;

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
          if (dz < 2.1 + r.r * 0.5 && dx < 1.45 + r.r * 0.6) {
            r.hit = true;
            slowTimer = HIT_SLOW_SECONDS;
            boostTimer = 0;
            shake = reducedMotion ? 0.1 : 0.6;
            speed *= 0.5;
            emitSparks(roverX, 1.0, -1.8);
            playErrorBuzz();
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
      const speedFactor = Math.min(1, speed / BASE_SPEED);
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
      if (stage === 'intro') {
        // Plano frontal para ver a los 3 astronautas y luego giro hasta detrás del rover
        const t = smoothstep(0.6, INTRO_SECONDS, elapsedIntro);
        const ang = t * Math.PI;
        desiredPos.set(Math.sin(ang) * 7 + roverX, 2.6 + t * 1.8, -Math.cos(ang) * 7 + t * 2);
        desiredLook.set(roverX, 1.7 - t * 0.6, -t * 8);
        camPos.copy(desiredPos);
        camLook.copy(desiredLook);
      } else if (stage === 'drive') {
        desiredPos.set(roverX * 0.75, 5.6, 9.5);
        desiredLook.set(roverX * 0.85, 0.9, -10);
        camPos.lerp(desiredPos, Math.min(1, 5 * dt));
        camLook.lerp(desiredLook, Math.min(1, 5 * dt));
      } else {
        // Llegada: la cámara se eleva y enseña la cúpula de Ares-IV
        const t = Math.min(1, (clockT - arrivedAt) / 2.5);
        desiredPos.set(roverX + 7 * Math.sin(t * 0.9), 4.4 + t * 4, 9 - t * 3);
        desiredLook.set(0, 2 + t * 3, -STOP_GAP);
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
          stage === 'intro' ? 'ready' : stage === 'arrived' ? 'arrived' : slowTimer > 0 ? 'hit' : boostTimer > 0 ? 'boost' : 'cruise';
        setHud({
          remaining,
          elapsed: elapsedDrive,
          status,
          beacons: beaconsRef.current,
          countdown: Math.max(0, Math.ceil(INTRO_SECONDS - elapsedIntro)),
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

  // Cinemática de llegada: paso automático al informe final a los 2 s del cartel
  useEffect(() => {
    if (stage !== 'arrived') return;
    const t = setTimeout(finish, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const progress = Math.min(1, 1 - hud.remaining / TOTAL_DISTANCE);
  const mm = Math.floor(hud.elapsed / 60);
  const ss = Math.floor(hud.elapsed % 60);
  const statusText: Record<RoverStatus, string> = {
    ready: tr('Preparando motores', 'Warming up engines'),
    cruise: tr('En ruta', 'On route'),
    boost: tr('¡Impulso!', 'Boost!'),
    hit: tr('¡Choque! Tracción reducida', 'Bump! Reduced traction'),
    arrived: tr('Llegada a la base', 'Arrived at the base'),
  };
  const statusColor =
    hud.status === 'hit' ? 'text-nasa-red' : hud.status === 'boost' ? 'text-emerald-600' : 'text-nasa-blue';

  const press = (dir: 'left' | 'right', down: boolean) => {
    inputRef.current[dir] = down;
  };
  const steerButton = (dir: 'left' | 'right') => (
    <button
      type="button"
      aria-label={dir === 'left' ? tr('Girar a la izquierda', 'Steer left') : tr('Girar a la derecha', 'Steer right')}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(dir, true);
      }}
      onPointerUp={() => press(dir, false)}
      onPointerCancel={() => press(dir, false)}
      onLostPointerCapture={() => press(dir, false)}
      onContextMenu={(e) => e.preventDefault()}
      className="font-display pointer-events-auto flex touch-none select-none items-center gap-2 rounded-2xl border-[3px] border-white/80 bg-nasa-blue/85 px-5 py-4 text-base font-black tracking-wider text-white shadow-lg backdrop-blur active:scale-95 active:bg-nasa-blue sm:px-8 sm:py-5 sm:text-lg"
    >
      {dir === 'left' ? (
        <>
          <ArrowLeft size={28} strokeWidth={2.5} /> {tr('IZQUIERDA', 'LEFT')}
        </>
      ) : (
        <>
          {tr('DERECHA', 'RIGHT')} <ArrowRight size={28} strokeWidth={2.5} />
        </>
      )}
    </button>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#b8683f] select-none">
      <div ref={mountRef} className="absolute inset-0" />

      {webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6">
          <div className="hw-panel max-w-md p-6 text-center">
            <p className="font-display text-lg font-black text-nasa-blue">{tr('¡El rover ya ha llegado!', 'The rover has arrived!')}</p>
            <p className="mt-2 text-sm text-slate-600">
              {tr('Este navegador no puede mostrar la escena 3D, pero la Comandante Elena ya está en la base Ares-IV.', 'This browser cannot show the 3D scene, but Commander Elena is already at the Ares-IV base.')}
            </p>
            <button type="button" onClick={finish} className="font-display mt-4 rounded-xl bg-nasa-red px-6 py-3 text-base font-black tracking-wider text-white">
              {tr('Ver Reporte Final', 'View Final Report')}
            </button>
          </div>
        </div>
      )}

      {/* HUD superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
        <div className="hw-panel pointer-events-auto w-full max-w-xl bg-white/90 px-4 py-3 backdrop-blur sm:w-auto sm:min-w-[24rem]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display flex items-center gap-2 text-sm font-black tracking-wider text-nasa-blue sm:text-base">
              <Flag size={18} strokeWidth={1.75} />
              {tr('Distancia a ARES-IV', 'Distance to ARES-IV')}: {Math.ceil(hud.remaining)} m
            </p>
            <p className="font-display flex items-center gap-1 text-sm font-bold text-slate-700">
              <Timer size={16} strokeWidth={1.75} /> {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </p>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-nasa-blue via-sky-500 to-cyan-400 transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className={`flex items-center gap-1 font-bold ${statusColor}`}>
              <Gauge size={16} strokeWidth={1.75} /> {tr('Rover', 'Rover')}: {statusText[hud.status]}
            </span>
            <span className="flex items-center gap-1 font-bold text-emerald-700" title={tr('Cada baliza verde: impulso y +1 de ciencia', 'Each green beacon: boost and +1 science')}>
              <Zap size={16} strokeWidth={1.75} /> {tr('Balizas', 'Beacons')}: {hud.beacons}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            playButtonClick();
            finish();
          }}
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/60 bg-black/35 px-3 py-1.5 text-xs font-bold tracking-wide text-white backdrop-blur hover:bg-black/55 sm:text-sm"
        >
          {tr('Saltar escena 3D', 'Skip 3D scene')} <FastForward size={14} />
        </button>
      </div>

      {/* Cuenta atrás de salida */}
      {stage === 'intro' && !webglFailed && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 px-4 text-center">
          <p className="font-display text-base font-black tracking-[0.2em] text-white drop-shadow-lg sm:text-xl">
            {tr('RESCATE DE LA COMANDANTE ELENA', "COMMANDER ELENA'S RESCUE RUN")}
          </p>
          <p className="font-display text-6xl font-black text-white drop-shadow-xl sm:text-8xl">{hud.countdown > 0 ? hud.countdown : tr('¡YA!', 'GO!')}</p>
          <p className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-semibold text-white">
            {tr('Esquiva las rocas con las flechas o A / D. Pasa por las balizas verdes.', 'Dodge rocks with the arrow keys or A / D. Drive over green beacons.')}
          </p>
        </div>
      )}

      {/* Controles táctiles grandes */}
      {stage === 'drive' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {steerButton('left')}
          {steerButton('right')}
        </div>
      )}

      {/* Cartel de llegada */}
      {stage === 'arrived' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 p-4">
          <div className="hw-panel max-w-xl rounded-[1.75rem] border-[3px] border-white bg-white/95 p-6 text-center shadow-2xl sm:p-8">
            <p className="font-display text-2xl font-black tracking-wider text-nasa-red sm:text-4xl">{tr('¡RESCATE COMPLETADO!', 'RESCUE COMPLETE!')}</p>
            <p className="font-display mt-2 text-base font-black tracking-wider text-nasa-blue sm:text-xl">{tr('LLEGADA A LA BASE ARES-IV', 'ARRIVAL AT ARES-IV BASE')}</p>
            <p className="mt-3 text-sm text-slate-700 sm:text-base">
              {tr('Leo, Vega y Max ya están a salvo con la Comandante Elena.', 'Leo, Vega and Max are now safe with Commander Elena.')}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
              <Zap size={16} strokeWidth={1.75} />
              {tr(`+${RESCUE_BONUS} de ciencia por rescate rápido`, `+${RESCUE_BONUS} science for a fast rescue`)}
              {hud.beacons > 0 && tr(` · +${hud.beacons} por balizas`, ` · +${hud.beacons} from beacons`)}
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  playButtonClick();
                  finish();
                }}
                className="font-display mt-5 inline-flex items-center gap-2 rounded-xl bg-nasa-red px-6 py-3 text-base font-black tracking-wider text-white"
              >
                {tr('Ver Reporte Final', 'View Final Report')} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
