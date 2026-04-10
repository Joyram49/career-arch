import Stripe from 'stripe';

import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
  appInfo: {
    name: 'CareerArch',
    version: '1.0.0',
  },
});
