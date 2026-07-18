/**
 * Global subscription plans for the multi-tenant SaaS.
 *
 * Prices are denominated in USD minor units (cents) as the base and converted /
 * localized per country at display time. The legacy "10 units, first month free"
 * maps to the Starter tier. Every paid plan's first month is free (trial).
 */

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface Plan {
  tier: PlanTier;
  name: string;
  /** Base monthly price in USD cents. 0 = free. ENTERPRISE = custom (null). */
  monthlyUsdCents: number | null;
  /** Max members per tenant (null = unlimited). */
  memberLimit: number | null;
  /** Max sub-groups/businesses per tenant. */
  groupLimit: number | null;
  features: string[];
  trialDays: number;
}

export const PLANS: Record<PlanTier, Plan> = {
  FREE: {
    tier: 'FREE', name: 'Free', monthlyUsdCents: 0, memberLimit: 10, groupLimit: 1, trialDays: 0,
    features: ['1 group', 'Up to 10 members', 'Table banking', 'Capital-ratio tracking'],
  },
  STARTER: {
    tier: 'STARTER', name: 'Starter', monthlyUsdCents: 1000, memberLimit: 50, groupLimit: 3, trialDays: 30,
    features: ['Up to 3 groups', '50 members', 'M-Pesa & card payments', 'Receipts', 'Business matching'],
  },
  GROWTH: {
    tier: 'GROWTH', name: 'Growth', monthlyUsdCents: 4900, memberLimit: 250, groupLimit: 15, trialDays: 30,
    features: ['Up to 15 groups', '250 members', 'Accounting & tax auto-calc', 'Notifications & SMS', 'Formalization wizard'],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE', name: 'Enterprise', monthlyUsdCents: null, memberLimit: null, groupLimit: null, trialDays: 30,
    features: ['Unlimited groups & members', 'Multi-tier admin hierarchy', 'SSO & audit logs', 'Dedicated support & SLA', 'Custom compliance packs'],
  },
};

export const PLAN_ORDER: PlanTier[] = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier];
}

/** Amount due this month: 0 during the trial (first month), else the plan price. */
export function amountDueUsdCents(tier: PlanTier, monthsActive: number): number {
  const plan = PLANS[tier];
  if (plan.monthlyUsdCents == null) return 0; // enterprise = custom/invoiced
  if (plan.trialDays > 0 && monthsActive <= 1) return 0; // first month free
  return plan.monthlyUsdCents;
}

/** Whether a tenant with `count` members/groups is within its plan limit. */
export function withinMemberLimit(tier: PlanTier, count: number): boolean {
  const lim = PLANS[tier].memberLimit;
  return lim == null || count <= lim;
}
export function withinGroupLimit(tier: PlanTier, count: number): boolean {
  const lim = PLANS[tier].groupLimit;
  return lim == null || count <= lim;
}
