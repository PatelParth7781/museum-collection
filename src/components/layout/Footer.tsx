import { Link } from 'react-router-dom';
import { Landmark, Mail, MapPin, Phone, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 bg-stone-800 rounded-lg">
                <Landmark size={20} className="text-amber-400" />
              </div>
              <div>
                <span className="font-serif font-bold text-stone-100 text-lg leading-none">Heritage</span>
                <span className="block text-[10px] text-stone-500 tracking-widest uppercase">Museum Collection</span>
              </div>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              Preserving and showcasing the rich cultural heritage of our civilization through digital innovation.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4 uppercase tracking-wider">Explore</h3>
            <ul className="space-y-2.5">
              <li><Link to="/" className="text-sm text-stone-400 hover:text-amber-400 transition-colors">Home</Link></li>
              <li><Link to="/collection" className="text-sm text-stone-400 hover:text-amber-400 transition-colors">Collection</Link></li>
              <li><Link to="/exhibitions" className="text-sm text-stone-400 hover:text-amber-400 transition-colors">Exhibitions</Link></li>
              <li><Link to="/about" className="text-sm text-stone-400 hover:text-amber-400 transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4 uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-stone-400">
                <MapPin size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <span>123 Heritage Avenue, Museum District, New Delhi 110001</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-stone-400">
                <Mail size={16} className="shrink-0 text-amber-500" />
                <a href="mailto:info@heritagemuseum.org" className="hover:text-amber-400 transition-colors">info@heritagemuseum.org</a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-stone-400">
                <Phone size={16} className="shrink-0 text-amber-500" />
                <span>+91 11 2345 6789</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-stone-100 mb-4 uppercase tracking-wider">Follow Us</h3>
            <div className="flex gap-3">
              {[
                { icon: Facebook, label: 'Facebook' },
                { icon: Twitter, label: 'Twitter' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Youtube, label: 'YouTube' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="p-2.5 bg-stone-800 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-700 transition-colors"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-stone-500">
            &copy; {new Date().getFullYear()} Heritage Museum Collection Management System. All rights reserved.
          </p>
          <p className="text-xs text-stone-500">MCA Academic Project</p>
        </div>
      </div>
    </footer>
  );
}
