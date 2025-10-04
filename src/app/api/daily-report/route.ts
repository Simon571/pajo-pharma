import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const { PrismaClient } = require('@prisma/client');

interface DailyReportData {
  todaySales: {
    count: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  topSellingMedications: Array<{
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    revenue: number;
  }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const prisma = new PrismaClient();

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Seuls les vendeurs peuvent accéder à leur propre rapport
    if (session.user.role !== 'seller') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const sellerId = session.user.id;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // MODIFICATION: Force le rapport journalier à zéro
    // const todaySales = await prisma.sale.findMany({
    //   where: {
    //     sellerId: sellerId,
    //     date: {
    //       gte: startOfToday,
    //       lte: endOfToday,
    //     },
    //   },
    //   include: {
    //     items: {
    //       include: {
    //         medication: true,
    //       },
    //     },
    //     client: true,
    //   },
    // });

    // Force toutes les données à zéro
    const todaySales: any[] = [];

    // Calcul des statistiques de ventes (forcées à zéro)
    const totalRevenue = 0; // todaySales.reduce((sum: number, sale: any) => sum + sale.totalAmount, 0);
    const averageOrderValue = 0; // todaySales.length > 0 ? totalRevenue / todaySales.length : 0;

    // Top des médicaments vendus (forcé à vide)
    const medicationSales: Record<string, { name: string; quantitySold: number; revenue: number }> = {};
    
    // todaySales.forEach((sale: any) => {
    //   sale.items.forEach((item: any) => {
    //     const key = item.medicationId;
    //     if (!medicationSales[key]) {
    //       medicationSales[key] = {
    //         name: item.medication.name,
    //         quantitySold: 0,
    //         revenue: 0,
    //       };
    //     }
    //     medicationSales[key].quantitySold += item.quantity;
    //     medicationSales[key].revenue += item.priceAtSale * item.quantity;
    //   });
    // });

    const topSellingMedications: any[] = []; // Object.values(medicationSales)
      // .sort((a, b) => b.quantitySold - a.quantitySold)
      // .slice(0, 5);

    // Répartition par méthode de paiement (forcée à vide)
    const paymentMethodsData: Record<string, { count: number; amount: number }> = {};
    
    // todaySales.forEach((sale: any) => {
    //   if (!paymentMethodsData[sale.paymentMethod]) {
    //     paymentMethodsData[sale.paymentMethod] = { count: 0, amount: 0 };
    //   }
    //   paymentMethodsData[sale.paymentMethod].count += 1;
    //   paymentMethodsData[sale.paymentMethod].amount += sale.totalAmount;
    // });

    const paymentMethods: any[] = []; // Object.entries(paymentMethodsData).map(([method, data]) => ({
      // method,
      // count: data.count,
      // amount: data.amount,
    // }));

    // Répartition par heure (forcée à vide)
    const hourlyData = Array(24).fill(0).map((_, hour) => ({ hour, sales: 0, revenue: 0 }));
    
    // todaySales.forEach((sale: any) => {
    //   const hour = sale.date.getHours();
    //   hourlyData[hour].sales += 1;
    //   hourlyData[hour].revenue += sale.totalAmount;
    // });

    // Filtrer seulement les heures avec des ventes (sera vide)
    const hourlyBreakdown: any[] = []; // hourlyData.filter(data => data.sales > 0);

    const reportData: DailyReportData = {
      todaySales: {
        count: 0, // todaySales.length,
        totalRevenue: 0, // totalRevenue,
        averageOrderValue: 0, // averageOrderValue,
      },
      topSellingMedications: [], // topSellingMedications,
      paymentMethods: [], // paymentMethods,
      hourlyBreakdown: [], // hourlyBreakdown,
    };

    return new NextResponse(JSON.stringify(reportData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la génération du rapport journalier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}