import { Landmark, BookOpen, Shield, Heart, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-stone-800 rounded-2xl mb-4">
          <Landmark size={40} className="text-amber-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-800 mb-3">About the Heritage Museum</h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto">
          Preserving and sharing the cultural heritage of our civilization through digital innovation
        </p>
      </div>

      <div className="prose prose-stone max-w-none mb-12">
        <p className="text-stone-600 leading-relaxed">
          The Heritage Museum Collection Management System (MCMS) is a digital platform designed to catalog, preserve,
          and share historical and cultural artifacts with a global audience. Our collection spans thousands of years
          of human history — from the ancient Indus Valley Civilization to the colonial era — encompassing sculpture,
          painting, textiles, manuscripts, metalwork, and more.
        </p>
        <p className="text-stone-600 leading-relaxed mt-4">
          This platform serves as both a public-facing digital archive and a comprehensive management tool for museum
          staff. Visitors can explore the collection, learn about historical context, and save their favorite artifacts.
          Curators and administrators can manage artifacts, track conservation, record provenance, organize exhibitions,
          and analyze collection data through detailed dashboards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[
          { icon: BookOpen, title: 'Our Mission', text: 'To make cultural heritage accessible to everyone, everywhere, through digital technology and careful curation.' },
          { icon: Shield, title: 'Conservation', text: 'We maintain detailed conservation records for every artifact, ensuring preservation for future generations.' },
          { icon: Heart, title: 'Public Access', text: 'Our digital collection is freely accessible, allowing scholars, students, and enthusiasts to explore history.' },
          { icon: Users, title: 'Community', text: 'We engage with communities, researchers, and institutions to build a collaborative understanding of our shared heritage.' },
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <div className="inline-flex p-3 bg-amber-50 text-amber-700 rounded-lg mb-3">
              <item.icon size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-serif font-semibold text-stone-800 mb-1.5">{item.title}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-stone-900 text-stone-300 rounded-xl p-8 text-center">
        <h2 className="text-xl font-serif font-bold text-stone-100 mb-2">MCA Academic Project</h2>
        <p className="text-sm text-stone-400">
          This Museum Collection Management System is developed as an MCA academic project, demonstrating full-stack
          development with React, TypeScript, PostgreSQL (Supabase), authentication, role-based access control, and
          responsive design.
        </p>
      </div>
    </div>
  );
}
