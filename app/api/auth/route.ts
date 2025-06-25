import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeExternalCall } from '@/lib/utils';
import { Contract, Provider } from 'starknet';
import { ViviFactoryAbi } from '@/app/abis/ViviFactory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { email, password, mode } = await req.json();
  let result;
  let walletData = null;

  if (mode === 'signup') {
    result = await supabase.auth.signUp({ email, password });
    if (!result.error && result.data.user) {
      // 1. Deploy wallet and get keys
      const walletRes = await fetch('https://services.cavos.xyz/api/v1/external/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.CAVOS_API_KEY || '',
        },
        body: JSON.stringify({ network: 'sepolia' }),
      });
      const wallet = await walletRes.json();
      await new Promise(resolve => setTimeout(resolve, 5000));
      const viviResponse = await executeExternalCall({
        network: 'sepolia',
        calls: [{
          contractAddress: '0x02e7f46c15be6aae9a9a0ac04849f7234cb0102b35a5ccf914371ab4a9f254b6',
          entrypoint: 'create_vivi',
          calldata: [
            wallet.address
          ],
        }],
        address: wallet.address,
        hashedPk: wallet.private_key,
      });
      const viviTransaction = viviResponse.result.transactionHash;
      const provider = new Provider({nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/dql5pMT88iueZWl7L0yzT56uVk0EBU4L'});
      await provider.waitForTransaction(viviTransaction);
      const factoryContract = new Contract(ViviFactoryAbi, '0x02e7f46c15be6aae9a9a0ac04849f7234cb0102b35a5ccf914371ab4a9f254b6', provider);
      const viviAddress = await factoryContract.get_vivi(wallet.address);
      // Convert viviAddress to hex string starting with 0x
      const { num } = await import('starknet');
      const viviHex = num.toHex(viviAddress);
      console.log(viviHex);
      await supabase.from('user_wallet').insert([{
        uid: result.data.user.id,
        address: wallet.address,
        pk: wallet.private_key,
        vivi: viviHex
      }]);
      walletData = {
        address: wallet.address,
        pk: wallet.private_key,
        vivi: viviHex,
      };
    }
  } else {
    result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error && result.data.user) {
      // Fetch wallet information for the logged in user
      const { data: wallet, error: walletError } = await supabase
        .from('user_wallet')
        .select('address, pk, vivi')
        .eq('uid', result.data.user.id)
        .single();

      if (!walletError && wallet) {
        walletData = {
          address: wallet.address,
          pk: wallet.pk,
          vivi: wallet.vivi
        };
      }
    }
  }

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    user: result.data.user,
    wallet: walletData
  });
} 