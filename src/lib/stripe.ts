import Stripe from "stripe";
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});
export const STRIPE_PLANS = {
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: "Pro",
    price: 1900,
    analysesLimit: 999999,
  },
  TEAM: {
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    name: "Team",
    price: 4900,
    analysesLimit: 999999,
    seats: 5,
  },
} as const;
