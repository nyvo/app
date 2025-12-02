import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const StudentLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic
    console.log({ email, password });
  };

  return (
    <div className="min-h-screen w-full bg-surface text-sidebar-foreground flex flex-col">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-transparent">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
          <Link to="/courses" className="flex items-center gap-3 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">
              Ease
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content: Centered Login Panel */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 pt-24">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Login Card */}
          <div className="rounded-3xl border border-border bg-white p-8 shadow-xl shadow-text-primary/5">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="font-geist text-2xl font-semibold text-text-primary tracking-tight">
                Velkommen tilbake
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Logg inn for å administrere dine timer
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  E-postadresse
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary transition-colors group-focus-within:text-text-primary pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="navn@eksempel.no"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Passord
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary transition-colors group-focus-within:text-text-primary pointer-events-none" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Forgot Password Link */}
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-muted-foreground hover:text-text-primary transition-colors"
                  >
                    Glemt passord?
                  </Link>
                </div>
              </div>

              {/* Main Action */}
              <Button
                type="submit"
                className="w-full rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-surface-elevated shadow-md hover:shadow-lg ios-ease active:scale-[0.98]"
              >
                Logg inn
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Eller
                </span>
              </div>
            </div>

            {/* Vipps Button */}
            <Button
              type="button"
              className="w-full rounded-xl bg-[#FF5B24] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#E84E1B] hover:shadow-md ios-ease active:scale-[0.98]"
            >
              Logg inn med
              <img
                src="/badges/vipps login.svg"
                alt="Vipps"
                className="h-4 w-auto ml-px translate-y-0.5 brightness-0 invert"
              />
            </Button>
          </div>

          {/* Sign Up Footer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Har du ikke en konto?{' '}
              <Link
                to="/student/register"
                className="font-medium text-text-primary hover:text-primary hover:underline underline-offset-4 transition-colors"
              >
                Registrer deg
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLoginPage;
