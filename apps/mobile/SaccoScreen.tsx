/**
 * SACCO+ mobile screen (Pillar 4) — save, borrow, graduate on the phone.
 * Pure client logic from @stawi/core; wire to server actions/API when the
 * mobile app gains auth + networking.
 */

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  LOAN_PRODUCTS,
  STAGE_LABELS,
  STAGE_ORDER,
  amortizeReducingBalance,
  annualDividendCents,
  formatMoney,
  monthlyDepositInterestCents,
  scoreEligibility,
  type LoanProductId,
} from '@stawi/core';
import { colors, radius, spacing } from './theme/tokens';

const DEPOSITS = 4_200_000; // Amina's savings — KES 42,000

export function SaccoScreen() {
  const [product, setProduct] = useState<LoanProductId>('DEVELOPMENT');
  const [amount, setAmount] = useState(9_000_000); // KES 90,000

  const p = LOAN_PRODUCTS[product];
  const result = useMemo(
    () =>
      scoreEligibility(p, amount, {
        monthsActive: 12,
        depositsCents: DEPOSITS,
        savingStreakMonths: 11,
        onTimeRepaymentRate: 1,
        existingLoanBalanceCents: 0,
        guarantorCoverageCents: Math.max(0, amount - DEPOSITS),
        hasDefaultHistory: false,
      }),
    [p, amount],
  );
  const schedule = useMemo(
    () => amortizeReducingBalance(amount, result.monthlyRatePct, Math.min(12, p.maxTermMonths)),
    [amount, result.monthlyRatePct, p.maxTermMonths],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <View style={s.card}>
        <Text style={s.label}>SACCO+ deposits</Text>
        <Text style={s.big}>KES {formatMoney(DEPOSITS)}</Text>
        <Text style={s.line}>
          Earning KES {formatMoney(monthlyDepositInterestCents(DEPOSITS))}/month (10% p.a.) ·
          dividends {formatMoney(annualDividendCents(1_000_000))}/yr on shares
        </Text>
      </View>

      <Text style={s.section}>Borrow — pick a product</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(Object.keys(LOAN_PRODUCTS) as LoanProductId[]).map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => setProduct(id)}
            style={[s.chip, product === id && s.chipOn]}
          >
            <Text style={[s.chipTxt, product === id && s.chipTxtOn]}>
              {LOAN_PRODUCTS[id].name.split(' ')[0]}
            </Text>
            <Text style={[s.chipRate, product === id && s.chipTxtOn]}>
              {LOAN_PRODUCTS[id].baseMonthlyRatePct}%/mo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.section}>Loan amount · tap to adjust</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[3_000_000, 6_000_000, 9_000_000, 12_000_000].map((a) => (
          <TouchableOpacity key={a} onPress={() => setAmount(a)} style={[s.chip, amount === a && s.chipOn]}>
            <Text style={[s.chipTxt, amount === a && s.chipTxtOn]}>{formatMoney(a)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.card, { marginTop: spacing.lg }]}>
        <Text style={s.label}>System decision</Text>
        <Text style={[s.verdict, { color: result.qualified ? colors.good : colors.danger }]}>
          {result.qualified ? `Qualified — Tier ${result.tier}` : 'Not yet qualified'}
        </Text>
        <Text style={s.line}>
          Score {result.score}/100 · rate {result.monthlyRatePct}%/mo reducing · limit KES{' '}
          {formatMoney(result.maxLoanCents)}
        </Text>
        {result.qualified && schedule.rows.length > 0 && (
          <Text style={s.line}>
            ≈ KES {formatMoney(schedule.monthlyPaymentCents)}/month over {schedule.rows.length} months
            · total interest KES {formatMoney(schedule.totalInterestCents)}
          </Text>
        )}
      </View>

      <Text style={s.section}>Graduation ladder</Text>
      <View style={s.ladder}>
        {STAGE_ORDER.map((st, i) => (
          <View key={st} style={[s.rung, i === 2 && s.rungOn]}>
            <Text style={[s.rungTxt, i === 2 && s.rungTxtOn]} numberOfLines={1}>
              {STAGE_LABELS[st].split(' (')[0]}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[s.line, { marginTop: spacing.sm }]}>
        Umoja is a registered SACCO — next rung: deposit-taking licence. The Graduation
        Engine tracks liquidity (≥15%), capital adequacy and NPLs live.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  label: { color: colors.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  big: { color: colors.forestDeep, fontSize: 28, fontWeight: '700', marginTop: 4 },
  line: { color: colors.ink2, fontSize: 12.5, marginTop: 6 },
  section: { color: colors.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, backgroundColor: colors.paper, alignItems: 'center' },
  chipOn: { backgroundColor: colors.forestDeep, borderColor: colors.forestDeep },
  chipTxt: { fontSize: 12, fontWeight: '700', color: colors.ink },
  chipTxtOn: { color: colors.bone },
  chipRate: { fontSize: 11, color: colors.dim, marginTop: 2 },
  verdict: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  ladder: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rung: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.paper },
  rungOn: { backgroundColor: colors.forestDeep, borderColor: colors.forestDeep },
  rungTxt: { fontSize: 10.5, fontWeight: '700', color: colors.ink2 },
  rungTxtOn: { color: colors.bone },
});
