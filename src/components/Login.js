import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

// import jobzenterLogo from '../assets/jzlogo.png';
// import urbancodeLogo from '../assets/uclogo.png';
import { API_ENDPOINTS } from '../utils/api';

/** Only allow same-app relative paths (blocks open redirects). */
function getSafeReturnPath(from, role) {
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  if (role === 'admin') return '/dashboard';
  if (role === 'employee') return '/attendance';
  return '/';
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const returnFrom = location.state?.from;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const role = response.data?.role || jwtDecode(token).role;
        navigate(getSafeReturnPath(returnFrom, role), { replace: true });
      } catch (err) {
        localStorage.removeItem('token');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, returnFrom]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(API_ENDPOINTS.login, { email, password }, { validateStatus: s => s < 500 });

      if (response.status !== 200) throw new Error(response.data?.error || 'Login failed');

      const token = response.data.token;
      const inoutUnlockNotice = response.data.inoutUnlockNotice === true;
      localStorage.setItem('token', token);
      const decoded = jwtDecode(token);
      const destination = getSafeReturnPath(returnFrom, decoded.role);

      if (inoutUnlockNotice && decoded.role !== 'admin') {
        await new Promise((resolve) => {
          toast(
            ({ closeToast }) => (
              <div>
                <p className="inout-open-title">In-Out is open</p>
                <p className="inout-open-text">
                  Admin unlocked your In-Out. You can check in and check out now.
                </p>
                <button
                  type="button"
                  className="inout-open-btn"
                  onClick={() => {
                    closeToast();
                    resolve();
                  }}
                >
                  OK
                </button>
              </div>
            ),
            {
              autoClose: false,
              closeOnClick: false,
              closeButton: false,
              draggable: false,
              icon: false,
              className: 'inout-unlock-toast',
            }
          );
        });
        try {
          await axios.post(API_ENDPOINTS.acknowledgeInoutUnlock, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          /* notice can show again on the next login if this fails */
        }
      } else {
        toast.success('Welcome! Login successful. Redirecting...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      navigate(destination, { replace: true });

    } catch (err) {
      toast.error(`Login Failed: ${err?.message || 'Something went wrong.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-lg border border-[#e0ecff] rounded-3xl shadow-xl px-8 py-10">
        <div className="flex justify-center items-center gap-4 mb-6">
          <img src="/inout-logo.png" alt="InOut" className="h-20" />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-[#2c2e3e] mb-2">Sign In</h2>
          <p className="text-[#6e7b8b] text-sm">Enter your credentials below</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[#2c2e3e] mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white/60 placeholder-gray-400 text-gray-800 focus:ring-2 focus:ring-[#159C8E] focus:outline-none"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#2c2e3e] mb-1">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white/60 placeholder-gray-400 text-gray-800 focus:ring-2 focus:ring-[#159C8E] focus:outline-none"
              placeholder="••••••••"
            />
            <button
  type="button"
  onClick={() => setShowPassword((prev) => !prev)}
  className="text-sm text-[#159C8E] hover:underline mt-1"
>
  {showPassword ? "Hide Password" : "Show Password"}
</button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#2c2e3e]">
              <input type="checkbox" className="accent-[#159C8E]" />
              Remember me
            </label>
            <button
              type="button"
              onClick={() =>
                toast.info('Forgot Password? Contact admin for password reset.')
              }
              className="text-[#159C8E] hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#159C8E] hover:bg-[#0F7A6E] text-white font-semibold py-3 rounded-lg transition duration-150 shadow-md"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm mt-6 text-[#6e7b8b]">
          Don’t have an account?{' '}
          <a href="/register" className="text-[#0F7A6E] font-semibold hover:underline">
            Register
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
