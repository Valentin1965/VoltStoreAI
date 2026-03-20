/**
 * Email marketing funnel — re-exports from emailService.
 * Steps: welcome → nurture_1 → nurture_2 (templates in Edge Function send-funnel-email).
 *
 * Enable sending from the browser: VITE_EMAIL_FUNNEL_ENABLED=true
 * External automations: POST to send-funnel-email with JSON { step, customerEmail, customerName, lang? }.
 */
export type { FunnelStep, FunnelEmailData } from './emailService';
export { sendFunnelEmail, sendFunnelEmailAdmin, isEmailFunnelEnabled } from './emailService';
