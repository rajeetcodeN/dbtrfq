import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Info, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// Types for our data
interface CartItem {
  id: string;
  productGroup: string;
  dinNorm: string;
  material: string;
  breite: string;
  hohe: string;
  tiefe: string;
  weight: number;
  bore: string;
  numberOfBores: number;
  coating: string;
  hardening: string;
  toleranceBreite: string;
  toleranceHohe: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PriceCalculatorProps {
  selectedProduct?: string;
  onSendToChat?: (message: string) => void;
  onFormFill?: (data: any) => void;
}

export default function PriceCalculator({ selectedProduct, onSendToChat, onFormFill }: PriceCalculatorProps) {
  const supabase = useSupabaseClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productGroups, setProductGroups] = useState<{id: number, name: string}[]>([]);
  const [options, setOptions] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    productGroup: selectedProduct || '',
    productGroupId: '',
    productGroupName: '',
    dinNorm: '',
    material: '',
    breite: '',
    hohe: '',
    tiefe: '',
    weight: 10,
    bore: '',
    numberOfBores: 1,
    coating: '',
    hardening: '',
    toleranceBreite: '',
    toleranceHohe: '',
    quantity: 1
  });

  // Fetch product groups on mount
  useEffect(() => {
    const fetchProductGroups = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('product-config', {
          body: { action: 'getProductGroups' }
        });

        if (error) throw error;
        setProductGroups(data);
      } catch (err) {
        toast.error('Failed to load product groups');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductGroups();
  }, [supabase.functions]);

  // Update form when product is selected from chat
  useEffect(() => {
    if (selectedProduct && selectedProduct !== formData.productGroup) {
      setFormData(prev => ({ ...prev, productGroup: selectedProduct }));
      setCurrentStep(2);
      fetchOptionsForProduct(selectedProduct);
    }
  }, [selectedProduct]);

  // Auto-fill form from chat responses with formfill{} JSON
  useEffect(() => {
    const fillFormFromChat = (data: any) => {
      console.log('Received form fill data:', data);

      // Create a mapping object for field names to handle different formats
      const fieldMapping: { [key: string]: string } = {
        'productGroup': 'productGroup',
        'dinNorm': 'dinNorm',
        'material': 'material',
        'breite': 'breite',
        'hohe': 'hohe',
        'tiefe': 'tiefe',
        'weight': 'weight',
        'bore': 'bore',
        'numberOfBores': 'numberOfBores',
        'coating': 'coating',
        'hardening': 'hardening',
        'toleranceBreite': 'toleranceBreite',
        'toleranceHohe': 'toleranceHohe',
        'quantity': 'quantity'
      };

      // Process the data and convert to the correct format
      const updatedData: any = {};
      Object.entries(data).forEach(([key, value]) => {
        const mappedKey = fieldMapping[key] || key;

        // Convert numeric strings to numbers for specific fields
        if (['breite', 'hohe', 'tiefe', 'weight', 'numberOfBores', 'quantity'].includes(mappedKey)) {
          updatedData[mappedKey] = Number(value) || value;
        } else {
          updatedData[mappedKey] = value;
        }
      });

      console.log('Processed form data:', updatedData);

      // Update form data
      setFormData(prev => {
        const newData = { ...prev, ...updatedData };
        console.log('Updated form data:', newData);
        return newData;
      });

      // Show success message
      toast.success('Form filled from chat!');
    };

    // Expose function to window
    (window as any).fillFormFromChat = fillFormFromChat;

    return () => {
      // Cleanup
      delete (window as any).fillFormFromChat;
    };
  }, []);

  const fetchOptionsForProduct = async (productGroupName: string) => {
    try {
      setIsLoading(true);
      // Find product group ID by name
      const productGroup = productGroups.find(pg => pg.name === productGroupName);
      if (!productGroup) return;

      const { data, error } = await supabase.functions.invoke('product-config', {
        body: {
          action: 'getOptions',
          productGroupId: productGroup.id
        }
      });

      if (error) throw error;
      setOptions(data);

      // Set default values
      setFormData(prev => ({
        ...prev,
        productGroupId: productGroup.id.toString(),
        productGroupName: productGroup.name,
        dinNorm: data.standards[0] || '',
        material: data.materials[0] || '',
        bore: data.bores[0] || '',
        coating: data.coatings[0] || '',
        hardening: data.hardening[0] || '',
        toleranceBreite: data.tolerances[0] || 'none',
        toleranceHohe: data.tolerances[0] || 'none',
      }));
    } catch (err) {
      toast.error('Failed to load product options');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrice = async (productData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('product-config', {
        body: {
          action: 'calculatePrice',
          formData: productData
        }
      });

      if (error) throw error;
      return data.price || 0;
    } catch (err) {
      console.error('Price calculation failed:', err);
      toast.error('Failed to calculate price');
      return 0;
    }
  };

  const handleAddToCart = async () => {
    if (!formData.productGroupId || !formData.material) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const unitPrice = await calculatePrice(formData);
      const quantity = parseInt(formData.quantity.toString()) || 1;

      const newItem: CartItem = {
        id: Date.now().toString(),
        productGroup: formData.productGroupName,
        dinNorm: formData.dinNorm,
        material: formData.material,
        breite: formData.breite,
        hohe: formData.hohe,
        tiefe: formData.tiefe,
        weight: parseFloat(formData.weight.toString()) || 0,
        bore: formData.bore,
        numberOfBores: formData.numberOfBores,
        coating: formData.coating,
        hardening: formData.hardening,
        toleranceBreite: formData.toleranceBreite,
        toleranceHohe: formData.toleranceHohe,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity
      };

      setCart([...cart, newItem]);
      toast.success('Item added to cart');

      // Reset form
      setFormData(prev => ({
        ...prev,
        productGroupId: '',
        productGroupName: '',
        material: '',
        breite: '',
        hohe: '',
        tiefe: '',
        quantity: '1'
      }));

    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Failed to add item to cart');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    toast.success("Item removed from quote");
  };

  const saveQuoteList = () => {
    const quoteData = {
      items: cart,
      total: grandTotal,
      date: new Date().toISOString(),
      itemCount: cart.length
    };
    
    // Save to localStorage
    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    savedQuotes.push(quoteData);
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
    
    toast.success("Quote saved successfully!");
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Nosta Cost Estimation Quote', 20, 25);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
    
    // Prepare table data
    const tableData = cart.map(item => [
      item.productGroup,
      item.material,
      `${item.breite}×${item.hohe}×${item.tiefe}`,
      item.quantity.toString(),
      `${item.unitPrice.toFixed(2)} EUR`,
      `${item.lineTotal.toFixed(2)} EUR`
    ]);
    
    // Add table using autoTable
    autoTable(doc, {
      head: [['Product', 'Material', 'Dimensions', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Add grand total
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.text(`Grand Total: ${grandTotal.toFixed(2)} EUR`, 20, finalY + 10);
    
    // Save the PDF
    doc.save(`nosta-quote-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF generated successfully!");
  };

  const getStepData = (step: number) => {
    switch (step) {
      case 1:
        return { productGroup: formData.productGroup };
      case 2:
        return { 
          productGroup: formData.productGroup,
          dinNorm: formData.dinNorm,
          material: formData.material,
          breite: formData.breite,
          hohe: formData.hohe,
          tiefe: formData.tiefe,
          weight: formData.weight
        };
      case 3:
        return {
          productGroup: formData.productGroup,
          dinNorm: formData.dinNorm,
          material: formData.material,
          breite: formData.breite,
          hohe: formData.hohe,
          tiefe: formData.tiefe,
          weight: formData.weight,
          bore: formData.bore,
          numberOfBores: formData.numberOfBores,
          coating: formData.coating,
          hardening: formData.hardening,
          toleranceBreite: formData.toleranceBreite,
          toleranceHohe: formData.toleranceHohe
        };
      case 4:
        return formData;
      default:
        return {};
    }
  };

  const handleAskAI = (step: number, title: string) => {
    const currentStepData = getStepData(step);
    const previousStepData = step > 1 ? getStepData(step - 1) : {};
    
    const allData = { ...previousStepData, ...currentStepData };
    const formattedEntries = Object.entries(allData)
      .filter(([_, value]) => value !== '' && value !== 0)
      .map(([key, value]) => `${key}: ${value}`);
    
    const dataDisplay = formattedEntries.length > 0 ? formattedEntries.join('\n• ') : 'No data filled yet';
    
    const message = `I need help with "${title}" (Step ${step}).

Current filled data:
• ${dataDisplay}

Please provide guidance for this step.`;
    
    // Display data in chat and send message
    if (onSendToChat) {
      console.log('Sending to chat:', { 
        step, 
        title, 
        currentData: currentStepData,
        previousData: previousStepData,
        formattedMessage: message 
      });
      
      onSendToChat(message);
      toast.success(`Data from step ${step} sent to chat!`);
    } else {
      console.error('onSendToChat function not available');
    }
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);

  const getCurrentStepFeatures = () => {
    if (!formData.productGroup) return null;
    return FEATURE_AVAILABILITY[formData.productGroup as keyof typeof FEATURE_AVAILABILITY];
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1: return !!formData.productGroup;
      case 2: return !!(formData.dinNorm && formData.material && formData.breite && formData.hohe && formData.tiefe);
      case 3: return !!(formData.bore && formData.coating && formData.hardening);
      case 4: return formData.quantity > 0;
      default: return false;
    }
  };

  const StepHeader = ({ step, title, isActive, isComplete }: { step: number; title: string; isActive: boolean; isComplete: boolean }) => (
    <div 
      className={`py-3 px-4 border-l-4 cursor-pointer transition-all ${
        isActive 
          ? 'border-primary bg-white' 
          : isComplete 
          ? 'border-primary/30 bg-gray-50' 
          : 'border-gray-200 bg-gray-50'
      }`}
      onClick={() => isComplete || step <= currentStep ? setCurrentStep(step) : null}
    >
      <div className="flex items-center justify-between">
        <h3 className={`font-medium text-sm ${
          isActive ? 'text-primary' : 
          isComplete ? 'text-gray-700' : 
          'text-gray-400'
        }`}>
          Step {step}: {title}
        </h3>
        {isActive && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs px-2 py-1 h-6 text-primary border-primary/20 bg-primary/5"
            onClick={(e) => {
              e.stopPropagation();
              handleAskAI(step, title);
            }}
          >
            Ask AI
          </Button>
        )}
      </div>
    </div>
  );

  const features = getCurrentStepFeatures();

  return (
    <div className="flex flex-col h-full bg-calc-bg">
      <Card className="h-full flex flex-col shadow-sm">
        <CardHeader className="border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-foreground">Nosta Cost Estimation</CardTitle>
              <p className="text-muted-foreground mt-1">Configure your product specifications</p>
            </div>
          </div>
        </CardHeader>

        <div className="flex-1 flex flex-col">
          {/* Configuration Steps */}
          <div className="flex-1 p-6 bg-gray-50">
            <div className="space-y-1">
              <StepHeader 
                step={1} 
                title="Choose Product Group" 
                isActive={currentStep === 1}
                isComplete={isStepComplete(1)}
              />
              {currentStep === 1 && (
                <div className="bg-white border-l-4 border-primary p-6">
                  <div className="space-y-4">
                    <Select value={formData.productGroup} onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, productGroup: value }));
                      fetchOptionsForProduct(value);
                      setCurrentStep(2);
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- Select a Product Group --" />
                      </SelectTrigger>
                      <SelectContent>
                        {productGroups.map(group => (
                          <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <StepHeader 
                step={2} 
                title="Define Properties" 
                isActive={currentStep === 2}
                isComplete={isStepComplete(2)}
              />
              {currentStep === 2 && options && (
                <div className="bg-white border-l-4 border-primary p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">DIN / Norm</label>
                      <Select value={formData.dinNorm} onValueChange={(value) => setFormData(prev => ({ ...prev, dinNorm: value }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.standards.map((standard: string) => (
                            <SelectItem key={standard} value={standard}>{standard}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                      <Select value={formData.material} onValueChange={(value) => setFormData(prev => ({ ...prev, material: value }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.materials.map((material: string) => (
                            <SelectItem key={material} value={material}>{material}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                        <Select value={formData.breite} onValueChange={(value) => setFormData(prev => ({ ...prev, breite: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.widths.map((width: number) => (
                              <SelectItem key={width} value={width.toString()}>{width}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                        <Select value={formData.hohe} onValueChange={(value) => setFormData(prev => ({ ...prev, hohe: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.heights.map((height: number) => (
                              <SelectItem key={height} value={height.toString()}>{height}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Depth</label>
                        <Select value={formData.tiefe} onValueChange={(value) => setFormData(prev => ({ ...prev, tiefe: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.depths.map((depth: number) => (
                              <SelectItem key={depth} value={depth.toString()}>{depth}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight (grams)</label>
                      <Input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                        className="w-full"
                      />
                    </div>
                    <Button onClick={() => setCurrentStep(3)} className="w-full bg-primary hover:bg-primary-dark">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              <StepHeader 
                step={3} 
                title="Add Custom Features" 
                isActive={currentStep === 3}
                isComplete={isStepComplete(3)}
              />
              {currentStep === 3 && options && (
                <div className="bg-white border-l-4 border-primary p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bore (Thread)</label>
                        <Select value={formData.bore} onValueChange={(value) => setFormData(prev => ({ ...prev, bore: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.bores.map((bore: string) => (
                              <SelectItem key={bore} value={bore}>{bore}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Bores</label>
                        <Select value={formData.numberOfBores.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, numberOfBores: parseInt(value) }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.numBores.map((num: number) => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Coating</label>
                        <Select value={formData.coating} onValueChange={(value) => setFormData(prev => ({ ...prev, coating: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.coatings.map((coating: string) => (
                              <SelectItem key={coating} value={coating}>{coating}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hardening</label>
                        <Select value={formData.hardening} onValueChange={(value) => setFormData(prev => ({ ...prev, hardening: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.hardening.map((hardening: string) => (
                              <SelectItem key={hardening} value={hardening}>{hardening}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tolerance (Width)</label>
                        <Select value={formData.toleranceBreite} onValueChange={(value) => setFormData(prev => ({ ...prev, toleranceBreite: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.tolerances.map((tolerance: string) => (
                              <SelectItem key={`width-${tolerance}`} value={tolerance}>{tolerance}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tolerance (Height)</label>
                        <Select value={formData.toleranceHohe} onValueChange={(value) => setFormData(prev => ({ ...prev, toleranceHohe: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.tolerances.map((tolerance: string) => (
                              <SelectItem key={`height-${tolerance}`} value={tolerance}>{tolerance}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={() => setCurrentStep(4)} className="w-full bg-primary hover:bg-primary-dark">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              <StepHeader 
                step={4} 
                title="Finalize & Add to Quote" 
                isActive={currentStep === 4}
                isComplete={isStepComplete(4)}
              />
              {currentStep === 4 && (
                <div className="bg-white border-l-4 border-primary p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <Input 
                        type="number" 
                        value={formData.quantity} 
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        min="1"
                        className="w-full"
                      />
                    </div>
                    <Button onClick={handleAddToCart} className="w-full bg-primary hover:bg-primary-dark font-semibold">
                      Add to Quote
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quote Display - Now below steps */}
          <div className="border-t bg-white">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Current Quote</h2>
              <ScrollArea className="max-h-48">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Your quote is currently empty.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{item.quantity} x {item.productGroup} ({item.dinNorm})</h3>
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                              <p><strong>Material:</strong> {item.material} | <strong>Weight:</strong> {item.weight}g</p>
                              <p><strong>Dimensions:</strong> {item.breite}×{item.hohe}×{item.tiefe} mm</p>
                              <p><strong>Bore:</strong> {item.bore} (×{item.numberOfBores}) | <strong>Coating:</strong> {item.coating}</p>
                              <p><strong>Hardening:</strong> {item.hardening} | <strong>Tolerance:</strong> {item.toleranceBreite}/{item.toleranceHohe}</p>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end gap-2">
                            <div>
                              <p className="font-bold text-sm">{item.lineTotal.toFixed(2)} EUR</p>
                              <p className="text-xs text-muted-foreground">({item.unitPrice.toFixed(2)} EUR each)</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Total and Actions */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground font-medium">GRAND TOTAL</span>
                <span className="text-2xl font-bold text-foreground">{grandTotal.toFixed(2)} EUR</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={saveQuoteList}
                  disabled={cart.length === 0}
                  variant="outline"
                  className="font-semibold py-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Save List
                </Button>
                <Button 
                  onClick={generatePDF}
                  disabled={cart.length === 0}
                  className="bg-accent hover:bg-accent-dark text-accent-foreground font-semibold py-3"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}