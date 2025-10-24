import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4004" }); // pharmacy-service

export default function Pharmacy() {
  const [pending, setPending] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [resp, setResp] = useState<any>(null);

  async function fetchPending() {
    try {
      const { data } = await api.get("/pharmacy/pending");
      console.log("[pharmacy] pending prescriptions:", data);
      setPending(data);
    } catch (err) {
      console.error("[pharmacy] ❌ failed to fetch pending:", err);
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  async function fulfill() {
    if (!selectedId) return alert("Select a prescription to fulfill");
    const { data } = await api.post("/pharmacy/fulfill", {
      prescriptionId: selectedId,
    });
    setResp(data);
    fetchPending();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">💊 Pharmacy Portal</h1>

      <div className="space-y-3 max-w-md">
        <select
          className="border p-2 w-full rounded"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Select Pending Prescription</option>
          {pending.map((p) => (
            <option key={p.id} value={p.id}>
              Patient {p.patient_id} – {p.medicine} ({p.dosage}) from Dr.{" "}
              {p.doctor_id}
            </option>
          ))}
        </select>

        <button
          onClick={fulfill}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ✅ Fulfill Prescription
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
