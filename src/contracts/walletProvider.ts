// src/contracts/walletProvider.ts
// Pure domain contract for Wallet operations

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletProvider {
  getBalance(userId: string): Promise<number>;
  hasSufficientBalance(userId: string, requiredAmount: number): Promise<boolean>;
}
