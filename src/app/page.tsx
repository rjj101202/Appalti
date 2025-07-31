'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Zap, Shield, TrendingUp, Users } from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-primary-600">Appalti</span> AI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/api/auth/login" className="btn-secondary">
                Inloggen
              </Link>
              <Link href="/api/auth/login?screen_hint=signup" className="btn-primary">
                Registreren
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="gradient-subtle absolute inset-0 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              AI-gedreven Sales Optimalisatie voor{' '}
              <span className="text-primary-600">Aanbestedingen</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Transformeer uw aanbestedingsproces met intelligente matching, 
              geautomatiseerde documentgeneratie en 16 jaar expertise.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/api/auth/login?screen_hint=signup" className="btn-primary text-lg px-8 py-3 flex items-center">
                Start Gratis Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="#features" className="btn-secondary text-lg px-8 py-3">
                Ontdek Meer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Waarom Appalti AI?
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ons platform combineert geavanceerde AI met diepgaande marktkennis
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary-600" />}
              title="Intelligente Matching"
              description="AI-gedreven tender matching op basis van uw ideale klantprofiel"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary-600" />}
              title="16 Jaar Expertise"
              description="Toegang tot een database van succesvolle aanbestedingen"
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-primary-600" />}
              title="Verhoog Win Rate"
              description="Geoptimaliseerde offertes met AI-gegenereerde content"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-primary-600" />}
              title="Team Samenwerking"
              description="Werk samen aan offertes met uw hele team"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-4">
            Klaar om uw aanbestedingsproces te transformeren?
          </h3>
          <p className="text-xl text-primary-100 mb-8">
            Start vandaag nog met Appalti AI en ervaar de kracht van AI-gedreven sales optimalisatie
          </p>
          <Link 
            href="/api/auth/login?screen_hint=signup" 
            className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 transition-colors"
          >
            Begin Nu
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card-elevated p-6 text-center hover:scale-105 transition-transform">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-lg mb-4">
        {icon}
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
