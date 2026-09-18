export interface DepositInstructions {
    bankId: string;
    accountNo: string;
    accountName: string;
    transferSyntax?: string;
    qrUrl?: string;
    suggestedAmounts: number[];
}
export interface WalletProvider {
    /**
     * Retrieve the current balance for a user
     */
    getBalance(userId: string): Promise<number>;
    /**
     * Get bank transfer details and instructions for wallet deposit
     */
    getDepositInstructions(amount?: number, userId?: string): Promise<DepositInstructions>;
    /**
     * Check if user has sufficient balance for amount
     */
    hasSufficientBalance?(userId: string, amount: number): Promise<boolean>;
}
