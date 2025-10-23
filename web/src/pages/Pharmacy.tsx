import { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4004" }); // pharmacy-service

export default function Pharmacy() {
  const [patientId, setPatientId] = useState("p-001");
  const [medicine, setMedicine] = useState("Amoxicillin");
  const [resp, setResp] = useState<any>(null);

  async function fulfillPrescription() {
    const { data } = await api.post("/pharmacy/fulfill", {
      patientId,
      medicine,
    });
    setResp(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">💊 Pharmacy Portal</h1>
      <div className="space-y-3 max-w-md">
        <input
          className="border p-2 w-full rounded"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Patient ID"
        />
        <input
          className="border p-2 w-full rounded"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          placeholder="Medicine"
        />
        <button
          onClick={fulfillPrescription}
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
