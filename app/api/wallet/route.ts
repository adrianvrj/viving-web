import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch wallet details for the user
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallet')
      .select('address, pk, created_at')
      .eq('uid', user.id)
      .single();

    if (walletError) {
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 });
    }

    // Return wallet details (excluding private key for security)
    return NextResponse.json({
      success: true,
      wallet: {
        address: walletData.address,
        created_at: walletData.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching wallet details:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 