# Nosta Quote AI - Complete Codebase Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Data Flow & Integration](#data-flow--integration)
6. [Key Features](#key-features)
7. [Configuration & Setup](#configuration--setup)
8. [API Integration](#api-integration)
9. [Styling & UI](#styling--ui)
10. [Development Workflow](#development-workflow)

---

## 🎯 Project Overview

**Nosta Quote AI** is a modern web application that combines an AI-powered chat interface with a dynamic price calculator for industrial products. The application helps customers get product quotes and technical assistance through an intelligent conversational interface.

### Key Capabilities:
- **AI Chat Interface**: Real-time conversation with N8N-powered backend
- **Dynamic Price Calculator**: Multi-step product configuration and pricing
- **Auto-fill Integration**: Chat responses can automatically populate form fields
- **PDF Generation**: Export quotes as professional PDF documents
- **Real-time Updates**: Hot module replacement for development

---

## 🏗️ Architecture & Tech Stack

### Frontend Stack:
- **React 18.3.1** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite 5.4.19** - Fast build tool and dev server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Shadcn/ui** - Modern component library built on Radix UI

### Key Libraries:
- **@tanstack/react-query** - Server state management
- **react-router-dom** - Client-side routing
- **lucide-react** - Modern icon library
- **jspdf & jspdf-autotable** - PDF generation
- **sonner** - Toast notifications
- **date-fns** - Date manipulation

### Backend Integration:
- **N8N Webhook** - AI processing and workflow automation
- **RESTful API** - HTTP-based communication
- **Session Management** - Unique session IDs for chat continuity

---

## 📁 Project Structure

```
nosta-quote-ai-main/
├── public/                     # Static assets
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn/ui base components
│   │   ├── ChatInterface.tsx # Main chat component
│   │   └── PriceCalculator.tsx # Price calculation component
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   ├── pages/                # Page components
│   │   ├── Index.tsx         # Main application page
│   │   └── NotFound.tsx      # 404 error page
│   ├── App.tsx               # Root application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── package.json              # Dependencies and scripts
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
└── learn.md                  # This documentation file
```

---

## 🧩 Core Components

### 1. App.tsx - Application Root
```typescript
// Main application wrapper with providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

**Purpose**: Sets up global providers and routing
**Key Features**:
- React Query for server state management
- Toast notifications (dual system)
- Client-side routing
- Tooltip provider for UI components

### 2. Index.tsx - Main Page Layout
```typescript
const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background">
      {/* Chat Panel - Left side */}
      <div className="flex-1 lg:w-1/2 border-r border-border lg:h-screen lg:overflow-hidden">
        <ChatInterface />
      </div>
      
      {/* Calculator Panel - Right side */}
      <div className="flex-1 lg:w-1/2 lg:h-screen lg:overflow-auto">
        <PriceCalculator />
      </div>
    </div>
  );
};
```

**Purpose**: Main application layout with split-screen design
**Key Features**:
- Responsive layout (mobile: stacked, desktop: side-by-side)
- Independent scroll areas for each panel
- Product selection state management
- Cross-component communication via global functions

---

## 💬 ChatInterface Component

### Core Functionality:

#### 1. Message Management
```typescript
interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  options?: string[];
}

const [messages, setMessages] = useState<Message[]>([
  // Initial welcome messages with template buttons
]);
```

#### 2. Session Management
```typescript
const [sessionId] = useState(() => {
  // Generate 32-character hex string for N8N session tracking
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
  }
  return total_price;
END;
$$ LANGUAGE plpgsql;
  }];

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
};
```

#### 4. Markdown Cleaning
```typescript
const cleanMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold
    .replace(/\*(.*?)\*/g, '$1')            // Remove italic
    .replace(/^---+$/gm, '')                // Remove horizontal rules
    .replace(/^#{1,6}\s+/gm, '')            // Remove headers
    .replace(/^\d+\.\s+/gm, '• ')           // Convert numbered lists
    .replace(/^[\-\*\+]\s+/gm, '• ')        // Convert bullet points
    .replace(/```[\s\S]*?```/g, '')         // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')            // Remove inline code
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .trim();
};
```

#### 5. Auto-fill Integration
```typescript
// Parse N8N response for form auto-fill
if (data.fromfill && (window as any).fillFormFromChat) {
  const formData = {};
  const entries = data.fromfill.split('•').map(entry => entry.trim());
  
  entries.forEach(entry => {
    const [key, value] = entry.split(':').map(s => s.trim());
    formData[key] = value;
  });
  
  (window as any).fillFormFromChat(formData);
}
```

#### 6. Quick Response Templates
```typescript
const [responseTemplates, setResponseTemplates] = useState<ResponseTemplate[]>([
  { 
    id: '1', 
    name: 'Product Selection', 
    message: 'Please choose a product:', 
    options: ['Passfeder', 'Scheibenfeder', 'Nutenstein'] 
  },
  { 
    id: '2', 
    name: 'Need Help', 
    message: 'How can I help you today?', 
    options: ['Technical Support', 'Pricing Info', 'Product Details'] 
  },
  { 
    id: '4', 
    name: 'material or Configuration Unavailable', 
    message: 'The specification/material I am looking for is unavailable' 
  }
]);
```

---

## 🧮 PriceCalculator Component

### Core Functionality:

#### 1. Product Configuration
```typescript
const [formData, setFormData] = useState({
  productGroup: '',
  dinNorm: '',
  material: '',
  breite: '',      // Width
  hohe: '',        // Height
  tiefe: '',       // Depth
  weight: 10,
  bore: '',
  numberOfBores: 1,
  coating: '',
  hardening: '',
  toleranceBreite: '',
  toleranceHohe: '',
  quantity: 1
});
```

#### 2. Feature Availability Matrix
```typescript
const FEATURE_AVAILABILITY = {
  "Passfeder (Keyway)": {
    Norms: ["DIN 6885", "Keine Norm"],
    Materials: ["C45", "Edelstahl", "Aluminium"],
    Dimensions: Array.from({length: 15}, (_, i) => i + 4), // 4-18
    Bores: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"],
    // ... more configurations
  },
  // ... other product types
};
```

#### 3. Cost Calculation Engine
```typescript
const COST_DATA = {
  MATERIAL_COSTS_PER_GRAM: {
    'C45': 1.5,
    'C60': 2.5,
    'Edelstahl': 3.0,
    'Aluminium': 4.5,
    'Messing': 6.0
  },
  BORE_COSTS: { 'M1': 10, 'M2': 11, /* ... */ },
  COATING_COSTS: { 'Typ 1': 3.2, 'Typ 2': 3.4, /* ... */ },
  TOLERANCE_COSTS: { 'h4': 1.5, 'h5': 1.6, /* ... */ },
  HARDENING_COSTS: { 'HRC 40': 50, 'HRC 41': 60, /* ... */ }
};
```

#### 4. Multi-step Wizard
```typescript
const isStepComplete = (step: number) => {
  switch (step) {
    case 1: return !!formData.productGroup;
    case 2: return !!(formData.dinNorm && formData.material && formData.breite && formData.hohe && formData.tiefe);
    case 3: return !!(formData.bore && formData.coating && formData.hardening);
    case 4: return formData.quantity > 0;
    default: return false;
  }
};
```

#### 5. Ask AI Integration
```typescript
const handleAskAI = (step: number, title: string) => {
  const currentStepData = getStepData(step);
  const previousStepData = step > 1 ? getStepData(step - 1) : {};
  
  const allData = { ...previousStepData, ...currentStepData };
  const formattedEntries = Object.entries(allData)
    .filter(([_, value]) => value !== '' && value !== 0)
    .map(([key, value]) => `${key}: ${value}`);
  
  const message = `I need help with "${title}" (Step ${step}).

Current filled data:
• ${formattedEntries.join('\n• ')}

Please provide guidance for this step.`;
  
  if (onSendToChat) {
    onSendToChat(message);
    toast.success(`Data from step ${step} sent to chat!`);
  }
};
```

#### 6. Auto-fill from Chat
```typescript
useEffect(() => {
  const fillFormFromChat = (data: any) => {
    const fieldMapping = {
      'productGroup': 'productGroup',
      'dinNorm': 'dinNorm', 
      'material': 'material',
      'breite': 'breite',
      'hohe': 'hohe',
      'tiefe': 'tiefe',
      // ... more field mappings
    };
    
    const updatedData = {};
    Object.entries(data).forEach(([key, value]) => {
      const mappedKey = fieldMapping[key] || key;
      
      if (['breite', 'hohe', 'tiefe', 'weight', 'numberOfBores', 'quantity'].includes(mappedKey)) {
        updatedData[mappedKey] = Number(value) || value;
      } else {
        updatedData[mappedKey] = value;
      }
    });
    
    setFormData(prev => ({ ...prev, ...updatedData }));
    toast.success('Form filled from chat!');
  };
  
  (window as any).fillFormFromChat = fillFormFromChat;
}, []);
```

#### 7. PDF Generation
```typescript
const generatePDF = () => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text('Nosta Cost Estimation', 20, 30);
  
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
  
  doc.save('nosta-quote.pdf');
};
```

---

## 🔄 Data Flow & Integration

### 1. Chat to Calculator Flow
```
User Message → ChatInterface → N8N Webhook → AI Processing → Response with fromfill data → Auto-populate Calculator Form
```

### 2. Calculator to Chat Flow
```
Ask AI Button → Collect Form Data → Format Message → Send to ChatInterface → N8N Webhook → AI Response
```

### 3. Session Management
```
Component Mount → Generate Session ID → Store in State → Include in All Webhook Calls → Maintain Conversation Context
```

### 4. Cross-Component Communication
```typescript
// Global functions for component communication
(window as any).sendMessageToChat = receiveExternalMessage;
(window as any).fillFormFromChat = fillFormFromChat;
```

---

## 🎨 Styling & UI Design

### Design System:
- **Modern Chat Interface**: Clean, document-style layout without bubbles for bot messages
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Color Scheme**: Professional blue/gray palette with accent colors
- **Typography**: System fonts for optimal readability
- **Interactive Elements**: Hover effects, transitions, and micro-animations

### Key UI Components:
1. **Message Bubbles**: User messages with rounded corners and shadows
2. **Bot Responses**: Clean text without containers for better readability
3. **Option Buttons**: Colorful, interactive buttons with hover effects
4. **Form Controls**: Modern input fields with focus states
5. **Step Indicators**: Visual progress tracking in the calculator

### Tailwind Classes Used:
```css
/* Layout */
.h-screen .flex .flex-col .lg:flex-row

