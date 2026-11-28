/**
 * Business books: words and pictures shared by the screens (owner 28/11/26).
 * Every action is a drawn picture with its words underneath, in English and
 * Kiswahili (standing rule 19).
 */
import { formatMoney, type BizChannel, type BizKind, type BizOpening } from '@stawi/core';
import type { PictureName } from '@/components/Pictures';

export type Lang = 'en' | 'sw';

export const kes = (c: number) => `${c < 0 ? '−' : ''}KES ${formatMoney(Math.abs(c))}`;
export const dmy = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(2, 4)}`;
export const toCents = (v: string) => {
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

export const KIND: Record<BizKind, { en: string; sw: string; pic: PictureName; help: string }> = {
  SALE: { en: 'I sold', sw: 'Nimeuza', pic: 'basket', help: 'Goods or a service a customer bought.' },
  STOCK_IN: { en: 'I bought stock', sw: 'Nimenunua bidhaa', pic: 'box', help: 'Goods you bought to sell again.' },
  EXPENSE: { en: 'I paid for something', sw: 'Nimelipia gharama', pic: 'receipt', help: 'Rent, wages, transport, power and other running costs.' },
  DEBT_PAID_IN: { en: 'A customer paid me', sw: 'Mteja amenilipa', pic: 'purse', help: 'Money from a customer who owed you.' },
  DEBT_PAID_OUT: { en: 'I paid a supplier', sw: 'Nimemlipa msambazaji', pic: 'handshake', help: 'Money to a supplier you owed.' },
  OWNER_OUT: { en: 'I took money out', sw: 'Nimechukua pesa', pic: 'cash', help: 'Money taken for home or personal use.' },
  OWNER_IN: { en: 'I put money in', sw: 'Nimeweka pesa', pic: 'moneybag', help: 'Your own money added to the business.' },
  MOVE: { en: 'I moved money', sw: 'Nimehamisha pesa', pic: 'bank', help: 'From the till to M-Pesa or the bank, or back.' },
  STOCK_LOSS: { en: 'Goods lost or spoilt', sw: 'Bidhaa zimeharibika', pic: 'hourglass', help: 'Damaged, expired or missing goods.' },
  OTHER_INCOME: { en: 'Other money in', sw: 'Mapato mengine', pic: 'growth', help: 'Commission, rent received, money that is not a sale.' },
  EQUIPMENT: { en: 'I bought equipment', sw: 'Nimenunua kifaa', pic: 'shop', help: 'Something the business keeps: a fridge, a scale, a motorbike.' },
  CASH_SHORT: { en: 'Cash short at count', sw: 'Upungufu wa pesa', pic: 'scales', help: '' },
  CASH_OVER: { en: 'Cash over at count', sw: 'Ziada ya pesa', pic: 'scales', help: '' },
  STOCK_COUNT: { en: 'I counted the stock', sw: 'Nimehesabu bidhaa', pic: 'clipboard', help: 'The value of goods on the shelf that you do not track one by one.' },
  OPENING: { en: 'What I have today', sw: 'Nilichonacho leo', pic: 'books', help: 'Money, stock and debts the business already has, written once at the start.' },
};

export const MAIN_KINDS: BizKind[] = ['SALE', 'STOCK_IN', 'EXPENSE', 'DEBT_PAID_IN'];
export const MORE_KINDS: BizKind[] = ['DEBT_PAID_OUT', 'OWNER_OUT', 'OWNER_IN', 'MOVE', 'STOCK_LOSS', 'OTHER_INCOME', 'EQUIPMENT', 'STOCK_COUNT', 'OPENING'];
export const OWNER_ONLY_KINDS: BizKind[] = ['OWNER_IN', 'OWNER_OUT', 'EQUIPMENT', 'STOCK_COUNT', 'OPENING'];

export const CHANNEL: Record<BizChannel, { en: string; sw: string }> = {
  CASH: { en: 'Cash', sw: 'Pesa taslimu' },
  MPESA: { en: 'M-Pesa', sw: 'M-Pesa' },
  BANK: { en: 'Bank', sw: 'Benki' },
  CREDIT: { en: 'Not paid yet', sw: 'Bado hajalipa' },
};

export const OPENING_LABEL: Record<BizOpening, { en: string; sw: string }> = {
  CASH: { en: 'Cash in the till', sw: 'Pesa taslimu kwenye droo' },
  MPESA: { en: 'M-Pesa balance', sw: 'Salio la M-Pesa' },
  BANK: { en: 'Bank balance', sw: 'Salio la benki' },
  STOCK: { en: 'Goods in stock', sw: 'Bidhaa zilizopo' },
  DEBTORS: { en: 'A customer owes me', sw: 'Mteja ananidai' },
  CREDITORS: { en: 'I owe a supplier', sw: 'Nadaiwa na msambazaji' },
  EQUIPMENT: { en: 'Equipment I own', sw: 'Vifaa nilivyo navyo' },
};

/** Kinds where the money can be "not paid yet" (someone owes, or we owe). */
export const CAN_BE_CREDIT: BizKind[] = ['SALE', 'STOCK_IN', 'EXPENSE', 'EQUIPMENT', 'OTHER_INCOME'];
export const USES_ITEM: BizKind[] = ['SALE', 'STOCK_IN', 'STOCK_LOSS', 'OPENING'];
export const ETIMS_KINDS: BizKind[] = ['EXPENSE', 'STOCK_IN', 'EQUIPMENT'];

/** Save a text file to the phone or computer (CSV for the accountant). */
export function downloadText(name: string, text: string, type = 'text/csv') {
  const blob = new Blob(['﻿' + text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
