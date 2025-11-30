import * as fs from 'fs';
import * as path from 'path';

export interface WalletData {
  账户: string;
  Bitcoin: string;
  SUI: string;
  Aptos: string;
  NEAR: string;
  Solana: string;
}

export function readWalletData(csvPath: string): WalletData[] {
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    const walletData: WalletData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const wallet: WalletData = {
        账户: values[0],
        Bitcoin: values[1],
        SUI: values[2],
        Aptos: values[3],
        NEAR: values[4],
        Solana: values[5]
      };
      walletData.push(wallet);
    }
    
    return walletData;
  } catch (error) {
    console.error('Error reading CSV file:', error);
    throw error;
  }
}

export function getWalletByAccount(accountName: string, csvPath: string): WalletData | null {
  const wallets = readWalletData(csvPath);
  return wallets.find(wallet => wallet.账户 === accountName) || null;
}