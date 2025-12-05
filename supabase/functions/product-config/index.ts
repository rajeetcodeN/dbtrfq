// @ts-ignore - Deno types are available in Supabase Edge Functions
declare const Deno: any;

// @ts-ignore - ESM imports are valid in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CONFIGURATION & HELPERS ---

const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:3000',
  'https://your-production-domain.com' // Add your production domain here
];

const getCorsHeaders = (origin: string | null) => {
  const headers = new Headers();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return headers;
};

const createResponse = (data: any, status = 200, origin: string | null = null) => {
  const headers = getCorsHeaders(origin);
  headers.set('Content-Type', 'application/json');
  
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.fromEntries(headers.entries())
  });
};

const createCorsResponse = (origin: string | null = null) => {
  const headers = getCorsHeaders(origin);
  return new Response(null, {
    status: 204, // No Content
    headers: Object.fromEntries(headers.entries())
  });
};

// Fetch all available options for a product group from the database
async function getOptionsForProductGroup(supabase: any, productGroup: string) {
  try {
    // 1. First get the product group ID
    const { data: groupData, error: groupError } = await supabase
      .from('productgroups')
      .select('id')
      .eq('group_name', productGroup)
      .single();
      
    if (groupError || !groupData) {
      throw new Error(`Product group '${productGroup}' not found`);
    }
    
    const groupId = groupData.id;
    
    // 2. Fetch all related data in parallel
    const [
      { data: norms },
      { data: materials },
      { data: dimensions },
      { data: bores },
      { data: numBores },
      { data: coatings },
      { data: hardeningLevels },
      { data: tolerances }
    ] = await Promise.all([
      // Get standards/norms
      supabase
        .from('productgroup_standards')
        .select('standards(standard_name)')
        .eq('productgroup_id', groupId),
      
      // Get materials
      supabase
        .from('productgroup_available_materials')
        .select('materials(material_name)')
        .eq('productgroup_id', groupId),
      
      // Get dimensions (width, height, depth)
      supabase
        .from('productgroup_available_dimensions')
        .select('dimensions(value, dimension_type)')
        .eq('productgroup_id', groupId),
      
      // Get bores
      supabase
        .from('productgroup_available_bores')
        .select('bores(bore_size)')
        .eq('productgroup_id', groupId),
      
      // Get number of bores
      supabase
        .from('productgroup_available_num_bores')
        .select('numberofbores(count)')
        .eq('productgroup_id', groupId),
      
      // Get coatings
      supabase
        .from('productgroup_available_coatings')
        .select('coatings(coating_type)')
        .eq('productgroup_id', groupId),
      
      // Get hardening levels
      supabase
        .from('productgroup_available_hardening')
        .select('hardeninglevels(hardening_level)')
        .eq('productgroup_id', groupId),
      
      // Get tolerances
      supabase
        .from('productgroup_available_tolerances')
        .select('tolerances(tolerance_grade)')
        .eq('productgroup_id', groupId)
    ]);
    
    // Process dimensions by type
    const dimensionsByType = (dimensions || []).reduce((acc: any, { dimensions }: any) => {
      if (dimensions) {
        const type = dimensions.dimension_type?.toLowerCase();
        const value = parseFloat(dimensions.value);
        if (type && !isNaN(value)) {
          acc[type] = acc[type] || [];
          if (!acc[type].includes(value)) {
            acc[type].push(value);
          }
        }
      }
      return acc;
    }, {});
    
    // Helper to extract values from nested objects
    const extractValues = (items: any[], prop: string) => 
      Array.from(new Set(
        (items || [])
          .map((item: any) => item[Object.keys(item)[0]]?.[prop])
          .filter(Boolean)
      )).sort((a: any, b: any) => a - b);
    
    // Return the formatted options
    return {
      Norms: extractValues(norms || [], 'standard_name'),
      Materials: extractValues(materials || [], 'material_name'),
      Dimensions: [
        ...(dimensionsByType.width || []),
        ...(dimensionsByType.height || []),
        ...(dimensionsByType.depth || [])
      ].sort((a: number, b: number) => a - b),
      Bores: extractValues(bores || [], 'bore_size'),
      NumberOfBores: extractValues(numBores || [], 'count').map(String),
      Coatings: extractValues(coatings || [], 'coating_type'),
      Hardening: extractValues(hardeningLevels || [], 'hardening_level'),
      TolerancesBreite: extractValues(tolerances || [], 'tolerance_grade'),
      TolerancesHohe: extractValues(tolerances || [], 'tolerance_grade')
    };
    
  } catch (error) {
    console.error('Error in getOptionsForProductGroup:', error);
    throw new Error(`Failed to fetch options for product group '${productGroup}': ${error.message}`);
  }
}

