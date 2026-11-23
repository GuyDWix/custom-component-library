Create a custom element called "World Connections Map". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: locations (name, latitude, longitude), connections (from location, to location), dot color, arc color, background style (dark | light), show labels. Add other settings if they help.

```tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import styles from './Component.module.css';

export type BackgroundStyle = 'dark' | 'light';

export interface MapLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface MapConnection {
  from: string;
  to: string;
}

export interface WorldConnectionsMapProps {
  locations?: MapLocation[];
  connections?: MapConnection[];
  dotColor?: string;
  arcColor?: string;
  backgroundStyle?: BackgroundStyle;
  showLabels?: boolean;
  mapLabel?: string;
  connectedToLabel?: string;
  distanceUnit?: string;
  pauseLabel?: string;
  playLabel?: string;
  className?: string;
}

const DEFAULT_LOCATIONS: MapLocation[] = [
  { name: 'New York', latitude: 40.71, longitude: -74.01 },
  { name: 'Mexico City', latitude: 19.43, longitude: -99.13 },
  { name: 'São Paulo', latitude: -23.55, longitude: -46.63 },
  { name: 'London', latitude: 51.51, longitude: -0.13 },
  { name: 'Lagos', latitude: 6.52, longitude: 3.38 },
  { name: 'Nairobi', latitude: -1.29, longitude: 36.82 },
  { name: 'Dubai', latitude: 25.2, longitude: 55.27 },
  { name: 'Mumbai', latitude: 19.08, longitude: 72.88 },
  { name: 'Singapore', latitude: 1.35, longitude: 103.82 },
  { name: 'Tokyo', latitude: 35.68, longitude: 139.69 },
  { name: 'Sydney', latitude: -33.87, longitude: 151.21 },
];

const DEFAULT_CONNECTIONS: MapConnection[] = [
  { from: 'London', to: 'New York' },
  { from: 'New York', to: 'São Paulo' },
  { from: 'New York', to: 'Mexico City' },
  { from: 'London', to: 'Lagos' },
  { from: 'Lagos', to: 'São Paulo' },
  { from: 'London', to: 'Dubai' },
  { from: 'Dubai', to: 'Nairobi' },
  { from: 'Dubai', to: 'Mumbai' },
  { from: 'Dubai', to: 'Singapore' },
  { from: 'Singapore', to: 'Tokyo' },
  { from: 'Singapore', to: 'Sydney' },
];

/* Land mask: 360 x 142 one-degree cells (84°N to 58°S), run-length encoded.
   Each char is a run length; '_' adds 63 and keeps the current run going. */
const LAND_RLE = [
  '__H9____pK6e____Z_G____R_FY3_99__bN1qUF_5A__ZJ4sTD_A6__aH6sV8_I4__CBBEApZ1k3WE__6Bgh_E6PPPA_P3_1',
  'b_B5SROA_O735A868La_B5Ma74_j62D475DJZ_A5C45oA9_P52FGFHX_B5B45q2JnESHGHEWj9P1B44_Kcf4GJGDUgFR6252',
  '_e22ExPFCRgM612__D8_ECDCMiR3__K3_K8EBIB6TS3__J4_M7CCEDAQA1C7__C539_J8ADAH9OB3B4__EH_L88F8J6OB3__',
  'UH_L5272H7kD3__UI_G87P4lC4__SK_BDBM2mD4__67BODBkHC_7D9__074Y9GiGDx293267_tH5b4KiDFv4B1257_rH6b2P',
  'iBGu4A3145_sI6Z3Sl6Is11493217_qK6_4n3Jo433943_vK5_6n2Kn4336__731D4_8n1Lm4172__B11D3_A_8l1561__C1',
  '1D2_C_8p43__D12_S_6u__F12_T_4s__H21_T_3t__H32_T_0xr2_M41_U-yW3F5_L_ay-F1F41495_L53_TtyG342CC74_L',
  '64_SszC834AD73_H94_TszC943A35385_E_hp_1A7244161N4_518A2_Vn_398261333O3_338A2_Wl_49F2432N4_27592_',
  'Xl_48E3534M4_54483_Yk_743AB16_U4465_Zj_732CP_L6348_ah_7HQ_LB8_ed_8JO_MA212_jb_8NL_N92_nZ_8R463_S',
  '91_pY_8__6_yP63_8w2_9_z11GD3_5z2_8_z21EE3_4l2D3_6__012DF2_3m2E412_0__113CG1_2o2E7-__213B_Ip3D42A',
  'q21__5A_Iq2L9n32__68E7ys2L9l41__798265xs2KBJ3K__H86484wt2JEE5F__M954E3rt3HFC8D41__K816E5qt3GGBAC',
  '31B1__BD_8u3EHABDD2__DB_8u3CJ9CDD2__J9_4v39M7HAC3__J8_3x27O6IBB3__L6_4x15R5IBD2__N4_3yW5I227__d3',
  '92uy52P4I236F1__N38Dl_3P4I243G2__O3213Fl_2P3J251G2__QOl_0R121H2N3__RMl-U2H2L5__TKlyV2H2F253__UPh',
  'A5il133C4__bQi1Dgm224B3__cRyco22395__cSxbq22287__aTxas2215A23__UVwYu37931__VWwYv36822__XYtXx3672',
  '3A6__GcqUz45633A9__CfpT-473349B__AhoR_13D211BB__8inR_22W9__6jmR_37QA__6jmQ_48OA__7imR_N1D332__8h',
  'mR_L2L2__7gnS_j1__7fnS_S371__EeoS81_I651__FcoT72_H653__FapT63_C41654__FZpS65_AD45__FYpR65_BE35__',
  'HWpP76_AN__IUqO86_9O__IUrM95_8S__GUrM95_5W__FTtL95_3Y__ETuM84_2c__CSvM84_2d__BPzKA3_3d__AN_0JB1_',
  '5d__AN_0I_Ie__9N_1H_Ie__8N_2G_Je__8N_3E_Lc__9M_4D_Mc__9L_6B_Nc__9K_7A_OB7J__AJ_89_P8CH__9J_A2_W4',
  'F11E__AF___7DM1_oG___7BO1_mH___8AO4_jG___B5R4_jC___l4_jC___m1_l9___L3O2_nA___L2N3_nA___M1L4_o9__',
  '_i3_p9___h5_p8___k2_q8_____a9_____b7_____c7_____c7_____d6_____e5_____g4_____h1_______________N',
].join('');

const WORLD_W = 360;
const WORLD_H = 142;
const TOP_LAT = 84;
const RUN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const TAU = Math.PI * 2;
const NARROW_WIDTH = 560;
const NARROW_LABEL_BUDGET = 3;
const ARC_SAMPLES = 48;
const DOT_BUCKETS = 8;
const SWEEP_SECONDS = 2;
const TRAVEL_SHARE = 0.68;

let landMask: Uint8Array | null = null;
function getLandMask(): Uint8Array {
  if (landMask) return landMask;
  const mask = new Uint8Array(WORLD_W * WORLD_H);
  let cursor = 0;
  let isLand = 0;
  let run = 0;
  for (const char of LAND_RLE) {
    const value = RUN_ALPHABET.indexOf(char);
    run += value;
    if (value === 63) continue;
    if (isLand) mask.fill(1, cursor, cursor + run);
    cursor += run;
    run = 0;
    isLand ^= 1;
  }
  landMask = mask;
  return mask;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function project(latitude: number, longitude: number) {
  const lat = clamp(latitude, TOP_LAT - WORLD_H, TOP_LAT);
  const lon = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return { x: lon + 180, y: TOP_LAT - lat };
}

function formatCoordinates(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat} ${lon}`;
}

