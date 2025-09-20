
'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMedications, createMedication, updateMedication, deleteMedication } from '@/lib/actions/medications';
import { Medication } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MedicationForm } from './medication-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useSession } from 'next-auth/react';

export function MedicationsList() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { addItem } = useCartStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const { data: session } = useSession();
  
  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    const fetchMedications = async () => {
      const data = await getMedications();
      setMedications(data);
    };
    fetchMedications();
  }, []);

  

  const filteredMedications = medications.filter((medication) =>
    medication.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (medication: Medication) => {
    addItem(medication, 1);
    console.log('Médicament ajouté au panier:', medication);
  };

  const handleFormSubmit = async (data: any) => {
    const medicationData = {
      ...data,
      expirationDate: new Date(data.expirationDate).toISOString(),
      purchasePrice: Number(data.purchasePrice),
      price: Number(data.price),
      isAvailableForSale: false, // Default to false when adding/editing from this form
    };

    if (selectedMedication) {
      await updateMedication(selectedMedication.id, medicationData);
      toast.success('Médicament mis à jour avec succès!');
    } else {
      await createMedication(medicationData);
      toast.success('Médicament ajouté avec succès!');
    }
    const updatedMedications = await getMedications();
    setMedications(updatedMedications);
    setIsDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce médicament ?')) {
      await deleteMedication(id);
      toast.success('Médicament supprimé avec succès!');
      const updatedMedications = await getMedications();
      setMedications(updatedMedications);
    }
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <Input
          placeholder="Rechercher un médicament par nom ou code-barres..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm mr-2"
        />
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedMedication(null)} className="ml-2">Ajouter un médicament</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedMedication ? 'Modifier le médicament' : 'Ajouter un médicament'}</DialogTitle>
              </DialogHeader>
              <MedicationForm onSubmit={handleFormSubmit} medication={selectedMedication} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Date d&apos;expiration</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMedications.map((medication) => (
            <TableRow key={medication.id}>
              <TableCell>{medication.name}</TableCell>
              <TableCell>{formatCurrency(medication.price)}</TableCell>
              <TableCell>{medication.quantity}</TableCell>
              <TableCell>{new Date(medication.expirationDate).toLocaleDateString()}</TableCell>
              <TableCell>
              <Button onClick={() => { console.log('Bouton Ajouter au panier cliqué'); handleAddToCart(medication); }}>Ajouter au panier</Button>
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedMedication(medication); setIsDialogOpen(true); }} className="ml-2">Modifier</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(medication.id)} className="ml-2">Supprimer</Button>
                </>
              )}
            </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
