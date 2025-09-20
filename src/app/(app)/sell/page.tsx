'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle, Trash2, Printer, Scan, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchMedications } from '@/lib/api-utils';
import { useReactToPrint } from 'react-to-print';
import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/scanner/barcode-scanner';
import { Label } from '@/components/ui/label';
import PrintableContent from '@/components/invoice/PrintableContent';

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

export default function SellPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const printRef = React.useRef(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Debounce du terme de recherche pour éviter trop d'appels API
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Effet pour détecter la saisie en cours
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  useEffect(() => {
    const fetchMedicationsData = async () => {
      try {
        setIsLoading(true);
        
        const params = {
          inStock: true,
          ...(debouncedSearchTerm.length > 0 && { search: debouncedSearchTerm })
        };
        
        const data = await fetchMedications(params);
        setMedications(data);
        
      } catch (error) {
        console.error('Failed to fetch medications:', error);
        setMedications([]); // S'assurer que medications reste un array
        toast.error('Erreur lors de la recherche des médicaments.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedicationsData();
  }, [debouncedSearchTerm]);

  const addToCart = useCallback((medication: Medication) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.medication.id === medication.id);
      if (existingItem) {
        if (existingItem.quantity < medication.quantity) {
          return prevCart.map((item) =>
            item.medication.id === medication.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          toast.warning(`Stock insuffisant pour ${medication.name}.`);
          return prevCart;
        }
      } else {
        if (medication.quantity > 0) {
          return [...prevCart, { medication, quantity: 1 }];
        } else {
          toast.warning(`${medication.name} est en rupture de stock.`);
          return prevCart;
        }
      }
    });
    setSearchTerm(''); // Clear search after adding to cart
    setMedications([]); // Clear search results
  }, [setCart, setSearchTerm, setMedications]);

  const updateCartQuantity = (medicationId: string, delta: number) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) => {
        if (item.medication.id === medicationId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity > 0 && newQuantity <= item.medication.quantity) {
            return { ...item, quantity: newQuantity };
          } else if (newQuantity <= 0) {
            return null; // Mark for removal
          } else {
            toast.warning(`Stock insuffisant pour ${item.medication.name}.`);
          }
        }        return item;
      }).filter(Boolean) as CartItem[]; // Filter out nulls
      return updatedCart;
    });
  };

  const removeFromCart = (medicationId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.medication.id !== medicationId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.medication.price * item.quantity, 0);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Facture_${Date.now()}`,
    onAfterPrint: () => {
      // Save sale to DB after printing
      saveSale();
    },
  });

  const saveSale = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide. Impossible d\'enregistrer la vente.');
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: clientName || 'Client Anonyme',
          totalAmount,
          items: cart.map((item) => ({
            medicationId: item.medication.id,
            quantity: item.quantity,
            priceAtSale: item.medication.price,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Vente enregistrée avec succès!');
        setCart([]);
        setClientName('');
      } else {
        const data = await res.json();
        toast.error(`Erreur lors de l\'enregistrement de la vente: ${data.message || 'Une erreur est survenue.'}`);
      }
    } catch (error) {
      console.error('Failed to save sale:', error);
      toast.error('Erreur réseau lors de l\'enregistrement de la vente.');
    }
  };

  const onScanSuccess = useCallback(async (decodedText: string) => {
    setIsScannerOpen(false); // Close scanner after successful scan
    try {
      const res = await fetch(`/api/medications?search=${decodedText}`);
      const data = await res.json();
      if (data && data.length > 0) {
        addToCart(data[0]); // Add the first found medication to cart
        toast.success(`Médicament ${data[0].name} ajouté au panier.`);
      } else {
        toast.error('Médicament non trouvé avec ce code-barres.');
      }
    } catch (error) {
      console.error('Error fetching medication by barcode:', error);
      toast.error('Erreur lors de la recherche du médicament par code-barres.');
    }
  }, [addToCart]);

  const onScanError = useCallback(() => {
    // console.warn(`Code Scan Error = ${_errorMessage}`);
  }, []);

  

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Vente Rapide</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Médicaments en Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barre de recherche et filtres */}
              <div className="space-y-4 mb-6">
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <Input
                      placeholder="Rechercher un médicament (nom ou code-barres)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-grow pr-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                        if (e.key === 'Escape') setSearchTerm('');
                      }}
                    />
                    {(isLoading || isTyping) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => setSearchTerm('')} 
                    variant="outline"
                    title="Effacer la recherche"
                  >
                    Effacer
                  </Button>
                  <Button onClick={() => setIsScannerOpen(true)} variant="outline" size="icon">
                    <Scan className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Résultats de recherche */}
                {searchTerm && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    {isTyping ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Recherche en cours...
                      </span>
                    ) : isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement des résultats...
                      </span>
                    ) : (
                      <span>
                        {medications.length} résultat{medications.length !== 1 ? 's' : ''} trouvé{medications.length !== 1 ? 's' : ''} 
                        pour "{searchTerm}"
                      </span>
                    )}
                  </div>
                )}
                
                {/* Options de tri et filtrage */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="sort-select">Trier par:</Label>
                    <select 
                      id="sort-select"
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'stock')}
                      className="px-3 py-1 border rounded-md"
                    >
                      <option value="name">Nom</option>
                      <option value="price">Prix</option>
                      <option value="stock">Stock</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-out-of-stock"
                      checked={showOutOfStock}
                      onChange={(e) => setShowOutOfStock(e.target.checked)}
                    />
                    <Label htmlFor="show-out-of-stock">Afficher ruptures de stock</Label>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="text-sm"
                  >
                    Recharger
                  </Button>
                </div>
              </div>

              {/* Liste des médicaments */}
              {medications.length > 0 ? (
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Médicament</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(medications) ? medications
                        .filter(med => showOutOfStock || med.quantity > 0)
                        .sort((a, b) => {
                          if (sortBy === 'name') return a.name.localeCompare(b.name);
                          if (sortBy === 'price') return a.price - b.price;
                          if (sortBy === 'stock') return b.quantity - a.quantity;
                          return 0;
                        })
                        .map((med) => (
                        <TableRow key={med.id} className={med.quantity === 0 ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(med.price)}
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              med.quantity > 10 ? 'text-green-600' : 
                              med.quantity > 0 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {med.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            {med.quantity > 10 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                Disponible
                              </span>
                            ) : med.quantity > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                Stock faible
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                Rupture
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              onClick={() => addToCart(med)}
                              disabled={med.quantity === 0}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              Ajouter
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : []}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? (
                    <div>
                      <p>Aucun médicament trouvé pour "{searchTerm}"</p>
                      <p className="text-sm">Essayez avec un autre terme de recherche</p>
                    </div>
                  ) : (
                    <div>
                      <p>Aucun médicament en stock trouvé</p>
                      <p className="text-sm">Vérifiez les stocks dans la section "Stock"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Panier 
                {cart.length > 0 && (
                  <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {cart.length} article{cart.length > 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Le panier est vide</p>
                  <p className="text-sm">Ajoutez des médicaments pour commencer une vente</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médicament</TableHead>
                      <TableHead>Prix Unitaire</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead className="text-right">Sous-total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.medication.id}>
                        <TableCell>{item.medication.name}</TableCell>
                        <TableCell>
                          {formatCurrency(item.medication.price)}
                        </TableCell>
                        <TableCell className="flex items-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartQuantity(item.medication.id, -1)}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="mx-2">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartQuantity(item.medication.id, 1)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.medication.price * item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFromCart(item.medication.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end items-center mt-4 text-xl font-bold">
                Total: {formatCurrency(totalAmount)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Finaliser la Vente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Résumé de la vente */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Résumé</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Articles:</span>
                    <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Informations client */}
              <div>
                <Label htmlFor="client-name">Nom du client (facultatif)</Label>
                <Input
                  id="client-name"
                  placeholder="Nom du client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Boutons d'action */}
              <div className="space-y-2 pt-4">
                <Button 
                  onClick={handlePrint} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={cart.length === 0}
                >
                  <Printer className="mr-2 h-4 w-4" /> 
                  Générer & Imprimer Facture
                </Button>
                <Button 
                  onClick={saveSale} 
                  className="w-full" 
                  variant="outline"
                  disabled={cart.length === 0}
                >
                  Vente Rapide (Sans facture)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques rapides */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Médicaments disponibles:</span>
                  <span className="font-semibold text-green-600">
                    {Array.isArray(medications) ? medications.filter(m => m.quantity > 0).length : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stock faible:</span>
                  <span className="font-semibold text-orange-600">
                    {Array.isArray(medications) ? medications.filter(m => m.quantity > 0 && m.quantity <= 10).length : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ruptures de stock:</span>
                  <span className="font-semibold text-red-600">
                    {Array.isArray(medications) ? medications.filter(m => m.quantity === 0).length : 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un Code-barres</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onScanSuccess={onScanSuccess} onScanError={onScanError} />
        </DialogContent>
      </Dialog>

      {/* Printable Invoice Component (hidden by default) */}
      <div style={{ display: 'none' }}>
        <PrintableContent ref={printRef} cart={cart} totalAmount={totalAmount} clientName={clientName} />
      </div>
    </div>
  );
}