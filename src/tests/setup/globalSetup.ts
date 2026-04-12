/* eslint-disable @typescript-eslint/require-await */
export default async function globalSetup(): Promise<void> {
  process.env['NODE_ENV'] = 'test';
  process.env['DATABASE_URL'] =
    process.env['TEST_DATABASE_URL'] ??
    'postgresql://postgres:joyram%40J9@localhost:5432/careerarch_db';
  process.env['REDIS_URL'] = process.env['TEST_REDIS_URL'] ?? 'redis://localhost:6379/1';
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-minimum-32-chars!!';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-minimum-32-chars!';
  process.env['JWT_ACCESS_EXPIRY'] = '15m';
  process.env['JWT_REFRESH_EXPIRY'] = '7d';
  process.env['JWT_REFRESH_EXPIRY_REMEMBER_ME'] = '30d';
  process.env['BCRYPT_ROUNDS'] = '4'; // Low rounds for faster tests
  process.env['BREVO_SMTP_KEY'] = 'BV.test-key';
  process.env['BREVO_SMTP_USER'] = 'BV.test-user';
  process.env['MAIL_FROM_ADDRESS'] = 'test@careerarch.com';
  process.env['FRONTEND_URL'] = 'http://localhost:3000';
  process.env['API_URL'] = 'http://localhost:5000/api/v1';
  process.env['STRIPE_SECRET_KEY'] = 'sk_test_test';
  process.env['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_test';
  process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test';
  process.env['STRIPE_BASIC_PRICE_ID'] = 'price_test_basic';
  process.env['STRIPE_PREMIUM_PRICE_ID'] = 'price_test_premium';
  process.env['AWS_ACCESS_KEY_ID'] = 'test';
  process.env['AWS_SECRET_ACCESS_KEY'] = 'test';
  process.env['AWS_S3_BUCKET'] = 'test-bucket';
  process.env['GOOGLE_CLIENT_ID'] = 'test';
  process.env['GOOGLE_CLIENT_SECRET'] = 'test';
  process.env['GOOGLE_CALLBACK_URL'] = 'http://localhost:5000/api/v1/auth/google/callback';
  process.env['LINKEDIN_CLIENT_ID'] = 'test';
  process.env['LINKEDIN_CLIENT_SECRET'] = 'test';
  process.env['ALLOWED_ORIGINS'] = 'http://localhost:3000';
}
