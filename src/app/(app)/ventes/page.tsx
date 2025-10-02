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
  price: number;
  quantity: number;
  barcode: string;
}

interface CartItem {
  medication: Medication;
  quantity: number;
}

export default function VentesPage() {
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

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
        
        // Si on fait une recherche mais qu'on ne trouve rien, charger tous les médicaments
        // et laisser le filtrage côté client s'en occuper
        if (debouncedSearchTerm.length > 0 && data.length === 0) {
          console.log('Recherche API vide, chargement de tous les médicaments pour filtrage côté client');
          const allData = await fetchMedications({ inStock: true });
          // S'assurer qu'on ne duplique pas - utiliser un Set pour éliminer les doublons par ID
          const uniqueMedications = Array.from(
            new Map(allData.map(med => [med.id, med])).values()
          );
          setMedications(uniqueMedications);
        } else {
          // Éliminer les doublons potentiels même pour les résultats normaux
          const uniqueData = Array.from(
            new Map(data.map(med => [med.id, med])).values()
          );
          setMedications(uniqueData);
        }
        
      } catch (error) {
        console.error('Failed to fetch medications:', error);
        setMedications([]);
        toast.error('Erreur lors de la recherche des médicaments.');
      } finally {
        setIsLoading(false);
      }
    };

    // Toujours charger les médicaments (avec ou sans recherche)
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
    // Ne pas vider la recherche ni la liste après ajout au panier
    // setSearchTerm('');
    // setMedications([]);
  }, [setCart]);

  const updateCartQuantity = (medicationId: string, delta: number) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) => {
        if (item.medication.id === medicationId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity > 0 && newQuantity <= item.medication.quantity) {
            return { ...item, quantity: newQuantity };
          } else if (newQuantity <= 0) {
            return null;
          } else {
            toast.warning(`Stock insuffisant pour ${item.medication.name}.`);
          }
        }
        return item;
      }).filter(Boolean) as CartItem[];
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
    setIsScannerOpen(false);
    try {
      const res = await fetch(`/api/medications?search=${decodedText}`);
      const data = await res.json();
      if (data && data.length > 0) {
        addToCart(data[0]);
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

  const filteredAndSortedMedications = medications
    .filter(m => {
      // Filtrage par stock si nécessaire
      if (!showOutOfStock && m.quantity <= 0) return false;
      
      // Filtrage côté client par terme de recherche (backup)
      if (searchTerm && searchTerm.length > 0) {
        const searchLower = searchTerm.toLowerCase();
        return m.name.toLowerCase().includes(searchLower) || 
               (m.barcode && m.barcode.toLowerCase().includes(searchLower));
      }
      
      return true;
    })
    // Déduplication des vrais doublons (même nom + même prix + même stock)
    .filter((medication, index, array) => {
      const duplicateIndex = array.findIndex(m => 
        m.name === medication.name && 
        m.price === medication.price && 
        m.quantity === medication.quantity
      );
      return duplicateIndex === index; // Garder seulement la première occurrence
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'stock':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Interface de Vente</h1>
        <p className="text-gray-600 mt-2">Recherchez et vendez des médicaments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section de recherche et liste des médicaments */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recherche de Médicaments
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Scan className="h-4 w-4" />
                  Scanner
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Rechercher un médicament..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setMedications([]);
                  }}
                >
                  Effacer
                </Button>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-gray-600">Recherche...</span>
                </div>
              )}

              {!isLoading && medications.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedMedications.map((medication) => (
                        <TableRow key={medication.id}>
                          <TableCell className="font-medium">{medication.name}</TableCell>
                          <TableCell>{formatCurrency(medication.price)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-sm ${
                              medication.quantity > 10 ? 'bg-green-100 text-green-800' :
                              medication.quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {medication.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => addToCart(medication)}
                              disabled={medication.quantity <= 0}
                              className="w-full"
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              Ajouter
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!isLoading && !isTyping && searchTerm && medications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun médicament trouvé pour "{searchTerm}"
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panier et finalisation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Panier ({cart.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Panier vide</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Médicament</TableHead>
                      <TableHead className="text-xs text-center">Qté</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.medication.id}>
                        <TableCell className="text-sm font-medium">
                          {item.medication.name}
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.medication.price)} × {item.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.medication.id, -1)}
                              className="h-6 w-6 p-0"
                            >
                              <MinusCircle className="h-3 w-3" />
                            </Button>
                            <span className="text-sm w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.medication.id, 1)}
                              disabled={item.quantity >= item.medication.quantity}
                              className="h-6 w-6 p-0"
                            >
                              <PlusCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(item.medication.price * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.medication.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
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

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Finaliser la Vente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un Code-barres</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onScanSuccess={onScanSuccess} onScanError={onScanError} />
        </DialogContent>
      </Dialog>

      <div style={{ display: 'none' }}>
        <PrintableContent ref={printRef} cart={cart} totalAmount={totalAmount} clientName={clientName} />
      </div>
    </div>
  );
}