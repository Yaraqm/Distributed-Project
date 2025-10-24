import { useEffect, useState } from "react";
import axios from "axios";

export default function Admin() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [resp, setResp] = useState<any>(null);

  useEffect(() => {
    console.log("📡 Admin useEffect started");

    async function loadData() {
      try {
        // ✅ Make sure to call the backend (not frontend port)
        const doctorRes = await axios.get("http://localhost:4002/doctors");
        console.log("✅ DOCTORS RESPONSE:", doctorRes.data);
        setDoctors(Array.isArray(doctorRes.data) ? doctorRes.data : []);

        const roomRes = await axios.get("http://localhost:4002/rooms");
        console.log("✅ ROOMS RESPONSE:", roomRes.data);
        setRooms(Array.isArray(roomRes.data) ? roomRes.data : []);
      } catch (err) {
        console.error("❌ Error loading admin data:", err);
      }
    }

    loadData();
  }, []);

  async function assignRoom() {
    try {
      const res = await axios.post("http://localhost:4002/admin/assign-room", {
        doctorId,
        roomNumber,
      });
      console.log("✅ ROOM ASSIGNED:", res.data);
      setResp(res.data);
    } catch (err) {
      console.error("❌ Error assigning room:", err);
      setResp({ error: "Failed to assign room" });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🧾 Admin Portal</h1>

      {/* Doctor selection */}
      <div className="flex items-center space-x-4">
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="border p-2 rounded w-64"
        >
          <option value="">Select Doctor</option>
          {doctors.map((d) => (
            <option key={d.id || d.doctor_id} value={d.id || d.doctor_id}>
              {d.name || `Doctor ${d.id || d.doctor_id}`}
            </option>
          ))}
        </select>

        {/* Room selection */}
        <select
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          className="border p-2 rounded w-64"
        >
          <option value="">Select Room</option>
          {rooms.map((r) => (
            <option key={r.id || r.room_number} value={r.room_number}>
              {r.room_number}
            </option>
          ))}
        </select>

        {/* Assign button */}
        <button
          onClick={assignRoom}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Assign Room
        </button>
      </div>

      {/* Response */}
      {resp && (
        <div className="border rounded p-4 bg-gray-50">
          <pre>{JSON.stringify(resp, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
