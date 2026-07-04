import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapView } from '../../map/MapView';
import {
  geocodeAddress,
  reverseGeocode,
  parseToAddress,
  type GeocodeResult,
} from '../../../lib/mapUtils';
import type { BookingLocation } from '../../../types/booking';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default center (contiguous US) when no geolocation is available */
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 4;

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-alt)] ' +
  'px-3 py-2 text-sm text-[color:var(--fg)] placeholder-[color:var(--gray)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] focus:border-transparent';

// ── Props ──────────────────────────────────────────────────────────────────────

interface StepLocationProps {
  location: BookingLocation;
  onChange: (location: BookingLocation) => void;
  onNext: () => void;
  canProceed: boolean;
  error: string | null;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepLocation({
  location,
  onChange,
  onNext,
  canProceed,
  error,
}: StepLocationProps) {
  // ── Local UI state ──────────────────────────────────────────────────────────

  /** Text shown in the smart autocomplete input */
  const [searchText, setSearchText] = useState('');
  /** Geocoding state for the loading indicator */
  const [geocoding, setGeocoding] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  /** Autocomplete suggestion list */
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /** Guards against re-geocoding when we programmatically set the input value */
  const justSelectedRef = useRef(false);
  const justReverseGeocodedRef = useRef(false);

  /** Prevent repeated auto-detection attempts */
  const didAutodetectRef = useRef(false);

  /** Whether the map panel is expanded */
  const [showMap, setShowMap] = useState(false);
  /** "Pick on map" click-to-drop mode */
  const [selectionMode, setSelectionMode] = useState(false);

  /** Map center — updated by geolocation on first "Pick on Map" click */
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom] = useState(DEFAULT_ZOOM);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Update a single field without losing the rest */
  const patch = useCallback(
    (fields: Partial<BookingLocation>) => onChange({ ...location, ...fields }),
    [location, onChange],
  );

