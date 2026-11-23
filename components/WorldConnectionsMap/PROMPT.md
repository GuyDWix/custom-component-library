Create a custom element called "World Connections Map". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: locations (name, latitude, longitude), connections (from location, to location), dot color, arc color, background style (dark | light), show labels. Add other settings if they help.

```tsx
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
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

const MASK_COLS = 360;
const MASK_ROWS = 142;
const MASK_TOP_LAT = 84;
const VIEW_W = MASK_COLS;
const VIEW_H = MASK_ROWS;
const RUN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

let landMask: Uint8Array | null = null;
function getLandMask(): Uint8Array {
  if (landMask) return landMask;
  const mask = new Uint8Array(MASK_COLS * MASK_ROWS);
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

function project(latitude: number, longitude: number) {
  const lat = Math.max(MASK_TOP_LAT - MASK_ROWS, Math.min(MASK_TOP_LAT, latitude));
  const lon = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return { x: lon + 180, y: MASK_TOP_LAT - lat };
}

function formatCoordinates(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(1)}°${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}  ${lon}`;
}

interface Arc {
  key: string;
  from: number;
  to: number;
  path: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    let nx = -dy / length;
    let ny = dx / length;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const lift = Math.min(length * 0.32, 46);
    const cx = (a.x + b.x) / 2 + nx * lift;
    const cy = Math.max(2, (a.y + b.y) / 2 + ny * lift);
    const r = (n: number) => n.toFixed(2);
    arcs.push({
      key: `${from}-${to}-${index}`,
      from,
      to,
      path: `M${r(a.x)} ${r(a.y)}Q${r(cx)} ${r(cy)} ${r(b.x)} ${r(b.y)}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
    });
  });
  return arcs;
}

interface Dot {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkle: number;
}

function buildDots(width: number, height: number): Dot[] {
  const mask = getLandMask();
  const step = Math.max(1, Math.round((360 * 6.8) / width));
  const cellW = (width / MASK_COLS) * step;
  const dots: Dot[] = [];
  for (let row = 0; row + step <= MASK_ROWS; row += step) {
    for (let col = 0; col + step <= MASK_COLS; col += step) {
      let land = 0;
      for (let y = row; y < row + step; y++)
        for (let x = col; x < col + step; x++) land += mask[y * MASK_COLS + x];
      if (!land) continue;
      const coverage = land / (step * step);
      const x = ((col + step / 2) / MASK_COLS) * width;
      const y = ((row + step / 2) / MASK_ROWS) * height;
      const lightX = x / width - 0.42;
      const lightY = y / height - 0.28;
      const light = Math.max(0, 1 - Math.hypot(lightX * 1.1, lightY * 1.6));
      const hash = Math.abs(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1;
      dots.push({
        x,
        y,
        radius: cellW * (0.17 + 0.13 * Math.sqrt(coverage)),
        alpha: (0.3 + 0.5 * light) * (0.55 + 0.45 * coverage),
        twinkle: hash < 0.07 ? hash * 90 : -1,
      });
    }
  }
  return dots;
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

const LABEL_GAP = 12;
const DOT_CLEARANCE = 8;
const NARROW_WIDTH = 560;
const NARROW_LABEL_BUDGET = 3;

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
  mapWidth: number;
}

function placeLabels({ points, sizes, order, wanted, active, budget, bounds, obstacles, mapWidth }: PlaceInput) {
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
    const options = labelCandidates(w, h, p.x > mapWidth * 0.62);
    const boxOf = ([dx, dy]: [number, number, string]) => ({
      left: p.x + dx,
      top: p.y + dy,
      right: p.x + dx + w,
      bottom: p.y + dy + h,
    });
    const isActive = index === active;
    const canShow = wanted.has(index) && (isActive || shown < budget);
    const clear = (box: Box) =>
      inside(box, bounds) &&
      !placed.some((other) => overlaps(box, other)) &&
      !obstacles.some((other) => overlaps(box, other, 0)) &&
      !dots.some((dot, i) => i !== index && overlaps(box, dot, 0));
    let choice = canShow ? options.find((option) => clear(boxOf(option))) : undefined;
    if (!choice && canShow && isActive) {
      const [dx, dy, origin] = options.find((option) => inside(boxOf(option), bounds)) ?? options[0];
      const x = Math.min(Math.max(p.x + dx, bounds.left), bounds.right - w) - p.x;
      const y = Math.min(Math.max(p.y + dy, bounds.top), bounds.bottom - h) - p.y;
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

const GRATICULE = [
  { latitude: 23.44, major: false },
  { latitude: 0, major: true },
  { latitude: -23.44, major: false },
];

export default function WorldConnectionsMap({
  locations = DEFAULT_LOCATIONS,
  connections = DEFAULT_CONNECTIONS,
  dotColor,
  arcColor,
  backgroundStyle = 'dark',
  showLabels = true,
  mapLabel = 'Map of our locations and the routes between them',
  connectedToLabel = 'connected to',
  pauseLabel = 'Pause animation',
  playLabel = 'Play animation',
  className,
}: WorldConnectionsMapProps) {
  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [isPlayOn, setIsPlayOn] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isOnScreen, setIsOnScreen] = useState(true);

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [labelSpots, setLabelSpots] = useState<LabelSpot[] | null>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const active = hovered ?? focused ?? pinned;
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
    const root = rootRef.current;
    const map = mapRef.current;
    const toggle = toggleRef.current;
    if (!root || !map || !toggle || !mapSize.width) return;
    const points = locations.map((location) => {
      const p = project(location.latitude, location.longitude);
      return { x: (p.x / VIEW_W) * mapSize.width, y: (p.y / VIEW_H) * mapSize.height };
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
    const ox = map.offsetLeft;
    const oy = map.offsetTop;
    const edge = 8;
    setLabelSpots(
      placeLabels({
        points,
        sizes,
        order,
        wanted,
        active,
        budget: mapSize.width < NARROW_WIDTH ? NARROW_LABEL_BUDGET : Infinity,
        bounds: {
          left: edge - ox,
          top: edge - oy,
          right: root.clientWidth - ox - edge,
          bottom: root.clientHeight - oy - edge,
        },
        obstacles: [
          {
            left: toggle.offsetLeft - ox,
            top: toggle.offsetTop - oy,
            right: toggle.offsetLeft + toggle.offsetWidth - ox,
            bottom: toggle.offsetTop + toggle.offsetHeight - oy,
          },
        ],
        mapWidth: mapSize.width,
      }),
    );
  }, [mapSize, active, linked, degree, locations, showLabels]);

  const stateRef = useRef({ active, isPlayOn, locations });
  stateRef.current = { active, isPlayOn, locations };
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const map = mapRef.current;
    const base = baseCanvasRef.current;
    const fx = fxCanvasRef.current;
    if (!root || !map || !base || !fx) return;
    const baseCtx = base.getContext('2d');
    const fxCtx = fx.getContext('2d');
    if (!baseCtx || !fxCtx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) setIsPlayOn(false);

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let colors = { dot: '#5f6f86', arc: '#8eeaff' };
    let visible = true;
    let frame = 0;
    const spot = { x: 0, y: 0, strength: 0 };

    const readColors = () => {
      const style = getComputedStyle(root);
      colors = {
        dot: style.getPropertyValue('--wcm-dot-color').trim() || colors.dot,
        arc: style.getPropertyValue('--wcm-arc-color').trim() || colors.arc,
      };
    };

    const drawBase = () => {
      baseCtx.clearRect(0, 0, width, height);
      baseCtx.fillStyle = colors.dot;
      for (const dot of dots) {
        baseCtx.globalAlpha = dot.alpha;
        baseCtx.beginPath();
        baseCtx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        baseCtx.fill();
      }
      baseCtx.globalAlpha = 1;
    };

    const spotTarget = () => {
      const { active: index, locations: list } = stateRef.current;
      const location = index === null ? undefined : list[index];
      if (!location) return null;
      const p = project(location.latitude, location.longitude);
      return { x: (p.x / VIEW_W) * width, y: (p.y / VIEW_H) * height };
    };

    const drawFx = (time: number, animate: boolean, twinkle = false) => {
      fxCtx.clearRect(0, 0, width, height);
      const target = spotTarget();
      if (target) {
        if (spot.strength < 0.02 || !animate) {
          spot.x = target.x;
          spot.y = target.y;
        } else {
          spot.x += (target.x - spot.x) * 0.16;
          spot.y += (target.y - spot.y) * 0.16;
        }
      }
      const goal = target ? 1 : 0;
      spot.strength = animate ? spot.strength + (goal - spot.strength) * 0.12 : goal;

      if (spot.strength > 0.01) {
        const reach = Math.max(70, width * 0.13);
        fxCtx.fillStyle = colors.arc;
        for (const dot of dots) {
          const distance = Math.hypot(dot.x - spot.x, dot.y - spot.y);
          if (distance > reach) continue;
          const falloff = Math.pow(1 - distance / reach, 2);
          fxCtx.globalAlpha = falloff * spot.strength * 0.85;
          fxCtx.beginPath();
          fxCtx.arc(dot.x, dot.y, dot.radius * (1 + falloff * 0.35), 0, Math.PI * 2);
          fxCtx.fill();
        }
      }

      if (twinkle) {
        fxCtx.fillStyle = colors.arc;
        for (const dot of dots) {
          if (dot.twinkle < 0) continue;
          const glint = Math.pow(Math.max(0, Math.sin(time * 0.0007 + dot.twinkle)), 24);
          if (glint < 0.02) continue;
          fxCtx.globalAlpha = glint * 0.75;
          fxCtx.beginPath();
          fxCtx.arc(dot.x, dot.y, dot.radius * 1.1, 0, Math.PI * 2);
          fxCtx.fill();
        }
      }
      fxCtx.globalAlpha = 1;
      return Math.abs(goal - spot.strength) > 0.01;
    };

    const tick = (time: number) => {
      frame = 0;
      const playing = stateRef.current.isPlayOn;
      const easing = drawFx(time, true, playing);
      if (visible && (playing || easing)) frame = requestAnimationFrame(tick);
    };

    const redraw = () => {
      readColors();
      drawBase();
      if (!frame) {
        if (visible && !reducedMotion.matches) frame = requestAnimationFrame(tick);
        else drawFx(0, false);
      }
    };
    redrawRef.current = redraw;

    const resize = () => {
      const rect = map.getBoundingClientRect();
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
      dots = buildDots(width, height);
      setMapSize({ width, height });
      redraw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(map);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setIsOnScreen(visible);
      if (visible) {
        setIsRevealed(true);
        redraw();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    intersectionObserver.observe(root);

    const onMotionChange = () => {
      if (reducedMotion.matches) setIsPlayOn(false);
    };
    reducedMotion.addEventListener('change', onMotionChange);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener('change', onMotionChange);
    };
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [active, isPlayOn, backgroundStyle, dotColor, arcColor, locations]);

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

  const glowFilter = `${uid}-glow`;

  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={rootStyle}
      role="group"
      aria-label={mapLabel}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget || event.target === mapRef.current) setPinned(null);
      }}
    >
      <span className={styles.atmosphere} aria-hidden="true" />
      <div ref={mapRef} className={styles.map}>
        {GRATICULE.map((line) => (
          <span
            key={line.latitude}
            className={line.major ? styles.equator : styles.tropic}
            style={{ top: `${(project(line.latitude, 0).y / VIEW_H) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        <canvas ref={baseCanvasRef} className={styles.dotsBase} aria-hidden="true" />
        <canvas ref={fxCanvasRef} className={styles.dotsFx} aria-hidden="true" />

        <svg className={styles.arcs} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
          <defs>
            <filter id={glowFilter} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {arcs.map((arc) => (
              <linearGradient
                key={arc.key}
                id={`${uid}-g${arc.key}`}
                gradientUnits="userSpaceOnUse"
                x1={arc.x1}
                y1={arc.y1}
                x2={arc.x2}
                y2={arc.y2}
              >
                <stop offset="0" className={styles.stopFaint} />
                <stop offset="0.55" className={styles.stopFull} />
                <stop offset="1" className={styles.stopSoft} />
              </linearGradient>
            ))}
          </defs>

          {arcs.map((arc, index) => {
            const lit = active !== null && (arc.from === active || arc.to === active);
            const stateClass = active === null ? '' : lit ? styles.arcLit : styles.arcDim;
            const timing = {
              '--draw-delay': `${0.25 + index * 0.11}s`,
              '--pulse-delay': `${1.6 + index * 0.47}s`,
              '--pulse-duration': `${3.2 + (index % 3) * 0.55}s`,
            } as CSSProperties;
            return (
              <g key={arc.key} className={`${styles.arc} ${stateClass}`} style={timing}>
                <path className={styles.arcHalo} d={arc.path} pathLength={100} />
                <path
                  className={styles.arcLine}
                  d={arc.path}
                  pathLength={100}
                  stroke={`url(#${uid}-g${arc.key})`}
                />
                <g filter={`url(#${glowFilter})`}>
                  <path className={styles.pulseTrail} d={arc.path} pathLength={100} />
                  <path className={styles.pulse} d={arc.path} pathLength={100} />
                </g>
                <circle className={styles.landing} cx={arc.x2} cy={arc.y2} r={1.4} />
              </g>
            );
          })}
        </svg>

        {locations.map((location, index) => {
          const p = project(location.latitude, location.longitude);
          const isActive = index === active;
          const isLinked = linked.has(index);
          const spot = labelSpots?.[index];
          const linkedNames = arcs
            .filter((arc) => arc.from === index || arc.to === index)
            .map((arc) => locations[arc.from === index ? arc.to : arc.from].name);
          const isDimmed = active !== null && !isActive && !isLinked;
          const markerClass = [
            styles.marker,
            isActive ? styles.markerActive : '',
            isLinked ? styles.markerLinked : '',
            isDimmed ? styles.markerDim : '',
          ].join(' ');
          const labelClass = [
            styles.label,
            spot?.visible ? styles.labelShown : '',
            spot?.visible && isLinked ? styles.labelLinked : '',
            isActive ? styles.labelActive : '',
          ].join(' ');
          const labelStyle = spot
            ? ({ '--lx': `${spot.x}px`, '--ly': `${spot.y}px`, transformOrigin: spot.origin } as CSSProperties)
            : undefined;
          return (
            <button
              key={`${location.name}-${index}`}
              type="button"
              className={markerClass}
              style={{
                left: `${(p.x / VIEW_W) * 100}%`,
                top: `${(p.y / VIEW_H) * 100}%`,
                '--i': index,
              } as CSSProperties}
              aria-label={
                linkedNames.length
                  ? `${location.name}, ${connectedToLabel} ${linkedNames.join(', ')}`
                  : location.name
              }
              aria-pressed={pinned === index}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovered(index);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHovered(null);
              }}
              onFocus={() => setFocused(index)}
              onBlur={() => setFocused(null)}
              onClick={() => setPinned((current) => (current === index ? null : index))}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                setPinned(null);
                event.currentTarget.blur();
              }}
            >
              <span className={styles.ring} aria-hidden="true" />
              <span className={isActive ? `${styles.core} ${styles.coreActive}` : styles.core} aria-hidden="true" />
              <span
                ref={(node) => {
                  labelRefs.current[index] = node;
                }}
                className={labelClass}
                style={labelStyle}
                aria-hidden="true"
              >
                <span className={isActive ? `${styles.labelName} ${styles.labelNameFull}` : styles.labelName}>
                  {location.name}
                </span>
                <span className={isActive ? `${styles.labelMeta} ${styles.labelMetaShown}` : styles.labelMeta}>
                  {formatCoordinates(location.latitude, location.longitude)}
                </span>
              </span>
            </button>
          );
        })}
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
  );
}
```

```css
@property --wcm-dot-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #5f6f86;
}

