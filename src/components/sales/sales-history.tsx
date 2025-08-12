
'use client';

import { useEffect, useState } from 'react';
import { getAllSales } from '@/lib/actions/sales';
import { Sale, User, Client, SaleItem, Medication } from '@prisma/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

export function SalesHistory() {
  const [sales, setSales] = useState<(Sale & { seller: User; client: Client; items: (SaleItem & { medication: Medication })[] })[]>([]);

  useEffect(() => {
    const fetchSales = async () => {
      const data = await getAllSales();
      setSales(data as (Sale & { seller: User; client: Client; items: (SaleItem & { medication: Medication })[] })[]);
    };
    fetchSales();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Vendeur</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Médicaments</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell>{sale.client.name}</TableCell>
            <TableCell>{sale.seller.username}</TableCell>
            <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
            <TableCell>{new Date(sale.date).toLocaleString()}</TableCell>
            <TableCell>
              {sale.items && sale.items.map((item) => (
                <div key={item.id}>
                  {item.medication.name} (x{item.quantity})
                </div>
              ))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
