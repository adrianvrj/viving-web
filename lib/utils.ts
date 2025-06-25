export interface Call {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
}

export interface ExecuteExternalCallParams {
  network: string;
  calls: Call[];
  address: string;
  hashedPk: string;
}

export async function executeExternalCall({
  network,
  calls,
  address,
  hashedPk,
}: ExecuteExternalCallParams) {
  const response = await fetch('https://services.cavos.xyz/api/v1/external/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.CAVOS_API_KEY || '',
    },
    body: JSON.stringify({
      network,
      calls,
      address,
      hashedPk,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`External call failed: ${error}`);
  }

  return response.json();
} 