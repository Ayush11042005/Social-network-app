import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/feed');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24 bg-gradient-to-br from-violet-950 via-background to-fuchsia-950/30">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-violet-500/25">
              N
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Nexus
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6">
            Connect with the{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              world around you
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Share your moments, discover new perspectives, and build meaningful connections.
            Join our vibrant community today.
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              Real-time messaging
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
              Rich media sharing
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-400" />
              Smart recommendations
            </div>
          </div>
        </div>
      </div>

      {/* Right Auth Section */}
      <div className="lg:w-[480px] flex flex-col justify-center px-8 py-12 lg:px-16 bg-card border-l border-border">
        <div className="max-w-sm mx-auto w-full">
          <h2 className="text-2xl font-bold mb-2">Get Started</h2>
          <p className="text-muted-foreground mb-8">Create an account or sign in to continue</p>

          <div className="space-y-4">
            <Link
              href="/register"
              className="flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center w-full h-12 rounded-xl border border-border hover:bg-muted font-medium transition-all"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
}
