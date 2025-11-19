import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Register() {
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e: any) {
    e.preventDefault();

    const success = await register(email, password, role);
    if (!success) return setErr("Registration failed");

    setOk("Account created! You can now login.");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <form
        onSubmit={submit}
        className="bg-gray-800 p-10 rounded-2xl w-[350px] space-y-5 border border-gray-700"
      >
        <h1 className="text-3xl font-extrabold text-center">Sign Up</h1>

        {err && <p className="text-red-400 text-center">{err}</p>}
        {ok && <p className="text-green-400 text-center">{ok}</p>}

        <input
          className="w-full p-3 rounded bg-gray-700"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-gray-700"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="w-full p-3 rounded bg-gray-700"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="lab">Lab</option>
          <option value="pharmacy">Pharmacy</option>
        </select>

        <button className="w-full py-3 rounded-xl bg-blue-600 font-bold">
          Register
        </button>

        <a className="block text-center text-blue-400" href="/login">
          Already have an account? Login
        </a>
      </form>
    </div>
  );
}