async function calculatePrice(supabase: any, formData: any) {
  console.log('Starting price calculation for:', formData);
  
  const getCost = async (table: string, nameCol: string, costCol: string, name: string, fallback = 0) => {
    if (!name) return 0;
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select(costCol)
        .eq(nameCol, name)
        .single();
        
      if (error || !data) {
        console.warn(`No cost found for ${name} in ${table}:`, error?.message || 'No data');
        return fallback;
      }
      
      const cost = parseFloat(data[costCol]);
      if (isNaN(cost)) {
        console.warn(`Invalid cost value for ${name} in ${table}:`, data[costCol]);
        return fallback;
      }
      
      console.log(`Cost for ${name} in ${table}:`, cost);
      return cost;
    } catch (error) {
      console.error(`Error getting cost for ${name} in ${table}:`, error);
      return fallback;
    }
  };

  try {
    // Get base price for the product group
    const { data: groupData, error: groupError } = await supabase
      .from('productgroups')
      .select('base_price')
      .eq('group_name', formData.productGroup)
      .single();
      
    if (groupError || !groupData) {
      throw new Error(`Product group '${formData.productGroup}' not found`);
    }
    
    let total = parseFloat(groupData.base_price) || 0;
    console.log('Base price:', total);

    // Get all costs in parallel
    const [
      materialCost, 
      boreCost, 
      coatingCost, 
      hardeningCost, 
      tolBreiteCost, 
      tolHoheCost
    ] = await Promise.all([
      getCost("materials", "material_name", "cost_per_gram", formData.material),
      getCost("bores", "bore_size", "cost_per_bore", formData.bore),
      getCost("coatings", "coating_type", "cost_per_part", formData.coating),
      getCost("hardeninglevels", "hardening_level", "cost_per_lot", formData.hardening),
      getCost("tolerances", "tolerance_grade", "cost_per_side", formData.toleranceBreite),
      getCost("tolerances", "tolerance_grade", "cost_per_side", formData.toleranceHohe),
    ]);

    // Calculate material cost based on weight
    const weight = parseFloat(formData.weight) || 0;
    const materialTotal = materialCost * weight;
    
    // Calculate bore cost based on number of bores
    const numBores = parseInt(formData.numberOfBores) || 0;
    const boreTotal = boreCost * numBores;
    
    // Calculate total with all costs
    total += materialTotal + boreTotal + coatingCost + hardeningCost + tolBreiteCost + tolHoheCost;
    
    // Apply quantity
    const quantity = parseInt(formData.quantity) || 1;
    total = total * quantity;
    
    // Apply volume discount if applicable
    if (quantity > 10) {
      const discount = Math.min(0.2, Math.floor(quantity / 10) * 0.02); // 2% per 10 items, max 20%
      total *= (1 - discount);
      console.log(`Applied ${discount * 100}% volume discount`);
    }
    
    // Round to 2 decimal places
    const finalPrice = Math.round(total * 100) / 100;
    console.log('Final calculated price:', finalPrice);
    
    return finalPrice;
  } catch (error) {
    console.error("Error in calculatePrice:", error);
    throw new Error(`Failed to calculate price: ${error.message}`);
  }
}

// --- EDGE FUNCTION MAIN HANDLER ---
Deno.serve(async (req) => {
  // Get origin from headers for CORS
  const origin = req.headers.get('origin') || 'http://localhost:3000';
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return createCorsResponse(origin);
  }
  
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    // Validate environment variables
    if (!serviceKey || !anonKey) {
      console.error("CRITICAL: Missing required environment variables.");
      return createResponse(
        { error: 'Server configuration error: Missing required keys.' },
        500,
        origin
      );
    }
    
    if (!supabaseUrl) {
      console.error("CRITICAL: SUPABASE_URL is not available in environment secrets.");
      return createResponse(
        { error: 'Server configuration error: Missing Supabase URL.' },
        500,
        origin
      );
    }

    // Verify the request includes a valid API key
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    if (!apiKey || apiKey !== anonKey) {
      console.error('Unauthorized: Invalid or missing API key');
      return createResponse(
        { error: 'Unauthorized: Invalid or missing API key' },
        401,
        origin
      );
    }

    // Initialize Supabase client with service role key for full access
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey
        }
      }
    });

    // Parse request body
    let body;
    try {
      body = req.body ? await req.json() : {};
    } catch (e) {
      return createResponse(
        { error: 'Invalid JSON payload' },
        400,
        origin
      );
    }

    // Route requests based on action
    switch (body.action) {
      case 'get-options':
        if (!body.productGroup) {
          return createResponse({ error: 'productGroup is required for get-options' }, 400, origin);
        }
        try {
          const options = await getOptionsForProductGroup(supabase, body.productGroup);
          return createResponse(options, 200, origin);
        } catch (error) {
          console.error('Error fetching options:', error);
          return createResponse({ error: error.message }, 500);
        }

      case 'calculate-price':
        if (!body.formData) {
          return createResponse({ error: 'formData is required for calculate-price' }, 400, origin);
        }
        try {
          const price = await calculatePrice(supabase, body.formData);
          return createResponse({ price }, 200, origin);
        } catch (error) {
          console.error('Error calculating price:', error);
          return createResponse({ error: error.message }, 500);
        }

      default:
        return createResponse(
          { error: 'Invalid action. Supported actions: get-options, calculate-price' },
          400,
          origin
        );
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return createResponse(
      { error: 'Internal server error', details: error.message },
      500,
      origin
    );
  }
});
