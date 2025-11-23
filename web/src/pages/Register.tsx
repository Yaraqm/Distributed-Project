import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Register() {
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [securityCode, setSecurityCode] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [formError, setFormError] = useState("");
  const [ok, setOk] = useState("");

  // Role → expected security code
  const ROLE_CODES: Record<string, string> = {
    admin: "admin123",
    doctor: "doctor123",
    lab: "lab123",
    pharmacy: "pharmacy123",
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*\d).{6,}$/;

  async function submit(e: any) {
    e.preventDefault();

    // Reset errors
    setEmailError("");
    setPasswordError("");
    setCodeError("");
    setFormError("");
    setOk("");

    let hasError = false;

    // Email validation
    if (!email.trim()) {
      setEmailError("Email is required.");
      hasError = true;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email (e.g., sam@gmail.com).");
      hasError = true;
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError("Password is required.");
      hasError = true;
    } else if (!passwordRegex.test(password)) {
      setPasswordError(
        "Password must be at least 6 characters and include at least one number."
      );
      hasError = true;
    }

    // Security code validation
    const expectedCode = ROLE_CODES[role];
    if (!securityCode.trim()) {
      setCodeError("Security code is required for the selected role.");
      hasError = true;
    } else if (securityCode.trim() !== expectedCode) {
      setCodeError("Security code does not match the selected role.");
      hasError = true;
    }

    if (hasError) return;

    const success = await register(email, password, role);

    if (!success) {
      setFormError("Registration failed. Please try again.");
      return;
    }

    setOk("Account created! You can now login.");
    setEmail("");
    setPassword("");
    setSecurityCode("");
    setRole("doctor");
  }

  const baseInputClasses =
    "w-full p-3 rounded bg-gray-700 border focus:outline-none";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <form
        onSubmit={submit}
        className="bg-gray-800 p-10 rounded-2xl w-[350px] space-y-5 border border-gray-700"
      >
        <h1 className="text-3xl font-extrabold text-center">Sign Up</h1>

        {formError && (
          <p className="text-red-400 text-center text-sm">{formError}</p>
        )}
        {ok && <p className="text-green-400 text-center text-sm">{ok}</p>}

        {/* Email */}
        <div>
          <input
            className={
              baseInputClasses +
              " " +
              (emailError ? "border-red-500" : "border-transparent")
            }
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError && (
            <p className="mt-1 text-sm text-red-400">{emailError}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <input
            className={
              baseInputClasses +
              " " +
              (passwordError ? "border-red-500" : "border-transparent")
            }
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {passwordError && (
            <p className="mt-1 text-sm text-red-400">{passwordError}</p>
          )}
        </div>

        {/* Role dropdown */}
        <div>
          <select
            className={baseInputClasses + " border-transparent"}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="lab">Lab</option>
            <option value="pharmacy">Pharmacy</option>
          </select>
        </div>

        {/* Security code */}
        <div>
          <input
            className={
              baseInputClasses +
              " " +
              (codeError ? "border-red-500" : "border-transparent")
            }
            placeholder="Security code"
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value)}
          />
          {codeError && (
            <p className="mt-1 text-sm text-red-400">{codeError}</p>
          )}
        </div>

        <button className="w-full py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500">
          Register
        </button>

        <a
          className="block text-center text-blue-400 hover:text-blue-300"
          href="/login"
        >
          Already have an account? Login
        </a>
      </form>
    </div>
  );
}
