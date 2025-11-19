import { useEffect, useState } from "react";
import axios from "axios";
import FloorPlan from "./FloorPlan";

const api = axios.create({
  baseURL: "http://localhost:3000", // always go through gateway
});

// auto-attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// small helpers
function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type AssignResp =
  | { error: string }
  | { ok: boolean; event?: { key?: string; payload?: Record<string, any> } };

type Doctor = { id: string; name: string; specialty?: string };

export default function Admin() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignedRooms, setAssignedRooms] = useState<any[]>([]);

  // assign room form
  const [doctorId, setDoctorId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [assignResp, setAssignResp] = useState<AssignResp | null>(null);

  // add/remove doctor form
  const [newName, setNewName] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [doctorResp, setDoctorResp] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [doctorRes, roomRes, assignedRes] = await Promise.all([
          axios.get("/admin/doctors"),
          axios.get("/admin/rooms"),
          axios.get("/admin/assigned-rooms"),
        ]);
        setDoctors(Array.isArray(doctorRes.data) ? doctorRes.data : []);
        setRooms(Array.isArray(roomRes.data) ? roomRes.data : []);
        setAssignedRooms(
          Array.isArray(assignedRes.data) ? assignedRes.data : []
        );
      } catch (err) {
        console.error("❌ Error loading admin data:", err);
      }
    }
    loadData();
  }, []);

  // ------- Assign Room -------
  async function assignRoom() {
    if (!doctorId || !roomNumber) {
      setAssignResp({ error: "Please select both a Doctor and a Room." });
      return;
    }

    setAssignResp(null);

    try {
      // 1️⃣ Send assignment request
      const res = await axios.post("/admin/assign-room", {
        doctorId,
        roomNumber,
      });

      setAssignResp(res.data);

      // 2️⃣ Refresh assigned rooms — ensures dropdown updates immediately
      const assignedRes = await axios.get("/admin/assigned-rooms");
      setAssignedRooms(Array.isArray(assignedRes.data) ? assignedRes.data : []);

      // 3️⃣ Refresh rooms state
      const roomRes = await axios.get("admin/rooms");
      setRooms(Array.isArray(roomRes.data) ? roomRes.data : []);

      // 4️⃣ Clear UI fields
      setDoctorId("");
      setRoomNumber("");
    } catch (err) {
      console.error("❌ Error assigning room:", err);
      setAssignResp({
        error: "Failed to assign room. See console for details.",
      });
    }
  }

  // ------- Add Doctor -------
  async function addDoctor() {
    if (!newName || !newSpecialty) {
      setDoctorResp({ error: "Please enter a name and specialty." });
      return;
    }
    setDoctorResp(null);
    try {
      const res = await axios.post("/admin/doctors", {
        name: newName,
        specialty: newSpecialty,
      });
      setDoctors((prev) => [res.data.doctor, ...prev]);
      setDoctorResp(res.data);
      setNewName("");
      setNewSpecialty("");
    } catch (err) {
      console.error("Error creating doctor:", err);
      setDoctorResp({
        error: "Failed to create doctor. See console for details.",
      });
    }
  }

  // ------- Remove Doctor -------
  async function removeDoctor(id: string) {
    if (!id) return;
    setDoctorResp(null);

    try {
      // 1️⃣ Delete doctor
      const res = await axios.delete(`/admin/doctors/${id}`);

      // 2️⃣ Update doctor list immediately
      setDoctors((prev) => prev.filter((d) => String(d.id) !== String(id)));

      // 3️⃣ Refresh assigned rooms so FloorPlan updates instantly
      const assignedRes = await axios.get("/admin/assigned-rooms");
      setAssignedRooms(Array.isArray(assignedRes.data) ? assignedRes.data : []);

      // 4️⃣ Refresh rooms (optional but recommended)
      const roomRes = await axios.get("/admin/rooms");
      setRooms(Array.isArray(roomRes.data) ? roomRes.data : []);

      // 5️⃣ Operation response
      setDoctorResp(res.data);

      // 6️⃣ Clear selected doctor if needed
      if (String(id) === doctorId) setDoctorId("");
    } catch (err) {
      console.error("Error deleting doctor:", err);
      setDoctorResp({
        error: "Failed to delete doctor. See console for details.",
      });
    }
  }

  const inputStyle =
    "border border-gray-700 bg-gray-800 text-white p-3 rounded-lg shadow-inner focus:ring-amber-500 focus:border-amber-500 transition duration-150 w-full";
  const labelStyle = "text-gray-300 font-medium mb-1 block";
  const sectionCard =
    "bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 space-y-6";

  // Available rooms
  const availableRooms = rooms.filter((room) => room.is_available === true);

  // Assigned doctor IDs as strings
  const assignedDoctorIds = new Set(
    assignedRooms
      .map((r) => String(r.doctorId))
      .filter((id) => id !== "undefined" && id !== "null")
  );

  // Doctors not assigned to any room
  const availableDoctors = doctors.filter(
    (d) => !assignedDoctorIds.has(String(d.id))
  );

  // ------- pretty cards -------
  function AssignResult({ data }: { data: AssignResp }) {
    if ("error" in data) {
      return (
        <div className="rounded-xl p-4 shadow-inner border bg-red-900/40 border-red-700">
          <div className="text-red-200 font-medium">❌ {data.error}</div>
        </div>
      );
    }
    const key = data.event?.key ?? "admin.room.assigned";
    const p = data.event?.payload ?? {};
    const doc = p.doctorId ?? p.doctor_id ?? "—";
    const room = p.roomNumber ?? p.room_number ?? "—";
    const at = p.assignedAt ?? p.assigned_at;

    return (
      <div className="rounded-xl p-5 shadow-inner border bg-gray-900 border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="text-amber-300 font-semibold">
            ✅ Room Assignment Created
          </div>
          <div className="text-xs text-gray-400">{fmtTime(at)}</div>
        </div>
        <div className="grid grid-cols-[120px,1fr] gap-y-2 text-sm">
          <div className="text-gray-400">Event</div>
          <div className="text-gray-200 font-mono">{key}</div>

          <div className="text-gray-400">Doctor</div>
          <div className="text-gray-100">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-900/40 border border-blue-700 text-blue-200">
              {doc}
            </span>
          </div>

          <div className="text-gray-400">Room</div>
          <div className="text-gray-100">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-900/40 border border-green-700 text-green-200">
              {room}
            </span>
          </div>

          <div className="text-gray-400">Assigned At</div>
          <div className="text-gray-200">{fmtTime(at)}</div>
        </div>
      </div>
    );
  }

  function DoctorResult({ data }: { data: any }) {
    if (!data) return null;
    if (data.error) {
      return (
        <div className="rounded-xl p-4 shadow-inner border bg-red-900/40 border-red-700">
          <div className="text-red-200 font-medium">❌ {data.error}</div>
        </div>
      );
    }
    const isCreate = data?.event?.key === "admin.doctor.created";
    const isDelete = data?.event?.key === "admin.doctor.deleted";
    const p = data?.event?.payload ?? {};
    return (
      <div className="rounded-xl p-5 shadow-inner border bg-gray-900 border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="text-amber-300 font-semibold">
            {isCreate
              ? "✅ Doctor Created"
              : isDelete
              ? "🗑 Doctor Removed"
              : "ℹ Operation Result"}
          </div>
          <div className="text-xs text-gray-400">
            {fmtTime(p.createdAt || p.deletedAt || new Date().toISOString())}
          </div>
        </div>
        <div className="grid grid-cols-[120px,1fr] gap-y-2 text-sm">
          {"id" in p && (
            <>
              <div className="text-gray-400">ID</div>
              <div className="text-gray-200 font-mono">{p.id}</div>
            </>
          )}
          {"name" in p && (
            <>
              <div className="text-gray-400">Name</div>
              <div className="text-gray-100">{p.name}</div>
            </>
          )}
          {"specialty" in p && (
            <>
              <div className="text-gray-400">Specialty</div>
              <div className="text-gray-100">{p.specialty}</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-black border-b border-gray-700 pb-4">
        🧾 Admin Portal
      </h1>

      {/* --- Add Doctor --- */}
      <div className={sectionCard}>
        <h2 className="text-xl font-bold text-amber-400">Add Doctor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelStyle}>Name</label>
            <input
              className={inputStyle}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Dr. Jane Doe"
            />
          </div>
          <div>
            <label className={labelStyle}>Specialty</label>
            <input
              className={inputStyle}
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="e.g., Cardiology"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addDoctor}
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-500 transition duration-200 shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400 w-full"
            >
              Add Doctor
            </button>
          </div>
        </div>
        {doctorResp && <DoctorResult data={doctorResp} />}
      </div>

      {/* --- Manage Doctors (Scrollable List) --- */}
      <div className={sectionCard}>
        <h2 className="text-xl font-bold text-amber-400">Manage Doctors</h2>
        {doctors.length === 0 ? (
          <p className="text-gray-400">No doctors found.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-4 custom-scrollbar">
            <ul className="divide-y divide-gray-700">
              {doctors.map((d) => (
                <li
                  key={d.id}
                  className="py-3 flex items-center justify-between pr-2"
                >
                  <div>
                    <div className="text-white font-medium">{d.name}</div>
                    {d.specialty && (
                      <div className="text-gray-400 text-sm">{d.specialty}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeDoctor(String(d.id))}
                    className="px-3 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-600 transition"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: rgba(255, 255, 255, 0.8);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background-color: rgba(255, 255, 255, 1);
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(31, 41, 55, 0.8);
            }
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(255,255,255,0.8) rgba(31,41,55,0.8);
            }
        `}</style>
      </div>

      {/* --- Assign Doctor to Room --- */}
      <div className={sectionCard}>
        <h2 className="text-xl font-bold text-amber-400">
          Assign Doctor to Room
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Doctor selection */}
          <div>
            <label className={labelStyle}>Select Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={inputStyle}
            >
              <option value="" className="text-gray-500 bg-gray-800">
                Select Doctor
              </option>
              {availableDoctors.map((d) => (
                <option key={d.id} value={d.id} className="bg-gray-800">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room selection */}
          <div>
            <label className={labelStyle}>Select Room</label>
            <select
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className={inputStyle}
            >
              <option value="" className="text-gray-500 bg-gray-800">
                Select Room
              </option>
              {availableRooms.map((room) => (
                <option
                  key={room.room_number}
                  value={room.room_number}
                  className="bg-gray-800"
                >
                  Room {room.room_number}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={assignRoom}
            className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-500 transition duration-200 shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Assign Room
          </button>
        </div>

        {assignResp && <AssignResult data={assignResp} />}
      </div>

      {/* Floor Plan */}
      <FloorPlan assignedRooms={assignedRooms} />
    </div>
  );
}
