import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Globe, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateEmail } from '@/lib/utils';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  password: string;
  confirmPassword: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName) e.firstName = 'First name is required';
    if (!form.lastName) e.lastName = 'Last name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!validateEmail(form.email)) e.email = 'Please enter a valid email';
    if (!form.phone) e.phone = 'Phone is required';
    if (!form.city) e.city = 'City is required';
    if (!form.country) e.country = 'Country is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email,
            phone: form.phone,
            city: form.city,
            country: form.country,
          })
          .eq('id', data.user.id);
        if (profileError) throw profileError;
      }
      showToast('Account created! Welcome to GlobeTrotter.', 'success');
      navigate(returnTo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-teal-700 font-bold text-2xl">
            <Globe className="w-8 h-8" />
            <span>GlobeTrotter</span>
          </Link>
          <p className="text-gray-500 mt-2">Create your account and start exploring</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Create Account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Jane"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                error={errors.lastName}
              />
            </div>
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              error={errors.email}
            />
            <Input
              type="tel"
              label="Phone"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              error={errors.phone}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                placeholder="San Francisco"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                error={errors.city}
              />
              <Input
                label="Country"
                placeholder="USA"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                error={errors.country}
              />
            </div>
            <Input
              type="password"
              label="Password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              error={errors.password}
            />
            <Input
              type="password"
              label="Confirm Password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
            />
            <Button type="submit" loading={loading} size="lg" className="w-full">
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{' '}
            <Link to={`/login${returnTo !== '/dashboard' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="text-teal-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
