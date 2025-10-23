import { useEffect, useState } from "react";
import axios from "axios";

type ServiceStatus = {
  name: string;
  url: string;
  healthy: boolean;
  lastEvent?: string;
  color?: string;
};

export default function Dashboard() {
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

  // ✅ Check service health
  async function checkHealth() {
    const updated = await Promise.all(
      services.map(async (svc) => {
        try {
          const res = await axios.get(svc.url);
          return { ...svc, healthy: res.data.ok };
        } catch {
          return { ...svc, healthy: false };
        }
      })
    );
    setServices(updated);
  }

  // ✅ Load latest events (requires backend endpoint `/events` or `/logs`)
  async function fetchEvents() {
    try {
      // You can expose this from any one service (e.g. admin-service) via DB
      const res = await axios.get("http://localhost:4002/events"); // <- add endpoint
      setEvents(res.data.slice(-20).reverse()); // latest 20
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
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">🏥 Hospital System Dashboard</h1>

      {/* Services Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {services.map((svc) => (
          <div
            key={svc.name}
            className={`border rounded-xl p-4 shadow-md flex flex-col items-center ${
              svc.healthy ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <h2 className={`text-lg font-bold text-${svc.color}-700`}>
              {svc.name}
            </h2>
            <p className="text-sm">
              Status:{" "}
              <span className={svc.healthy ? "text-green-600" : "text-red-600"}>
                {svc.healthy ? "Online ✅" : "Offline ❌"}
              </span>
            </p>
            <a
              href={`/${svc.name.toLowerCase()}`}
              className={`mt-2 px-3 py-1 bg-${svc.color}-600 text-white rounded`}
            >
              Open {svc.name}
            </a>
          </div>
        ))}
      </div>

      {/* Live Event Feed */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-3">📡 Live Event Feed</h2>
        <div className="border rounded-lg bg-gray-50 p-4 h-96 overflow-y-auto text-sm font-mono">
          {events.length === 0 && (
            <p className="text-gray-500">No events yet...</p>
          )}
          {events.map((e, i) => (
            <div key={i} className="mb-2 border-b border-gray-200 pb-1">
              <strong>
                {e.direction === "sent" ? "📤 Sent" : "📥 Received"}
              </strong>{" "}
              <span className="text-gray-600">{e.routing_key}</span>{" "}
              <span className="text-gray-400 text-xs">
                {new Date(e.created_at || e.timestamp).toLocaleTimeString()}
              </span>
              <div className="pl-4 text-gray-700">
                {JSON.stringify(e.payload).slice(0, 200)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
