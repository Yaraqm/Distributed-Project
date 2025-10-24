import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4001" }); // doctor-service

export default function Doctor() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("p-001");
  const [testType, setTestType] = useState("Blood");
  const [medicine, setMedicine] = useState("Amoxicillin");
  const [dosage, setDosage] = useState("500mg");
  const [resp, setResp] = useState<any>(null);

  // ✅ Load doctor list from Admin service
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const { data } = await axios.get("http://localhost:4002/doctors");
        if (Array.isArray(data)) {
          setDoctors(data);
          // Auto-select first doctor for convenience
          if (data.length > 0 && !doctorId)
            setDoctorId(data[0].id || data[0].doctor_id);
        } else {
          setDoctors([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch doctors:", err);
        setDoctors([]);
      }
    }
    fetchDoctors();
  }, []);

  // ✅ Order a lab test
  async function orderTest() {
    try {
      const { data } = await api.post("/tests/order", {
        patientId,
        testType,
        orderedBy: doctorId,
      });
      setResp(data);
    } catch (err) {
      console.error("❌ Error ordering test:", err);
      setResp({ error: "Failed to order test" });
    }
  }

  // ✅ Send a prescription
  async function sendPrescription() {
    try {
      const { data } = await api.post("/doctor/prescription", {
        patientId,
        doctorId,
        medicine,
        dosage,
      });
      setResp(data);
    } catch (err) {
      console.error("❌ Error sending prescription:", err);
      setResp({ error: "Failed to send prescription" });
    }
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">🩺 Doctor Portal</h1>

      {/* Doctor selection */}
      <div className="space-y-2 max-w-md">
        <h2 className="font-semibold">Select Doctor</h2>
        <select
          className="border p-2 w-full rounded"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          <option value="">Choose Doctor</option>
          {doctors.map((d) => (
            <option key={d.id || d.doctor_id} value={d.id || d.doctor_id}>
              {d.name || `Doctor ${d.id || d.doctor_id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Order lab test */}
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

      {/* Send prescription */}
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

      {/* Response display */}
      {resp && (
        <div className="bg-gray-100 p-4 rounded">
          <pre>{JSON.stringify(resp, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
