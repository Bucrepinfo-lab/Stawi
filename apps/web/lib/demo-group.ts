import { isDemoGroupId } from '@stawi/core';

/**
 * The one shared demo chama (owner 26/11/26), set on the server as
 * STAWI_DEMO_GROUP_ID. Unset = no "Join the demo chama" anywhere.
 */
export function demoGroupId(): string | null {
  const id = (process.env.STAWI_DEMO_GROUP_ID ?? '').trim();
  return isDemoGroupId(id) ? id : null;
}