function distanceKm(a: MapLocation, b: MapLocation) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface Arc {
  key: string;
  from: number;
  to: number;
  pts: Float32Array;
  apexX: number;
  apexY: number;
  km: number;
}

function buildArcs(locations: MapLocation[], connections: MapConnection[]): Arc[] {
  const indexByName = new Map(locations.map((location, index) => [location.name, index]));
  const arcs: Arc[] = [];
  connections.forEach((connection, index) => {
    const from = indexByName.get(connection.from);
    const to = indexByName.get(connection.to);
    if (from === undefined || to === undefined || from === to) return;
    const a = project(locations[from].latitude, locations[from].longitude);
    const b = project(locations[to].latitude, locations[to].longitude);
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = -(b.y - a.y) / length;
    let ny = (b.x - a.x) / length;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const lift = Math.min(length * 0.32, 46);
    const cx = (a.x + b.x) / 2 + nx * lift;
    const cy = Math.max(2, (a.y + b.y) / 2 + ny * lift);
    const pts = new Float32Array((ARC_SAMPLES + 1) * 2);
    for (let i = 0; i <= ARC_SAMPLES; i++) {
      const t = i / ARC_SAMPLES;
      const u = 1 - t;
      pts[i * 2] = u * u * a.x + 2 * u * t * cx + t * t * b.x;
      pts[i * 2 + 1] = u * u * a.y + 2 * u * t * cy + t * t * b.y;
    }
    arcs.push({
      key: `${from}-${to}-${index}`,
      from,
      to,
      pts,
      apexX: (a.x + 2 * cx + b.x) / 4,
      apexY: (a.y + 2 * cy + b.y) / 4,
      km: distanceKm(locations[from], locations[to]),
    });
  });
  return arcs;
}

interface Cam {
  x: number;
  y: number;
  ls: number;
}

function frameCamera(points: { x: number; y: number }[], width: number, height: number, focused: boolean): Cam {
  const narrow = width < NARROW_WIDTH;
  const minScale = narrow ? width / WORLD_W : Math.max(width / WORLD_W, height / WORLD_H);
  const maxScale = Math.max(minScale, width / (narrow ? 60 : 34));
  const padX = Math.max(48, width * 0.1);
  const padL = focused && !narrow ? Math.max(padX, width * 0.3) : padX;
  const padT = Math.max(64, height * 0.12);
  const padB = focused && narrow ? height * 0.42 : Math.max(64, height * 0.12);
  const availW = Math.max(40, width - padL - padX);
  const availH = Math.max(40, height - padT - padB);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const hasPoints = points.length > 0;
  const scale = hasPoints
    ? clamp(Math.min(availW / Math.max(x1 - x0, 0.5), availH / Math.max(y1 - y0, 0.5)), minScale, maxScale)
    : minScale;
  const centerX = hasPoints ? (x0 + x1) / 2 : WORLD_W / 2;
  const centerY = hasPoints ? (y0 + y1) / 2 : WORLD_H / 2;
  let x = centerX - (padL + availW / 2 - width / 2) / scale;
  let y = centerY - (padT + availH / 2 - height / 2) / scale;
  const viewW = width / scale;
  const viewH = height / scale;
  x = viewW < WORLD_W ? clamp(x, viewW / 2, WORLD_W - viewW / 2) : WORLD_W / 2;
  y = viewH < WORLD_H ? clamp(y, viewH / 2, WORLD_H - viewH / 2) : WORLD_H / 2;
  return { x, y, ls: Math.log(scale) };
}

function frameSelection(locations: MapLocation[], arcs: Arc[], index: number | null, width: number, height: number) {
  const points: { x: number; y: number }[] = [];
  const place = (i: number) => points.push(project(locations[i].latitude, locations[i].longitude));
  if (index === null) {
    locations.forEach((_, i) => place(i));
    arcs.forEach((arc) => points.push({ x: arc.apexX, y: arc.apexY }));
  } else {
    place(index);
    arcs.forEach((arc) => {
      if (arc.from !== index && arc.to !== index) return;
      place(arc.from === index ? arc.to : arc.from);
      points.push({ x: arc.apexX, y: arc.apexY });
    });
  }
  return frameCamera(points, width, height, index !== null);
}

interface DotSet {
  step: number;
  cols: number;
  rows: number;
  xs: Float32Array;
  ys: Float32Array;
  grid: Int32Array;
  buckets: number[][];
}

function buildDotSet(step: number, locations: MapLocation[]): DotSet {
  const mask = getLandMask();
  const cols = Math.floor(WORLD_W / step);
  const rows = Math.floor(WORLD_H / step);
  const grid = new Int32Array(cols * rows).fill(-1);
  const buckets: number[][] = Array.from({ length: DOT_BUCKETS }, () => []);
  const cities = locations.map((l) => project(l.latitude, l.longitude));
  const xs: number[] = [];
  const ys: number[] = [];
  const water = (x: number, y: number) => x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H || !mask[y * WORLD_W + x];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let land = 0;
      for (let y = row * step; y < row * step + step; y++)
        for (let x = col * step; x < col * step + step; x++) land += mask[y * WORLD_W + x];
      const coverage = land / (step * step);
      if (coverage < 0.5) continue;
      const x = (col + 0.5) * step;
      const y = (row + 0.5) * step;
      const lightX = x / WORLD_W - 0.42;
      const lightY = y / WORLD_H - 0.28;
      const light = Math.max(0, 1 - Math.hypot(lightX * 1.1, lightY * 1.6));
      let glow = 0;
      for (const c of cities) glow += Math.exp(-((x - c.x) ** 2 + (y - c.y) ** 2) / 98);
      const coast =
        coverage < 0.99 ||
        (step === 1 && (water(col - 1, row) || water(col + 1, row) || water(col, row - 1) || water(col, row + 1)));
      const alpha = (0.2 + 0.3 * light + 0.5 * Math.min(1, glow)) * (0.7 + 0.3 * coverage) + (coast ? 0.16 : 0);
      buckets[Math.min(DOT_BUCKETS - 1, Math.floor(clamp(alpha, 0, 0.999) * DOT_BUCKETS))].push(xs.length);
      grid[row * cols + col] = xs.length;
      xs.push(x);
      ys.push(y);
    }
  }
  return { step, cols, rows, xs: Float32Array.from(xs), ys: Float32Array.from(ys), grid, buckets };
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface LabelSpot {
  x: number;
  y: number;
  origin: string;
  visible: boolean;
}

