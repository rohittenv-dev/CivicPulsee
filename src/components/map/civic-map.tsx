import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Circle,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import type { IssueItem } from "@/lib/services/issue-service";
import { statusMeta, type IssueStatus } from "@/lib/lifecycle";
import { categories } from "@/config/authority";
import { Link } from "@tanstack/react-router";
import L from "leaflet";

/* ─── User location "You are here" custom marker icon ─── */
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 99, 235, 0.28); border: 1.5px solid rgba(37, 99, 235, 0.6); animation: user-loc-pulse 2s infinite ease-out;"></div>
      <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(37, 99, 235, 0.8), 0 2px 6px rgba(0,0,0,0.35); position: relative; z-index: 2;"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/* ─── Status colours (match design-system OKLCH tokens as hex approximations) ─── */
const STATUS_COLOR: Record<string, string> = {
  reported: "#dc2626",   // pending red
  assigned: "#d97706",   // amber
  in_progress: "#d97706",
  reopened: "#db2777",   // pink alert
  resolved: "#059669",   // green
  confirmed: "#0f766e",  // teal closed
};

/* ─── Category colours for markers ─── */
const CAT_COLOR: Record<string, string> = {
  pothole: "#b45309",
  streetlight: "#ca8a04",
  garbage: "#16a34a",
  water_leak: "#0284c7",
  drainage: "#0369a1",
  live_wire: "#dc2626",
  encroachment: "#7c3aed",
  other: "#475569",
};

/* ─── Category labels for display ─── */
const catLabel = (slug: string) =>
  categories.find((c) => c.slug === slug)?.label ?? slug;

/* ─── Fit map to issue bounds ─── */
function FitToIssues({ issues }: { issues: IssueItem[] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (issues.length === 0 || fittedRef.current) return;
    fittedRef.current = true;
    const bounds = issues.map((i) => [i.latitude, i.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [issues, map]);
  return null;
}

/* ─── Fly to selected issue ─── */
function FlyToSelected({ issue }: { issue: IssueItem | null }) {
  const map = useMap();
  useEffect(() => {
    if (!issue) return;
    map.flyTo([issue.latitude, issue.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.8,
    });
  }, [issue, map]);
  return null;
}

/* ─── Locate me button handler ─── */
function LocateMeHandler({ trigger }: { trigger: number }) {
  const map = useMap();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    if (trigger === 0) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser/device.");
      return;
    }

    const toastId = toast.loading("Locating your position…");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), {
          duration: 1.2,
        });
        toast.success("Location found! Centered on your position.");
      },
      (err) => {
        toast.dismiss(toastId);
        if (err.code === 1) {
          toast.error("Location permission denied. Please enable location access in browser settings.");
        } else if (err.code === 2) {
          toast.error("Location unavailable. Please check your network or GPS.");
        } else if (err.code === 3) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Could not fetch your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [trigger, map]);

  if (!userLocation) return null;

  return (
    <>
      <Circle
        center={[userLocation.lat, userLocation.lng]}
        radius={Math.max(userLocation.accuracy, 20)}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: "4, 4",
        }}
      />
      <Marker
        position={[userLocation.lat, userLocation.lng]}
        icon={userLocationIcon}
        zIndexOffset={1000}
      >
        <Popup className="civic-popup">
          <div className="space-y-1 p-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span className="inline-block size-2 rounded-full bg-blue-600 animate-ping" />
              You are here
            </div>
            <p className="text-[11px] text-muted-foreground">
              Current Location &bull; Accuracy &plusmn;{Math.round(userLocation.accuracy)}m
            </p>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

/* ─── Tile error fallback ─── */
function TileErrorGuard({ onError }: { onError: () => void }) {
  useMapEvents({
    tileerror: onError,
  });
  return null;
}

