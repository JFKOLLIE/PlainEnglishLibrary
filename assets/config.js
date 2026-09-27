/*
  PLAIN ENGLISH LIBRARY — SITE SETTINGS
  This is the only file you need to edit to connect payments and email.

  1. stripeLinks: paste your Stripe Payment Link for each product
     (Stripe Dashboard > Payment Links > Create > copy the https://buy.stripe.com/... link).
  2. emailFormAction: paste the form "action" URL from your email tool
     (MailerLite, Kit, Brevo, etc.). Leave empty to skip email collection.
  3. emailFieldName: the name your email tool expects for the email field
     (usually "email" or "fields[email]").
*/
window.PEL_CONFIG = {
  stripeLinks: {
    aiAgent: "https://buy.stripe.com/aFa14pfrg7dhgOL5bq53O00"   // e.g. "https://buy.stripe.com/xxxxxxxx"
  },
  emailFormAction: "/api/subscribe",   // handled by _worker.js + Resend
  emailFieldName: "email",
  contactEmail: "hello@plainenglishlibrary.com"
};