const LABEL_GAP = 14;
const DOT_CLEARANCE = 9;

const overlaps = (a: Box, b: Box, pad = 4) =>
  a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;

const inside = (a: Box, bounds: Box) =>
  a.left >= bounds.left && a.top >= bounds.top && a.right <= bounds.right && a.bottom <= bounds.bottom;

function labelCandidates(w: number, h: number, preferLeft: boolean): [number, number, string][] {
  const right: [number, number, string][] = [
    [LABEL_GAP, -h / 2, 'left center'],
    [LABEL_GAP, -h + 6, 'left bottom'],
    [LABEL_GAP, -6, 'left top'],
  ];
  const left: [number, number, string][] = [
    [-LABEL_GAP - w, -h / 2, 'right center'],
    [-LABEL_GAP - w, -h + 6, 'right bottom'],
    [-LABEL_GAP - w, -6, 'right top'],
  ];
  const vertical: [number, number, string][] = [
    [-w / 2, -LABEL_GAP - h, 'center bottom'],
    [-w / 2, LABEL_GAP, 'center top'],
  ];
  return [...(preferLeft ? [left[0], right[0]] : [right[0], left[0]]), ...vertical, ...(preferLeft ? [...left, ...right] : [...right, ...left])];
}

interface PlaceInput {
  points: { x: number; y: number }[];
  sizes: { w: number; h: number }[];
  order: number[];
  wanted: Set<number>;
  active: number | null;
  budget: number;
  bounds: Box;
  obstacles: Box[];
  width: number;
}

function placeLabels({ points, sizes, order, wanted, active, budget, bounds, obstacles, width }: PlaceInput) {
  const placed: Box[] = [];
  const dots = points.map((p) => ({
    left: p.x - DOT_CLEARANCE,
    top: p.y - DOT_CLEARANCE,
    right: p.x + DOT_CLEARANCE,
    bottom: p.y + DOT_CLEARANCE,
  }));
  let shown = 0;
  return order.reduce<LabelSpot[]>((spots, index) => {
    const p = points[index];
    const { w, h } = sizes[index];
    const options = labelCandidates(w, h, p.x > width * 0.62);
    const boxOf = ([dx, dy]: [number, number, string]) => ({
      left: p.x + dx,
      top: p.y + dy,
      right: p.x + dx + w,
      bottom: p.y + dy + h,
    });
    const isActive = index === active;
    const onScreen = p.x > 0 && p.y > 0 && p.x < bounds.right + 8 && p.y < bounds.bottom + 8;
    const canShow = onScreen && wanted.has(index) && (isActive || shown < budget);
    const clear = (box: Box) =>
      inside(box, bounds) &&
      !placed.some((other) => overlaps(box, other)) &&
      !obstacles.some((other) => overlaps(box, other, 0)) &&
      !dots.some((dot, i) => i !== index && overlaps(box, dot, 0));
    let choice = canShow ? options.find((option) => clear(boxOf(option))) : undefined;
    if (!choice && canShow && isActive) {
      const [dx, dy, origin] = options.find((option) => inside(boxOf(option), bounds)) ?? options[0];
      const x = clamp(p.x + dx, bounds.left, bounds.right - w) - p.x;
      const y = clamp(p.y + dy, bounds.top, bounds.bottom - h) - p.y;
      choice = [x, y, origin];
    }
    if (choice) {
      placed.push(boxOf(choice));
      if (!isActive) shown += 1;
    }
    const [x, y, origin] = choice ?? options[0];
    spots[index] = { x, y, origin, visible: !!choice };
    return spots;
  }, []);
}

interface ArcState {
  lit: number;
  trace: number;
  u: number;
}

