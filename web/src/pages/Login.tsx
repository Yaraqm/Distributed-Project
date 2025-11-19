import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: any) {
    e.preventDefault();
    const ok = await login(email, password);

    if (!ok) return setErr("Invalid login");

    window.location.href = "/";
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <form
        onSubmit={submit}
        className="bg-gray-800 p-10 rounded-2xl shadow-xl w-[350px] space-y-5 border border-gray-700"
      >
        <h1 className="text-3xl font-extrabold text-center">Login</h1>

        {err && <p className="text-red-400 text-center">{err}</p>}

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

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold shadow"
        >
          Login
        </button>

        {/* NEW SIGNUP LINK */}
        <a
          href="/register"
          className="block text-center text-blue-400 hover:text-blue-300"
        >
          Create an account
        </a>
      </form>
    </div>
  );
}
