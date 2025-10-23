import { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4003" }); // lab-service

export default function Lab() {
  const [patientId, setPatientId] = useState("p-001");
  const [result, setResult] = useState("Normal");
  const [resp, setResp] = useState<any>(null);

  async function sendResult() {
    const { data } = await api.post("/lab/result", { patientId, result });
    setResp(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧪 Lab Portal</h1>
      <div className="space-y-3 max-w-md">
        <input
          className="border p-2 w-full rounded"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Patient ID"
        />
        <input
          className="border p-2 w-full rounded"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Result"
        />
        <button
          onClick={sendResult}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          📤 Publish Test Result
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