/* Spacing */
.space-y-8 .px-6 .py-8 .gap-3

/* Colors */
.bg-primary .text-primary-foreground .bg-gray-50

/* Effects */
.shadow-lg .rounded-2xl .transition-all .duration-200

/* Responsive */
.lg:w-1/2 .lg:h-screen .lg:overflow-hidden
```

---

## ⚙️ Configuration & Setup

### Environment Variables:
```typescript
// Webhook URL configuration
const [webhookUrl, setWebhookUrl] = useState('https://nosta.app.n8n.cloud/webhook/b4c843be-698d-40c6-8e31-9370f5e165e0');
```

### Development Scripts:
```json
{
  "scripts": {
    "dev": "vite",                    // Start development server
    "build": "vite build",            // Build for production
    "build:dev": "vite build --mode development",
    "lint": "eslint .",               // Code linting
    "preview": "vite preview"         // Preview production build
  }
}
```

### TypeScript Configuration:
- Strict type checking enabled
- Modern ES modules support
- React JSX transformation
- Path mapping for clean imports (`@/components`)

---

## 🔌 API Integration

### N8N Webhook Format:

#### Request Format:
```json
[{
  "sessionId": "32-character-hex-string",
  "action": "sendMessage",
  "chatInput": "User message content"
}]
```

#### Expected Response Format:
```json
{
  "output": "AI response message",
  "button": "Option1,Option2,Option3",
  "fromfill": "productGroup: Passfeder• material: C45• breite: 4"
}
```

#### Error Handling:
- Connection errors show "Connection error. Please try again."
- Invalid JSON responses show "Sorry, I received an invalid response."
- Missing webhook URL shows configuration prompt
- Fallback message: "Thank you for your message. How can I help you further?"

---

## 🚀 Development Workflow

### Getting Started:
1. **Install Dependencies**: `npm install`
2. **Start Development Server**: `npm run dev`
3. **Open Browser**: Navigate to `http://localhost:8080`
4. **Configure Webhook**: Update N8N webhook URL in ChatInterface

