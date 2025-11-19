import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4001" }); // doctor-service
const adminApi = axios.create({ baseURL: "http://localhost:4002" }); // admin-service

export default function Doctor() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("p-001");
  const [testType, setTestType] = useState("Blood");
  const [medicine, setMedicine] = useState("Amoxicillin");
  const [dosage, setDosage] = useState("500mg");
  const [resp, setResp] = useState<any>(null);
  const [assignedRoom, setAssignedRoom] = useState<string | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const { data } = await axios.get("http://localhost:4002/doctors");
        if (Array.isArray(data)) {
          setDoctors(data);
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

  // Fetch assigned room when doctorId changes
  useEffect(() => {
    if (doctorId) {
      fetchAssignedRoom();
    } else {
      setAssignedRoom(null);
    }
  }, [doctorId]);

  const fetchAssignedRoom = async () => {
    if (!doctorId) return;

    setRoomLoading(true);
    try {
      const { data } = await adminApi.get(`/admin/assigned-rooms`);

      // Find the most recent room assignment for this doctor
      const doctorAssignment = data.find(
        (assignment: any) =>
          assignment.doctorId?.toString() === doctorId.toString()
      );

      if (doctorAssignment) {
        setAssignedRoom(doctorAssignment.roomNumber);
      } else {
        setAssignedRoom(null);
      }
    } catch (err) {
      console.error("❌ Failed to fetch assigned room:", err);
      setAssignedRoom(null);
    } finally {
      setRoomLoading(false);
    }
  };

  const inputStyle =
    "border border-gray-700 bg-gray-900 text-white p-3 w-full rounded-lg shadow-inner focus:ring-blue-500 focus:border-blue-500 transition duration-150";

  async function orderTest() {
    if (!doctorId) {
      setResp({ error: "Please select a doctor first." });
      return;
    }
    setResp(null);
    try {
      const { data } = await api.post("/tests/order", {
        patientId,
        testType,
        orderedBy: doctorId,
      });
      setResp(data);
    } catch (err: any) {
      console.error("❌ Error ordering test:", err);
      const code = err.response?.data?.error;
      if (code === "duplicate_test") {
        setResp({ error: "Duplicate test. Please enter a new one." });
      } else {
        setResp({ error: "Failed to order test. See console for details." });
      }
    }
  }

  async function sendPrescription() {
    if (!doctorId) {
      setResp({ error: "Please select a doctor first." });
      return;
    }
    setResp(null);
    try {
      const { data } = await api.post("/doctor/prescription", {
        patientId,
        doctorId,
        medicine,
        dosage,
      });
      setResp(data);
    } catch (err: any) {
      console.error("❌ Error sending prescription:", err);
      const code = err.response?.data?.error;
      if (code === "duplicate_prescription") {
        setResp({
          error:
            "Duplicate prescription. Please modify or fulfill existing one before sending again.",
        });
      } else {
        setResp({
          error: "Failed to send prescription. See console for details.",
        });
      }
    }
  }

  async function leaveRoom() {
    if (!doctorId || !assignedRoom) {
      setResp({ error: "No room assigned to leave." });
      return;
    }

    setResp(null);
    try {
      // Remove room assignment and mark room as available
      const { data } = await adminApi.post("/admin/leave-room", {
        doctorId,
        roomNumber: assignedRoom,
      });

      setResp(data);
      setAssignedRoom(null); // Clear the assigned room locally

      // Refresh the assigned room data
      fetchAssignedRoom();
    } catch (err) {
      console.error("❌ Error leaving room:", err);
      setResp({ error: "Failed to leave room. See console for details." });
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-black border-b border-gray-700 pb-4">
        🩺 Doctor Portal
      </h1>

      {/* Top Row: Choose Doctor and Leave Room side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active Doctor Selection */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-700">
          <h2 className="text-xl font-bold text-blue-400 mb-3">
            Active Doctor
          </h2>
          <select
            className={inputStyle}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="" className="text-gray-500 bg-gray-800">
              Choose Doctor
            </option>
            {doctors.map((d) => (
              <option
                key={d.id || d.doctor_id}
                value={d.id || d.doctor_id}
                className="bg-gray-800"
              >
                {d.name || `Doctor ${d.id || d.doctor_id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Leave Room Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-amber-700">
          <h2 className="text-xl font-bold text-amber-400 mb-3">Leave Room</h2>
          {roomLoading ? (
            <div className="text-gray-400 text-center py-4">
              Loading room information...
            </div>
          ) : assignedRoom ? (
            <div className="space-y-4">
              <div className="text-white text-center">
                <div className="text-sm text-gray-400 mb-1">
                  Currently Assigned Room
                </div>
                <div className="text-2xl font-bold text-amber-300">
                  Room {assignedRoom}
                </div>
              </div>
              <button
                onClick={leaveRoom}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-500 transition duration-200 shadow-md w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Leave Room
              </button>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-4">
              No room currently assigned
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Patient section going across */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-yellow-700">
        <h2 className="text-xl font-bold text-purple-400 mb-3">Patient</h2>
        <input
          className={inputStyle}
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Patient ID (p-001)"
        />
      </div>

      {/* Bottom Row: Order Lab Test and Send Prescription - aligned buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Lab Test Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-red-700 space-y-4">
          <h2 className="text-xl font-bold text-red-400">Order Lab Test</h2>
          <input
            className={inputStyle}
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            placeholder="Test Type (Blood, X-Ray)"
          />
          <div className="mt-8">
            {" "}
            {/* Added margin to align buttons */}
            <button
              onClick={orderTest}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-500 transition duration-200 shadow-md w-full focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Order Test
            </button>
          </div>
        </div>

        {/* Send Prescription Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-green-700 space-y-4">
          <h2 className="text-xl font-bold text-green-400">
            Send Prescription
          </h2>
          <input
            className={inputStyle}
            value={medicine}
            onChange={(e) => setMedicine(e.target.value)}
            placeholder="Medicine (Amoxicillin)"
          />
          <input
            className={inputStyle}
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Dosage (500mg)"
          />
          <button
            onClick={sendPrescription}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-500 transition duration-200 shadow-md w-full focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            Send Prescription
          </button>
        </div>
      </div>

      {/* Response Display */}
      {resp && (
        <div
          className={`rounded-xl p-4 shadow-inner border ${
            resp.error
              ? "bg-red-900/50 border-red-700"
              : "bg-gray-900 border-gray-700"
          }`}
        >
          <h3 className="text-lg font-medium text-blue-400 mb-2">
            Operation Result:
          </h3>

          {resp.error ? (
            <p className="text-red-300">{resp.error}</p>
          ) : resp.event ? (
            <div className="text-gray-300 space-y-1 font-mono text-sm">
              {resp.event.key === "lab.test.requested" && (
                <>
                  <p className="text-green-400 font-semibold">
                    Test Ordered Successfully
                  </p>
                  <p>Patient ID: {resp.event.payload.patientId}</p>
                  <p>Test Type: {resp.event.payload.testType}</p>
                  <p>
                    Ordered By:{" "}
                    {resp.event.payload.doctorName ||
                      `Doctor ${resp.event.payload.orderedBy}`}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Timestamp: {new Date(resp.event.timestamp).toLocaleString()}
                  </p>
                </>
              )}

              {resp.event.key === "pharmacy.prescription.created" && (
                <>
                  <p className="text-green-400 font-semibold">
                    Prescription Sent Successfully
                  </p>
                  <p>Patient ID: {resp.event.payload.patientId}</p>
                  <p>Medicine: {resp.event.payload.medicine}</p>
                  <p>Dosage: {resp.event.payload.dosage}</p>
                  <p>
                    Prescribed By:{" "}
                    {resp.event.payload.doctorName ||
                      `Doctor ${resp.event.payload.doctorId}`}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Timestamp: {new Date(resp.event.timestamp).toLocaleString()}
                  </p>
                </>
              )}

              {resp.event.key === "admin.room.vacated" && (
                <>
                  <p className="text-green-400 font-semibold">
                    Room Successfully Vacated
                  </p>
                  <p>Room Number: {resp.event.payload.roomNumber}</p>
                  <p>
                    Doctor:{" "}
                    {resp.event.payload.doctorName ||
                      `Doctor ${resp.event.payload.doctorId}`}
                  </p>
                </>
              )}

              {![
                "lab.test.requested",
                "pharmacy.prescription.created",
                "admin.room.vacated",
              ].includes(resp.event.key) && (
                <pre>{JSON.stringify(resp, null, 2)}</pre>
              )}
            </div>
          ) : (
            <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
              {JSON.stringify(resp, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
