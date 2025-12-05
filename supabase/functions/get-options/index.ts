import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { productGroupId } = await req.json();
    if (!productGroupId) {
      throw new Error('Product group ID is required.');
    }

    // This helper function now selects the pre-joined, readable columns directly.
    const getOptions = async (ruleTable: string, readableColumnName: string) => {
        const { data, error } = await supabase
            .from(ruleTable)
            .select(readableColumnName)
            .eq('product_group_id', productGroupId);
        if (error) throw error;
        // The result from Supabase is [{ readableColumnName: 'value' }]
        // We need to flatten this to just ['value']
        return data.map((item: any) => item[readableColumnName]);
    };

    // Note: These calls now point to the readable column names you added.
    const [standards, materials, widths, heights, depths, bores, numBores, coatings, hardening, tolerances] = await Promise.all([
        getOptions('ProductGroup_Standards', 'standard_name'),
        getOptions('ProductGroup_Available_Materials', 'material_name'),
        getOptions('ProductGroup_Available_Widths', 'width_display'),
        getOptions('ProductGroup_Available_Heights', 'height_display'),
        getOptions('ProductGroup_Available_Depths', 'dimension_display'),
        getOptions('ProductGroup_Available_Bores', 'bore_display'),
        getOptions('ProductGroup_Available_Num_Bores', 'num_bores_display'),
        getOptions('ProductGroup_Available_Coatings', 'coating_name'),
        getOptions('ProductGroup_Available_Hardening', 'hardening_display'),
        getOptions('ProductGroup_Available_Tolerances', 'tolerance_display'),
    ]);

    const responseData = { standards, materials, widths, heights, depths, bores, numBores, coatings, hardening, tolerances };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
