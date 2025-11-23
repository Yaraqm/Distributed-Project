import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthProvider";

type ServiceStatus = {
  name: string;
  url: string;
  healthy: boolean;
  color?: string;
};

// ---------- helpers for nicer routing/payload rendering ----------
function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function formatRoutingKey(key: string = "") {
  // doctor.heartbeat
  return key
    .split(".")
    .map((seg) =>
      seg.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" • ");
}

/** Normalization — handles nested {Key, Payload} and stringified JSON */
function normalizePayload(payload: any): any {
  // Flatten already-object {Key, Payload} forms
  if (payload && typeof payload === "object") {
    if (payload.Key && payload.Payload && typeof payload.Payload === "object") {
      const inner = payload.Payload;
      const flattened: Record<string, any> = {
        event: formatRoutingKey(String(payload.Key)),
      };
      for (const [k, v] of Object.entries(inner)) {
        flattened[k.charAt(0).toLowerCase() + k.slice(1)] = v;
      }
      return flattened;
    } else if (
      payload.key &&
      payload.payload &&
      typeof payload.payload === "object"
    ) {
      const inner = payload.payload;
      const flattened: Record<string, any> = {
        event: formatRoutingKey(payload.key),
      };
      for (const [k, v] of Object.entries(inner)) {
        flattened[k.charAt(0).toLowerCase() + k.slice(1)] = v;
      }
      return flattened;
    }
    return payload;
  }

  if (typeof payload !== "string") return payload;
  let s = payload.trim();

  // remove extra quotes/backticks
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith("`") && s.endsWith("`"))
  ) {
    s = s.slice(1, -1);
  }

  // normalize special characters
  s = s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u200B|\uFEFF/g, "");

  // parse JSON safely
  try {
    const parsed = JSON.parse(s);
    return normalizePayload(parsed);
  } catch {
    try {
      const unescaped = s
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\");
      const parsed = JSON.parse(unescaped);
      return normalizePayload(parsed);
    } catch {
      return s;
    }
  }
}

function formatValue(v: any): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

