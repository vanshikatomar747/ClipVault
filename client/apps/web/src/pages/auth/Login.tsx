import { useState } from 'react';

import { useForm as useReactHookForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock } from 'lucide-react';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useReactHookForm();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await login(data.email, data.password);
      setAuth(res.user, res.token);
      navigate('/dashboard');
    } catch (err: any) {
      const details = err.response?.data?.message 
        || `${err.message || 'Login failed'} (Target: ${err.config?.url || 'unknown'})`;
      setErrorMsg(details);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cv-beige px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-cv-cream rounded-2xl shadow-soft p-8"
      >
        <div className="text-center mb-8">
          <div className="mx-auto bg-cv-sage w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <LogIn className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-cv-brown">Welcome back to ClipVault</h2>
          <p className="text-cv-olive mt-2">Enter your details to access your notebooks</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-cv-brown mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-cv-sage focus:border-cv-sage bg-white/50"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-cv-brown mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-cv-sage focus:border-cv-sage bg-white/50"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-cv-sage hover:bg-cv-olive focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cv-sage disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-zinc-500">Don't have an account? </span>
          <Link to="/register" className="text-cv-olive hover:text-cv-sage font-medium">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
