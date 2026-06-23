import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

// ── Gold pin icon (carpYellow #E6C384 from Kanagawa Dragon) ──────────────────

const pinSvg = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C9.373 0 4 5.373 4 12C4 19.5 16 40 16 40C16 40 28 19.5 28 12C28 5.373 22.627 0 16 0Z" fill="#E6C384" stroke="#1F1F28" stroke-width="1.5"/>
  <circle cx="16" cy="12" r="5" fill="#1F1F28"/>
</svg>`;

const goldPinIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(pinSvg)}`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -42],
});

// ── Custom cursor SVG for selection mode ─────────────────────────────────────

const SELECTION_CURSOR =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='32' ` +
  `viewBox='0 0 24 32'%3E%3Cpath d='M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 ` +
  `8-16c0-4.42-3.58-8-8-8z' fill='%23E6C384' stroke='%231F1F28' stroke-width='1.5'/%3E` +
  `%3Ccircle cx='12' cy='8' r='3' fill='%231F1F28'/%3E%3C/svg%3E") 12 32, crosshair`;

// ── Inner child components (must live inside MapContainer) ───────────────────

/**
 * Fires onMapClick only when selectionMode is active.
 */
function ClickHandler({
  enabled,
  onMapClick,
}: {
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Imperatively pans/zooms the map when `pin` or `center` changes.
 */
function MapController({
  pin,
  center,
  zoom,
}: {
  pin: { lat: number; lng: number } | undefined;
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (pin) {
      map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 15), { animate: true });
    } else {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng, center.lat, center.lng]);

  return null;
}

/**
 * Applies / removes the custom pin cursor while selectionMode is on.
 */
function CursorController({ selectionMode }: { selectionMode: boolean }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = selectionMode ? SELECTION_CURSOR : '';
  }, [selectionMode, map]);
  return null;
}

/**
 * Calls map.invalidateSize() after container resize / orientation change.
 * Required so map tiles render correctly when the panel expands.
 */
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const handle = () => setTimeout(() => map.invalidateSize(), 100);
    window.addEventListener('resize', handle);
    window.addEventListener('orientationchange', handle);
    // Also fire once on mount to catch any deferred layout
    handle();
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('orientationchange', handle);
    };
  }, [map]);
  return null;
}

// ── Public component interface ────────────────────────────────────────────────

export interface MapPin {
  lat: number;
  lng: number;
  label?: string;
}

interface MapViewProps {
  /** Map center — used when no pin is set */
  center: { lat: number; lng: number };
  /** Initial zoom level (default 13) */
  zoom?: number;
  /** Current location pin */
  pin?: MapPin;
  /** Called when user clicks the map (only fires in selectionMode) */
  onMapClick?: (lat: number, lng: number) => void;
  /** True while "pick on map" mode is active */
  selectionMode?: boolean;
  /** Called when user cancels selection */
  onCancelSelection?: () => void;
  /** Called after user drags the existing pin to a new location */
  onPinDragEnd?: (lat: number, lng: number) => void;
}

export function MapView({
  center,
  zoom = 13,
  pin,
  onMapClick,
  selectionMode = false,
  onCancelSelection,
  onPinDragEnd,
}: MapViewProps) {
  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl
        className="w-full h-full"
        // Disable scroll zoom so the form page can still scroll over the map
        scrollWheelZoom={false}
      >
        {/* CartoDB Dark Matter — matches Kanagawa Dragon theme perfectly */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ClickHandler enabled={selectionMode} onMapClick={onMapClick ?? (() => {})} />
        <MapController pin={pin} center={center} zoom={zoom} />
        <CursorController selectionMode={selectionMode} />
        <ResizeHandler />

        {pin && (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={goldPinIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                onPinDragEnd?.(lat, lng);
              },
            }}
          >
            {pin.label && <Popup>{pin.label.split(',')[0]}</Popup>}
          </Marker>
        )}
      </MapContainer>

      {/* Selection-mode overlay pill */}
      {selectionMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-4 py-2 rounded-xl border shadow-xl text-sm font-medium backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(22,22,29,0.92)',
            borderColor: '#E6C384',
            color: '#DCD7BA',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: '#E6C384' }}
          />
          Click anywhere on the map to pin your location
          <button
            onClick={onCancelSelection}
            className="ml-1 text-xs px-2 py-1 rounded transition-colors"
            style={{ color: '#727169' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#DCD7BA')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#727169')}
            aria-label="Cancel map selection"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default MapView;
