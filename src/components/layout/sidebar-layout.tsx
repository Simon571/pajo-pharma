'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Package, ShoppingCart, Users, LogOut, Boxes, Tag } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen] = useState(true);

  const isAdmin = session?.user?.role === 'admin';
  const isSeller = session?.user?.role === 'seller';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className={cn(
        "bg-white shadow-md p-4 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="text-2xl font-bold mb-6">PAJO PHARMA</div>
        <nav className="space-y-2">
          {isAdmin && (
            <Link
              href="/admin-dashboard"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/admin-dashboard' && 'bg-gray-200 text-gray-900'
              )}
            >
              <Home className="mr-3 h-5 w-5" />
              Dashboard Admin
            </Link>
          )}
          
          {isAdmin && (
            <Link
              href="/sell"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/sell' && 'bg-gray-200 text-gray-900'
              )}
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              Vente Rapide
            </Link>
          )}
          {(isAdmin || isSeller) && (
            <Link
              href="/medications"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/medications' && 'bg-gray-200 text-gray-900'
              )}
            >
              <Package className="mr-3 h-5 w-5" />
              Médicaments
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/stock"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/admin/stock' && 'bg-gray-200 text-gray-900'
              )}
            >
              <Boxes className="mr-3 h-5 w-5" />
              Stock
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/produits-disponibles"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/admin/produits-disponibles' && 'bg-gray-200 text-gray-900'
              )}
            >
              <Tag className="mr-3 h-5 w-5" />
              Produits Disponibles
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/sales"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/sales' && 'bg-gray-200 text-gray-900'
              )}
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              Historique Ventes
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/users"
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200",
                pathname === '/users' && 'bg-gray-200 text-gray-900'
              )}
            >
              <Users className="mr-3 h-5 w-5" />
              Utilisateurs
            </Link>
          )}
          {session && (
            <Button
              onClick={() => signOut({ callbackUrl: '/' })}
              className={cn(
                "w-full flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-200 justify-start",
                "bg-transparent hover:bg-gray-200 text-gray-700"
              )}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Déconnexion
            </Button>
          )}
        </nav>
      </aside>
      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="p-8">
          
          {children}
        </div>
      </main>
    </div>
  );
}
