import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./AttractionMap.css";

export type MapPoint = {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  // Where clicking the marker goes
  to?: string;
  // The marker drawn on top, in the route colour
  highlighted?: boolean;
};

export type LatLng = { lat: number; lng: number };

type AttractionMapProps = {
  points: MapPoint[];
  // Joins the points in their order, as the stops of a day
  route?: boolean;
  // The location being picked; clicking the map moves it
  picked?: LatLng | null;
  onPick?: (position: LatLng) => void;
  label: string;
  height?: number;
  className?: string;
};

// Centre of La Habana, for a map with nothing to show yet
const DEFAULT_CENTER: LatLngTuple = [23.1367, -82.3589];

function toKey(points: LatLng[]) {
  return points.map(point => `${point.lat},${point.lng}`).join("|");
}

// Frames every point; the key keeps it from refitting on each render
function FitBounds({ positionsKey }: { positionsKey: string }) {
  const map = useMap();

  useEffect(() => {
    if (!positionsKey) return;
    const positions = positionsKey.split("|").map(item => item.split(",").map(Number) as LatLngTuple);
    if (positions.length === 1) map.setView(positions[0], 15);
    else map.fitBounds(positions, { padding: [32, 32], maxZoom: 16 });
  }, [map, positionsKey]);

  return null;
}

function PickHandler({ onPick }: { onPick: (position: LatLng) => void }) {
  useMapEvents({ click: event => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

// OpenStreetMap tiles drawn with Leaflet (revision-frontend.md §2)
export function AttractionMap({ points, route = false, picked, onPick, label, height = 320, className }: AttractionMapProps) {
  const navigate = useNavigate();
  const classes = ["attraction-map", onPick && "attraction-map--picking", className].filter(Boolean).join(" ");
  const framed = picked ? [...points, picked] : points;

  return (
    <div className={classes} role="region" aria-label={label} style={{ height }}>
      {/* The wheel zooms while the cursor is over the map */}
      <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom className="attraction-map__canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positionsKey={toKey(framed)} />
        {onPick && <PickHandler onPick={onPick} />}

        {route && points.length > 1 && (
          <Polyline
            positions={points.map(point => [point.lat, point.lng] as LatLngTuple)}
            pathOptions={{ className: "attraction-map__route" }}
          />
        )}

        {points.map((point, index) => {
          const to = point.to;
          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={point.highlighted ? 10 : 8}
              pathOptions={{
                className: point.highlighted
                  ? "attraction-map__marker attraction-map__marker--highlighted"
                  : "attraction-map__marker",
              }}
              eventHandlers={to ? { click: () => navigate(to) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {route ? `${index + 1} · ${point.label}` : point.label}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {picked && (
          <CircleMarker
            center={[picked.lat, picked.lng]}
            radius={10}
            pathOptions={{ className: "attraction-map__marker attraction-map__marker--picked" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