export default function WorldConnectionsMap({
  locations = DEFAULT_LOCATIONS,
  connections = DEFAULT_CONNECTIONS,
  dotColor,
  arcColor,
  backgroundStyle = 'dark',
  showLabels = true,
  mapLabel = 'Map of our locations and the routes between them',
  connectedToLabel = 'connected to',
  distanceUnit = 'km',
  pauseLabel = 'Pause animation',
  playLabel = 'Play animation',
  className,
}: WorldConnectionsMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [hudIndex, setHudIndex] = useState<number | null>(null);
  const [isPlayOn, setIsPlayOn] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isOnScreen, setIsOnScreen] = useState(true);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [labelSpots, setLabelSpots] = useState<LabelSpot[] | null>(null);

  const active = hovered ?? focused ?? pinned;
  const cameraIndex = pinned ?? keyboardFocus;
  const arcs = useMemo(() => buildArcs(locations, connections), [locations, connections]);

  const degree = useMemo(() => {
    const counts = locations.map(() => 0);
    arcs.forEach((arc) => {
      counts[arc.from] += 1;
      counts[arc.to] += 1;
    });
    return counts;
  }, [arcs, locations]);

  const linked = useMemo(() => {
    const set = new Set<number>();
    if (active === null) return set;
    arcs.forEach((arc) => {
      if (arc.from === active) set.add(arc.to);
      if (arc.to === active) set.add(arc.from);
    });
    return set;
  }, [arcs, active]);

  useEffect(() => {
    if (active !== null) setHudIndex(active);
  }, [active]);

  const hudRoutes = useMemo(() => {
    if (hudIndex === null) return [];
    return arcs
      .filter((arc) => arc.from === hudIndex || arc.to === hudIndex)
      .map((arc) => ({ key: arc.key, name: locations[arc.from === hudIndex ? arc.to : arc.from]?.name ?? '', km: arc.km }));
  }, [arcs, hudIndex, locations]);

  const stateRef = useRef({ active, cameraIndex, isPlayOn, locations, arcs });
  stateRef.current = { active, cameraIndex, isPlayOn, locations, arcs };
  const kickRef = useRef<() => void>(() => {});
  const retargetRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const toggle = toggleRef.current;
    const hud = hudRef.current;
    if (!root || !toggle || !size.width) return;
    const target = frameSelection(locations, arcs, cameraIndex, size.width, size.height);
    const scale = Math.exp(target.ls);
    const points = locations.map((location) => {
      const p = project(location.latitude, location.longitude);
      return { x: (p.x - target.x) * scale + size.width / 2, y: (p.y - target.y) * scale + size.height / 2 };
    });
    const sizes = locations.map((_, index) => {
      const label = labelRefs.current[index];
      return { w: label?.offsetWidth ?? 0, h: label?.offsetHeight ?? 0 };
    });
    const rank = (index: number) => (index === active ? 2 : linked.has(index) ? 1 : 0);
    const order = locations
      .map((_, index) => index)
      .sort((a, b) => rank(b) - rank(a) || degree[b] - degree[a] || a - b);
    const wanted = new Set(active === null ? (showLabels ? order : []) : [active, ...linked]);
    const edge = 12;
    const obstacles: Box[] = [
      {
        left: toggle.offsetLeft,
        top: toggle.offsetTop,
        right: toggle.offsetLeft + toggle.offsetWidth,
        bottom: toggle.offsetTop + toggle.offsetHeight,
      },
    ];
    if (hud && active !== null) {
      obstacles.push({ left: hud.offsetLeft, top: hud.offsetTop, right: hud.offsetLeft + hud.offsetWidth, bottom: hud.offsetTop + hud.offsetHeight });
    }
    setLabelSpots(
      placeLabels({
        points,
        sizes,
        order,
        wanted,
        active,
        budget: size.width < NARROW_WIDTH ? NARROW_LABEL_BUDGET : Infinity,
        bounds: { left: edge, top: edge, right: root.clientWidth - edge, bottom: root.clientHeight - edge },
        obstacles,
        width: size.width,
      }),
    );
  }, [size, active, cameraIndex, linked, degree, locations, arcs, showLabels, hudIndex]);

  useEffect(() => {
    const root = rootRef.current;
    const base = baseRef.current;
    const fx = fxRef.current;
    if (!root || !base || !fx) return;
    const baseCtx = base.getContext('2d');
    const fxCtx = fx.getContext('2d');
    if (!baseCtx || !fxCtx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) setIsPlayOn(false);

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    let introStart = -1;
    let introTime = reduced.matches ? 99 : 0;
    let colors = { dot: '#46536b', arc: '#46f59c', core: '#f2fff8', additive: true };
    const cam: Cam = { x: WORLD_W / 2, y: WORLD_H / 2, ls: Math.log(3) };
    const velocity: Cam = { x: 0, y: 0, ls: 0 };
    let target: Cam = { ...cam };
    let ready = false;
    let baseDirty = true;
    let dotCache = { locations: stateRef.current.locations, sets: new Map<number, DotSet>() };
    let arcStates: ArcState[] = [];
    let arcsRef: Arc[] = [];
    let lastActive: number | null = null;
    const spot = { x: 0, y: 0, strength: 0 };

    const readColors = () => {
      const style = getComputedStyle(root);
      colors = {
        dot: style.getPropertyValue('--wcm-dot-color').trim() || colors.dot,
        arc: style.getPropertyValue('--wcm-arc-color').trim() || colors.arc,
        core: style.getPropertyValue('--wcm-core').trim() || colors.core,
        additive: style.getPropertyValue('--wcm-additive').trim() !== '0',
      };
    };

    const dotSetFor = (scale: number) => {
      const { locations: list } = stateRef.current;
      if (dotCache.locations !== list) dotCache = { locations: list, sets: new Map() };
      const step = clamp(Math.ceil(4 / scale), 1, 4);
      let set = dotCache.sets.get(step);
      if (!set) {
        set = buildDotSet(step, list);
        dotCache.sets.set(step, set);
      }
      return set;
    };

    const syncArcStates = () => {
      const { arcs: list } = stateRef.current;
      if (arcsRef === list) return;
      arcsRef = list;
      arcStates = list.map((_, i) => ({ lit: 0, trace: 1, u: 0.12 + ((i * 0.37) % 0.5) }));
    };

    const retarget = () => {
      const { locations: list, arcs: arcList, cameraIndex: index } = stateRef.current;
      if (!width) return;
      target = frameSelection(list, arcList, index, width, height);
      if (!ready) {
        ready = true;
        Object.assign(cam, target);
        if (!reduced.matches) cam.ls -= 0.18;
      }
      kick();
    };
    retargetRef.current = retarget;

    const stepCamera = (dt: number) => {
      let moving = false;
      const keys: (keyof Cam)[] = ['x', 'y', 'ls'];
      for (const key of keys) {
        const omega = key === 'ls' ? 4.4 : 5.6;
        const steps = Math.max(1, Math.ceil(dt / 0.008));
        const h = dt / steps;
        for (let k = 0; k < steps; k++) {
          velocity[key] += (omega * omega * (target[key] - cam[key]) - 2 * omega * velocity[key]) * h;
          cam[key] += velocity[key] * h;
        }
        const limit = key === 'ls' ? 0.0008 : 0.006;
        if (Math.abs(target[key] - cam[key]) < limit && Math.abs(velocity[key]) < limit * 4) {
          cam[key] = target[key];
          velocity[key] = 0;
        } else moving = true;
      }
      return moving;
    };

    const drawBase = () => {
      const scale = Math.exp(cam.ls);
      const sx = (x: number) => (x - cam.x) * scale + width / 2;
      const sy = (y: number) => (y - cam.y) * scale + height / 2;
      baseCtx.clearRect(0, 0, width, height);
      const front = introTime < SWEEP_SECONDS + 0.3 ? sx((introTime / SWEEP_SECONDS) * WORLD_W) : Infinity;
      baseCtx.save();
      baseCtx.beginPath();
      baseCtx.rect(0, 0, Math.min(front, width), height);
      baseCtx.clip();

      baseCtx.strokeStyle = colors.dot;
      baseCtx.lineWidth = 1;
      baseCtx.globalAlpha = 0.1;
      baseCtx.beginPath();
      for (let lon = 0; lon <= WORLD_W; lon += 30) {
        baseCtx.moveTo(Math.round(sx(lon)) + 0.5, 0);
        baseCtx.lineTo(Math.round(sx(lon)) + 0.5, height);
      }
      for (let lat = -30; lat <= 60; lat += 30) {
        baseCtx.moveTo(0, Math.round(sy(TOP_LAT - lat)) + 0.5);
        baseCtx.lineTo(width, Math.round(sy(TOP_LAT - lat)) + 0.5);
      }
      baseCtx.stroke();

      const set = dotSetFor(scale);
      const radius = clamp(set.step * scale * 0.3, 0.7, 3.2);
      baseCtx.fillStyle = colors.dot;
      set.buckets.forEach((bucket, b) => {
        baseCtx.globalAlpha = (b + 0.6) / DOT_BUCKETS;
        baseCtx.beginPath();
        for (const i of bucket) {
          const x = sx(set.xs[i]);
          const y = sy(set.ys[i]);
          if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
          baseCtx.moveTo(x + radius, y);
          baseCtx.arc(x, y, radius, 0, TAU);
        }
        baseCtx.fill();
      });
      baseCtx.restore();

      if (front < width + 60) {
        baseCtx.fillStyle = colors.arc;
        const band = 70;
        for (let i = 0; i < set.xs.length; i++) {
          const x = sx(set.xs[i]);
          if (x > front || x < front - band) continue;
          baseCtx.globalAlpha = Math.pow(1 - (front - x) / band, 2) * 0.85;
          baseCtx.beginPath();
          baseCtx.arc(x, sy(set.ys[i]), radius * 1.15, 0, TAU);
          baseCtx.fill();
        }
      }
      baseCtx.globalAlpha = 1;
      baseDirty = false;
    };

    const placeMarkers = () => {
      const scale = Math.exp(cam.ls);
      stateRef.current.locations.forEach((location, i) => {
        const el = markerRefs.current[i];
        if (!el) return;
        const p = project(location.latitude, location.longitude);
        el.style.transform = `translate3d(${(p.x - cam.x) * scale + width / 2}px, ${(p.y - cam.y) * scale + height / 2}px, 0)`;
      });
    };

    const drawFx = (dt: number, snap: boolean) => {
      const { active: activeIndex, locations: list, arcs: arcList, isPlayOn: playing } = stateRef.current;
      syncArcStates();
      const scale = Math.exp(cam.ls);
      const sx = (x: number) => (x - cam.x) * scale + width / 2;
      const sy = (y: number) => (y - cam.y) * scale + height / 2;
      const set = dotSetFor(scale);
      const radius = clamp(set.step * scale * 0.3, 0.7, 3.2);
      const glowOp: GlobalCompositeOperation = colors.additive ? 'lighter' : 'source-over';
      let busy = false;
      fxCtx.clearRect(0, 0, width, height);

      const lightDots = (wx: number, wy: number, reach: number, strength: number) => {
        const cx = Math.floor(wx / set.step);
        const cy = Math.floor(wy / set.step);
        const span = Math.ceil(reach / set.step);
        for (let r = Math.max(0, cy - span); r <= Math.min(set.rows - 1, cy + span); r++) {
          for (let c = Math.max(0, cx - span); c <= Math.min(set.cols - 1, cx + span); c++) {
            const i = set.grid[r * set.cols + c];
            if (i < 0) continue;
            const d = Math.hypot(set.xs[i] - wx, set.ys[i] - wy);
            if (d > reach) continue;
            const falloff = (1 - d / reach) ** 2;
            fxCtx.globalAlpha = falloff * strength;
            fxCtx.beginPath();
            fxCtx.arc(sx(set.xs[i]), sy(set.ys[i]), radius * (1 + falloff * 0.5), 0, TAU);
            fxCtx.fill();
          }
        }
      };

      const activeLocation = activeIndex === null ? undefined : list[activeIndex];
      const goal = activeLocation ? 1 : 0;
      if (activeLocation) {
        const p = project(activeLocation.latitude, activeLocation.longitude);
        if (spot.strength < 0.03 || snap) {
          spot.x = p.x;
          spot.y = p.y;
        } else {
          spot.x += (p.x - spot.x) * 0.18;
          spot.y += (p.y - spot.y) * 0.18;
        }
      }
      spot.strength = snap ? goal : spot.strength + (goal - spot.strength) * 0.14;
      if (Math.abs(goal - spot.strength) > 0.01) busy = true;
      fxCtx.fillStyle = colors.arc;
      if (spot.strength > 0.01) lightDots(spot.x, spot.y, 9, spot.strength * 0.9);

      if (activeIndex !== lastActive) {
        lastActive = activeIndex;
        arcList.forEach((arc, i) => {
          if (activeIndex !== null && (arc.from === activeIndex || arc.to === activeIndex)) {
            arcStates[i].trace = snap ? 1 : 0;
            arcStates[i].u = 0;
          }
        });
      }

      const dim = spot.strength;
      const at = { x: 0, y: 0 };
      const pointAt = (arc: Arc, p: number) => {
        const f = clamp(p, 0, 1) * ARC_SAMPLES;
        const i = Math.min(ARC_SAMPLES - 1, Math.floor(f));
        const t = f - i;
        at.x = sx(arc.pts[i * 2] + (arc.pts[i * 2 + 2] - arc.pts[i * 2]) * t);
        at.y = sy(arc.pts[i * 2 + 1] + (arc.pts[i * 2 + 3] - arc.pts[i * 2 + 1]) * t);
      };
      const tracePath = (arc: Arc, from: number, to: number) => {
        fxCtx.beginPath();
        const i0 = Math.floor(from * ARC_SAMPLES);
        const i1 = Math.ceil(to * ARC_SAMPLES);
        for (let i = i0; i <= i1; i++) {
          const x = sx(arc.pts[i * 2]);
          const y = sy(arc.pts[i * 2 + 1]);
          if (i === i0) fxCtx.moveTo(x, y);
          else fxCtx.lineTo(x, y);
        }
      };

      fxCtx.lineCap = 'round';
      fxCtx.lineJoin = 'round';
      arcList.forEach((arc, i) => {
        const state = arcStates[i];
        const isLit = activeIndex !== null && (arc.from === activeIndex || arc.to === activeIndex);
        const litGoal = isLit ? 1 : 0;
        state.lit = snap ? litGoal : state.lit + (litGoal - state.lit) * 0.14;
        if (Math.abs(litGoal - state.lit) > 0.01) busy = true;
        if (state.trace < 1) {
          state.trace = Math.min(1, state.trace + dt * 1.5);
          busy = true;
        }
        const fromX = arc.pts[0];
        const introDelay = 0.2 + (fromX / WORLD_W) * SWEEP_SECONDS + 0.2;
        const reveal = easeOut(clamp((introTime - introDelay) / 1.2, 0, 1));
        if (reveal < 1) busy = true;
        if (reveal <= 0) return;
        const drawn = Math.max(0.02, reveal);
        const fade = 1 - dim * (1 - state.lit) * 0.88;
        const railAlpha = 0.3 * fade + state.lit * 0.4;

        fxCtx.strokeStyle = colors.arc;
        tracePath(arc, 0, drawn);
        fxCtx.globalCompositeOperation = glowOp;
        fxCtx.globalAlpha = railAlpha * 0.2;
        fxCtx.lineWidth = 4;
        fxCtx.stroke();
        fxCtx.globalCompositeOperation = 'source-over';
        fxCtx.globalAlpha = railAlpha;
        fxCtx.lineWidth = 1;
        fxCtx.stroke();

        const reverse = activeIndex !== null && arc.to === activeIndex;
        if (state.lit > 0.02 && state.trace > 0) {
          const t = easeOut(state.trace);
          if (reverse) tracePath(arc, 1 - t, 1);
          else tracePath(arc, 0, t);
          fxCtx.globalCompositeOperation = glowOp;
          fxCtx.globalAlpha = state.lit * 0.9;
          fxCtx.lineWidth = 1.8;
          fxCtx.stroke();
          fxCtx.globalCompositeOperation = 'source-over';
        }

        if (reveal < 0.97) return;
        if (snap) return; // reduced-motion: rails and lit traces stay, comets and landing rings do not
        if (playing) state.u += (dt / (3.6 + (i % 3) * 0.8)) * (1 + state.lit * 0.9);
        const cycle = state.u % 1;
        const cometAlpha = fade;
        const dirReverse = reverse;
        if (cycle < TRAVEL_SHARE) {
          const p = easeInOut(cycle / TRAVEL_SHARE);
          const tail = 0.24;
          const segments = 14;
          fxCtx.globalCompositeOperation = glowOp;
          fxCtx.strokeStyle = colors.arc;
          for (let k = 0; k < segments; k++) {
            const a = p - (k / segments) * tail;
            const b = p - ((k + 1) / segments) * tail;
            if (b < 0) break;
            const lead = 1 - k / segments;
            pointAt(arc, dirReverse ? 1 - a : a);
            const ax = at.x;
            const ay = at.y;
            pointAt(arc, dirReverse ? 1 - b : b);
            fxCtx.beginPath();
            fxCtx.moveTo(ax, ay);
            fxCtx.lineTo(at.x, at.y);
            fxCtx.globalAlpha = Math.pow(lead, 1.7) * 0.95 * cometAlpha;
            fxCtx.lineWidth = 0.7 + lead * 2;
            fxCtx.stroke();
          }
          pointAt(arc, dirReverse ? 1 - p : p);
          const edgeFade = Math.min(1, p * 8, (1 - p) * 8 + 0.3);
          fxCtx.fillStyle = colors.arc;
          for (const [r, a] of [[11, 0.09], [6, 0.2], [3.4, 0.45]] as const) {
            fxCtx.globalAlpha = a * cometAlpha * edgeFade;
            fxCtx.beginPath();
            fxCtx.arc(at.x, at.y, r, 0, TAU);
            fxCtx.fill();
          }
          fxCtx.globalCompositeOperation = 'source-over';
          fxCtx.globalAlpha = cometAlpha * edgeFade;
          fxCtx.fillStyle = colors.core;
          fxCtx.beginPath();
          fxCtx.arc(at.x, at.y, 1.7, 0, TAU);
          fxCtx.fill();
          fxCtx.fillStyle = colors.arc;
          const hp = dirReverse ? 1 - p : p;
          const f = clamp(hp, 0, 1) * ARC_SAMPLES;
          const hi = Math.min(ARC_SAMPLES, Math.round(f));
          if (cometAlpha > 0.3) lightDots(arc.pts[hi * 2], arc.pts[hi * 2 + 1], 5, 0.8 * cometAlpha);
        } else {
          const q = (cycle - TRAVEL_SHARE) / 0.3;
          if (q < 1) {
            pointAt(arc, dirReverse ? 0 : 1);
            fxCtx.globalCompositeOperation = glowOp;
            fxCtx.strokeStyle = colors.arc;
            fxCtx.globalAlpha = (1 - q) ** 2 * 0.85 * cometAlpha;
            fxCtx.lineWidth = 1.3;
            fxCtx.beginPath();
            fxCtx.arc(at.x, at.y, 3 + easeOut(q) * 17, 0, TAU);
            fxCtx.stroke();
            fxCtx.globalCompositeOperation = 'source-over';
          }
        }
      });
      fxCtx.globalAlpha = 1;
      fxCtx.globalCompositeOperation = 'source-over';
      return busy;
    };

    const loop = (time: number) => {
      frame = 0;
      const snap = reduced.matches;
      const dt = Math.min(0.05, Math.max(0.001, (time - last) / 1000));
      last = time;
      if (introStart < 0) introStart = time;
      introTime = snap ? 99 : (time - introStart) / 1000;
      let moving = false;
      if (snap) {
        if (cam.x !== target.x || cam.y !== target.y || cam.ls !== target.ls) baseDirty = true;
        Object.assign(cam, target);
      } else moving = stepCamera(dt);
      if (moving || baseDirty || introTime < SWEEP_SECONDS + 0.4) drawBase();
      placeMarkers();
      const busy = drawFx(dt, snap);
      const introRunning = introTime < SWEEP_SECONDS + 2.2;
      if (visible && !snap && (stateRef.current.isPlayOn || moving || busy || introRunning)) frame = requestAnimationFrame(loop);
    };

    function kick() {
      if (frame || !visible || !width) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    }
    kickRef.current = () => {
      readColors();
      baseDirty = true;
      kick();
    };

    const resize = () => {
      const rect = root.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      for (const canvas of [base, fx]) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      fxCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      setSize({ width, height });
      readColors();
      baseDirty = true;
      const wasReady = ready;
      retarget();
      if (wasReady) Object.assign(cam, target);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setIsOnScreen(visible);
      if (visible) {
        setIsRevealed(true);
        kick();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    intersectionObserver.observe(root);

    const onMotionChange = () => {
      if (reduced.matches) setIsPlayOn(false);
      kick();
    };
    reduced.addEventListener('change', onMotionChange);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reduced.removeEventListener('change', onMotionChange);
    };
  }, []);

  useEffect(() => {
    retargetRef.current();
  }, [cameraIndex, locations, arcs, size.width, size.height]);

  useEffect(() => {
    kickRef.current();
  }, [active, isPlayOn, backgroundStyle, dotColor, arcColor, locations, arcs]);

  const rootStyle = {
    ...(dotColor ? { '--wcm-dot-color': dotColor } : {}),
    ...(arcColor ? { '--wcm-arc-color': arcColor } : {}),
  } as CSSProperties;

  const rootClass = [
    styles.root,
    backgroundStyle === 'light' ? styles.themeLight : styles.themeDark,
    isRevealed ? styles.revealed : '',
    isPlayOn ? '' : styles.paused,
    isOnScreen ? '' : styles.offscreen,
    active === null ? '' : styles.focusMode,
    className ?? '',
  ].join(' ');

  const hudLocation = hudIndex === null ? undefined : locations[hudIndex];
  const narrow = size.width > 0 && size.width < NARROW_WIDTH;
  const hudRows = hudRoutes.slice(0, narrow ? 3 : 6);

  return (
    <div className={styles.frame}>
      <div
        ref={rootRef}
        className={rootClass}
        style={rootStyle}
        role="group"
        aria-label={mapLabel}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget || event.target === fxRef.current) setPinned(null);
        }}
      >
        <canvas ref={baseRef} className={styles.canvas} aria-hidden="true" />
        <canvas ref={fxRef} className={styles.canvas} aria-hidden="true" />
        <span className={styles.vignette} aria-hidden="true" />

        {locations.map((location, index) => {
          const isActive = index === active;
          const isLinked = linked.has(index);
          const isDimmed = active !== null && !isActive && !isLinked;
          const spot = labelSpots?.[index];
          const linkedNames = arcs
            .filter((arc) => arc.from === index || arc.to === index)
            .map((arc) => locations[arc.from === index ? arc.to : arc.from].name);
          const markerClass = [
            styles.marker,
            isActive ? styles.markerActive : '',
            isLinked ? styles.markerLinked : '',
            isDimmed ? styles.markerDim : '',
          ].join(' ');
          const labelClass = [
            styles.label,
            spot?.visible ? styles.labelShown : '',
            isActive ? styles.labelActive : '',
          ].join(' ');
          const p = project(location.latitude, location.longitude);
          const markerStyle = { '--pop': `${0.1 + (p.x / WORLD_W) * SWEEP_SECONDS}s`, '--i': index } as CSSProperties;
          const labelStyle = spot
            ? ({ '--lx': `${spot.x}px`, '--ly': `${spot.y}px`, transformOrigin: spot.origin } as CSSProperties)
            : undefined;
          return (
            <button
              key={`${location.name}-${index}`}
              ref={(node) => {
                markerRefs.current[index] = node;
              }}
              type="button"
              className={markerClass}
              style={markerStyle}
              aria-label={
                linkedNames.length ? `${location.name}, ${connectedToLabel} ${linkedNames.join(', ')}` : location.name
              }
              aria-pressed={pinned === index}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovered(index);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHovered(null);
              }}
              onFocus={(event) => {
                setFocused(index);
                try {
                  if (event.currentTarget.matches(':focus-visible')) setKeyboardFocus(index);
                } catch {
                  setKeyboardFocus(index);
                }
              }}
              onBlur={() => {
                setFocused(null);
                setKeyboardFocus(null);
              }}
              onClick={() => setPinned((current) => (current === index ? null : index))}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                setPinned(null);
                event.currentTarget.blur();
              }}
            >
              <span className={styles.reticle} aria-hidden="true" />
              <span className={styles.ring} aria-hidden="true" />
              <span className={styles.core} aria-hidden="true" />
              <span
                ref={(node) => {
                  labelRefs.current[index] = node;
                }}
                className={labelClass}
                style={labelStyle}
                aria-hidden="true"
              >
                {location.name}
              </span>
            </button>
          );
        })}

        <div ref={hudRef} className={active === null ? styles.hud : `${styles.hud} ${styles.hudShown}`} aria-hidden="true">
          {hudLocation && (
            <div key={hudIndex} className={styles.hudBody}>
              <p className={styles.hudName}>{hudLocation.name}</p>
              <p className={styles.hudCoords}>{formatCoordinates(hudLocation.latitude, hudLocation.longitude)}</p>
              <ul className={styles.hudRoutes}>
                {hudRows.map((route, row) => (
                  <li key={route.key} className={styles.hudRoute} style={{ '--row': row } as CSSProperties}>
                    <span className={styles.hudRouteName}>{route.name}</span>
                    <span className={styles.hudRouteKm}>
                      {Math.round(route.km).toLocaleString('en-US')} {distanceUnit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className={styles.playToggle}
          aria-label={isPlayOn ? pauseLabel : playLabel}
          onClick={() => setIsPlayOn((value) => !value)}
        >
          {isPlayOn ? (
            <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="7" y="6" width="3.2" height="12" rx="1.2" fill="currentColor" />
              <rect x="13.8" y="6" width="3.2" height="12" rx="1.2" fill="currentColor" />
            </svg>
          ) : (
            <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 6.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8a.8.8 0 0 0-1.2.7Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className={styles.grain} aria-hidden="true" />
      </div>
    </div>
  );
}
```

```css
@property --wcm-dot-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #46536b;
}

@property --wcm-arc-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #46f59c;
}

@font-face {
  font-family: 'Wix Madefor Display';
  src: url('./fonts/WixMadeforDisplay-Regular.ttf') format('truetype');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Wix Madefor Display';
  src: url('./fonts/WixMadeforDisplay-Bold.ttf') format('truetype');
  font-weight: 700;
  font-display: swap;
}

.frame {
  container: wcm / inline-size;
  inline-size: 100%;
}

.root {
  --wcm-font: 'Wix Madefor Display', 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
  --wcm-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  --wcm-play: paused;
  --wcm-motion-display: block;
  --wcm-vignette: inset 0 0 110px 26px rgba(0, 3, 8, 0.55);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  inline-size: 100%;
  aspect-ratio: 2.05 / 1;
  min-block-size: 308px;
  border-radius: 22px;
  background-color: var(--wcm-bg);
  background-image:
    radial-gradient(85% 62% at 40% 14%, var(--wcm-surface-hi) 0%, transparent 72%),
    linear-gradient(180deg, transparent 58%, var(--wcm-floor) 100%);
  border: 1px solid var(--wcm-frame);
  box-shadow: var(--wcm-shadow);
  color: var(--wcm-ink);
  font-family: var(--wcm-font);
  -webkit-tap-highlight-color: transparent;
}

.root ::selection {
  background: color-mix(in srgb, var(--wcm-arc-color) 30%, transparent);
}

.themeDark {
  --wcm-bg: #04070d;
  --wcm-surface-hi: rgba(70, 245, 156, 0.05);
  --wcm-floor: #01030a;
  --wcm-frame: rgba(140, 255, 190, 0.1);
  --wcm-shadow: inset 0 1px 0 rgba(190, 255, 220, 0.06), 0 46px 90px -52px rgba(0, 4, 10, 0.92);
  --wcm-dot-color: #46536b;
  --wcm-arc-color: #46f59c;
  --wcm-pulse-color: color-mix(in srgb, var(--wcm-arc-color) 14%, #ffffff);
  --wcm-ink: #ecf4ef;
  --wcm-ink-muted: rgba(199, 216, 206, 0.74);
  --wcm-data: rgba(151, 235, 192, 0.82);
  --wcm-chip-bg: rgba(6, 12, 18, 0.92);
  --wcm-chip-border: rgba(140, 255, 190, 0.14);
  --wcm-chip-active: color-mix(in srgb, var(--wcm-arc-color) 42%, transparent);
  --wcm-additive: 1;
  --wcm-grain-opacity: 0.06;
  --wcm-scan-opacity: 0.035;
}

.themeLight {
  --wcm-bg: #e8edf1;
  --wcm-surface-hi: #f9fcfd;
  --wcm-floor: #d5dde4;
  --wcm-frame: rgba(23, 42, 62, 0.12);
  --wcm-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 46px 90px -56px rgba(18, 40, 62, 0.42);
  --wcm-dot-color: #33415c;
  --wcm-arc-color: #0b7d4f;
  --wcm-pulse-color: color-mix(in srgb, var(--wcm-arc-color) 58%, #001c10);
  --wcm-ink: #16243a;
  --wcm-ink-muted: rgba(22, 36, 58, 0.7);
  --wcm-data: #2e5a7a;
  --wcm-chip-bg: rgba(249, 252, 253, 0.94);
  --wcm-chip-border: rgba(23, 42, 62, 0.14);
  --wcm-chip-active: color-mix(in srgb, var(--wcm-arc-color) 45%, transparent);
  --wcm-additive: 0;
  --wcm-grain-opacity: 0.05;
  --wcm-scan-opacity: 0;
  --wcm-vignette: inset 0 0 90px 18px rgba(30, 52, 74, 0.14);
}

.revealed {
  --wcm-play: running;
}

.offscreen {
  --wcm-play: paused;
}

.paused {
  --wcm-motion-display: none;
}

.focusMode {
  --wcm-vignette: inset 0 0 130px 42px rgba(0, 3, 8, 0.64);
}

.canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  box-shadow: var(--wcm-vignette);
  transition: box-shadow 0.6s ease;
}

.marker {
  --reticle-o: 0;
  --core-scale: 1;

  position: absolute;
  z-index: 2;
  inline-size: 44px;
  block-size: 44px;
  margin-block-start: -22px;
  margin-inline-start: -22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  outline: none;
  opacity: 0;
  animation: wcmMarkerIn 0.5s ease var(--pop, 0s) backwards;
  animation-play-state: var(--wcm-play);
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.marker:hover,
.marker:focus-visible {
  --reticle-o: 1;
}

.marker:focus-visible {
  box-shadow: 0 0 0 2px var(--wcm-chip-active), 0 0 0 4px var(--wcm-chip-bg);
}

.markerLinked {
  z-index: 3;
}

.markerActive {
  z-index: 4;
  --reticle-o: 1;
  --reticle-turn: rotate(0deg) scale(1);
  --core-scale: 1.55;
}

.markerDim {
  opacity: 0.34;
}

.reticle {
  --reticle-c: color-mix(in srgb, var(--wcm-arc-color) 62%, #ffffff 38%);

  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 30px;
  block-size: 30px;
  margin-block-start: -15px;
  margin-inline-start: -15px;
  pointer-events: none;
  background-image:
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c)),
    linear-gradient(var(--reticle-c), var(--reticle-c));
  background-repeat: no-repeat;
  background-size:
    34% 1.5px, 1.5px 34%,
    34% 1.5px, 1.5px 34%,
    34% 1.5px, 1.5px 34%,
    34% 1.5px, 1.5px 34%;
  background-position:
    0 0, 0 0,
    100% 0, 100% 0,
    0 100%, 0 100%,
    100% 100%, 100% 100%;
  opacity: var(--reticle-o);
  transform: var(--reticle-turn, rotate(45deg) scale(0.72));
  transition:
    opacity 0.24s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.core {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 9px;
  block-size: 9px;
  margin-block-start: -4.5px;
  margin-inline-start: -4.5px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle at 35% 30%, var(--wcm-pulse-color), var(--wcm-arc-color) 62%);
  box-shadow:
    0 0 0 2.5px var(--wcm-bg),
    0 0 0 3.5px var(--wcm-chip-active),
    0 0 16px 3px color-mix(in srgb, var(--wcm-arc-color) 55%, transparent);
  transform: scale(var(--core-scale));
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: wcmCoreIn 0.66s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--pop, 0s) + 0.06s) backwards;
  animation-play-state: var(--wcm-play);
}

.ring {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 9px;
  block-size: 9px;
  margin-block-start: -4.5px;
  margin-inline-start: -4.5px;
  display: var(--wcm-motion-display);
  border: 1.5px solid var(--wcm-arc-color);
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  animation: wcmRing 3.4s cubic-bezier(0.2, 0.6, 0.3, 1) calc(var(--i, 0) * -0.43s) infinite;
  animation-play-state: var(--wcm-play);
}

.label {
  position: absolute;
  inset-block-start: calc(50% + var(--ly, -14px));
  inset-inline-start: calc(50% + var(--lx, 12px));
  inline-size: max-content;
  max-inline-size: 22ch;
  padding-block: 5px;
  padding-inline: 9px 10px;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 8px;
  background: var(--wcm-chip-bg);
  color: var(--wcm-ink);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.005em;
  text-align: start;
  overflow-wrap: anywhere;
  pointer-events: none;
  box-shadow: 0 10px 24px -16px rgba(0, 0, 0, 0.55);
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity 0.28s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.28s ease;
}

.labelShown {
  opacity: 1;
  transform: none;
}

.labelActive {
  opacity: 1;
  transform: none;
  max-inline-size: 30ch;
  border-color: var(--wcm-chip-active);
}

.hud {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-start: 14px;
  z-index: 5;
  inline-size: min(320px, calc(100% - 88px));
  padding: 14px 16px 13px;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 12px;
  background: var(--wcm-chip-bg);
  box-shadow: 0 20px 44px -22px rgba(0, 0, 0, 0.62);
  pointer-events: none;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.3s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.hudShown {
  opacity: 1;
  transform: none;
}

.hudBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hudName {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.012em;
  color: var(--wcm-ink);
  animation: wcmHudIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hudCoords {
  margin: 0;
  font-family: var(--wcm-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  line-height: 1.4;
  color: var(--wcm-data);
  font-variant-numeric: tabular-nums;
  animation: wcmHudIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) 40ms both;
}

.hudRoutes {
  margin: 9px 0 0;
  padding: 9px 0 0;
  border-block-start: 1px solid var(--wcm-chip-border);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hudRoute {
  display: flex;
  align-items: baseline;
  gap: 10px;
  animation: wcmHudIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) calc(80ms + var(--row, 0) * 45ms) both;
}

.hudRouteName {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--wcm-ink);
}

.hudRouteKm {
  margin-inline-start: auto;
  font-family: var(--wcm-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.3;
  white-space: nowrap;
  color: var(--wcm-data);
  font-variant-numeric: tabular-nums;
}

.playToggle {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-end: 14px;
  z-index: 5;
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  padding: 0;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 50%;
  background: var(--wcm-chip-bg);
  color: var(--wcm-ink);
  cursor: pointer;
  opacity: 0.6;
  transition:
    opacity 0.25s ease,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.25s ease;
}

.playToggle:hover {
  opacity: 1;
  border-color: var(--wcm-chip-active);
}

.playToggle:active {
  transform: scale(0.92);
}

.playToggle:focus-visible {
  opacity: 1;
  outline: 2px solid var(--wcm-arc-color);
  outline-offset: 3px;
}

.playIcon {
  inline-size: 18px;
  block-size: 18px;
}

.grain {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0 1px, transparent 1px 3px),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: var(--wcm-grain-opacity);
  mix-blend-mode: overlay;
}

@container wcm (max-width: 560px) {
  .root {
    aspect-ratio: 0.92;
    min-block-size: 340px;
    border-radius: 16px;
  }

  .playToggle {
    inset-block-end: auto;
    inset-block-start: 10px;
    inset-inline-end: 10px;
  }

  .hud {
    inset-block-end: 10px;
    inset-inline-start: 10px;
    inline-size: calc(100% - 20px);
    padding: 12px 14px 11px;
  }

  .hudName {
    font-size: 15px;
  }

  .hudRouteName {
    font-size: 12.5px;
  }

  .label {
    max-inline-size: 18ch;
    font-size: 12.5px;
    padding-block: 4px;
    padding-inline: 8px 9px;
  }

  .labelActive {
    max-inline-size: 22ch;
  }
}

@container wcm (min-width: 1100px) {
  .root {
    border-radius: 26px;
  }
}

@keyframes wcmMarkerIn {
  from {
    opacity: 0;
  }
}

@keyframes wcmCoreIn {
  from {
    transform: scale(0);
  }
}

@keyframes wcmRing {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(4.4);
  }
}

@keyframes wcmHudIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .marker,
  .core {
    animation: none;
    opacity: 1;
  }

  .ring {
    display: none;
  }

  .reticle {
    transition: none;
  }

  .core {
    transition: none;
  }

  .label,
  .hud,
  .vignette {
    transition-duration: 0.01ms;
  }

  .hudName,
  .hudCoords,
  .hudRoute {
    animation: none;
  }
}
```
