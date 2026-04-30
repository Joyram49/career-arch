import Stripe from 'stripe';

import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  appInfo: {
    name: 'CareerArch',
    version: '1.0.0',
  },
});
