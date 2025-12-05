import React, { useState, useRef, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import PriceCalculatorSupabase from '@/components/PriceCalculatorSupabase';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const handleProductSelect = (product: string) => {
    setSelectedProduct(product);
  };

  const handleSendToChat = (message: string) => {
    // Use the global function to send message to chat
    if ((window as any).sendMessageToChat) {
      (window as any).sendMessageToChat(message);
    }
  };

  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentPreviewContent, setDocumentPreviewContent] = useState<{
    type: 'image' | 'pdf' | 'text';
    content: string | File | null;
  } | null>(null);

  // Function to update the document preview from child components
  const updateDocumentPreview = (type: 'image' | 'pdf' | 'text', content: string | File) => {
    setDocumentPreviewContent({ type, content });
    setShowDocumentPreview(true);
  };

  // Close preview and clear content
  const closeDocumentPreview = () => {
    setShowDocumentPreview(false);
    // Small delay before clearing content to allow for smooth animation
    setTimeout(() => setDocumentPreviewContent(null), 300);
  };

  // Expose the update and close functions to window for use in FileProcessor
  useEffect(() => {
    (window as any).updateDocumentPreview = updateDocumentPreview;
    (window as any).closeDocumentPreview = closeDocumentPreview;
    
    // Close preview when component unmounts or when navigating away
    return () => {
      closeDocumentPreview();
      delete (window as any).updateDocumentPreview;
      delete (window as any).closeDocumentPreview;
    };
  }, []);

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-background relative">
      {/* Chat Panel - 40% width on large screens, full width on mobile */}
      <div className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-border lg:h-screen overflow-hidden relative">
        <ChatInterface 
          onProductSelect={handleProductSelect}
          onReceiveMessage={(message) => {
            console.log('Received message from form:', message);
          }}
          onFormFill={(data) => {}}
        />
        
        {/* Document Preview Overlay */}
        {showDocumentPreview && documentPreviewContent && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col shadow-lg rounded-lg overflow-hidden transition-all duration-300 ease-in-out">
            <div className="flex justify-between items-center p-2 border-b bg-gray-50">
              <h3 className="font-medium">Document Preview</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeDocumentPreview}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {documentPreviewContent.type === 'image' && (
                <img 
                  src={typeof documentPreviewContent.content === 'string' 
                    ? documentPreviewContent.content 
                    : URL.createObjectURL(documentPreviewContent.content as File)} 
                  className="max-w-full h-auto mx-auto rounded" 
                  alt="Document Preview"
                />
              )}
              {documentPreviewContent.type === 'pdf' && (
                <iframe 
                  src={URL.createObjectURL(documentPreviewContent.content as File)} 
                  className="w-full h-full min-h-[70vh] border-0" 
                  title="PDF Preview"
                />
              )}
              {documentPreviewContent.type === 'text' && (
                <pre className="whitespace-pre-wrap text-sm p-4 bg-gray-50 rounded">
                  {documentPreviewContent.content as string}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Calculator Panel - 60% width on large screens, full width on mobile */}
      <div className="w-full lg:w-[60%] lg:h-screen overflow-auto">
        <PriceCalculatorSupabase 
          selectedProduct={selectedProduct} 
          onSendToChat={handleSendToChat}
          onFormFill={(data) => {}}
        />
      </div>
    </div>
  );
};

export default Index;
