import { Link } from 'react-router-dom'
import { Package, Phone, Mail, MapPin } from 'lucide-react'

export const Footer = () => (
  <footer className="bg-gray-900 text-white mt-auto">
    <div className="section py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">E-Star Enterprise</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Kenya's trusted supplier of genuine printer toners, ink cartridges, and office printing supplies.
          </p>
          <a href="https://wa.me/254745581692" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
            WhatsApp Us
          </a>
        </div>

        <div>
          <h4 className="font-semibold text-gray-200 mb-4 text-sm uppercase tracking-wider">Products</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            {[['Laser Toners','/products?category=toners'],['Ink Cartridges','/products?category=ink-cartridges'],['Drum Units','/products?category=drum-units'],['Featured Deals','/products?featured=true']].map(([l,h]) => (
              <li key={h}><Link to={h} className="hover:text-white transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-200 mb-4 text-sm uppercase tracking-wider">Brands</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            {['hp','canon','epson','brother','samsung'].map(b => (
              <li key={b}><Link to={`/products?brand=${b}`} className="hover:text-white transition-colors capitalize">{b}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-200 mb-4 text-sm uppercase tracking-wider">Contact</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-center gap-2"><Phone size={13} /><span>+254 745 581 692</span></li>
            <li className="flex items-center gap-2"><Mail  size={13} /><span>orders@e-star.co.ke</span></li>
            <li className="flex items-center gap-2"><MapPin size={13}/><span>Nairobi, Kenya</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <p>© {new Date().getFullYear()} E-Star Enterprise. All rights reserved.</p>
        <p>Pay securely via M-Pesa · Visa · Mastercard</p>
      </div>
    </div>
  </footer>
)