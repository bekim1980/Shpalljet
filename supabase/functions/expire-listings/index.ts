import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find all active listings that have expired
    const { data: expiredListings, error: fetchError } = await supabase
      .from('products')
      .select('id, title, seller_id, listing_type, auto_renew')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (fetchError) throw fetchError;

    if (!expiredListings || expiredListings.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired listings found', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Separate auto-renew from expired
    const autoRenewListings = expiredListings.filter((l: any) => l.auto_renew);
    const expireListings = expiredListings.filter((l: any) => !l.auto_renew);

    // Auto-renew: extend expiry by same duration
    for (const listing of autoRenewListings) {
      const days = listing.listing_type === 'paid' ? 30 : 7;
      const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('products')
        .update({ expires_at: newExpiry })
        .eq('id', listing.id);

      // Notify seller about auto-renewal
      await supabase.from('notifications').insert({
        user_id: listing.seller_id,
        title: 'Listing Auto-Renewed',
        message: `Your listing "${listing.title}" was automatically renewed for ${days} days.`,
        type: 'listing_renewed',
        link: '/profile',
      });
    }

    // Expire the rest
    if (expireListings.length > 0) {
      const expiredIds = expireListings.map((l: any) => l.id);
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'expired' })
        .in('id', expiredIds);

      if (updateError) throw updateError;

      // Notify sellers
      const notifications = expireListings.map((listing: any) => ({
        user_id: listing.seller_id,
        title: 'Listing Expired',
        message: `Your listing "${listing.title}" has expired. You can renew it from your profile.`,
        type: 'listing_expired',
        link: '/profile',
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Also un-boost expired boosts
    await supabase
      .from('products')
      .update({ is_boosted: false, boost_expires_at: null })
      .eq('is_boosted', true)
      .not('boost_expires_at', 'is', null)
      .lt('boost_expires_at', now);

    return new Response(JSON.stringify({
      message: 'Listings processed',
      expired: expireListings.length,
      autoRenewed: autoRenewListings.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing listings:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
