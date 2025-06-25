import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface WalletInfo {
  address: string;
  pk: string;
  vivi: string;
}

export interface ViviState {
  healthPoints: number;
  room: number;
  owner: string;
  contractAddress: string;
}

// Atom that persists wallet data in sessionStorage
export const walletAtom = atomWithStorage<WalletInfo | null>('wallet', null);

// Atom that stores vivi state
export const viviStateAtom = atom<ViviState | null>(null);