### Development Features:
- **Hot Module Replacement**: Instant updates without page refresh
- **TypeScript Support**: Real-time type checking
- **ESLint Integration**: Code quality enforcement
- **Responsive Testing**: Built-in mobile/desktop testing

### Build Process:
1. **Development Build**: `npm run build:dev`
2. **Production Build**: `npm run build`
3. **Preview Build**: `npm run preview`

### Code Organization:
- **Components**: Reusable UI components
- **Pages**: Route-level components
- **Hooks**: Custom React hooks for shared logic
- **Utils**: Helper functions and utilities
- **Types**: TypeScript type definitions

---

## 🔧 Key Features Explained

### 1. Dual-Panel Layout
- **Left Panel**: Chat interface with AI conversation
- **Right Panel**: Step-by-step product configuration
- **Responsive**: Stacks vertically on mobile devices
- **Independent Scrolling**: Each panel scrolls independently

### 2. AI-Powered Assistance
- **Context Awareness**: AI understands current form state
- **Auto-fill Capability**: AI responses can populate form fields
- **Session Continuity**: Maintains conversation context
- **Multi-language Support**: German time formatting and UI text

### 3. Dynamic Product Configuration
- **Feature Matrix**: Products have different available options
- **Step Validation**: Users must complete steps in order
- **Real-time Pricing**: Costs update as options are selected
- **Visual Progress**: Clear indication of completion status

