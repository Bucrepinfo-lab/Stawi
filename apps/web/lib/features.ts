import { isSaccoPlusEnabled } from '@stawi/core';

/**
 * SACCO+ (loans, credit scoring, deposit interest, withdrawals/remittances) is
 * OFF unless the server env sets SACCO_PLUS_ENABLED=true. Read at request time
 * on the server — never trust the client for this.
 */
export const saccoPlusEnabled = (): boolean => isSaccoPlusEnabled(process.env);