@property --wcm-arc-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #8eeaff;
}

.root {
  --wcm-font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --wcm-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  --wcm-play: paused;

  position: relative;
  isolation: isolate;
  overflow: hidden;
  inline-size: 100%;
  container: wcm / inline-size;
  border-radius: 28px;
  background-color: var(--wcm-bg);
  background-image:
    radial-gradient(90% 75% at 44% 22%, var(--wcm-surface-hi) 0%, transparent 70%),
    linear-gradient(180deg, transparent 55%, var(--wcm-floor) 100%);
  border: 1px solid var(--wcm-frame);
  box-shadow: var(--wcm-shadow);
  color: var(--wcm-ink);
  font-family: var(--wcm-font);
  -webkit-tap-highlight-color: transparent;
}

.themeDark {
  --wcm-bg: #03060d;
  --wcm-surface-hi: #0c1a2f;
  --wcm-floor: #010309;
  --wcm-frame: rgba(170, 225, 255, 0.08);
  --wcm-shadow: inset 0 1px 0 rgba(200, 235, 255, 0.07), 0 50px 90px -50px rgba(0, 4, 12, 0.9);
  --wcm-dot-color: #5f6f86;
  --wcm-arc-color: #8eeaff;
  --wcm-pulse-color: color-mix(in srgb, var(--wcm-arc-color) 12%, #ffffff);
  --wcm-glow-color: #2fe0c0;
  --wcm-ink: #f2f9ff;
  --wcm-ink-muted: rgba(214, 233, 248, 0.72);
  --wcm-chip-bg: rgba(5, 11, 22, 0.86);
  --wcm-chip-border: rgba(170, 225, 255, 0.12);
  --wcm-chip-shine: rgba(220, 245, 255, 0.09);
  --wcm-dot-opacity: 1;
  --wcm-grain-opacity: 0.09;
  --wcm-grain-blend: overlay;
  --wcm-glow-strength: 9%;
}

.themeLight {
  --wcm-bg: #e4ebf2;
  --wcm-surface-hi: #f8fbfe;
  --wcm-floor: #d3dde8;
  --wcm-frame: rgba(20, 40, 70, 0.09);
  --wcm-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 50px 90px -55px rgba(20, 45, 80, 0.45);
  --wcm-dot-color: #2a3a52;
  --wcm-arc-color: #0a8db8;
  --wcm-pulse-color: color-mix(in srgb, var(--wcm-arc-color) 65%, #00141f);
  --wcm-glow-color: #19b8a0;
  --wcm-ink: #13202f;
  --wcm-ink-muted: rgba(19, 32, 47, 0.72);
  --wcm-chip-bg: rgba(248, 251, 254, 0.9);
  --wcm-chip-border: rgba(20, 40, 70, 0.1);
  --wcm-chip-shine: rgba(255, 255, 255, 0.9);
  --wcm-dot-opacity: 0.62;
  --wcm-grain-opacity: 0.16;
  --wcm-grain-blend: multiply;
  --wcm-glow-strength: 14%;
}

.revealed {
  --wcm-play: running;
}

.offscreen {
  --wcm-play: paused;
}

.paused {
  --wcm-draw-duration: 0s;
  --wcm-draw-delay: 0s;
  --wcm-motion-display: none;
}

.atmosphere {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(55% 38% at 50% 8%, color-mix(in srgb, var(--wcm-glow-color) var(--wcm-glow-strength), transparent) 0%, transparent 75%),
    radial-gradient(40% 44% at 62% 52%, color-mix(in srgb, var(--wcm-arc-color) calc(var(--wcm-glow-strength) * 0.6), transparent) 0%, transparent 72%),
    radial-gradient(120% 90% at 50% 50%, transparent 55%, var(--wcm-floor) 100%);
}

.map {
  --arc-line: 0.5;
  --arc-halo: 2;
  --arc-pulse: 0.9;
  --arc-ring: 0.32;

  position: relative;
  direction: ltr;
  aspect-ratio: 360 / 142;
  margin-block: 44px 52px;
  margin-inline: 28px;
}

.equator,
.tropic {
  position: absolute;
  inset-inline: 4%;
  block-size: 1px;
  pointer-events: none;
  background-image: repeating-linear-gradient(90deg, var(--wcm-dot-color) 0 2px, transparent 2px 8px);
  mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
}

.equator {
  opacity: 0.22;
}

.tropic {
  opacity: 0.09;
}

.dotsBase,
.dotsFx {
  position: absolute;
  inset: 0;
  display: block;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
  mask-image: linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%);
}

.dotsBase {
  opacity: var(--wcm-dot-opacity);
}

.arcs {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
  pointer-events: none;
}

.stopFaint {
  stop-color: var(--wcm-arc-color);
  stop-opacity: 0.4;
}

.stopFull {
  stop-color: var(--wcm-arc-color);
  stop-opacity: 1;
}

.stopSoft {
  stop-color: var(--wcm-arc-color);
  stop-opacity: 0.8;
}

.arc {
  --arc-boost: 1;
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.arcLit {
  --arc-boost: 1.7;
}

.arcDim {
  opacity: 0.12;
}

.arcHalo,
.arcLine {
  fill: none;
  stroke-linecap: round;
  stroke-dasharray: 100 100;
  animation: wcmDraw var(--wcm-draw-duration, 2s) cubic-bezier(0.65, 0, 0.35, 1) both;
  animation-delay: var(--wcm-draw-delay, var(--draw-delay));
  animation-play-state: var(--wcm-play);
}

.arcHalo {
  stroke: var(--wcm-arc-color);
  stroke-width: calc(var(--arc-halo) * var(--arc-boost));
  opacity: 0.18;
  transition: stroke-width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.arcLine {
  stroke-width: calc(var(--arc-line) * var(--arc-boost));
  transition: stroke-width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.pulse,
.pulseTrail {
  display: var(--wcm-motion-display, inline);
  fill: none;
  stroke-linecap: round;
  stroke-dashoffset: var(--from);
  animation: wcmPulse var(--pulse-duration) linear var(--pulse-delay) infinite;
  animation-play-state: var(--wcm-play);
}

.pulse {
  --from: 4;
  --to: -100;
  stroke: var(--wcm-pulse-color);
  stroke-width: var(--arc-pulse);
  stroke-dasharray: 4 300;
}

.pulseTrail {
  --from: 18;
  --to: -86;
  stroke: var(--wcm-arc-color);
  stroke-width: calc(var(--arc-pulse) * 0.7);
  stroke-dasharray: 18 300;
  opacity: 0.85;
}

.landing {
  display: var(--wcm-motion-display, inline);
  fill: none;
  stroke: var(--wcm-pulse-color);
  stroke-width: var(--arc-ring);
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: wcmLand var(--pulse-duration) linear var(--pulse-delay) infinite;
  animation-play-state: var(--wcm-play);
}

.marker {
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
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.marker:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wcm-arc-color);
}

.markerLinked {
  z-index: 3;
}

.markerActive {
  z-index: 4;
}

.markerDim {
  opacity: 0.32;
}

.core,
.ring {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 9px;
  block-size: 9px;
  margin-block-start: -4.5px;
  margin-inline-start: -4.5px;
  border-radius: 50%;
  pointer-events: none;
}

.core {
  background: radial-gradient(circle at 35% 30%, var(--wcm-pulse-color), var(--wcm-arc-color) 60%);
  box-shadow:
    0 0 0 2.5px var(--wcm-bg),
    0 0 0 3.5px color-mix(in srgb, var(--wcm-arc-color) 40%, transparent),
    0 0 18px 3px color-mix(in srgb, var(--wcm-arc-color) 55%, transparent);
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.coreActive {
  transform: scale(1.55);
}

.ring {
  display: var(--wcm-motion-display, block);
  border: 1.5px solid var(--wcm-arc-color);
  opacity: 0;
  animation: wcmRing 3.4s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
  animation-delay: calc(var(--i) * -0.43s);
  animation-play-state: var(--wcm-play);
}

.label {
  position: absolute;
  inset-block-start: calc(50% + var(--ly, -14px));
  inset-inline-start: calc(50% + var(--lx, 12px));
  display: flex;
  flex-direction: column;
  gap: 3px;
  inline-size: max-content;
  max-inline-size: 22ch;
  padding-block: 6px;
  padding-inline: 10px 11px;
  border: 1px solid var(--wcm-chip-border);
  border-radius: 10px;
  background: var(--wcm-chip-bg);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    inset 0 1px 0 var(--wcm-chip-shine),
    0 12px 28px -14px rgba(0, 0, 0, 0.6);
  color: var(--wcm-ink);
  text-align: start;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.92);
  transform-origin: left center;
  transition:
    opacity 0.3s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.3s ease;
}

.labelShown {
  opacity: 1;
  transform: none;
}

.labelLinked {
  opacity: 1;
  transform: none;
}

.labelActive {
  opacity: 1;
  transform: none;
  max-inline-size: 30ch;
  border-color: color-mix(in srgb, var(--wcm-arc-color) 45%, transparent);
}

.labelName {
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.012em;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.labelNameFull {
  -webkit-line-clamp: 4;
}

.labelMeta {
  display: none;
  color: var(--wcm-ink-muted);
  font-family: var(--wcm-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  line-height: 1.3;
  white-space: pre;
  font-variant-numeric: tabular-nums;
}

.labelMetaShown {
  display: block;
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
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 var(--wcm-chip-shine);
  color: var(--wcm-ink);
  cursor: pointer;
  opacity: 0.6;
  transition:
    opacity 0.25s ease,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.playToggle:hover {
  opacity: 1;
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
  opacity: var(--wcm-grain-opacity);
  mix-blend-mode: var(--wcm-grain-blend);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@container wcm (max-width: 640px) {
  .map {
    --arc-line: 0.85;
    --arc-halo: 3;
    --arc-pulse: 1.4;
    --arc-ring: 0.7;
    margin-block: 28px 64px;
    margin-inline: 12px;
  }

  .label {
    padding-block: 4px;
    padding-inline: 8px 9px;
    border-radius: 8px;
  }

  .labelActive {
    max-inline-size: 20ch;
  }

  .labelName {
    font-size: 12.5px;
  }

  .labelMeta {
    font-size: 10px;
  }
}

@container wcm (min-width: 1100px) {
  .map {
    margin-block: 64px 72px;
    margin-inline: 40px;
  }
}

@keyframes wcmDraw {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes wcmPulse {
  0% {
    stroke-dashoffset: var(--from);
    animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1);
  }
  70%,
  100% {
    stroke-dashoffset: var(--to);
  }
}

@keyframes wcmLand {
  0%,
  47% {
    opacity: 0;
    transform: scale(0.4);
  }
  53% {
    opacity: 0.95;
    transform: scale(0.8);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  88%,
  100% {
    opacity: 0;
    transform: scale(3.6);
  }
}

@keyframes wcmRing {
  0% {
    opacity: 0.65;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(4.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .label,
  .core,
  .arc,
  .arcLine,
  .arcHalo {
    transition-duration: 0.01ms;
  }
}
```
