'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Zap, Shield, TrendingUp, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      <nav>
        <div className="nav-container">
          <a href="/" className="logo">
            <span>Appalti</span> AI
          </a>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="/dashboard" className="btn btn-secondary">
              Dashboard
            </a>
            <a href="/dashboard" className="btn btn-primary">
              Login (Test)
            </a>
          </div>
        </div>
      </nav>
      
      <div className="container">
        <div className="hero">
          <h1>
            AI-gedreven Sales Optimalisatie voor Aanbestedingen
          </h1>
          <p>
            Transformeer uw aanbestedingsproces met intelligente matching, 
            geautomatiseerde documentgeneratie en 16 jaar expertise.
          </p>
          <a href="/dashboard" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '0.75rem 2rem' }}>
            Start Nu →
          </a>
        </div>
        
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Intelligente Matching</h3>
            <p>AI-gedreven tender matching op basis van uw ideale klantprofiel</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>16 Jaar Expertise</h3>
            <p>Toegang tot een database van succesvolle aanbestedingen</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"></div>
            <h3>Team Samenwerking</h3>
            <p>Werk samen aan offertes met uw hele team</p>
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
