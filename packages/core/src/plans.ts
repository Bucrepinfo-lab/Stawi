/**
 * Global subscription plans for the multi-tenant SaaS.
 *
 * A plan sets limits and features. The price is per group, in the country's
 * own currency, from `group-pricing.ts`. Kenya (owner 20/11/26): KES 10 a
 * member a month, at least KES 50, at most KES 299; meetings-only groups half.
 * A year ahead = 10 months, first month free, founding price locked.
 * Enterprise is invoiced.
 */

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface Plan {
  tier: PlanTier;
  name: string;
  /** PER_GROUP = priced per group by group-pricing.ts; CUSTOM = invoiced. */
  billing: 'PER_GROUP' | 'CUSTOM';
  /** Max members per group (null = unlimited). */
  memberLimit: number | null;
  /** Max sub-groups/businesses per tenant. */
  groupLimit: number | null;
  features: string[];
  trialDays: number;
}

export const PLANS: Record<PlanTier, Plan> = {
  // The tier is still called FREE in the database; it is now the small-group plan.
  FREE: {
    tier: 'FREE', name: 'Small group', billing: 'PER_GROUP', memberLimit: 10, groupLimit: 1, trialDays: 30,
    features: ['1 group', 'Up to 10 members', 'Table banking', 'Capital-ratio tracking'],
  },
  STARTER: {
    tier: 'STARTER', name: 'Group', billing: 'PER_GROUP', memberLimit: 50, groupLimit: 3, trialDays: 30,
    features: ['Up to 3 groups', '50 members', 'M-Pesa & card payments', 'Receipts', 'Business matching'],
  },
  GROWTH: {
    tier: 'GROWTH', name: 'Growth', billing: 'PER_GROUP', memberLimit: 250, groupLimit: 15, trialDays: 30,
    features: ['Up to 15 groups', '250 members', 'Accounting & tax auto-calc', 'Notifications & SMS', 'Formalization wizard'],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE', name: 'Enterprise', billing: 'CUSTOM', memberLimit: null, groupLimit: null, trialDays: 30,
    features: ['Unlimited groups & members', 'Multi-tier admin hierarchy', 'SSO & audit logs', 'Dedicated support & SLA', 'Custom compliance packs'],
  },
};

export const PLAN_ORDER: PlanTier[] = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier];
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
