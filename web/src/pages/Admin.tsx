import { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4002" }); // admin-service

export default function Admin() {
  const [doctorId, setDoctorId] = useState("d-123");
  const [roomNumber, setRoomNumber] = useState("101A");
  const [resp, setResp] = useState<any>(null);

  async function assignRoom() {
    const { data } = await api.post("/admin/assign-room", {
      doctorId,
      roomNumber,
    });
    setResp(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧾 Admin Portal</h1>
      <div className="space-y-3 max-w-md">
        <input
          className="border p-2 w-full rounded"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          placeholder="Doctor ID"
        />
        <input
          className="border p-2 w-full rounded"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          placeholder="Room Number"
        />
        <button
          onClick={assignRoom}
          className="bg-amber-600 text-white px-4 py-2 rounded"
        >
          🧾 Assign Room
        </button>
      </div>

      {resp && (
        <div className="bg-gray-100 p-4 rounded">
          <pre>{JSON.stringify(resp, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
