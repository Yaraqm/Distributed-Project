import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4004" }); // pharmacy-service

export default function Pharmacy() {
  const [pending, setPending] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [resp, setResp] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null);

  async function fetchPending() {
    try {
      const { data } = await api.get("/pharmacy/pending");
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[pharmacy] ❌ failed to fetch pending:", err);
    }
  }

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fulfill() {
    setMessage(null);
    setResp(null);

    if (!selectedId) {
      setMessage({ text: "Please select a prescription to fulfill.", type: "info" });
      return;
    }

    try {
      const { data } = await api.post("/pharmacy/fulfill", {
        prescriptionId: selectedId,
      });
      setResp(data);
      setMessage({ text: `Prescription ${selectedId} fulfilled successfully.`, type: "info" });
      setSelectedId("");
      fetchPending();
    } catch (err) {
      console.error("[pharmacy] ❌ failed to fulfill:", err);
      setMessage({ text: "Failed to fulfill prescription. See console.", type: "error" });
    }
  }

  const inputStyle =
    "border border-gray-700 bg-gray-900 text-white p-3 w-full rounded-lg shadow-inner focus:ring-green-500 focus:border-green-500 transition duration-150";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-black border-b border-gray-700 pb-4">
        💊 Pharmacy Portal
      </h1>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-lg space-y-4">
        <h2 className="text-xl font-bold text-green-400">
          Fulfill Pending Prescriptions ({pending.length} found)
        </h2>

        {message && (
          <div
            className={`p-3 rounded-lg font-medium ${
              message.type === "error"
                ? "bg-red-800 text-red-100"
                : "bg-blue-800 text-blue-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <select
          className={inputStyle}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="" className="text-gray-500 bg-gray-800">
            Select Pending Prescription
          </option>
          {pending.map((p) => (
            <option key={p.id} value={p.id} className="bg-gray-800">
              Patient {p.patient_id} – {p.medicine} ({p.dosage}) from{" "}
              {p.doctor_name || `Doctor ${p.doctor_id}`}
            </option>
          ))}
        </select>

        <button
          onClick={fulfill}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-500 transition duration-200 shadow-md w-full focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Fulfill Prescription
        </button>
      </div>

      {/* ✅ Friendly result display */}
      {resp && !resp.error && (
        <div className="rounded-xl p-4 shadow-inner border max-w-lg bg-gray-900 border-gray-700">
          <h3 className="text-lg font-medium text-green-400 mb-2">
            Prescription Fulfilled
          </h3>
          <div className="text-gray-300 space-y-1 font-mono text-sm">
            <p>Prescription ID: {resp.event?.payload?.prescriptionId}</p>
            <p>Patient ID: {resp.event?.payload?.patientId}</p>
            <p>Doctor: {resp.event?.payload?.doctorName}</p>
            <p>Medicine: {resp.event?.payload?.medicine}</p>
            <p>Dosage: {resp.event?.payload?.dosage}</p>
            <p>
              Fulfilled At:{" "}
              {new Date(resp.event?.payload?.fulfilledAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {resp?.error && (
        <div className="rounded-xl p-4 shadow-inner border max-w-lg bg-red-900/50 border-red-700">
          <h3 className="text-lg font-medium text-red-400 mb-2">
            ❌ Operation Failed
          </h3>
          <p className="text-red-200">{resp.error}</p>
        </div>
      )}
    </div>
  );
}
