import { describe, it, expect } from 'vitest';
import { toSlug, tenantScope, tenantRoleAtLeast, assertSameTenant, resolveTenantSlug } from '../src/tenancy';

describe('tenancy', () => {
  it('slugifies tenant names', () => {
    expect(toSlug('Umoja Women Group!')).toBe('umoja-women-group');
    expect(toSlug('   ')).toBe('tenant');
  });
  it('requires a tenant in scope', () => {
    expect(() => tenantScope(undefined)).toThrow(/Tenant context/);
    expect(tenantScope('t1')).toEqual({ tenantId: 't1' });
  });
  it('ranks roles', () => {
    expect(tenantRoleAtLeast('OWNER', 'ADMIN')).toBe(true);
    expect(tenantRoleAtLeast('MEMBER', 'MANAGER')).toBe(false);
  });
  it('blocks cross-tenant row access', () => {
    expect(() => assertSameTenant('t1', 't1')).not.toThrow();
    expect(() => assertSameTenant('t2', 't1')).toThrow(/Cross-tenant/);
    expect(() => assertSameTenant('t1', undefined)).toThrow(/Tenant context/);
  });
});

describe('resolveTenantSlug', () => {
  it('reads a subdomain', () => {
    expect(resolveTenantSlug({ host: 'umoja.stawi.app' })).toBe('umoja');
    expect(resolveTenantSlug({ host: 'umoja.stawi.app:443' })).toBe('umoja');
  });
  it('reads a /t/{slug} path', () => {
    expect(resolveTenantSlug({ pathname: '/t/vijana/dashboard' })).toBe('vijana');
    expect(resolveTenantSlug({ pathname: '/t/mboga' })).toBe('mboga');
  });
  it('ignores reserved subdomains and the root site', () => {
    expect(resolveTenantSlug({ host: 'www.stawi.app' })).toBeNull();
    expect(resolveTenantSlug({ host: 'app.stawi.app' })).toBeNull();
    expect(resolveTenantSlug({ host: 'stawi.app', pathname: '/' })).toBeNull();
  });
  it('path takes precedence over subdomain', () => {
    expect(resolveTenantSlug({ host: 'umoja.stawi.app', pathname: '/t/vijana' })).toBe('vijana');
  });
});