  /** Clear everything back to empty state */
  const handleClear = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectionMode(false);
    onChange({
      address1: '', address2: '', city: '', state: '', zip: '',
    });
    inputRef.current?.focus();
  };

  // ── Automatic location detection (on first load) ───────────────────────────
  // If allowed, we use the user's current coordinates as the initial location.
  // This ensures the booking flow can proceed as soon as we have coords.

  useEffect(() => {
    if (didAutodetectRef.current) return;

    // If coords already exist (e.g., user navigated back), just center the map.
    if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      didAutodetectRef.current = true;
      setMapCenter({ lat: location.lat, lng: location.lng });
      return;
    }

    if (!navigator.geolocation) {
      didAutodetectRef.current = true;
      return;
    }

    didAutodetectRef.current = true;
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setMapCenter({ lat, lng });

        try {
          const resolved = await reverseGeocode(lat, lng);
          if (cancelled) return;

          justReverseGeocodedRef.current = true;
          setTimeout(() => {
            justReverseGeocodedRef.current = false;
          }, 600);

          setSearchText(resolved.displayName);
          const parsed = parseToAddress(resolved.displayName, resolved.rawAddress);

          onChange({
            ...location,
            address1: parsed.address1,
            city: parsed.city,
            state: parsed.state,
            zip: parsed.zip,
            lat,
            lng,
          });
        } catch {
          // Even if reverse geocoding fails, keep the coords.
          onChange({ ...location, lat, lng });
        }
      },
      () => {
        /* user denied or unavailable — keep DEFAULT_CENTER */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [location, onChange]);

  // ── Debounced forward geocoding (500 ms) ─────────────────────────────────────

  useEffect(() => {
    if (
      !searchText ||
      searchText.length < 3 ||
      justSelectedRef.current ||
      justReverseGeocodedRef.current
    ) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setGeocoding('loading');
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeAddress(searchText);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setGeocoding(results.length > 0 ? 'success' : 'idle');
      } catch {
        setGeocoding('error');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // ── Suggestion selected ──────────────────────────────────────────────────────

  const handleSuggestionSelect = (s: GeocodeResult) => {
    justSelectedRef.current = true;
    setTimeout(() => { justSelectedRef.current = false; }, 150);

    setSearchText(s.displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    setGeocoding('idle');

    const parsed = parseToAddress(s.displayName, s.rawAddress);
    onChange({
      ...location,
      address1: parsed.address1,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      lat: s.lat,
      lng: s.lng,
    });
    setMapCenter({ lat: s.lat, lng: s.lng });
    setShowMap(true);
  };

  // ── "Pick on Map" button ─────────────────────────────────────────────────────

  const handlePickOnMap = () => {
    setSelectionMode(true);
    setShowMap(true);

    // Try to use the user's real location as the map center
    if (!location.lat && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* keep DEFAULT_CENTER */ },
      );
    } else if (location.lat && location.lng) {
      setMapCenter({ lat: location.lat, lng: location.lng });
    }
  };

  // ── Map click (selection mode) ───────────────────────────────────────────────

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      setSelectionMode(false);
      const resolved = await reverseGeocode(lat, lng);
      justReverseGeocodedRef.current = true;
      setTimeout(() => { justReverseGeocodedRef.current = false; }, 600);

      setSearchText(resolved.displayName);
      const parsed = parseToAddress(resolved.displayName, resolved.rawAddress);
      onChange({
        ...location,
        address1: parsed.address1,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        lat,
        lng,
      });
      setMapCenter({ lat, lng });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, location],
  );

  // ── Marker drag ──────────────────────────────────────────────────────────────

  const handlePinDrag = useCallback(
    async (lat: number, lng: number) => {
      const resolved = await reverseGeocode(lat, lng);
      justReverseGeocodedRef.current = true;
      setTimeout(() => { justReverseGeocodedRef.current = false; }, 600);

      setSearchText(resolved.displayName);
      const parsed = parseToAddress(resolved.displayName, resolved.rawAddress);
      onChange({
        ...location,
        address1: parsed.address1,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        lat,
        lng,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, location],
  );

  // ── Derived pin for MapView ──────────────────────────────────────────────────

  const mapPin =
    location.lat && location.lng
      ? { lat: location.lat, lng: location.lng, label: searchText }
      : undefined;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-[color:var(--fg)]">Service location</h3>
        <p className="text-sm text-[color:var(--fg-dim)] mt-0.5">
          Where should we come to detail your vehicle?
        </p>
      </div>

      {/* ── Smart address input ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <label htmlFor="location-search" className="block text-xs font-medium text-[color:var(--fg-dim)]">
          Street address
        </label>

        <div className="flex gap-2">
          {/* Autocomplete input */}
          <div className="relative flex-1">
            {/* Search icon */}
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--gray)' }}
              aria-hidden
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>

            <input
              id="location-search"
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type an address or pick on the map…"
              autoComplete="off"
              className={`${inputCls} pl-9 pr-9 h-11`}
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
            />

            {/* Inline loading spinner / clear button */}
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {geocoding === 'loading' ? (
                <svg
                  className="animate-spin w-4 h-4"
                  style={{ color: 'var(--gold)' }}
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : searchText ? (
                <button
                  onClick={handleClear}
                  aria-label="Clear address"
                  className="transition-colors"
                  style={{ color: 'var(--gray)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray)')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              ) : null}
            </span>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-lg border shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
                style={{ backgroundColor: 'var(--bg-alt)', borderColor: 'var(--border)' }}
              >
                {suggestions.map((s) => (
                  <li key={s.id} role="option" aria-selected={false}>
                    <button
                      onMouseDown={() => handleSuggestionSelect(s)}
                      className="w-full px-4 py-3 text-left border-b last:border-b-0 transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Bold street / short name */}
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                        {s.displayName.split(',')[0]}
                      </div>
                      {/* Dimmer full address */}
                      <div className="text-xs truncate mt-0.5" style={{ color: 'var(--fg-dim)' }}>
                        {s.displayName}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* "Pick on Map" toggle button */}
          <button
            type="button"
            onClick={handlePickOnMap}
            title="Pick location on map"
            aria-label="Pick location on map"
            aria-pressed={selectionMode}
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-md border transition-colors"
            style={{
              backgroundColor: selectionMode
                ? 'color-mix(in srgb, var(--gold) 15%, transparent)'
                : 'var(--bg-alt)',
              borderColor: selectionMode ? 'var(--gold)' : 'var(--border)',
              color: selectionMode ? 'var(--gold)' : 'var(--fg-dim)',
            }}
          >
            {/* Map pin icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </button>
        </div>

        {/* Coordinates hint */}
        {location.lat && location.lng && (
          <p className="text-xs pl-1" style={{ color: 'var(--gray)' }}>
            📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)} · drag the pin to adjust
          </p>
        )}
      </div>

      {/* ── Inline map ────────────────────────────────────────────────────────── */}
      {showMap && (
        <div
          className="rounded-xl overflow-hidden border transition-all"
          style={{ height: '224px', borderColor: 'var(--border)' }}
        >
          <MapView
            center={mapCenter}
            zoom={mapPin ? 15 : mapZoom}
            pin={mapPin}
            onMapClick={handleMapClick}
            selectionMode={selectionMode}
            onCancelSelection={() => setSelectionMode(false)}
            onPinDragEnd={handlePinDrag}
          />
        </div>
      )}

      {/* ── Detail fields (auto-filled, editable for corrections) ─────────────── */}
      <div className="space-y-3">
        {/* Apt / Suite */}
        <div>
          <label htmlFor="loc-address2" className="block text-xs font-medium mb-1 text-[color:var(--fg-dim)]">
            Apt / Suite / Unit <span className="text-[color:var(--gray)]">(optional)</span>
          </label>
          <input
            id="loc-address2"
            type="text"
            value={location.address2}
            onChange={(e) => patch({ address2: e.target.value })}
            placeholder="Apt 4B"
            autoComplete="address-line2"
            className={inputCls}
          />
        </div>

        {/* City · State · ZIP */}
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <label htmlFor="loc-city" className="block text-xs font-medium mb-1 text-[color:var(--fg-dim)]">
              City <span className="text-[color:var(--red)] ml-0.5">*</span>
            </label>
            <input
              id="loc-city"
              type="text"
              value={location.city}
              onChange={(e) => patch({ city: e.target.value })}
              placeholder="Springfield"
              autoComplete="address-level2"
              className={inputCls}
            />
          </div>

          <div className="col-span-1">
            <label htmlFor="loc-state" className="block text-xs font-medium mb-1 text-[color:var(--fg-dim)]">
              State <span className="text-[color:var(--red)] ml-0.5">*</span>
            </label>
            <input
              id="loc-state"
              type="text"
              value={location.state}
              onChange={(e) => patch({ state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="IL"
              autoComplete="address-level1"
              maxLength={2}
              className={`${inputCls} uppercase`}
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="loc-zip" className="block text-xs font-medium mb-1 text-[color:var(--fg-dim)]">
              ZIP <span className="text-[color:var(--red)] ml-0.5">*</span>
            </label>
            <input
              id="loc-zip"
              type="text"
              value={location.zip}
              onChange={(e) => patch({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              placeholder="62701"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={5}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────────── */}
      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2 border-t border-[color:var(--border)]">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>

    </div>
  );
}

export default StepLocation;
