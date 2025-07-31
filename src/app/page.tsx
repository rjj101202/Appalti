'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Zap, Shield, TrendingUp, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold">
              <span className="text-purple-600">Appalti</span> AI
            </h1>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="px-4 py-2 text-gray-700 hover:text-gray-900">
                Dashboard
              </a>
              <a href="/dashboard" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Login (Test)
              </a>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            AI-gedreven Sales Optimalisatie voor Aanbestedingen
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transformeer uw aanbestedingsproces met intelligente matching, 
            geautomatiseerde documentgeneratie en 16 jaar expertise.
          </p>
          <a 
            href="/dashboard" 
            className="inline-block px-8 py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700"
          >
            Start Nu →
          </a>
        </div>
        
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Intelligente Matching</h3>
            <p className="text-gray-600">AI-gedreven tender matching op basis van uw ideale klantprofiel</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">16 Jaar Expertise</h3>
            <p className="text-gray-600">Toegang tot een database van succesvolle aanbestedingen</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Team Samenwerking</h3>
            <p className="text-gray-600">Werk samen aan offertes met uw hele team</p>
          </div>
        </div>
      </div>
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
