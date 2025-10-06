'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ShoppingCart, BarChart3, Home, Settings, LogOut, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface MobileNavigationProps {
  userRole?: 'admin' | 'seller';
}

export function MobileNavigation({ userRole = 'seller' }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const sellerLinks = [
    {
      href: '/seller-dashboard',
      label: 'Accueil',
      icon: Home,
    },
    {
      href: '/ventes',
      label: 'Nouvelle Vente',
      icon: ShoppingCart,
    },
    {
      href: '/daily-report',
      label: 'Mon Rapport',
      icon: BarChart3,
    },
  ];

  const adminLinks = [
    {
      href: '/admin-dashboard',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/medications',
      label: 'Médicaments',
      icon: Package,
    },
    {
      href: '/ventes',
      label: 'Interface Vente',
      icon: ShoppingCart,
    },
    {
      href: '/users',
      label: 'Utilisateurs',
      icon: Users,
    },
    {
      href: '/admin/historique-ventes',
      label: 'Historique Ventes',
      icon: BarChart3,
    },
    {
      href: '/admin/global-report',
      label: 'Rapports',
      icon: BarChart3,
    },
  ];

  const links = userRole === 'admin' ? adminLinks : sellerLinks;

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="lg:hidden">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-50 bg-white shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-72 p-0 max-w-sm h-full fixed left-0 top-0 translate-x-0 translate-y-0 rounded-r-lg rounded-l-none">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">PajoPharma</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-blue-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                {userRole === 'admin' ? 'Administration' : 'Point de Vente'}
              </p>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4">
              <ul className="space-y-3">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-4 rounded-lg transition-all duration-200 text-base font-medium
                          ${active 
                            ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <Icon className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Quick Actions for Seller */}
            {userRole === 'seller' && (
              <div className="p-4 border-t bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Actions Rapides</h3>
                <div className="space-y-2">
                  <Link
                    href="/ventes"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Nouvelle Vente
                  </Link>
                </div>
              </div>
            )}

            {/* Section Déconnexion */}
            <div className="p-4 border-t bg-gray-50 mt-auto">
              <div className="space-y-2">
                <Link
                  href="/login-common"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Déconnexion
                </Link>
                <p className="text-xs text-center text-gray-500">
                  Retour à la page de connexion
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MobileNavigation;