### 4. Professional Output
- **PDF Generation**: Export quotes as formatted documents
- **Detailed Breakdowns**: Show all cost components
- **Professional Styling**: Clean, business-ready appearance
- **Print-friendly**: Optimized for printing and sharing

---

## 🐛 Common Issues & Solutions

### Issue: "Thank you for your message" appears
**Cause**: N8N webhook not returning proper `output` field
**Solution**: Check N8N workflow response format

### Issue: Auto-fill not working
**Cause**: N8N not returning `fromfill` data in correct format
**Solution**: Ensure N8N returns: `"fromfill": "key: value• key2: value2"`

### Issue: Ask AI button not sending data
**Cause**: `onSendToChat` function not properly connected
**Solution**: Verify global function setup in Index.tsx

### Issue: PDF generation fails
**Cause**: Missing cart items or invalid data
**Solution**: Ensure cart has items before generating PDF

---

## 📚 Learning Resources

### Key Concepts to Understand:
1. **React Hooks**: useState, useEffect, useRef
2. **TypeScript**: Interfaces, type safety, generics
3. **Tailwind CSS**: Utility-first styling approach
4. **Webhook Integration**: HTTP requests and response handling
5. **State Management**: Component state and global state
6. **Event Handling**: User interactions and form submissions

### Recommended Reading:
- React Documentation: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs
- Tailwind CSS Docs: https://tailwindcss.com/docs
- Vite Guide: https://vitejs.dev/guide
- N8N Documentation: https://docs.n8n.io

---

## 🎯 Next Steps & Improvements

### Potential Enhancements:
1. **User Authentication**: Add login/logout functionality
2. **Chat History**: Persist conversations across sessions
3. **Multi-language**: Add internationalization support
4. **Advanced Filtering**: More sophisticated product search
5. **Real-time Collaboration**: Multiple users on same quote
6. **Analytics**: Track user interactions and popular products
7. **Mobile App**: React Native version for mobile devices

### Performance Optimizations:
1. **Code Splitting**: Lazy load components
2. **Caching**: Implement request caching
3. **Virtualization**: Handle large lists efficiently
4. **Bundle Analysis**: Optimize bundle size
5. **Service Worker**: Add offline support

---

This documentation provides a comprehensive understanding of the Nosta Quote AI codebase. Use it as a reference for development, debugging, and explaining the system to others.
