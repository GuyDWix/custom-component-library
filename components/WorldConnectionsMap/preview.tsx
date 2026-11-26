import '@fontsource/wix-madefor-display/400.css';
import '@fontsource/wix-madefor-display/500.css';
import '@fontsource/wix-madefor-display/600.css';
import '@fontsource/wix-madefor-display/700.css';
import type { CSSProperties } from 'react';
import WorldConnectionsMap, { type MapConnection, type MapLocation } from './Component';

const stage: CSSProperties = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  padding: 'clamp(20px, 4vw, 64px) clamp(16px, 4vw, 64px)',
  color: '#f5f2eb',
  fontFamily:
    "'Wix Madefor Display', 'Avenir Next', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif",
  display: 'flex',
  flexDirection: 'column',
  gap: 'clamp(24px, 3vw, 40px)',
};

const inner: CSSProperties = { width: '100%', maxWidth: 1360, margin: '0 auto' };

const eyebrow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: 0,
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 12,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'rgba(245,242,235,0.55)',
};

const WORST_SINGLE: MapLocation[] = [
  {
    name: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch Regional Distribution and Returns Centre',
    latitude: 53.22,
    longitude: -4.2,
  },
];

const CITIES: [string, number, number][] = [
  ['Anchorage International Cargo Terminal', 61.22, -149.9],
  ['Vancouver Harbour', 49.28, -123.12],
  ['Los Angeles / Long Beach Port Complex', 33.74, -118.27],
  ['Chicago Intermodal', 41.88, -87.63],
  ['New York / New Jersey', 40.71, -74.01],
  ['Mexico City', 19.43, -99.13],
  ['Bogotá El Dorado', 4.71, -74.07],
  ['Lima Callao', -12.05, -77.04],
  ['São Paulo Guarulhos Logistics Park', -23.55, -46.63],
  ['Buenos Aires', -34.6, -58.38],
  ['Reykjavík', 64.15, -21.94],
  ['Rotterdam Maasvlakte Container Terminal', 51.92, 4.48],
  ['Madrid', 40.42, -3.7],
  ['Casablanca', 33.57, -7.59],
  ['Lagos Apapa', 6.45, 3.39],
  ['Cape Town', -33.92, 18.42],
  ['Nairobi', -1.29, 36.82],
  ['Istanbul', 41.01, 28.98],
  ['Dubai Jebel Ali Free Zone', 25.01, 55.06],
  ['Mumbai Nhava Sheva', 18.95, 72.95],
  ['Singapore', 1.35, 103.82],
  ['Shanghai Yangshan', 30.63, 122.06],
  ['Tokyo', 35.68, 139.69],
  ['Perth Fremantle', -32.05, 115.75],
  ['Auckland', -36.85, 174.76],
];

const WORST_MANY: MapLocation[] = CITIES.map(([name, latitude, longitude]) => ({ name, latitude, longitude }));
const WORST_LINKS: MapConnection[] = [
  [11, 4], [11, 12], [11, 17], [11, 18], [11, 10], [4, 3], [4, 8], [4, 5], [3, 1], [1, 0], [2, 3], [2, 5],
  [5, 6], [6, 7], [8, 9], [8, 14], [12, 13], [13, 14], [14, 15], [15, 16], [16, 18], [17, 18], [18, 19],
  [19, 20], [20, 21], [21, 22], [20, 23], [23, 24], [20, 24], [7, 9],
].map(([a, b]) => ({ from: CITIES[a][0], to: CITIES[b][0] }));

const caption: CSSProperties = { ...eyebrow, margin: '0 0 12px' };

export default function Preview() {
  const worst = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('worst') === '1';

  if (worst) {
    return (
      <main style={stage}>
        <section style={inner}>
          <p style={caption}>Worst case — 1 location, 0 connections, very long name, light</p>
          <WorldConnectionsMap
            locations={WORST_SINGLE}
            connections={[]}
            backgroundStyle="light"
          />
        </section>
        <section style={inner}>
          <p style={caption}>Worst case — 25 locations, long names, 30 connections</p>
          <WorldConnectionsMap locations={WORST_MANY} connections={WORST_LINKS} />
        </section>
      </main>
    );
  }

  return (
    <main style={stage}>
      <section style={inner}>
        <WorldConnectionsMap />
      </section>
    </main>
  );
}
