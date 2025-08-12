import React from 'react';
import Image from 'next/image';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface Medication {
  id: string;
  name: string;
  price: number; // Assuming price is in CDF
  quantity: number; // stock quantity
  barcode: string;
}

interface CartItem {
  medication: Medication;
  quantity: number; // quantity in cart
}

interface PrintableContentProps {
  cart: CartItem[];
  totalAmount: number;
  clientName: string;
}

const PrintableContent = React.forwardRef<HTMLDivElement, PrintableContentProps>(
  ({ cart, totalAmount, clientName }, ref) => {
    return (
      <div ref={ref} className="p-8">
        <h2 className="text-2xl font-bold mb-4">Facture PAJO PHARMA</h2>
        {/* Logo Placeholder */}
        <div className="mb-4 text-center">
          <Image src="/next.svg" alt="PAJO PHARMA Logo" width={64} height={64} className="h-16 mx-auto" />
        </div>
        <p className="mb-2">Date: {new Date().toLocaleDateString()}</p>
        <p className="mb-4">Client: {clientName || 'Client Anonyme'}</p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Médicament</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Prix Unitaire</TableHead>
              <TableHead className="text-right">Sous-total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.map((item) => (
              <TableRow key={item.medication.id}>
                <TableCell>{item.medication.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.medication.price)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.medication.price * item.quantity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end items-center mt-4 text-xl font-bold">
          Total à payer: {formatCurrency(totalAmount)}
        </div>
        <p className="text-center mt-4 text-sm">Merci pour votre visite chez PAJO PHARMA</p>
      </div>
    );
  }
);

PrintableContent.displayName = 'PrintableContent';

export default PrintableContent;
