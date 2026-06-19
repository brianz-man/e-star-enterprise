import { Link } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <PackageSearch size={72} className="text-gray-200 mb-6" />
      <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 text-lg mb-8">This page doesn't exist.</p>
      <Link to="/" className="btn btn-primary btn-lg">Back to Home</Link>
    </div>
  )
}