function PayloadView({ payload, depth = 0 }: { payload: any; depth?: number }) {
  if (!isObject(payload))
    return <div className="text-gray-300">{formatValue(payload)}</div>;

  const entries = Object.entries(payload as Record<string, any>);
  return (
    <div
      className="text-gray-300"
      style={{
        borderLeft: depth ? "2px solid rgba(148,163,184,.25)" : undefined,
        paddingLeft: depth ? 10 : 0,
      }}
    >
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-gray-400">{k}</dt>
            <dd>
              {isObject(v) ? (
                <PayloadView payload={v} depth={depth + 1} />
              ) : (
                <span>{formatValue(v)}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "Doctor",
      url: "http://localhost:4001/health",
      healthy: false,
      color: "blue",
    },
    {
      name: "Lab",
      url: "http://localhost:4003/health",
      healthy: false,
      color: "purple",
    },
    {
      name: "Pharmacy",
      url: "http://localhost:4004/health",
      healthy: false,
      color: "green",
    },
    {
      name: "Admin",
      url: "http://localhost:4002/health",
      healthy: false,
      color: "amber",
    },
  ]);

  const [events, setEvents] = useState<any[]>([]);
  const [restrictedMsg, setRestrictedMsg] = useState(""); // ✅ NEW

  async function checkHealth() {
    const updated = await Promise.all(
      services.map(async (svc) => {
        try {
          const res = await axios.get(svc.url, { timeout: 3000 });
          return { ...svc, healthy: res.data.ok };
        } catch {
          return { ...svc, healthy: false };
        }
      })
    );
    setServices(updated);
  }

  async function fetchEvents() {
    try {
      const res = await axios.get("http://localhost:4002/events");
      const validEvents = res.data.filter(
        (e: any) => typeof e === "object" && e !== null
      );

      const unique = new Map();
      for (const e of validEvents) {
        const key = `${e.routing_key || e.topic || e.event}-${JSON.stringify(
          e.payload
        )}`;
        if (!unique.has(key)) unique.set(key, e);
      }

      setEvents(Array.from(unique.values()).slice(-20).reverse());
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  }

  useEffect(() => {
    checkHealth();
    fetchEvents();
    const interval = setInterval(() => {
      checkHealth();
      fetchEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-10">
      {/* Overlay for restricted access */}
      {restrictedMsg && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="bg-red-50 border border-red-500 text-red-800 rounded-lg px-6 py-4 max-w-md w-[90%] shadow-2xl">
            <h2 className="text-lg font-semibold mb-2">Restricted Access</h2>
            <p className="text-sm mb-4">{restrictedMsg}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setRestrictedMsg("")}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-extrabold text-black border-b border-gray-700 pb-4">
        MicroHealth System Dashboard
      </h1>

      {/* Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((svc) => {
          const allowed =
            user?.role && user.role.toLowerCase() === svc.name.toLowerCase(); // role-based access

          const handlePortalClick = (
            e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
          ) => {
            if (!allowed) {
              e.preventDefault();
              setRestrictedMsg(
                `You do not have access to the ${svc.name} portal with your current role.`
              );
            }
          };

          return (
            <div
              key={svc.name}
              className={`rounded-xl p-6 shadow-2xl transition-all duration-300 transform hover:scale-[1.02]
              ${
                svc.healthy
                  ? "bg-gray-800 border-t-4 border-green-500 hover:border-green-400"
                  : "bg-gray-800 border-t-4 border-red-500 hover:border-red-400"
              }
              border border-gray-700 ${!allowed ? "opacity-50" : ""}`} // still greyed out when not allowed
            >
              <h2 className="text-2xl font-bold mb-2 text-white">{svc.name}</h2>
              <p className="text-sm font-medium text-gray-400 mb-4">
                Status Indicator
              </p>
              <p className="text-lg font-semibold">
                <span
                  className={svc.healthy ? "text-green-400" : "text-red-400"}
                >
                  {svc.healthy ? "ONLINE" : "OFFLINE"}
                </span>
              </p>
              <a
                href={`/${svc.name.toLowerCase()}`}
                onClick={handlePortalClick}
                className={`mt-4 inline-block px-4 py-2 text-white rounded-lg transition duration-200 shadow-md 
                bg-${svc.color}-600 hover:bg-${
                  svc.color
                }-500 focus:outline-none focus:ring-2 focus:ring-${
                  svc.color
                }-400 focus:ring-offset-2 focus:ring-offset-gray-900
                w-full text-center font-bold ${
                  !allowed ? "cursor-not-allowed" : ""
                }`}
              >
                Open Portal
              </a>
            </div>
          );
        })}
      </div>

      {/* Event Feed */}
      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-4 text-black">Live Event Feed</h2>
        <div className="rounded-xl bg-gray-800 p-6 h-[400px] overflow-y-auto shadow-inner border border-gray-700 text-sm font-mono text-gray-300">
          {events.length === 0 && (
            <p className="text-gray-500">No events yet...</p>
          )}
          {events.map((e, i) => {
            const routing = formatRoutingKey(
              e.routing_key || e.topic || e.event || ""
            );
            const payload = normalizePayload(e.payload ?? e.message ?? e.body);
            const eventName = payload.event || routing;
            return (
              <div
                key={i}
                className="mb-3 border-b border-gray-700 pb-3 last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <strong
                    className={
                      e.direction === "sent"
                        ? "text-yellow-400"
                        : "text-blue-400"
                    }
                  >
                    {e.direction === "sent" ? "📤 SENT" : "📥 RECV"}
                  </strong>
                  <span className="text-gray-500 text-xs">
                    {new Date(e.created_at || e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-400 break-words my-1">{eventName}</p>
                <div className="pl-2">
                  <PayloadView payload={payload} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
