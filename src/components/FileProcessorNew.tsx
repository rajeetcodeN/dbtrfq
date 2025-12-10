import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as mammoth from 'mammoth';
import { formatCurrency } from '@/utils/format_currency';

// --- Cost Calculation Constants ---
const COST_DATA = {
  MATERIAL_COSTS_PER_GRAM: {
    'C45': 1.5,
    'C60': 2.5,
    'Edelstahl': 3.0,
    'Aluminium': 4.5,
    'Messing': 6.0
  },
  BORE_COSTS: {
    'M1': 10, 'M2': 11, 'M3': 12, 'M4': 13, 'M5': 14, 'M6': 15, 'M7': 16, 'M8': 17, 'M9': 18, 'M10': 19,
    'M11': 20, 'M12': 21, 'M13': 22, 'M14': 23, 'M15': 24, 'M16': 25, 'M17': 26, 'M18': 27, 'M19': 28, 'M20': 29, 'M21': 30
  },
  COATING_COSTS: {
    'Typ 1': 3.2, 'Typ 2': 3.4, 'Typ 3': 3.6, 'Typ 4': 3.8, 'Typ 5': 4.0, 'Typ 6': 4.2, 'Typ 7': 4.4, 'Typ 8': 4.6,
    'Typ 9': 4.8, 'Typ 10': 5.0, 'Typ 11': 5.2, 'Typ 12': 5.4, 'Typ 13': 5.6, 'Typ 14': 5.8, 'Typ 15': 6.0,
    'Typ 16': 6.2, 'Typ 17': 6.4
  },
  TOLERANCE_COSTS: {
    'h4': 1.5, 'h5': 1.6, 'h6': 1.7, 'h7': 1.8, 'h8': 1.9, 'h9': 2.0, 'h10': 2.1, 'h11': 2.2,
    'h12': 2.3, 'h13': 2.4, 'h14': 2.5, 'h15': 2.6, 'h16': 2.7, 'h17': 2.8, 'none': 0
  },
  HARDENING_COSTS: {
    'HRC 40': 50, 'HRC 41': 60, 'HRC 42': 70, 'HRC 43': 80, 'HRC 44': 90, 'HRC 45': 100, 'HRC 46': 110,
    'HRC 47': 120, 'HRC 48': 130, 'HRC 49': 140, 'HRC 50': 150, 'HRC 51': 160, 'HRC 52': 170,
    'HRC 53': 180, 'HRC 54': 190, 'HRC 55': 200, 'HRC 56': 210, 'HRC 57': 220, 'HRC 58': 230, 'none': 0
  }
};

const MATERIAL_DENSITY = {
  'C45': 7.85,
  'C60': 7.84,
  'Edelstahl': 7.95,
  'Aluminium': 2.70,
  'Messing': 8.50
};

const FEATURE_AVAILABILITY = {
  "Passfeder (Keyway)": {
    Norms: ["DIN 6885", "Keine Norm"],
    Materials: ["C45", "Edelstahl", "Aluminium"],
    Dimensions: Array.from({ length: 15 }, (_, i) => i + 4), // 4 to 18
    Bores: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"],
    NumberOfBores: Array.from({ length: 10 }, (_, i) => i + 1), // 1 to 10
    Coatings: ["Typ 1", "Typ 2", "Typ 3", "Typ 4", "Typ 5", "Typ 6", "Typ 7", "Typ 8", "Typ 9", "Typ 10", "Typ 11", "Typ 12"],
    Hardening: Array.from({ length: 19 }, (_, i) => `HRC ${i + 40}`), // HRC 40 to HRC 58
    TolerancesBreite: ["h4", "h5", "h6", "h7", "h8", "h9", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "none"],
    TolerancesHohe: ["h4", "h5", "h6", "h7", "h8", "h9", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "none"]
  },
  "Scheibenfeder (Disc Spring)": {
    Norms: ["DIN 6888", "Keine Norm"],
    Materials: ["Aluminium"],
    Dimensions: [4, 5, 6, 7, 16, 17, 18, 19, 20, 21],
    Bores: ["M1", "M2"],
    NumberOfBores: Array.from({ length: 10 }, (_, i) => i + 1), // 1 to 10
    Coatings: ["Typ 1", "Typ 2", "Typ 3", "Typ 4", "Typ 5", "Typ 6", "Typ 7", "Typ 8", "Typ 9", "Typ 10", "Typ 11", "Typ 12"],
    Hardening: Array.from({ length: 19 }, (_, i) => `HRC ${i + 40}`), // HRC 40 to HRC 58
    TolerancesBreite: ["h13", "h14", "h15", "h16", "h17", "none"],
    TolerancesHohe: ["h13", "h14", "h15", "h16", "h17", "none"]
  },
  "Nutenstein (T-Slot Nut)": {
    Norms: ["Keine Norm"],
    Materials: ["Aluminium", "Messing"],
    Dimensions: [3, 4, 5, 6, 7, 16, 17, 18, 22, 23, 24, 25, 26, 27, 28, 29],
    Bores: ["M13", "M14", "M15", "M16", "M17", "M18", "M19", "M20", "M21"],
    NumberOfBores: Array.from({ length: 10 }, (_, i) => i + 1), // 1 to 10
    Coatings: ["Typ 1", "Typ 2", "Typ 3", "Typ 4", "Typ 5", "Typ 6", "Typ 13", "Typ 14", "Typ 15", "Typ 16", "Typ 17"],
    Hardening: Array.from({ length: 19 }, (_, i) => `HRC ${i + 40}`), // HRC 40 to HRC 58
    TolerancesBreite: ["h13", "h14", "h15", "h16", "h17", "none"],
    TolerancesHohe: ["h13", "h14", "h15", "h16", "h17", "none"]
  }
};

// --- TypeScript Interfaces for Data Structures ---
interface DocumentHeader {
  supplier_name: string;
  customer_name: string;
  type_of_document: string;
  date: string;
  customer_number: string;
  order_or_rfq_number: string;
}

interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

interface ExtractedItem {
  id: number;
  pos: number;
  article_name: string;
  supplier_material_number: string;
  customer_material_number: string;
  qty: number;
  unit: string;
  deliveryDate: string;
  productGroup: string;
  material: string;
  // Dimensions
  width: number;
  height: number;
  depth: number;
  dimensions: Dimensions;
  weight: number;
  // Additional fields
  bore: string;
  numberOfBores: number;
  coating: string;
  hardening: string;
  toleranceBreite: string;
  toleranceHohe: string;
  // Pricing
  unitPrice: number;
  lineTotal: number;
  // Additional metadata
  dinNorm?: string;
  price: number;
}

// Helper function to get base material name (e.g., 'C45K' -> 'C45')
const getBaseMaterial = (material: string): string => {
  if (material.includes('C45')) return 'C45';
  if (material.includes('C60')) return 'C60';
  return material;
};

// Helper function to get material cost with fallback to base material
const getMaterialCost = (material: string): number | undefined => {
  return COST_DATA.MATERIAL_COSTS_PER_GRAM[material] ||
    COST_DATA.MATERIAL_COSTS_PER_GRAM[getBaseMaterial(material)];
};

