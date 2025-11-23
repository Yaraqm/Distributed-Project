import { useEffect, useState } from "react";
import axios from "axios";

// Gateway API with token injection
const api = axios.create({
  baseURL: "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function Lab() {
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [result, setResult] = useState("Normal");
  const [resp, setResp] = useState<any>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "info";
  } | null>(null);

  async function fetchPendingTests() {
    try {
      const { data } = await api.get("/lab/tests/pending");
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[lab] ❌ failed to fetch pending tests:", err);
    }
  }

  useEffect(() => {
    fetchPendingTests();
    const interval = setInterval(fetchPendingTests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fulfillTest() {
    setMessage(null);
    setResp(null);

    if (!selectedTest) {
      setMessage({ text: "Please select a test to fulfill.", type: "info" });
      return;
    }

    const test = tests.find((t) => String(t.id) === String(selectedTest));
    if (!test) {
      setMessage({ text: "Test not found. Try refreshing.", type: "error" });
      return;
    }

    try {
      const { data } = await api.post("/lab/result", {
        patientId: test.patient_id,
        result,
      });
      setResp(data);
      setMessage({
        text: `Result published for Test ${selectedTest}.`,
        type: "info",
      });
      setSelectedTest("");
      await fetchPendingTests();
    } catch (err) {
      console.error("[lab] ❌ failed to fulfill test:", err);
      setMessage({ text: "Failed to publish test result.", type: "error" });
    }
  }

  const inputStyle =
    "border border-gray-700 bg-gray-900 text-white p-3 w-full rounded-lg shadow-inner focus:ring-purple-500 focus:border-purple-500 transition duration-150";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-black border-b border-gray-700 pb-4">
        🧪 Lab Portal
      </h1>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-lg space-y-4">
        <h2 className="text-xl font-bold text-purple-400">
          Process Pending Tests ({tests.length} found)
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
          value={selectedTest}
          onChange={(e) => setSelectedTest(e.target.value)}
        >
          <option value="" className="text-gray-500 bg-gray-800">
            Select Pending Test
          </option>
          {tests.map((t) => (
            <option key={t.id} value={t.id} className="bg-gray-800">
              Patient {t.patient_id} – {t.test_type} (Doctor{" "}
              {t.doctor_name || t.doctor_id})
            </option>
          ))}
        </select>

        <input
          className={inputStyle}
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Enter Result (e.g., Normal, Elevated)"
        />

        <button
          onClick={fulfillTest}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-500 transition duration-200 shadow-md w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          Publish Test Result
        </button>
      </div>

      {/* Result display */}
      {resp && !resp.error && (
        <div className="rounded-xl p-4 shadow-inner border max-w-lg bg-gray-900 border-gray-700">
          <h3 className="text-lg font-medium text-purple-400 mb-2">
            Test Result Published
          </h3>
          <div className="text-gray-300 space-y-1 font-mono text-sm">
            <p>Patient ID: {resp.event?.payload?.patientId}</p>
            <p>Test Type: {resp.event?.payload?.testType}</p>
            <p>Doctor: {resp.event?.payload?.doctorName}</p>
            <p>Result: {resp.event?.payload?.result}</p>
            <p>
              Completed At:{" "}
              {new Date(resp.event?.payload?.completedAt).toLocaleString()}
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