/* ─── Ensure map redraws correctly on mount and resize ─── */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/* ─── Main export ─── */
export default function CivicMap({
  issues,
  center,
  selectedId,
  onSelect,
  locateTrigger = 0,
  onTileError,
}: {
  issues: IssueItem[];
  center: [number, number];
  selectedId?: string | null;
  onSelect: (issue: IssueItem) => void;
  locateTrigger?: number;
  onTileError?: () => void;
}) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#eef2f0" }}
      zoomControl={false}
    >
      <InvalidateSize />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitToIssues issues={issues} />
      <FlyToSelected issue={issues.find((i) => i.id === selectedId) ?? null} />
      <LocateMeHandler trigger={locateTrigger} />

      <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          showCoverageOnHover={false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            const size = count > 50 ? 44 : count > 20 ? 38 : 32;
            return L.divIcon({
              html: `<div style="
                width:${size}px;height:${size}px;
                background:oklch(0.42 0.078 203);
                border:3px solid white;
                border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                color:white;font-weight:700;font-size:${size > 38 ? 13 : 11}px;
                box-shadow:0 2px 8px rgba(0,0,0,0.25);
                font-family:'Public Sans',sans-serif;
              ">${count}</div>`,
              className: "",
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            });
          }}
        >
          {issues.map((item) => {
            const isResolved = item.status === "resolved" || item.status === "confirmed";
            const statusColor = STATUS_COLOR[item.status] ?? "#dc2626";
            const catColor = CAT_COLOR[item.category] ?? "#475569";
            const markerFillColor = isResolved ? "#059669" : catColor;
            const isSelected = selectedId === item.id;
            const markerRadius = isSelected ? 14 : 10;

            return (
              <CircleMarker
                key={item.id}
                center={[item.latitude, item.longitude]}
                radius={markerRadius}
                pathOptions={{
                  color: isSelected ? "#ffffff" : isResolved ? "#10b981" : "rgba(255,255,255,0.85)",
                  weight: isSelected ? 3 : 2,
                  fillColor: markerFillColor,
                  fillOpacity: 0.94,
                }}
                eventHandlers={{ click: () => onSelect(item) }}
              >
                <Popup
                  className="civic-popup"
                  closeButton={false}
                  offset={[0, -markerRadius]}
                  maxWidth={320}
                  minWidth={260}
                >
                  <IssuePopupContent item={item} statusColor={statusColor} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MarkerClusterGroup>
    </MapContainer>
  );
}

/* ─── Popup Card ─── */
function IssuePopupContent({
  item,
  statusColor,
}: {
  item: IssueItem;
  statusColor: string;
}) {
  const meta = statusMeta[item.status as IssueStatus];
  const label = catLabel(item.category);
  const isResolved = item.status === "resolved" || item.status === "confirmed";

  return (
    <div
      style={{
        fontFamily: "'Public Sans', sans-serif",
        minWidth: 240,
        maxWidth: 300,
      }}
    >
      {/* Category tag + status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: CAT_COLOR[item.category] ?? "#475569",
            background: (CAT_COLOR[item.category] ?? "#475569") + "18",
            padding: "2px 7px",
            borderRadius: 999,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: statusColor,
            background: statusColor + "18",
            padding: "2px 7px",
            borderRadius: 999,
          }}
        >
          {meta?.label ?? item.status}
        </span>
      </div>

      {/* Title */}
      <p
        style={{
          fontFamily: "'Archivo', sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {item.title}
      </p>

      {/* Description */}
      {item.description && (
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            marginBottom: 6,
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </p>
      )}

      {/* Photos: Before and After */}
      {(item.photo_url || item.proof_photo_url) && (
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          {item.photo_url && item.proof_photo_url ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: 3,
                  }}
                >
                  Before
                </p>
                <img
                  src={item.photo_url}
                  alt="Citizen complaint before photo"
                  style={{
                    width: "100%",
                    height: 75,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#059669",
                    marginBottom: 3,
                  }}
                >
                  After
                </p>
                <img
                  src={item.proof_photo_url}
                  alt="Officer resolution proof after photo"
                  style={{
                    width: "100%",
                    height: 75,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1.5px solid #059669",
                  }}
                />
              </div>
            </div>
          ) : item.photo_url ? (
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#64748b",
                  marginBottom: 3,
                }}
              >
                Before
              </p>
              <img
                src={item.photo_url}
                alt="Citizen complaint photo"
                style={{
                  width: "100%",
                  height: 95,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              />
            </div>
          ) : (
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#059669",
                  marginBottom: 3,
                }}
              >
                After
              </p>
              <img
                src={item.proof_photo_url!}
                alt="Officer resolution proof photo"
                style={{
                  width: "100%",
                  height: 95,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1.5px solid #059669",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Resolution notes */}
      {item.resolution_notes && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 6,
            padding: "5px 8px",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#065f46",
              marginBottom: 2,
            }}
          >
            Resolution Notes
          </p>
          <p style={{ fontSize: 10, color: "#047857", lineHeight: 1.35 }}>
            {item.resolution_notes}
          </p>
        </div>
      )}

      {/* Meta row */}
      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          paddingTop: 8,
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {item.address && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>📍</span>
            <span
              style={{
                fontSize: 10,
                color: "#64748b",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.address}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>📅</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>
            {new Date(item.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "#94a3b8",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {item.tracking_id}
          </span>
        </div>
      </div>

      {/* CTA */}
      <Link
        to="/track"
        search={{ q: item.tracking_id }}
        style={{
          display: "block",
          marginTop: 10,
          textAlign: "center",
          background: "oklch(0.42 0.078 203)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "6px 12px",
          borderRadius: 6,
          textDecoration: "none",
        }}
      >
        View Full Report →
      </Link>
    </div>
  );
}
