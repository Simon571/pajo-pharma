
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, BarChart3, DollarSign, Receipt, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface DailySummary {
  totalSales: number;
  transactionCount: number;
}

interface ReportData {
  todaySales: {
    count: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
}

export default function SellerDashboardPage() {
  const { data: session } = useSession();
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    totalSales: 0,
    transactionCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour récupérer les données
  const fetchDailySummary = async () => {
    setIsLoading(true);
    try {
  const response = await fetch('/api/daily-report', { cache: 'no-store' });
      if (response.ok) {
        const data: ReportData = await response.json();
        setDailySummary({
          totalSales: data.todaySales.totalRevenue || 0,
          transactionCount: data.todaySales.count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDailySummary();
    }
  }, [session]);

  // Rafraîchir automatiquement quand la page redevient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        fetchDailySummary();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session]);

  const sellerName = session?.user?.name || 'seller';
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="p-6 space-y-6">
      {/* En-tête de bienvenue */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Bonjour, {sellerName}!</h1>
          <p className="text-gray-600">Voici votre résumé pour aujourd'hui, {currentDate}.</p>
        </div>
        <Button
          onClick={fetchDailySummary}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ventes du Jour */}
        <Card className="bg-blue-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Ventes du Jour</CardTitle>
            <DollarSign className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(dailySummary.totalSales)}</div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-gray-700">Transactions</CardTitle>
            <Receipt className="h-6 w-6 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dailySummary.transactionCount}</div>
            <p className="text-sm text-gray-600 mt-1">
              ventes réalisées aujourd'hui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Rapides */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nouvelle Vente */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <Link href="/ventes" className="block">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Nouvelle Vente</h3>
                    <p className="text-sm text-gray-600">
                      Accéder au terminal de vente pour enregistrer de nouvelles transactions client.
                    </p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Mon Rapport */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <Link href="/daily-report" className="block">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mon Rapport</h3>
                    <p className="text-sm text-gray-600">
                      Consulter vos ventes et ajouter des dépenses pour le rapport journalier.
                    </p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

