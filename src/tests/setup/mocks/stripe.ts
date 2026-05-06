/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/require-await */
const stripeCustomer = {
  id: 'cus_test123',
};

const stripeProduct = {
  id: 'prod_test123',
};

const stripePrice = {
  id: 'price_test123',
};

const stripeCheckoutSession = {
  id: 'cs_test123',
  url: 'https://checkout.stripe.com/c/pay/cs_test123',
};

const stripePaymentIntent = {
  id: 'pi_test123',
  status: 'succeeded',
  latest_charge: 'ch_test123',
};

const stripeSubscription = {
  id: 'sub_test123',
  customer: stripeCustomer.id,
  cancel_at_period_end: false,
  items: {
    data: [
      {
        id: 'si_test123',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    ],
  },
};

export const stripe = {
  products: {
    create: async () => stripeProduct,
    update: async () => stripeProduct,
  },
  prices: {
    create: async () => stripePrice,
    update: async () => stripePrice,
  },
  customers: {
    create: async () => stripeCustomer,
    update: async () => stripeCustomer,
  },
  checkout: {
    sessions: {
      create: async () => stripeCheckoutSession,
    },
  },
  subscriptions: {
    retrieve: async () => stripeSubscription,
    update: async () => stripeSubscription,
    cancel: async () => stripeSubscription,
  },
  invoices: {
    list: async () => ({ data: [] }),
  },
  refunds: {
    create: async () => ({ id: 're_test123', status: 'succeeded' }),
  },
  paymentIntents: {
    create: async () => stripePaymentIntent,
  },
  paymentMethods: {
    create: async () => ({ id: 'pm_test123', customer: stripeCustomer.id }),
    attach: async () => ({ id: 'pm_test123', customer: stripeCustomer.id }),
    detach: async () => ({ id: 'pm_test123', customer: null }),
    retrieve: async () => ({
      id: 'pm_test123',
      customer: stripeCustomer.id,
      card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
    }),
  },
  setupIntents: {
    create: async () => ({ id: 'seti_test123', client_secret: 'seti_test123_secret_test' }),
  },
  webhooks: {
    constructEvent: () => ({ id: 'evt_test123', type: 'checkout.session.completed' }),
  },
};
