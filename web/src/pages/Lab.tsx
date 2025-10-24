import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4003" }); // lab-service

export default function Lab() {
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [result, setResult] = useState("Normal");
  const [resp, setResp] = useState<any>(null);

  async function fetchPendingTests() {
    try {
      const { data } = await api.get("/lab/tests/pending");
      setTests(data);
    } catch (err) {
      console.error("[lab] ❌ failed to fetch pending tests:", err);
    }
  }

  useEffect(() => {
    fetchPendingTests();
  }, []);

  async function fulfillTest() {
    if (!selectedTest) return alert("Select a test to fulfill.");

    const test = tests.find((t) => String(t.id) === String(selectedTest));
    if (!test) {
      console.error(
        "[lab] ⚠️ no matching test found for id",
        selectedTest,
        tests
      );
      return alert("Test not found. Try refreshing the pending list.");
    }

    try {
      const { data } = await api.post("/lab/result", {
        patientId: test.patient_id,
        result,
      });
      setResp(data);
      await fetchPendingTests();
    } catch (err) {
      console.error("[lab] ❌ failed to fulfill test:", err);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧪 Lab Portal</h1>

      <div className="space-y-3 max-w-md">
        <select
          className="border p-2 w-full rounded"
          value={selectedTest}
          onChange={(e) => setSelectedTest(e.target.value)}
        >
          <option value="">Select Pending Test</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              Patient {t.patient_id} – {t.test_type} (Doctor {t.doctor_id})
            </option>
          ))}
        </select>

        <input
          className="border p-2 w-full rounded"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Result"
        />

        <button
          onClick={fulfillTest}
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
