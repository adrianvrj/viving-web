import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Contract, Provider } from 'starknet';
import { ViviAbi } from '@/app/abis/Vivi';
import { num } from 'starknet';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('Vivi endpoint called');
    
    // Get uid from query parameters
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing uid parameter' }, { status: 400 });
    }
    
    console.log('Requested uid:', uid);

    // Fetch wallet details for the user
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallet')
      .select('address, vivi')
      .eq('uid', uid)
      .single();

    console.log('Wallet result:', { walletData, error: walletError });

    if (walletError || !walletData) {
      console.error('Wallet error:', walletError);
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 });
    }

    // Initialize Starknet provider
    const provider = new Provider({
      nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/dql5pMT88iueZWl7L0yzT56uVk0EBU4L'
    });

    // Create contract instance
    const viviContract = new Contract(ViviAbi, walletData.vivi, provider);

    // Fetch vivi state from contract
    const [healthPoints, room, owner] = await Promise.all([
      viviContract.get_health_points(),
      viviContract.get_room(),
      viviContract.get_owner()
    ]);

    console.log('Vivi state:', { healthPoints, room, owner });
    
    return NextResponse.json({
      success: true,
      vivi: {
        healthPoints: Number(healthPoints),
        room: Number(room),
        owner: num.toHex(owner),
        contractAddress: walletData.vivi
      }
    });

  } catch (error) {
    console.error('Error fetching vivi state:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 