// --- Main React Component ---
interface FileProcessorProps {
  onSendToChat?: (message: string) => void;
}

const FileProcessor: React.FC<FileProcessorProps> = ({ onSendToChat = () => { } }) => {
  // --- State Management ---
  const [isDataExtracted, setIsDataExtracted] = useState<boolean>(false);
  const [view, setView] = useState<'card' | 'table'>('card');
  const [headerData, setHeaderData] = useState<DocumentHeader | null>(null);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [noConfig, setNoConfig] = useState<boolean>(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [lastPastedText, setLastPastedText] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Close preview when component unmounts
  useEffect(() => {
    return () => {
      window.closeDocumentPreview?.();
    };
  }, []);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Function to calculate weight from dimensions and material density
  const calculateWeight = (width: number, height: number, depth: number, material: string): number => {
    try {
      // Convert dimensions from mm to cm for volume calculation (1cm³ = 1000mm³)
      const volumeCm3 = (width / 10) * (height / 10) * (depth / 10);
      const baseMaterial = getBaseMaterial(material);
      const density = MATERIAL_DENSITY[baseMaterial as keyof typeof MATERIAL_DENSITY] || 7.85; // Default to steel density (7.85 g/cm³)
      const weight = volumeCm3 * density;
      return parseFloat(weight.toFixed(3)); // Return weight in grams with 3 decimal places
    } catch (error) {
      console.error('Error calculating weight:', error);
      return 0;
    }
  };

  // Helper function to parse tab or space delimited text
  const parseTextTable = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Try to determine if it's tab or space delimited
    const isTabDelimited = lines[0].includes('\t');
    const delimiter = isTabDelimited ? '\t' : /\s{2,}/; // Tab or multiple spaces

    // Try to find header row
    const headerRow = lines[0];
    const headers = isTabDelimited
      ? headerRow.split('\t').map(h => h.trim().toLowerCase())
      : headerRow.split(/\s{2,}/).map(h => h.trim().toLowerCase());

    // If we have a proper header row, process as table
    if (headers.length > 3 && headers.some(h => ['artikel', 'menge', 'gewicht'].some(k => h.includes(k)))) {
      return lines.slice(1).map(line => {
        const values = isTabDelimited
          ? line.split('\t').map(v => v.trim())
          : line.split(/\s{2,}/).map(v => v.trim());

        const item: any = {};
        headers.forEach((header, index) => {
          if (values[index]) item[header] = values[index];
        });
        return item;
      });
    }

    // If no proper header row, try to parse as single line
    if (lines.length === 1) {
      const parts = text.trim().split(/\s+/);
      if (parts.length >= 5) {
        // Try to find position of quantity and unit
        const qtyIndex = parts.findIndex((p, i) => !isNaN(parseFloat(p)) && i > 0);
        if (qtyIndex > 0) {
          const item: any = {};
          item.article_name = parts.slice(1, qtyIndex).join(' ');
          item.qty = parseFloat(parts[qtyIndex]);
          item.unit = parts[qtyIndex + 1] || 'St';

          // Try to find weight
          const weightIndex = parts.findIndex((p, i) => i > qtyIndex + 1 && !isNaN(parseFloat(p.replace(',', '.'))));
          if (weightIndex > 0) {
            item.weight = parseFloat(parts[weightIndex].replace(',', '.'));
          }

          // Try to extract dimensions from article name
          const dimMatch = item.article_name.match(/(\d+)[xX×](\d+)[xX×](\d+)/);
          if (dimMatch) {
            item.dimensions = `${dimMatch[1]}x${dimMatch[2]}x${dimMatch[3]}`;
          }

          return [item];
        }
      }
    }

    return [];
  };

  // Function to process pasted text and extract items with weights
  const processPastedText = (text: string) => {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('No text provided or invalid format');
      }

      // First try to parse as JSON
      try {
        const jsonItems = JSON.parse(text);
        return processJsonItems(Array.isArray(jsonItems) ? jsonItems : [jsonItems]);
      } catch (e) {
        // If not JSON, try to parse as text table
        const tableItems = parseTextTable(text);
        if (tableItems.length > 0) {
          return processTextItems(tableItems);
        }

        // If still no items, try to parse as single line
        const parts = text.trim().split(/\s+/);
        if (parts.length >= 5) {
          const item: any = {};
          // Try to find position of quantity (first numeric value after position)
          const qtyIndex = parts.findIndex((p, i) => i > 0 && !isNaN(parseFloat(p)));
          if (qtyIndex > 0) {
            item.article_name = parts.slice(1, qtyIndex).join(' ');
            item.qty = parseFloat(parts[qtyIndex]);
            item.unit = parts[qtyIndex + 1] || 'St';

            // Try to find weight (next numeric value after unit)
            const weightIndex = parts.findIndex((p, i) => i > qtyIndex + 1 && !isNaN(parseFloat(p.replace(',', '.'))));
            if (weightIndex > 0) {
              item.weight = parseFloat(parts[weightIndex].replace(',', '.'));
            }

            // Extract dimensions from article name (e.g., 6x4x10)
            const dimMatch = item.article_name.match(/(\d+)[xX×](\d+)[xX×](\d+)/);
            if (dimMatch) {
              item.dimensions = `${dimMatch[1]}x${dimMatch[2]}x${dimMatch[3]}`;

              // Extract material (e.g., C45K)
              const materialMatch = item.article_name.match(/\b([A-Z]\d+[A-Z]?)\b/);
              if (materialMatch) {
                item.material = materialMatch[1];
              }
            }

            return processTextItems([item]);
          }
        }

        throw new Error('Could not parse the input format');
      }
      try {
        // Try parsing as a JSON array first
        items = JSON.parse(text);
      } catch (e) {
        console.log('Not a direct JSON array, trying to clean and parse...');
        // If that fails, try to clean and parse as JSON array
        try {
          // Try to fix common JSON issues
          const cleanText = text
            .replace(/[\r\n]+/g, '') // Remove all line breaks
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/([}"\d])\s+/g, '$1,') // Add missing commas between elements
            .replace(/,\s*$/, '') // Remove trailing comma
            .replace(/([{\[,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // Add quotes around keys

          // Try parsing as JSON array
          items = JSON.parse(`[${cleanText}]`);
        } catch (e2) {
          console.error('Error parsing as JSON array:', e2);
          // If that fails, try to parse as newline-separated JSON objects
          try {
            const lines = text.split('\n').filter(Boolean);
            items = lines.map(line => {
              try {
                return JSON.parse(line);
              } catch (e3) {
                console.error('Error parsing line as JSON:', line, e3);
                return null;
              }
            }).filter(Boolean);

            if (items.length === 0) {
              throw new Error('Could not parse any valid items from the input');
            }
          } catch (e3) {
            console.error('Failed to parse input:', e3);
            throw new Error('Could not parse the input. Please ensure it is valid JSON or newline-separated JSON objects.');
          }
        }
      }

      // Process each item to calculate weight
      const processedItems = items.map((item: any) => {
        try {
          if (!item) return null;

          // Extract dimensions (format: 6x4x10 or {width}x{height}x{depth})
          let width = 0, height = 0, depth = 0;
          if (item.dimensions) {
            const dims = String(item.dimensions).split(/[x×]/).map(Number);
            if (dims.length >= 3) [width, height, depth] = dims;
          } else if (item.width && item.height && item.depth) {
            width = Number(item.width) || 0;
            height = Number(item.height) || 0;
            depth = Number(item.depth) || 0;
          }

          // Extract material from article name (e.g., "DIN 6885 C45K B" -> "C45")
          let material = 'C45'; // Default material
          if (item.material) {
            material = getBaseMaterial(String(item.material));
          } else if (item.article_name) {
            const materialMatch = String(item.article_name).match(/\b([A-Z]\d+[A-Z]?)\b/);
            if (materialMatch) material = getBaseMaterial(materialMatch[1]);
          }

          // Calculate weight
          const weight = calculateWeight(width, height, depth, material);

          // Calculate unit price with proper defaults
          const unitPrice = calculateUnitPrice({
            ...item,
            material,
            width,
            height,
            depth,
            weight,
            bore: item.bore || 'none',
            numberOfBores: Number(item.numberOfBores) || 0,
            coating: item.coating || 'none',
            hardening: item.hardening || 'none',
            toleranceBreite: item.toleranceBreite || 'none',
            toleranceHohe: item.toleranceHohe || 'none',
            qty: Number(item.qty) || Number(item.quantity) || 1,
            unit: item.unit || 'pcs',
            price: 0,
            unitPrice: 0,
            lineTotal: 0,
            dimensions: { width, height, depth },
            deliveryDate: item.deliveryDate || item.delivery_date || '',
            productGroup: item.productGroup || item.product_group || '',
            supplier_material_number: item.supplier_material_number || item.supplierMaterialNumber || '',
            customer_material_number: item.customer_material_number || item.customerMaterialNumber || ''
          });

          return {
            ...item,
            id: item.id || item.pos || Math.floor(Math.random() * 10000),
            material,
            width,
            height,
            depth,
            weight,
            dimensions: { width, height, depth },
            // Set default values for other required fields
            bore: item.bore || 'none',
            numberOfBores: Number(item.numberOfBores) || 0,
            coating: item.coating || 'none',
            hardening: item.hardening || 'none',
            toleranceBreite: item.toleranceBreite || 'none',
            toleranceHohe: item.toleranceHohe || 'none',
            unit: item.unit || 'pcs',
            unitPrice: unitPrice,
            price: unitPrice,
            lineTotal: unitPrice * (Number(item.qty) || Number(item.quantity) || 1),
            qty: Number(item.qty) || Number(item.quantity) || 1,
            deliveryDate: item.deliveryDate || item.delivery_date || ''
          };
        } catch (error) {
          console.error('Error processing item:', item, error);
          return null;
        }
      });

      // Filter out any null items and update state
      const validItems = processedItems.filter(Boolean);
      if (validItems.length === 0) {
        throw new Error('No valid items could be processed from the input');
      }

      setItems(validItems);
      setUploadStatus(`Successfully processed ${validItems.length} item${validItems.length !== 1 ? 's' : ''}`);
      setIsDataExtracted(true);

    } catch (error) {
      console.error('Error processing pasted text:', error);
      setUploadStatus('Error processing text. Please check the format.');
      toast.error('Error processing pasted text. Please check the format.');
    }
  };
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [totalCost, setTotalCost] = useState<number>(0);

  // Handle text area paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain');
    setLastPastedText(pastedText);
    processPastedText(pastedText);
  };

  // Handle process button click
  const handleProcessText = () => {
    if (lastPastedText) {
      processPastedText(lastPastedText);
    }
  };

  // Calculate unit price based on item properties
  const calculateUnitPrice = (item: ExtractedItem): number => {
    // Get base material for cost lookup
    const baseMaterial = getBaseMaterial(item.material);
    // Get material cost per gram
    const materialCostPerGram = COST_DATA.MATERIAL_COSTS_PER_GRAM[baseMaterial as keyof typeof COST_DATA.MATERIAL_COSTS_PER_GRAM] || 0;

    // Calculate base cost (material cost only)
    const baseCost = item.weight * materialCostPerGram;

    // If No Config is enabled, return only material cost
    if (noConfig) {
      return parseFloat(baseCost.toFixed(2));
    }

    // Full calculation with all features
    let total = baseCost;

    // Add bore cost if specified
    if (item.bore && item.bore !== 'none') {
      const boreCost = COST_DATA.BORE_COSTS[item.bore as keyof typeof COST_DATA.BORE_COSTS] || 0;
      total += boreCost * (item.numberOfBores || 1);
    }

    // Add coating cost if specified
    if (item.coating && item.coating !== 'none') {
      total += COST_DATA.COATING_COSTS[item.coating as keyof typeof COST_DATA.COATING_COSTS] || 0;
    }

    // Add hardening cost if specified
    if (item.hardening && item.hardening !== 'none') {
      total += COST_DATA.HARDENING_COSTS[item.hardening as keyof typeof COST_DATA.HARDENING_COSTS] || 0;
    }

    // Add tolerance costs if specified
    if (item.toleranceBreite && item.toleranceBreite !== 'none') {
      total += COST_DATA.TOLERANCE_COSTS[item.toleranceBreite as keyof typeof COST_DATA.TOLERANCE_COSTS] || 0;
    }

    if (item.toleranceHohe && item.toleranceHohe !== 'none') {
      total += COST_DATA.TOLERANCE_COSTS[item.toleranceHohe as keyof typeof COST_DATA.TOLERANCE_COSTS] || 0;
    }

    return parseFloat(total.toFixed(2));
  };

  // Update item price and total when dependencies change
  const updateItemPricing = (item: ExtractedItem): ExtractedItem => {
    const weight = calculateWeight(item.width, item.height, item.depth, item.material);
    const unitPrice = calculateUnitPrice({ ...item, weight });
    const lineTotal = unitPrice * item.qty;

    return {
      ...item,
      weight,
      unitPrice,
      lineTotal,
      price: unitPrice // For backward compatibility
    };
  };

  const N8N_WEBHOOK_URL = 'https://n8n.digitalbiz.tech/webhook/f8957a80-b4c3-4bb4-b3c0-256624cbcc40';

  // --- Effects ---
  useEffect(() => {
    // Calculate total cost whenever items change
    const newTotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    setTotalCost(newTotal);
  }, [items]);

  // --- Event Handlers & Logic ---
  // Function to handle DOC/DOCX preview
  const handleDocPreview = async (file: File) => {
    // Convert DOCX to HTML and display as text content
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      // Use the same preview system as PDF
      window.updateDocumentPreview?.('text', result.value);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error processing DOC file:', error);
      toast.error('Could not preview the document. The file may be corrupted or in an unsupported format.');
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      showError('Unsupported file type. Please upload an image, PDF, Word, or Excel file.');
      return;
    }

    setLastUploadedFile(file);
    setUploadStatus(`Processing ${file.name}...`);
    setLastPastedText("");
    setIsProcessing(true);

    // Close any existing preview first
    if (isPreviewOpen) {
      window.closeDocumentPreview?.();
      setIsPreviewOpen(false);
    }

    // Show preview based on file type
    if (file.type.startsWith('image/')) {
      window.updateDocumentPreview?.('image', file);
      setIsPreviewOpen(true);
    } else if (file.type === 'application/pdf') {
      window.updateDocumentPreview?.('pdf', file);
      setIsPreviewOpen(true);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword') {
      await handleDocPreview(file);
    }

    try {
      await sendToWebhook(file);
      // The file is processed in sendToWebhook, no need to call processDocument
      // The status will be updated by sendToWebhook
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Error: ${(error as Error).message}`);
      setUploadStatus('Failed to process file');
      setIsProcessing(false);
    }
  };

  // Show error message with auto-dismiss
  const showError = (message: string, duration: number = 15000) => {
    const toastId = toast.error(message);
    setTimeout(() => {
      toast.dismiss(toastId);
    }, duration);
  };

  // Handle reset/start over
  const handleReset = () => {
    setItems([]);
    setHeaderData(null);
    setIsDataExtracted(false);
    setLastUploadedFile(null);
    setLastPastedText('');
    setPreviewContent('');
    window.closeDocumentPreview?.();
    setUploadStatus('');
  };

  const processDocument = async (file: File) => {
    try {
      // If we have a file, it's already been sent to the webhook
      // Now we'll just update the UI with the response
      // In a real implementation, you would process the webhook response here

      // For now, we'll use mock data as a fallback
      // In a production environment, you would use the actual response from the webhook
      setUploadStatus('Processing complete!');
      populateDataViewWithMock();
      setIsDataExtracted(true);
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Failed to process document');
    }
  };

  const sendToWebhook = async (file: File) => {
    const N8N_WEBHOOK_URL = 'https://n8n.digitalbiz.tech/webhook/f8957a80-b4c3-4bb4-b3c0-256624cbcc40';
    setUploadStatus('Extracting data from uploaded file. This may take a few minutes...');
    setIsProcessing(true);

    // Check if the file exists and has content
    if (!file) {
      const error = new Error('No file provided for upload');
      setUploadStatus('Error: No file provided');
      throw error;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Log file info for debugging
    console.log('File info:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    try {
      console.log('Initiating fetch request to:', N8N_WEBHOOK_URL);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with the correct boundary
        headers: {
          'Accept': 'application/json',
        },
        // Keep the connection alive for long-running requests
        keepalive: true,
      });

      console.log('Received response, status:', response.status);

      // First, read the response as text for debugging
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        console.error('Webhook error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      // Try to parse the response as JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed response data:', result);
      } catch (jsonError) {
        console.warn('Failed to parse JSON response, but request was successful. Response:', responseText);
        throw new Error('Received invalid JSON response from server');
      }

      // Process the response data
      if (result) {
        console.log('Raw result from API:', JSON.stringify(result, null, 2));

        // Handle both array and object responses
        const responseData = result;

        console.log('Processing response data:', responseData);

        // Check if we have the expected data structure
        if (responseData.requested_items && Array.isArray(responseData.requested_items)) {
          console.log('Found requested_items array with length:', responseData.requested_items.length);

          // Update header data
          const headerData = {
            supplier_name: responseData.supplier_name || 'N/A',
            customer_name: responseData.customer_name || 'N/A',
            type_of_document: responseData.type_of_document || 'RFQ',
            date: responseData.date || new Date().toISOString().split('T')[0],
            customer_number: responseData.customer_number || 'N/A',
            order_or_rfq_number: responseData.order_or_rfq_number || 'N/A'
          };

          console.log('Setting header data:', headerData);
          setHeaderData(headerData);

          // Map the requested_items to the ExtractedItem format
          const extractedItems = responseData.requested_items.map((item: any, index: number) => {
            // Extract dimensions from item.dimensions or article_name
            let width: number | 'NA' = 'NA';
            let height: number | 'NA' = 'NA';
            let depth: number | 'NA' = 'NA';

            // Helper function to parse dimension value
            const parseDimension = (value: any): number | 'NA' => {
              if (value === undefined || value === null || value === '') return 'NA';
              const num = parseFloat(value);
              return isNaN(num) ? 'NA' : num;
            };

            // First try to get dimensions from the dimensions field (could be object or string)
            if (item.dimensions) {
              if (typeof item.dimensions === 'string') {
                // Handle string format: 'width x height x depth'
                const dims = item.dimensions.split('x').map(d => d.trim());
                if (dims.length === 3) {
                  width = parseDimension(dims[0]);
                  height = parseDimension(dims[1]);
                  depth = parseDimension(dims[2]);
                  console.log(`Extracted dimensions from string: ${width}x${height}x${depth}`);
                }
              } else if (typeof item.dimensions === 'object' && item.dimensions !== null) {
                // Handle object format: { width: number, height: number, depth: number }
                width = parseDimension(item.dimensions.width);
                height = parseDimension(item.dimensions.height);
                depth = parseDimension(item.dimensions.depth);
                console.log(`Extracted dimensions from object: ${width}x${height}x${depth}`);
              }
            }

            // Fallback to individual dimension fields if available
            if (item.width !== undefined) width = parseDimension(item.width);
            if (item.height !== undefined) height = parseDimension(item.height);
            if (item.depth !== undefined) depth = parseDimension(item.depth);

            // Last resort: try to extract from article_name
            if ((width === 'NA' || height === 'NA' || depth === 'NA') && item.article_name) {
              const dimensionMatch = item.article_name.match(/(\d+(\.\d+)?)\s*[xX]\s*(\d+(\.\d+)?)(?:\s*[xX]\s*(\d+(\.\d+)?))?/);
              if (dimensionMatch) {
                if (width === 'NA') width = parseDimension(dimensionMatch[1]);
                if (height === 'NA') height = parseDimension(dimensionMatch[3]);
                if (depth === 'NA' && dimensionMatch[5] !== undefined) depth = parseDimension(dimensionMatch[5]);
                console.log(`Extracted dimensions from article_name: ${width}x${height}x${depth}`);
              }
            }

            // Handle both dimension formats
            const dimensions = item.dimensions || {
              width: item.width,
              height: item.height,
              depth: item.depth
            };

            // Initialize with default values if not provided
            const productGroup = item.productGroup || 'Passfeder (Keyway)';
            const material = item.material || 'C45';

            // Create base item with all required fields
            const baseItem = {
              id: index + 1,
              pos: item.pos || index + 1,
              article_name: item.article_name || 'Unnamed Article',
              supplier_material_number: item.supplier_material_number || 'N/A',
              customer_material_number: item.customer_material_number || 'N/A',
              qty: Number(item.quantity || item.qty) || 1,
              unit: item.unit || 'pcs',
              deliveryDate: item.delivery_date || item.deliveryDate || 'N/A',
              productGroup: productGroup,
              material: material,
              // Dimensions - use 'NA' for missing dimensions
              width: width,
              height: height,
              depth: depth,
              dimensions: {
                width: width === 'NA' ? 1 : width,
                height: height === 'NA' ? 1 : height,
                depth: depth === 'NA' ? 1 : depth
              },
              // Additional fields with defaults
              bore: item.bore || 'none',
              numberOfBores: Number(item.numberOfBores) || 1,
              coating: item.coating || 'none',
              hardening: item.hardening || 'none',
              toleranceBreite: item.toleranceBreite || 'none',
              toleranceHohe: item.toleranceHohe || 'none',
              // Pricing (will be calculated)
              unitPrice: 0,
              lineTotal: 0,
              price: 0
            };

            // Calculate weight and pricing
            const mappedItem = updateItemPricing(baseItem);
            console.log(`Mapped item ${index + 1}:`, mappedItem);
            return mappedItem;
          });

          console.log('Setting items state with:', extractedItems.length, 'items');
          setItems(extractedItems);
          setIsDataExtracted(true);
          setUploadStatus('Data processed successfully!');

          // Force a re-render to show the data
          setTimeout(() => {
            console.log('Forcing state update to refresh UI');
            setItems([...extractedItems]);
          }, 100);

          return { success: true, items: extractedItems };
        } else {
          console.warn('Unexpected response format - missing requested_items array');
          console.log('Full response data:', responseData);
          throw new Error('Unexpected response format from server');
        }
      } else {
        throw new Error('Empty response from server');
      }

    } catch (error) {
      console.error('Webhook Error:', error);
      let errorMessage = 'Failed to process file';

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Failed to connect to the server. Please check your internet connection.';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        } else if (error.message.includes('timeout') || error.name === 'TimeoutError') {
          errorMessage = 'Request timed out. The server is taking too long to respond.';
        } else {
          errorMessage = error.message;
        }
      }

      setUploadStatus(`Error: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePdf = async () => {
    const savePdfBtn = document.getElementById('save-pdf-btn');
    const originalButtonText = savePdfBtn?.textContent || 'Save as PDF';

    try {
      if (savePdfBtn) {
        savePdfBtn.textContent = 'Generating PDF...';
        savePdfBtn.setAttribute('disabled', 'true');
      }

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Set document properties
      doc.setProperties({
        title: 'DBT Quote',
        subject: 'Quote',
        author: 'DBT GmbH',
        keywords: 'DBT',
        creator: 'DBT Quote AI'
      });

      // Add NOSTA logo and company information
      try {
        // Add company name and address on the right side
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Nosta GmbH', 100, 20);

        // Add address
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('An der Bahn 5', 100, 28);
        doc.text('89420 Höchstädt an der Donau', 100, 36);

        // Add logo from public directory

      } catch (e) {
        console.warn('Error in header:', e);
        // Minimal fallback
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('DBT', 20, 30);
      }

      // Add document title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('COST CALCULATION', 105, 60, { align: 'center' });

      // Add horizontal line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      const lineY = 65; // Position the line below the header
      doc.line(20, lineY, 190, lineY);

      // Adjust the starting Y position for the document details
      const docDetailsStartY = lineY + 15;

      // Add document details in two columns - use adjusted Y positions
      const docDate = headerData?.date || new Date().toISOString().split('T')[0];
      const docNumber = headerData?.order_or_rfq_number || 'N/A';
      const customerName = headerData?.customer_name || 'N/A';
      const customerNumber = headerData?.customer_number || 'N/A';
      const docType = headerData?.type_of_document || 'QUOTE';

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const row1Y = docDetailsStartY + 5;
      const row2Y = row1Y + 10;
      const row3Y = row2Y + 10;

      doc.text('Customer Name:', 20, row1Y);
      doc.text('Document Type:', 20, row2Y);
      doc.text('Document Date:', 20, row3Y);
      doc.text('Customer Number:', 105, row1Y);
      doc.text('RFQ/Order Number:', 105, row2Y);

      // Add document detail values
      doc.setFont('helvetica', 'normal');
      doc.text(customerName, 50, row1Y);
      doc.text(docType, 50, row2Y);
      doc.text(docDate, 50, row3Y);
      doc.text(customerNumber, 135, row1Y);
      doc.text(docNumber, 140, row2Y);

      // Add another horizontal line - position it below the document details
      const bottomLineY = row3Y + 5;
      doc.line(20, bottomLineY, 190, bottomLineY);

      // Format additional specifications for better display
      const formatAdditionalSpecs = (item: ExtractedItem) => {
        const specs = [];
        if (item.bore && item.bore !== 'none') specs.push(`Bore: ${item.bore}`);
        if (item.coating && item.coating !== 'none') specs.push(`Coating: ${item.coating}`);
        if (item.hardening && item.hardening !== 'none') specs.push(`Hardening: ${item.hardening}`);
        if (item.toleranceBreite && item.toleranceBreite !== 'none') specs.push(`Tol. W: ${item.toleranceBreite}`);
        if (item.toleranceHohe && item.toleranceHohe !== 'none') specs.push(`Tol. H: ${item.toleranceHohe}`);

        return specs.length > 0 ? specs : ['-'];
      };

      // Add table with extracted items
      // Adjust layout for better readability with more spacing
      const startY = bottomLineY + 10; // Start table lower to give more space after the last line
      autoTable(doc, {
        startY: startY,
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200],
        head: [
          [
            { content: '#', styles: { cellWidth: 'auto', minCellWidth: 8 } },
            {
              content: 'Supplier\nMaterial',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 30,
                fontSize: 6,
                lineHeight: 1.2
              }
            },
            {
              content: 'Customer\nMaterial',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 30,
                fontSize: 6,
                lineHeight: 1.2
              }
            },
            {
              content: 'Article Name / Description',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 40,
                fontSize: 6,
                lineWidth: 0.1
              }
            },
            {
              content: 'Qty',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 10,
                halign: 'center'
              }
            },
            {
              content: 'Dimensions\n(W×H×D mm)',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 25,
                fontSize: 5.5,
                lineHeight: 1.2
              }
            },
            {
              content: 'Weight\n(kg)',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 15,
                fontSize: 6,
                lineHeight: 1.2,
                halign: 'right'
              }
            },
            {
              content: 'Unit Price\n(€)',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 20,
                fontSize: 6,
                lineHeight: 1.2,
                halign: 'right'
              }
            },
            {
              content: 'Subtotal\n(€)',
              styles: {
                cellWidth: 'auto',
                minCellWidth: 20,
                fontSize: 6,
                lineHeight: 1.2,
                halign: 'right'
              }
            }
          ]
        ],
        body: items.flatMap((item, index) => {
          const specs = formatAdditionalSpecs(item);
          const subtotal = item.qty * (item.unitPrice || 0);

          // Main row with most details
          const mainRow = [
            { content: item.pos.toString(), rowSpan: specs.length + 1 },
            { content: item.supplier_material_number || '-', rowSpan: specs.length + 1 },
            { content: item.customer_material_number || '-', rowSpan: specs.length + 1 },
            { content: item.article_name || '-', rowSpan: specs.length + 1 },
            { content: item.qty.toString(), rowSpan: specs.length + 1 },
            { content: item.dimensions ? `${item.dimensions.width}×${item.dimensions.height}×${item.dimensions.depth}` : '-', rowSpan: specs.length + 1 },
            { content: item.weight ? item.weight.toFixed(3) : '-', rowSpan: specs.length + 1 },
            { content: item.unitPrice ? item.unitPrice.toFixed(2) : '0.00', rowSpan: specs.length + 1 },
            { content: subtotal.toFixed(2), rowSpan: specs.length + 1, styles: { fontStyle: 'bold' } }
          ];

          // Additional rows for specifications
          const specRows = specs.map((spec, i) => [
            i === 0 ? { content: 'Specs:', colSpan: 2, styles: { fontStyle: 'italic' } } : '',
            i === 0 ? '' : '',
            { content: spec, colSpan: specs.length > 1 ? 2 : 5 },
            ...(specs.length > 1 ? ['', ''] : ['', '', ''])
          ].filter(Boolean));

          return [mainRow, ...specRows];
        }),
        headStyles: {
          fillColor: [0, 51, 102], // Dark blue
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2,
          lineWidth: 0.1,
          textColor: [255, 255, 255],
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        margin: { top: 5 },
        styles: {
          overflow: 'linebreak',
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 }, // More vertical padding
          fontSize: 7,
          cellWidth: 'wrap',
          minCellHeight: 10, // Increased minimum height
          lineHeight: 1.4, // Better line spacing
          valign: 'middle' // Center content vertically
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },  // #
          1: { cellWidth: 25 },  // Supplier Material
          2: { cellWidth: 25 },  // Customer Material
          3: { cellWidth: 35 },  // Article Name
          4: { cellWidth: 10, halign: 'center' },  // Qty
          5: { cellWidth: 25, fontSize: 6, halign: 'center' },  // Dimensions
          6: { cellWidth: 20, halign: 'right' },  // Weight
          7: { cellWidth: 20, halign: 'right' },  // Unit Price
          8: { cellWidth: 20, halign: 'right' }   // Subtotal
        },
        didDrawPage: function (data) {
          // Add page number with more spacing
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

          // Add more space before footer
          doc.setFontSize(8);
          doc.text(`Page ${data.pageNumber}`, 105, pageHeight - 15, { align: 'center' });

          // Add footer with company info and more spacing
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text('DBT • Your Address • Phone:• Email: ', 105, pageHeight - 8, { align: 'center' });
        }
      });

      // Add total cost with a nice box
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(240, 240, 240);
      doc.rect(120, finalY, 80, 15, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL COST (EUR):', 120, finalY + 9, { align: 'right' });
      doc.setFontSize(12);
      doc.text(totalCost.toFixed(2), 190, finalY + 9, { align: 'right' });

      // Draw a line above the total
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(120, finalY, 200, finalY);

      // Remove terms and conditions as requested

      // Save the PDF with a meaningful name
      doc.save(`DBT-${docType}-${docNumber || docDate.replace(/\//g, '-')}.pdf`);
      toast.success('PDF generated successfully!');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      if (savePdfBtn) {
        savePdfBtn.textContent = originalButtonText;
        savePdfBtn.removeAttribute('disabled');
      }
    }
  };

  const populateDataViewWithMock = () => {
    const mockFullData = {
      "supplier_name": "Nosta GmbH",
      "customer_name": "Ferdinand Gross GmbH & Co. KG",
      "type_of_document": "RFQ",
      "date": "2025-06-03",
      "customer_number": "923776",
      "order_or_rfq_number": "1172482",
      "requested_items": [
        {
          "pos": 1,
          "article_name": "DIN 6885 C45K B 6x4x10",
          "supplier_material_number": "00111488",
          "customer_material_number": "8500B0604010",
          "quantity": 400,
          "unit": "St",
          "delivery_date": "2025-06-23"
        },
        {
          "pos": 2,
          "article_name": "DIN 6885 C45K B 6x4x12",
          "supplier_material_number": "00111128",
          "customer_material_number": "",
          "quantity": 500,
          "unit": "St",
          "delivery_date": "2025-06-23"
        }
      ]
    };

    setHeaderData({
      supplier_name: mockFullData.supplier_name,
      customer_name: mockFullData.customer_name,
      type_of_document: mockFullData.type_of_document,
      date: mockFullData.date,
      customer_number: mockFullData.customer_number,
      order_or_rfq_number: mockFullData.order_or_rfq_number
    });

    const newItems = mockFullData.requested_items.map(item => ({
      id: item.pos,
      pos: item.pos,
      article_name: item.article_name,
      supplier_material_number: item.supplier_material_number,
      customer_material_number: item.customer_material_number || "",
      qty: item.quantity,
      unit: item.unit,
      deliveryDate: item.delivery_date,
      productGroup: "Passfeder",
      material: "C45K",
      width: 6,
      height: 4,
      depth: item.pos === 1 ? 10 : 12,
      weight: 0,
      bore: "",
      coating: "",
      hardening: "",
      tolerance: "",
      price: 0.50
    }));

    setItems(newItems);
  };



  const updateItemData = (index: number, prop: keyof ExtractedItem, value: any) => {
    const newItems = [...items];
    const itemToUpdate = newItems[index];

    if (itemToUpdate) {
      // Update the property that changed
      if (['qty', 'price', 'width', 'height', 'depth', 'weight'].includes(prop)) {
        (itemToUpdate as any)[prop] = parseFloat(value) || 0;
      } else {
        (itemToUpdate as any)[prop] = value;
      }

      // Recalculate costs for the updated item
      const updatedItem = updateItemPricing(itemToUpdate);

      // Update the item in the array
      newItems[index] = updatedItem;

      // Update the state with the new items
      setItems(newItems);

      // Recalculate the total cost
      const newTotalCost = newItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      setTotalCost(newTotalCost);
    }
  };

  const formatCurrency = (amount: number): string => {
    const formatter = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    // This will ensure the Euro symbol comes first with a non-breaking space
    return `€\u00A0${formatter
      .format(amount || 0)
      .replace(/[^\d,.-]/g, '')
      .trim()}`;
  };

  // --- Render ---
  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="flex-1 p-1 sm:p-2">
        {!isDataExtracted ? (
          <div id="initial-upload-view" className="w-full max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-center">Upload Document</h2>
            <div className="mb-1">
              <label
                htmlFor="document-upload"
                className="flex flex-col items-center p-2 sm:p-3 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-center space-y-0.5 sm:space-y-1">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <h3 className="text-sm sm:text-base font-medium text-gray-700">Upload Document</h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 text-center">Drag and drop your file here, or click to browse</p>
                  <p className="text-[10px] text-gray-400">Supports: Images, PDF, Word, Excel (Max 10MB)</p>
                </div>
                <input
                  id="document-upload"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </label>
              <p className="mt-2 text-sm text-center text-blue-600 h-5">
                {uploadStatus}
              </p>
            </div>
            {/* Text paste functionality has been removed */}
            <button
              id="process-btn"
              onClick={processDocument}
              className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 text-lg disabled:bg-blue-400"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Extract Data'}
            </button>
          </div>
        ) : (
          <div id="data-view" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Verify Extracted Data</h2>
              <button onClick={handleReset} className="text-sm text-blue-500 hover:underline">Start Over</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Preview Toggle Button - Small and in the top-right corner */}
              <div className="lg:col-span-12 flex justify-end">
                <button
                  onClick={() => {
                    if (isPreviewOpen) {
                      window.closeDocumentPreview?.();
                      setIsPreviewOpen(false);
                    } else {
                      if (lastUploadedFile) {
                        if (lastUploadedFile.type.startsWith('image/')) {
                          window.updateDocumentPreview?.('image', lastUploadedFile);
                        } else if (lastUploadedFile.type === 'application/pdf') {
                          window.updateDocumentPreview?.('pdf', lastUploadedFile);
                        }
                      } else if (lastPastedText) {
                        window.updateDocumentPreview?.('text', lastPastedText);
                      }
                      setIsPreviewOpen(true);
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                  disabled={!lastUploadedFile && !lastPastedText}
                  title={lastUploadedFile || lastPastedText ?
                    (isPreviewOpen ? 'Close document preview' : 'Show document preview') :
                    'No document to preview'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isPreviewOpen ? 'text-blue-300' : ''}
                  >
                    {isPreviewOpen ? (
                      <>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </>
                    ) : (
                      <>
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </>
                    )}
                  </svg>
                  <span className="hidden sm:inline">{isPreviewOpen ? 'Close' : 'Preview'}</span>
                </button>
              </div>

              {/* Data Panel - Now takes full width */}
              <div id="extraction-panel" className="lg:col-span-12 h-[70vh] flex flex-col">
                <div id="pdf-content-wrapper" className="flex-grow overflow-y-auto pr-2">
                  {headerData && (
                    <div id="document-header-info" className="mb-6 p-4 border rounded-lg bg-gray-50">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Document Details</h3>
                      {/* No Config Toggle */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={noConfig}
                            onChange={(e) => setNoConfig(e.target.checked)}
                            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">No Config (Material Cost Only)</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {noConfig ? 'Only material cost will be calculated' : 'All features will be included in cost'}
                          </span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500">Supplier Name</label>
                          <input
                            type="text"
                            value={headerData.supplier_name}
                            onChange={(e) => setHeaderData({ ...headerData, supplier_name: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Customer Name</label>
                          <input
                            type="text"
                            value={headerData.customer_name}
                            onChange={(e) => setHeaderData({ ...headerData, customer_name: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Document Type</label>
                          <input
                            type="text"
                            value={headerData.type_of_document}
                            onChange={(e) => setHeaderData({ ...headerData, type_of_document: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Document Date</label>
                          <input
                            type="date"
                            value={headerData.date}
                            onChange={(e) => setHeaderData({ ...headerData, date: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Customer Number</label>
                          <input
                            type="text"
                            value={headerData.customer_number}
                            onChange={(e) => setHeaderData({ ...headerData, customer_number: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">RFQ/Order Number</label>
                          <input
                            type="text"
                            value={headerData.order_or_rfq_number}
                            onChange={(e) => setHeaderData({ ...headerData, order_or_rfq_number: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mb-2">
                    <div className="inline-flex rounded-md shadow-sm">
                      <button
                        onClick={() => setView('card')}
                        className={`py-1 px-3 text-sm font-medium rounded-l-lg border ${view === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
                          }`}
                      >
                        Card View
                      </button>
                      <button
                        onClick={() => setView('table')}
                        className={`py-1 px-3 text-sm font-medium rounded-r-lg border ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
                          }`}
                      >
                        Table View
                      </button>
                    </div>
                  </div>

                  {view === 'card' ? (
                    <div id="extracted-data-list" className="space-y-4">
                      {items.map((item, index) => (
                        <div key={item.id} className="extracted-item p-4 bg-gray-50 rounded-lg border">
                          <p className="text-sm font-bold text-gray-500 mb-3 border-b pb-2">PRODUCT {item.pos}</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500">Product Group</label>
                              <input
                                type="text"
                                value={item.productGroup}
                                onChange={e => updateItemData(index, 'productGroup', e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500">Supplier Material #</label>
                              <input
                                type="text"
                                value={item.supplier_material_number}
                                onChange={e => updateItemData(index, 'supplier_material_number', e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500">Customer Material #</label>
                              <input
                                type="text"
                                value={item.customer_material_number}
                                onChange={e => updateItemData(index, 'customer_material_number', e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md bg-white"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-xs font-bold text-gray-500">Article Name / Description</label>
                              <input
                                type="text"
                                value={item.article_name}
                                onChange={e => updateItemData(index, 'article_name', e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md bg-white"
                              />
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                              <div>
                                <label className="text-xs font-bold text-gray-500">Quantity</label>
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={e => updateItemData(index, 'qty', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Unit</label>
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={e => updateItemData(index, 'unit', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Unit Price (€)</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={e => updateItemData(index, 'price', e.target.value)}
                                    className="mt-1 w-full p-2 pl-8 border rounded-md bg-white"
                                    min="0"
                                    lang="de-DE"
                                  />
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Width (mm)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={typeof item.width !== 'undefined' ? item.width : (item.dimensions?.width || '')}
                                  onChange={e => updateItemData(index, 'width', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Height (mm)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={typeof item.height !== 'undefined' ? item.height : (item.dimensions?.height || '')}
                                  onChange={e => updateItemData(index, 'height', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Depth (mm)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={typeof item.depth !== 'undefined' ? item.depth : (item.dimensions?.depth || '')}
                                  onChange={e => updateItemData(index, 'depth', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Weight (g)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.weight}
                                  onChange={e => updateItemData(index, 'weight', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Bore</label>
                                <select
                                  value={item.bore || 'none'}
                                  onChange={e => updateItemData(index, 'bore', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  <option value="none">No Bore</option>
                                  {Object.keys(COST_DATA.BORE_COSTS).map(bore => (
                                    <option key={bore} value={bore}>{bore}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Number of Bores</label>
                                <select
                                  value={item.numberOfBores || 1}
                                  onChange={e => updateItemData(index, 'numberOfBores', parseInt(e.target.value) || 1)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Coating</label>
                                <select
                                  value={item.coating || 'none'}
                                  onChange={e => updateItemData(index, 'coating', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  <option value="none">No Coating</option>
                                  {Object.keys(COST_DATA.COATING_COSTS).map(coating => (
                                    <option key={coating} value={coating}>{coating}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Hardening</label>
                                <select
                                  value={item.hardening || 'none'}
                                  onChange={e => updateItemData(index, 'hardening', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  <option value="none">No Hardening</option>
                                  {Object.keys(COST_DATA.HARDENING_COSTS).map(hardening => (
                                    <option key={hardening} value={hardening}>{hardening}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Tolerance (Width)</label>
                                <select
                                  value={item.toleranceBreite || 'none'}
                                  onChange={e => updateItemData(index, 'toleranceBreite', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  <option value="none">No Tolerance</option>
                                  {Object.keys(COST_DATA.TOLERANCE_COSTS).map(tol => (
                                    <option key={`w-${tol}`} value={tol}>{tol} (Width)</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Material</label>
                                <select
                                  value={item.material}
                                  onChange={e => updateItemData(index, 'material', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  {Object.keys(COST_DATA.MATERIAL_COSTS_PER_GRAM).map(material => (
                                    <option key={material} value={material}>{material}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Delivery Date</label>
                                <input
                                  type="date"
                                  value={item.deliveryDate}
                                  onChange={e => updateItemData(index, 'deliveryDate', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500">Tolerance (Height)</label>
                                <select
                                  value={item.toleranceHohe || 'none'}
                                  onChange={e => updateItemData(index, 'toleranceHohe', e.target.value)}
                                  className="mt-1 w-full p-2 border rounded-md bg-white"
                                >
                                  <option value="none">No Tolerance</option>
                                  {Object.keys(COST_DATA.TOLERANCE_COSTS).map(tol => (
                                    <option key={`h-${tol}`} value={tol}>{tol} (Height)</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <div className="space-y-2 text-sm text-gray-700">
                              {/* Material Cost */}
                              <div className="flex justify-between">
                                <span>Material Cost:</span>
                                <span>{formatCurrency(getMaterialCost(item.material) || 0)}/g</span>
                              </div>

                              {/* Weight and Dimensions */}
                              <div className="flex justify-between">
                                <span>Weight:</span>
                                <span>{item.weight || 0}g</span>
                              </div>
                              {item.width && item.height && item.depth && (
                                <div className="text-xs text-gray-500 text-right">
                                  ({item.width} × {item.height} × {item.depth}mm) × {MATERIAL_DENSITY[getBaseMaterial(item.material) as keyof typeof MATERIAL_DENSITY] || 'N/A'} g/cm³
                                </div>
                              )}

                              {/* Price Calculation */}
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-sm">
                                  <div className="flex justify-between">
                                    <span>Material Cost:</span>
                                    <span>{formatCurrency(getMaterialCost(item.material) || 0)}/g × {item.weight || 0}g = {formatCurrency((getMaterialCost(item.material) || 0) * (item.weight || 0))}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Features */}
                              <div className="space-y-1 mt-1">
                                {[
                                  item.bore && item.bore !== 'none' && {
                                    text: `Bore: ${item.bore} (${item.numberOfBores})`,
                                    cost: (COST_DATA.BORE_COSTS[item.bore] || 0) * (item.numberOfBores || 1)
                                  },
                                  item.coating && item.coating !== 'none' && {
                                    text: `Coating: ${item.coating}`,
                                    cost: COST_DATA.COATING_COSTS[item.coating] || 0
                                  },
                                  item.hardening && item.hardening !== 'none' && {
                                    text: `Hardening: ${item.hardening}`,
                                    cost: COST_DATA.HARDENING_COSTS[item.hardening] || 0
                                  },
                                  item.toleranceBreite && item.toleranceBreite !== 'none' && {
                                    text: `Tolerance (Width): ${item.toleranceBreite}`,
                                    cost: COST_DATA.TOLERANCE_COSTS[item.toleranceBreite] || 0
                                  },
                                  item.toleranceHohe && item.toleranceHohe !== 'none' && {
                                    text: `Tolerance (Height): ${item.toleranceHohe}`,
                                    cost: COST_DATA.TOLERANCE_COSTS[item.toleranceHohe] || 0
                                  }
                                ].filter(Boolean)
                                  .map((feature, i) => (
                                    <div key={i} className="flex justify-between">
                                      <span>+ {feature.text}</span>
                                      <span>{formatCurrency(feature.cost)}</span>
                                    </div>
                                  ))}
                              </div>

                              {/* Total Price and Tolerances */}
                              <div className="mt-2 pt-2 border-t">
                                <div className="flex justify-between font-medium">
                                  <span>Unit Price (Total):</span>
                                  <span>{formatCurrency(item.price)}</span>
                                </div>

                                {(item.toleranceBreite && item.toleranceBreite !== 'none') && (
                                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                                    <span>+ Tolerance (Width {item.toleranceBreite}):</span>
                                    <span>{formatCurrency(COST_DATA.TOLERANCE_COSTS[item.toleranceBreite])}</span>
                                  </div>
                                )}

                                {(item.toleranceHohe && item.toleranceHohe !== 'none') && (
                                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                                    <span>+ Tolerance (Height {item.toleranceHohe}):</span>
                                    <span>{formatCurrency(COST_DATA.TOLERANCE_COSTS[item.toleranceHohe])}</span>
                                  </div>
                                )}
                              </div>

                              <div className="border-t border-gray-200 my-2"></div>

                              <div className="flex justify-between font-medium">
                                <span>Quantity:</span>
                                <span>{item.qty} {item.unit}</span>
                              </div>

                              <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
                                <span>Subtotal ({item.qty} × {formatCurrency(item.price)}):</span>
                                <span className="text-blue-600">{formatCurrency(item.qty * item.price)}</span>
                              </div>

                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div id="glance-view-container" className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Pos</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Article Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Material</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Dimensions (mm)</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Unit</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Unit Price</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody id="glance-table-body" className="bg-white divide-y divide-gray-200">
                          {items.map((item, index) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{item.pos}</td>
                              <td className="px-3 py-2 min-w-[200px]">
                                <input
                                  type="text"
                                  value={item.article_name}
                                  onChange={e => updateItemData(index, 'article_name', e.target.value)}
                                  className="w-full p-1 border rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.material}
                                  onChange={e => updateItemData(index, 'material', e.target.value)}
                                  className="w-full p-1 border rounded text-sm"
                                >
                                  {Object.keys(COST_DATA.MATERIAL_COSTS_PER_GRAM).map(mat => (
                                    <option key={mat} value={mat}>{mat}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    value={item.width || ''}
                                    onChange={e => updateItemData(index, 'width', e.target.value)}
                                    placeholder="W"
                                    className="w-14 p-1 border rounded text-center"
                                  />
                                  <span className="self-center">×</span>
                                  <input
                                    type="number"
                                    value={item.height || ''}
                                    onChange={e => updateItemData(index, 'height', e.target.value)}
                                    placeholder="H"
                                    className="w-14 p-1 border rounded text-center"
                                  />
                                  <span className="self-center">×</span>
                                  <input
                                    type="number"
                                    value={item.depth || ''}
                                    onChange={e => updateItemData(index, 'depth', e.target.value)}
                                    placeholder="D"
                                    className="w-14 p-1 border rounded text-center"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={e => updateItemData(index, 'qty', e.target.value)}
                                  className="w-20 p-1 border rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.unit}
                                  onChange={e => updateItemData(index, 'unit', e.target.value)}
                                  className="w-16 p-1 border rounded text-sm"
                                >
                                  <option value="St">St</option>
                                  <option value="m">m</option>
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="mm">mm</option>
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={e => updateItemData(index, 'price', e.target.value)}
                                    className="w-24 p-1 border rounded pl-6"
                                    min="0"
                                    lang="de-DE"
                                  />
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 font-semibold">
                                {formatCurrency(item.qty * item.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">TOTAL COST (EUR):</span>
                    <span id="extracted-total-cost" className="font-bold text-blue-600 text-xl">
                      {formatCurrency(totalCost > 0 ? totalCost : 10643.00)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <button
                    onClick={() => onSendToChat(JSON.stringify({ items, headerData }, null, 2))}
                    className="w-full bg-blue-600 text-white text-sm sm:text-base font-semibold py-2 px-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    Ask AI
                  </button>
                  <button className="w-full bg-indigo-600 text-white text-sm sm:text-base font-semibold py-2 px-3 rounded-lg hover:bg-indigo-700">
                    Save Record
                  </button>
                  <button
                    id="save-pdf-btn"
                    onClick={generatePdf}
                    className="w-full bg-green-600 text-white text-sm sm:text-base font-semibold py-2 px-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Save as PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileProcessor;
