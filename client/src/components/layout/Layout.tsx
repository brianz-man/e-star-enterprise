import { type ReactNode } from 'react'
import { Navbar }     from './Navbar'
import { Footer }     from './Footer'
import { CartDrawer } from './CartDrawer'

interface LayoutProps { children: ReactNode }

export const Layout = ({ children }: LayoutProps) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <CartDrawer />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
)