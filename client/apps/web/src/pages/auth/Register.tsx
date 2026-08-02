import { useState } from 'react';
import { useForm as useReactHookForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { register as registerUser } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useReactHookForm();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await registerUser(data.name, data.email, data.password, '000000');
      setAuth(res.user, res.token);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cv-beige px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-cv-cream rounded-2xl shadow-soft p-8"
      >
        <div className="text-center mb-8">
          <div className="mx-auto bg-cv-sage w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-cv-brown">Create an Account</h2>
          <p className="text-cv-olive mt-2">Start organizing your clipboard history</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-cv-brown mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-cv-sage focus:border-cv-sage bg-white/50"
                placeholder="Name"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
          </div>

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
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-cv-sage focus:border-cv-sage bg-white/50"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-cv-sage hover:bg-cv-olive focus:outline-none transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-zinc-500">Already have an account? </span>
          <Link to="/login" className="text-cv-olive hover:text-cv-sage font-medium">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
