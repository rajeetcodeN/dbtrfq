import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // IMPORTANT: This function uses the Service Role Key for elevated access
    // to your database costs, which should be kept secure.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const {
        material, weight, bore, numberOfBores, coating,
        hardening, toleranceBreite, toleranceHohe
    } = await req.json();

    if (!material || !weight) {
        throw new Error('Missing required fields for price calculation.');
    }

    const getCost = async (table: string, selectCol: string, whereCol: string, value: any) => {
        if (!value) return 0;
        const { data, error } = await supabase
            .from(table)
            .select(selectCol)
            .eq(whereCol, value)
            .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found, which is ok
        return data ? data[selectCol] : 0;
    };

    const [materialCost, boreCost, coatingCost, hardeningCost, tolWidthCost, tolHeightCost] = await Promise.all([
        getCost('Materials', 'cost_per_gram', 'material_name', material),
        getCost('Bores', 'cost_per_bore', 'bore_size', bore),
        getCost('Coatings', 'cost_per_part', 'coating_type', coating),
        getCost('HardeningLevels', 'cost_per_lot', 'hardening_level', hardening),
        getCost('Tolerances', 'cost_per_side', 'tolerance_grade', toleranceBreite),
        getCost('Tolerances', 'cost_per_side', 'tolerance_grade', toleranceHohe)
    ]);
        
    const total = (materialCost * weight) + (boreCost * numberOfBores) + coatingCost + hardeningCost + tolWidthCost + tolHeightCost;

    return new Response(JSON.stringify({ grand_total: total }), {
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
