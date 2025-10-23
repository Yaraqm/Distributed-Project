import { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4001" }); // doctor-service

export default function Doctor() {
  const [patientId, setPatientId] = useState("p-001");
  const [testType, setTestType] = useState("Blood");
  const [medicine, setMedicine] = useState("Amoxicillin");
  const [dosage, setDosage] = useState("500mg");
  const [resp, setResp] = useState<any>(null);

  async function orderTest() {
    const { data } = await api.post("/tests/order", {
      patientId,
      testType,
      orderedBy: "d-123",
    });
    setResp(data);
  }

  async function sendPrescription() {
    const { data } = await api.post("/doctor/prescription", {
      patientId,
      doctorId: "d-123",
      medicine,
      dosage,
    });
    setResp(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🩺 Doctor Portal</h1>

      <div className="space-y-3 max-w-md">
        <h2 className="font-semibold">Order Lab Test</h2>
        <input
          className="border p-2 w-full rounded"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Patient ID"
        />
        <input
          className="border p-2 w-full rounded"
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          placeholder="Test Type"
        />
        <button
          onClick={orderTest}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          🧪 Order Test
        </button>
      </div>

      <div className="space-y-3 max-w-md">
        <h2 className="font-semibold">Send Prescription</h2>
        <input
          className="border p-2 w-full rounded"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          placeholder="Medicine"
        />
        <input
          className="border p-2 w-full rounded"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="Dosage"
        />
        <button
          onClick={sendPrescription}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          💊 Send Prescription
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
