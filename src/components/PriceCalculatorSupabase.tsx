import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Info, CheckCircle2, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import FileProcessor from '@/components/FileProcessorNew';

// Type definitions
interface FormData {
  productGroupId: string;
  productGroupName: string;
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
}

interface FormattedOptions {
  Norms: string[];
  Materials: string[];
  Dimensions: string[];
  Bores: string[];
  NumberOfBores: string[];
  Coatings: string[];
  Hardening: string[];
  TolerancesBreite: string[];
  TolerancesHohe: string[];
}
// --- SUPABASE CLIENT SETUP (FRONTEND) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PriceCalculatorSupabaseProps {
  selectedProduct?: any;
  onSendToChat?: (message: string) => void;
  onFormFill?: (data: any) => void;
}

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

export default function PriceCalculatorSupabase({
  selectedProduct,
  onSendToChat = () => { },
  onFormFill = () => { }
}: PriceCalculatorSupabaseProps) {
  // UI State
  const [currentStep, setCurrentStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [rfqNumber, setRfqNumber] = useState('');
  const [customerDetails, setCustomerDetails] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'file'>('file');

  // Material density in g/cm³
  const materialDensity: { [key: string]: number } = {
    'C45': 7.85,
    'C60': 7.84,
    'Edelstahl': 7.95,
    'Aluminium': 2.70,
    'Messing': 8.50,
    // Add more materials as needed
  };

  // Calculate weight based on dimensions and material
  const calculateWeight = (breite: string, hohe: string, tiefe: string, material: string): number => {
    // Convert dimensions to numbers, default to 0 if empty or invalid
    const w = parseFloat(breite) || 0;
    const h = parseFloat(hohe) || 0;
    const d = parseFloat(tiefe) || 0;

    // Skip calculation if any required dimension is missing
    if (w === 0 || h === 0 || d === 0 || !material) {
      return 0;
    }

    // Calculate volume in cm³ (convert each dimension from mm to cm first)
    const volume = (w * h * d) / 1000; // (w/10) * (h/10) * (d/10) = (w*h*d)/1000
    console.log(`Calculating weight for ${w}x${h}x${d}mm (${volume} cm³) of ${material} (${materialDensity[material]} g/cm³)`);
    // Get density from material, default to 0 if material not found
    const density = materialDensity[material] || 0;

    // Calculate weight in grams (volume in cm³ * density in g/cm³)
    const weight = volume * density;

    // Return weight with 3 decimal places for precision
    return weight > 0 ? parseFloat(weight.toFixed(3)) : 0;
  };

  // Form State
  const [formData, setFormData] = useState<FormData>({
    productGroupId: '',
    productGroupName: '',
    dinNorm: '',
    material: '',
    breite: '',
    hohe: '',
    tiefe: '',
    weight: 0, // Will be calculated
    bore: '',
    numberOfBores: 1,
    coating: '',
    hardening: '',
    toleranceBreite: '',
    toleranceHohe: '',
    quantity: 1,
  });

  // Data State
  const [productGroups, setProductGroups] = useState<{ id: number, group_name: string }[]>([]);
  const [availableOptions, setAvailableOptions] = useState<FormattedOptions>({
    Norms: [],
    Materials: [],
    Dimensions: [],
    Bores: [],
    NumberOfBores: [],
    Coatings: [],
    Hardening: [],
    TolerancesBreite: [],
    TolerancesHohe: []
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format the options received from the Edge Function
  const formatOptions = (data: Partial<FormattedOptions>): FormattedOptions => {
    return {
      Norms: data.Norms || [],
      Materials: data.Materials || [],
      Dimensions: data.Dimensions || [],
      Bores: data.Bores || [],
      NumberOfBores: data.NumberOfBores || [],
      Coatings: data.Coatings || [],
      Hardening: data.Hardening || [],
      TolerancesBreite: data.TolerancesBreite || [],
      TolerancesHohe: data.TolerancesHohe || []
    };
  };

  // Update weight when dimensions or material change
  useEffect(() => {
    if (formData.breite || formData.hohe || formData.tiefe || formData.material) {
      const newWeight = calculateWeight(
        formData.breite,
        formData.hohe,
        formData.tiefe,
        formData.material
      );
      setFormData(prev => ({ ...prev, weight: newWeight }));
    }
  }, [formData.breite, formData.hohe, formData.tiefe, formData.material]);

  // --- EDGE FUNCTION INTEGRATION ---
  // Fetch product groups on component mount
  useEffect(() => {
    const fetchProductGroups = async () => {
      try {
        console.log("Fetching product groups...");
        const { data, error } = await supabase
          .from('productgroups')
          .select('id, group_name')
          .order('group_name');

        if (error) {
          throw error;
        }

        console.log("Received product groups:", data);
        setProductGroups(data || []);
      } catch (error) {
        console.error('Error fetching product groups:', error);
        setError('Failed to load product groups');
      }
    };

    fetchProductGroups();
  }, []);

  // Fetch options when product group changes
  useEffect(() => {
    const fetchOptions = async () => {
      if (!formData.productGroupId) {
        setAvailableOptions({});
        return;
      }

      setIsLoadingOptions(true);
      setError(null);

      try {
        const selectedGroup = productGroups.find(pg => pg.id.toString() === formData.productGroupId);
        if (!selectedGroup) {
          console.error('[ERROR] Selected group not found');
          throw new Error('Selected product group not found');
        }

        // Get the API key from environment variables
        const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!apiKey) {
          throw new Error('Missing Supabase API key');
        }

        console.log('[DEBUG] Calling Edge Function with API key');

        // Call the Edge Function with API key authentication
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-config`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'apikey': apiKey
            },
            body: JSON.stringify({
              action: 'get-options',
              productGroup: selectedGroup.group_name
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ERROR] Edge Function error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });

          throw new Error(`Failed to fetch options: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Received data from function:', data);

        const formattedOptions = formatOptions(data);
        setAvailableOptions(formattedOptions);

        // Get initial values
        const newMaterial = formattedOptions.Materials?.[0] || '';
        const newBreite = formattedOptions.Dimensions?.[0]?.toString() || '';
        const newHohe = formattedOptions.Dimensions?.[0]?.toString() || '';
        const newTiefe = formattedOptions.Dimensions?.[0]?.toString() || '';

        // Calculate weight based on dimensions and material
        const newWeight = calculateWeight(newBreite, newHohe, newTiefe, newMaterial);

        // Update form data with first available options
        setFormData(prev => ({
          ...prev,
          dinNorm: formattedOptions.Norms?.[0] || '',
          material: newMaterial,
          breite: newBreite,
          hohe: newHohe,
          tiefe: newTiefe,
          weight: newWeight,
          bore: formattedOptions.Bores?.[0] || '',
          numberOfBores: formattedOptions.NumberOfBores?.[0] ? parseInt(formattedOptions.NumberOfBores[0]) : 1,
          coating: formattedOptions.Coatings?.[0] || '',
          hardening: formattedOptions.Hardening?.[0] || '',
          toleranceBreite: formattedOptions.TolerancesBreite?.[0] || '',
          toleranceHohe: formattedOptions.TolerancesHohe?.[0] || ''
        }));

      } catch (err: any) {
        console.error('[ERROR] Failed to fetch options:', err);
        setError(`Failed to load product options: ${err.message}`);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [formData.productGroupId, productGroups]);

  // Debug effect to log state changes
  useEffect(() => {
    console.group('PriceCalculatorSupabase State');
    console.log('formData:', formData);
    console.log('availableOptions:', availableOptions);
    console.log('isLoadingOptions:', isLoadingOptions);
    console.log('error:', error);
    console.groupEnd();
  }, [formData, availableOptions, isLoadingOptions, error]);
  // Auto-fill form from chat responses
  useEffect(() => {
    interface ChatFormData {
      [key: string]: string | number;
    }

    const fillFormFromChat = (data: ChatFormData) => {
      console.log('Received form fill data:', data);

      const fieldMapping: { [key: string]: string } = {
        'productGroup': 'productGroupName',
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

      const updatedData: Partial<FormData> = {};
      Object.entries(data).forEach(([key, value]) => {
        const mappedKey = fieldMapping[key] || key;

        if (['breite', 'hohe', 'tiefe', 'weight', 'numberOfBores', 'quantity'].includes(mappedKey)) {
          updatedData[mappedKey] = Number(value) || value;
        } else {
          updatedData[mappedKey] = value;
        }
      });

      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Create updated form data
        const updatedData = {
          ...formData,
          [name]: name === 'quantity' || name === 'numberOfBores' ? parseInt(value) || 0 : value
        };

        // If any dimension or material changes, recalculate weight
        if (['breite', 'hohe', 'tiefe', 'material'].includes(name)) {
          updatedData.weight = calculateWeight(
            name === 'breite' ? value : formData.breite,
            name === 'hohe' ? value : formData.hohe,
            name === 'tiefe' ? value : formData.tiefe,
            name === 'material' ? value : formData.material
          );
        }

        setFormData(updatedData);
      };
    };

    (window as any).fillFormFromChat = fillFormFromChat;

    return () => {
      delete (window as any).fillFormFromChat;
    };
  }, []);

  const calculateUnitCost = async (data: FormData): Promise<number> => {
    try {
      // Get the Supabase anon key from environment variables
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      // Make the request using fetch directly to have more control
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          action: 'calculate-price',  // Note the hyphen in the action name
          formData: data
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to calculate price:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to calculate price');
      }

      const result = await response.json();
      return result.price;
    } catch (err) {
      toast.error('Failed to calculate price. Please try again.');
      console.error('Calculation error:', err);
      return 0; // Return a default price in case of error
    }
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1: return customerDetails.trim().length > 0; // Just require some text
      case 2: return !!formData.productGroupId;
      case 3: return !!formData.dinNorm && !!formData.material && !!formData.breite && !!formData.hohe && !!formData.tiefe;
      case 4: return formData.quantity > 0;
      default: return false;
    }
  };

  const handleAskAI = (step: number, title: string) => {
    const getStepData = (stepNum: number) => {
      switch (stepNum) {
        case 1:
          return { productGroup: formData.productGroupName };
        case 2:
          return {
            productGroup: formData.productGroupName,
            dinNorm: formData.dinNorm,
            material: formData.material,
            breite: formData.breite,
            hohe: formData.hohe,
            tiefe: formData.tiefe,
            weight: formData.weight
          };
        case 3:
          return {
            productGroup: formData.productGroupName,
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

  const addToCart = async () => {
    if (!formData.productGroupId) {
      toast.error("Please select a product group first.");
      return;
    }

    const unitPrice = await calculateUnitCost(formData);
    const lineTotal = unitPrice * formData.quantity;

    const newItem: CartItem = {
      id: Date.now().toString(),
      productGroup: formData.productGroupName,
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
      toleranceHohe: formData.toleranceHohe,
      quantity: formData.quantity,
      unitPrice,
      lineTotal
    };

    setCart(prev => [...prev, newItem]);
    toast.success("Item added to quote!");
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    toast.success("Item removed from quote");
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);

  const generatePDF = async () => {
    try {
      // Dynamically import jspdf-autotable to avoid SSR issues
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();

      // Add header
      doc.setFontSize(20);
      doc.text('dbt ai Cost Estimation', 20, 30);

      // Add quote details
      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
      doc.text(`Total Items: ${cart.length}`, 20, 60);
      doc.text(`Grand Total: ${grandTotal.toFixed(2)} EUR`, 20, 70);

      // Add table with cart items
      autoTable(doc, {
        startY: 80,
        head: [['Product', 'Material', 'Dimensions', 'Quantity', 'Unit Price', 'Total']],
        body: cart.map(item => [
          item.productGroup,
          item.material,
          `${item.breite}×${item.hohe}×${item.tiefe}`,
          item.quantity.toString(),
          `${item.unitPrice.toFixed(2)} EUR`,
          `${item.lineTotal.toFixed(2)} EUR`
        ]),
      });

      doc.save(`nosta-quote-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const StepHeader = ({ step, title, isActive, isComplete }: { step: number; title: string; isActive: boolean; isComplete: boolean }) => (
    <div
      className={`py-3 px-4 border-l-4 cursor-pointer transition-all ${isActive
        ? 'border-primary bg-white'
        : isComplete
          ? 'border-primary/30 bg-gray-50'
          : 'border-gray-200 bg-gray-50'
        }`}
      onClick={() => isComplete || step <= currentStep ? setCurrentStep(step) : null}
    >
      <div className="flex items-center justify-between">
        <h3 className={`font-medium text-sm ${isActive ? 'text-primary' :
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

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800">DBT AI Cost Estimation</h1>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-gray-100 rounded-lg w-full max-w-md">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'file'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'form'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
              Manual Entry
            </button>
          </div>
        </div>
      </div>

      <Card className="w-full mt-3 shadow-sm">
        <CardHeader className="py-2 px-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500">
                {activeTab === 'file' ? 'File Upload' : 'Manual Entry'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {activeTab === 'file' ? 'Upload a file' : 'Enter details manually'}
            </div>
          </div>
        </CardHeader>

        <div className="flex-1 flex flex-col w-full overflow-hidden">
          {activeTab === 'form' && (
            <div className="flex-1 p-6 bg-gray-50 w-full overflow-auto">
              <div className="w-full max-w-full space-y-8">
                {/* Step 1: Customer Information */}
                <StepHeader
                  step={1}
                  title="Quote Information"
                  isActive={currentStep === 1}
                  isComplete={isStepComplete(1)}
                />
                {currentStep === 1 && (
                  <div className="bg-white border-l-4 border-primary p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">RFQ Number</label>
                        <Input
                          placeholder="Enter RFQ number"
                          value={rfqNumber}
                          onChange={(e) => setRfqNumber(e.target.value)}
                          className="max-w-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Customer & Order Details</label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Enter all relevant information (name, company, contact details, customer ID, article numbers, etc.)
                        </p>
                        <textarea
                          className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={customerDetails}
                          onChange={(e) => setCustomerDetails(e.target.value)}
                          placeholder="Enter customer and order details here"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={() => setCurrentStep(2)}
                        disabled={!isStepComplete(1)}
                      >
                        Continue to Product Selection
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Product Selection */}
                <StepHeader
                  step={2}
                  title="Choose Product Group"
                  isActive={currentStep === 2}
                  isComplete={isStepComplete(2)}
                />
                {currentStep === 2 && (
                  <div className="bg-white border-l-4 border-primary p-6">
                    <div className="space-y-4">
                      <Select
                        value={formData.productGroupId}
                        onValueChange={(value) => {
                          const selectedGroup = productGroups.find(pg => pg.id.toString() === value);
                          setFormData(prev => ({
                            ...prev,
                            productGroupId: value,
                            productGroupName: selectedGroup?.group_name || '',
                          }));
                          setCurrentStep(3);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Select a Product Group --" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(productGroups) && productGroups.map(group => (
                            <SelectItem key={group.id} value={group.id.toString()}>{group.group_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 3: Define Properties */}
                <StepHeader
                  step={3}
                  title="Define Properties"
                  isActive={currentStep === 3}
                  isComplete={isStepComplete(3)}
                />
                {currentStep === 3 && formData.productGroupId && (
                  <div className="bg-white border-l-4 border-primary p-6">
                    {isLoadingOptions ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading options...
                      </div>
                    ) : error ? (
                      <div className="p-4 text-center text-destructive">
                        {error}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">DIN / Norm</label>
                          <Select
                            value={formData.dinNorm}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, dinNorm: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select DIN Norm" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.Norms?.map((standard: string) => (
                                <SelectItem key={standard} value={standard}>
                                  {standard}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Material</label>
                          <Select
                            value={formData.material}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, material: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Material" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.Materials?.map((material: string) => (
                                <SelectItem key={material} value={material}>
                                  {material}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Width</label>
                          <Select value={formData.breite} onValueChange={(value) => setFormData(prev => ({ ...prev, breite: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select width" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.Dimensions?.map((width: number) => (
                                <SelectItem key={width} value={width.toString()}>{width}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Height</label>
                          <Select value={formData.hohe} onValueChange={(value) => setFormData(prev => ({ ...prev, hohe: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select height" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.Dimensions?.map((height: number) => (
                                <SelectItem key={height} value={height.toString()}>{height}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Depth</label>
                          <Select value={formData.tiefe} onValueChange={(value) => setFormData(prev => ({ ...prev, tiefe: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select depth" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.Dimensions?.map((depth: number) => (
                                <SelectItem key={depth} value={depth.toString()}>{depth}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Weight (g)</label>
                          <Input
                            type="number"
                            value={formData.weight}
                            readOnly
                            className="bg-gray-100"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Calculated from dimensions and material
                          </p>
                        </div>
                      </div>
                    )}

                    {!isLoadingOptions && isStepComplete(2) && (
                      <div className="mt-6">
                        <Button onClick={() => setCurrentStep(4)} className="w-full">
                          Continue to Custom Features
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Add Custom Features */}
                <StepHeader
                  step={4}
                  title="Add Custom Features"
                  isActive={currentStep === 4}
                  isComplete={isStepComplete(4)}
                />
                {currentStep === 4 && isStepComplete(3) && (
                  <div className="bg-white border-l-4 border-primary p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Bore (Thread)</label>
                        <Select value={formData.bore} onValueChange={(value) => setFormData(prev => ({ ...prev, bore: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bore" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.Bores?.map((bore: string) => (
                              <SelectItem key={bore} value={bore}>{bore}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Number of Bores</label>
                        <Select value={formData.numberOfBores.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, numberOfBores: Number(value) }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.NumberOfBores?.map((num: string) => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Coating</label>
                        <Select value={formData.coating} onValueChange={(value) => setFormData(prev => ({ ...prev, coating: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select coating" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.Coatings?.map((coating: string) => (
                              <SelectItem key={coating} value={coating}>{coating}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Hardening</label>
                        <Select value={formData.hardening} onValueChange={(value) => setFormData(prev => ({ ...prev, hardening: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hardening" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.Hardening?.map((hardening: string) => (
                              <SelectItem key={hardening} value={hardening}>{hardening}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Tolerance (Width)</label>
                        <Select value={formData.toleranceBreite} onValueChange={(value) => setFormData(prev => ({ ...prev, toleranceBreite: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tolerance" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.TolerancesBreite?.map((tolerance: string) => (
                              <SelectItem key={tolerance} value={tolerance}>{tolerance}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Tolerance (Height)</label>
                        <Select value={formData.toleranceHohe} onValueChange={(value) => setFormData(prev => ({ ...prev, toleranceHohe: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tolerance" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.TolerancesBreite?.map((tolerance: string) => (
                              <SelectItem key={tolerance} value={tolerance}>{tolerance}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {isStepComplete(3) && (
                      <div className="mt-6">
                        <Button onClick={() => setCurrentStep(5)} className="w-full">
                          Continue to Finalize & Add to Quote
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Finalize & Add to Quote */}
                <StepHeader
                  step={5}
                  title="Finalize & Add to Quote"
                  isActive={currentStep === 5}
                  isComplete={isStepComplete(5)}
                />
                {currentStep === 5 && isStepComplete(4) && (
                  <div className="bg-white border-l-4 border-primary p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Quantity</label>
                        <Input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          min="1"
                          className="w-32"
                        />
                      </div>

                      <Button onClick={addToCart} className="w-full bg-primary hover:bg-primary-dark">
                        Add to Quote
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart and PDF Generation Section */}
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">Current Quote</h3>
                <div className="border rounded-md overflow-hidden">
                  <ScrollArea className="h-64 p-4">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Your quote is currently empty.</p>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">
                                  {item.quantity} x {item.productGroup} {item.dinNorm && `(${item.dinNorm})`}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Material:</span> {item.material} | <span className="font-medium">Weight:</span> {item.weight}g
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Dimensions:</span> {item.breite}×{item.hohe}×{item.tiefe} mm
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Bore:</span> {item.bore} (×{item.numberOfBores}) | <span className="font-medium">Coating:</span> {item.coating}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Hardening:</span> {item.hardening} | <span className="font-medium">Tolerance:</span> {item.toleranceBreite}/{item.toleranceHohe}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-bold text-sm">{item.lineTotal.toFixed(2)} EUR</p>
                                <p className="text-xs text-muted-foreground">{item.unitPrice.toFixed(2)} EUR each</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(item.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
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

                  <div className="mt-4">
                    <Separator className="my-4" />

                    <div className="flex justify-between items-center mb-4 px-4">
                      <span className="text-xl font-bold">GRAND TOTAL</span>
                      <span className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)} EUR</span>
                    </div>

                    <div className="flex gap-2 px-4 pb-4">
                      <Button
                        onClick={generatePDF}
                        disabled={cart.length === 0}
                        className="flex-1 bg-accent hover:bg-accent-dark text-accent-foreground font-semibold py-3"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Generate PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="w-full p-4">
              <FileProcessor onSendToChat={onSendToChat} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
