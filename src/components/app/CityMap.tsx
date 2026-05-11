import { useState, useEffect } from "react";
import { 
  Map, 
  Marker, 
  InfoWindow, 
  useMap,
} from "@vis.gl/react-google-maps";
import { GRIEVANCES, TYPE_META } from "@/data/mock";

/* ─── Types ─────────────────────────────────────────────── */
interface CityMapProps {
  filterType: string;
}

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

/* ─── Marker Component ─────────────────────────────────── */
// Using standard Marker instead of AdvancedMarker for better compatibility without Map ID
function GrievanceMarker({ grievance }: { grievance: typeof GRIEVANCES[0] }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[grievance.type];

  return (
    <>
      <Marker
        position={{ lat: grievance.lat, lng: grievance.lng }}
        onClick={() => setOpen(true)}
        // We can't use complex HTML in standard Marker as easily, 
        // so we'll use the title and basic label for now to ensure it loads.
        title={grievance.title}
      />

      {open && (
        <InfoWindow
          position={{ lat: grievance.lat, lng: grievance.lng }}
          onCloseClick={() => setOpen(false)}
        >
          <div className="p-1 min-w-[200px] text-slate-900">
            <div className="font-mono text-[10px] text-blue-600 uppercase tracking-wider">{grievance.id}</div>
            <div className="font-bold text-sm mt-1">{grievance.title}</div>
            <div className="text-xs text-slate-500 mt-1">{grievance.ward}</div>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: meta.color }}>
                {grievance.type}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200">
                {grievance.status}
              </span>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export function CityMap({ filterType }: CityMapProps) {
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const map = useMap();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  console.log("Map Debug - API Key present:", !!apiKey);

  // Filter logic
  const filteredGrievances = GRIEVANCES.filter((g) => 
    filterType === "All" || 
    g.type === filterType || 
    (filterType === "Pending" && g.status !== "Resolved") || 
    (filterType === "Overdue" && g.daysOpen > g.slaDays)
  );

  // Request user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (map) map.panTo(loc);
        },
        (err) => console.warn("Location denied:", err)
      );
    }
  }, [map]);

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div className="absolute inset-0 grid place-items-center bg-slate-900/50 backdrop-blur-sm text-center p-6">
        <div className="glass p-8 max-w-sm">
          <div className="text-4xl mb-4">📍</div>
          <h3 className="text-lg font-bold text-white">Google Maps API Key Missing</h3>
          <p className="text-sm text-slate-400 mt-2">
            Please add your <code className="text-blue-400">VITE_GOOGLE_MAPS_API_KEY</code> to the <code className="text-blue-400">.env</code> file to enable the city heatmap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={12}
        disableDefaultUI={false}
        gestureHandling={"greedy"}
        className="h-full w-full rounded-2xl"
        // Force a light/dark color scheme based on your app's needs
        colorScheme="DARK"
      >
        {/* Render Grievances */}
        {filteredGrievances.map((g) => (
          <GrievanceMarker key={g.id} grievance={g} />
        ))}

        {/* User live location marker */}
        {userLocation && (
          <Marker 
            position={userLocation}
            title="You are here"
          />
        )}
      </Map>
    </div>
  );
}
