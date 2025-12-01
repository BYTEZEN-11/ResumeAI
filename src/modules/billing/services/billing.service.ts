import { stripe, STRIPE_PLANS } from "@/lib/stripe";
import { db } from "@/lib/db";
import { APP_URL } from "@/constants";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAST_DUE";
    default:
      return "INCOMPLETE";
  }
}
export class BillingService {
  async getOrCreateCustomer(userId: string): Promise<string> {
    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!subscription) throw new Error("Subscription record not found");
    if (subscription.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: subscription.user.email,
      name: subscription.user.name ?? undefined,
      metadata: { userId },
    });
    await db.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }
  async createCheckoutSession(
    userId: string,
    plan: "PRO" | "TEAM"
  ): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId);
    const planConfig = STRIPE_PLANS[plan];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/billing?canceled=true`,
      metadata: { userId, plan },
      subscription_data: {
        metadata: { userId, plan },
      },
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error("Failed to create checkout session");
    return session.url;
  }
  async createPortalSession(userId: string): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/billing`,
    });
    return session.url;
  }
  async handleWebhook(payload: string, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new Error("Invalid webhook signature");
    }

    const existing = await db.stripeEvent.findUnique({ where: { id: event.id } });
    if (existing?.status === "processed") {
      logger.info(
        { eventId: event.id, type: event.type },
        "Stripe event already processed, skipping"
      );
      return;
    }

    await db.stripeEvent.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        type: event.type,
        status: "pending",
      },
    });
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "checkout.session.async_payment_succeeded":
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "checkout.session.async_payment_failed":

          await this.handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.paused":
        case "customer.subscription.resumed":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.trial_will_end":
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;
        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case "charge.refunded":
          await this.handleRefund(event.data.object as Stripe.Charge);
          break;
        case "customer.updated":
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;
        default:

          logger.info({ type: event.type }, "Unhandled Stripe event type");
      }
      await db.stripeEvent.update({
        where: { id: event.id },
        data: { status: "processed", processedAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.stripeEvent.update({
        where: { id: event.id },
        data: { status: "failed", error: message },
      });

      throw err;
    }
  }
  private async handleAsyncPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!customerId) return;
    const localSubscription = await db.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    if (!localSubscription) return;
    const userId = localSubscription.userId;
    await db.notification.create({
      data: {
        userId,
        type: "SUBSCRIPTION_UPDATED",
        title: "Payment failed",
        message: "Your payment could not be processed. Please update your payment method to activate your subscription.",
      },
    });
  }
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;
    await db.notification.create({
      data: {
        userId,
        type: "SUBSCRIPTION_UPDATED",
        title: "Trial ending soon",
        message: trialEnd
          ? `Your free trial ends on ${trialEnd.toLocaleDateString()}. Add a payment method to continue.`
          : "Your free trial is ending soon. Add a payment method to continue.",
      },
    });
  }
  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    if (!charge.payment_intent) return;
    const payment = await db.payment.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent as string },
    });
    if (!payment) return;

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        metadata: {
          ...(payment.metadata as Record<string, unknown> | null) ?? {},
          refundedAmount: charge.amount_refunded,
        },
      },
    });
    await db.notification.create({
      data: {
        userId: payment.userId,
        type: "SUBSCRIPTION_UPDATED",
        title: "Refund processed",
        message: `A refund of $${(charge.amount_refunded / 100).toFixed(2)} has been issued.`,
      },
    });
  }
  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {

    const subscription = await db.subscription.findUnique({
      where: { stripeCustomerId: customer.id },
      select: { userId: true },
    });
    if (!subscription) return;
    if (!customer.name) return;
    await db.user.update({
      where: { id: subscription.userId },
      data: { name: customer.name },
    });
  }
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!customerId) {
      logger.warn(
        { sessionId: session.id },
        "Checkout session has no customer id; skipping"
      );
      return;
    }
    const subscription = await db.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    if (!subscription) {
      logger.warn(
        { sessionId: session.id, customerId },
        "No local subscription for Stripe customer; skipping"
      );
      return;
    }
    const userId = subscription.userId;
    const plan = session.metadata?.plan as "PRO" | "TEAM" | undefined;
    if (!plan || !(plan in STRIPE_PLANS)) {
      logger.warn(
        { sessionId: session.id, plan },
        "Checkout session has no/Unknown plan; skipping"
      );
      return;
    }
    const planConfig = STRIPE_PLANS[plan];
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const priceId =
        subscription.items?.data[0]?.price?.id ??
        planConfig.priceId;
      await db.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan: plan,
          status: mapStripeStatus(subscription.status),
          analysesLimit: planConfig.analysesLimit,
          analysesUsed: 0,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      await db.user.update({
        where: { id: userId },
        data: { role: plan === "PRO" ? "PRO" : "TEAM_ADMIN" },
      });

      await db.notification.create({
        data: {
          userId,
          type: "SUBSCRIPTION_UPDATED",
          title: "Subscription Activated",
          message: `Welcome to ${planConfig.name}! Enjoy unlimited analyses.`,
        },
      });
    }
  }
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const localSubscription = await db.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    if (!localSubscription) {
      logger.warn(
        { subscriptionId: subscription.id, customerId },
        "No local subscription for Stripe customer in subscription.updated"
      );
      return;
    }
    const userId = localSubscription.userId;
    const newStatus = mapStripeStatus(subscription.status);

    if (newStatus === "CANCELED" || newStatus === "UNPAID" || newStatus === "INCOMPLETE") {
      await db.subscription.update({
        where: { userId },
        data: {
          plan: "FREE",
          status: newStatus,
          analysesLimit: 3,
          analysesUsed: 0,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      await db.user.update({ where: { id: userId }, data: { role: "USER" } });
      return;
    }
    await db.subscription.update({
      where: { userId },
      data: {
        status: newStatus,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const localSubscription = await db.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    if (!localSubscription) {
      logger.warn(
        { subscriptionId: subscription.id, customerId },
        "No local subscription for Stripe customer in subscription.deleted"
      );
      return;
    }
    const userId = localSubscription.userId;
    await db.subscription.update({
      where: { userId },
      data: {
        plan: "FREE",
        status: "CANCELED",
        analysesLimit: 3,
        analysesUsed: 0,
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
    });
    await db.user.update({
      where: { id: userId },
      data: { role: "USER" },
    });

    await db.notification.create({
      data: {
        userId,
        type: "SUBSCRIPTION_UPDATED",
        title: "Subscription canceled",
        message:
          "Your subscription has been canceled. You're back on the FREE plan. Re-subscribe any time from the billing page.",
      },
    });
  }
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const subscription = await db.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!subscription) return;

    const isPeriodBoundary =
      invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_create";
    if (isPeriodBoundary) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { analysesUsed: 0, status: "ACTIVE" },
      });
    } else {

      if (subscription.status === "PAST_DUE") {
        await db.subscription.update({
          where: { id: subscription.id },
          data: { status: "ACTIVE" },
        });
      }
    }

    if (invoice.payment_intent) {
      await db.payment.upsert({
        where: { stripePaymentIntentId: invoice.payment_intent as string },
        update: {},
        create: {
          userId: subscription.userId,
          stripePaymentIntentId: invoice.payment_intent as string,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "succeeded",
          description: invoice.description ?? "Subscription payment",
        },
      });
    }
  }
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const subscription = await db.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!subscription) return;
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE" },
    });

    await db.notification.create({
      data: {
        userId: subscription.userId,
        type: "SUBSCRIPTION_UPDATED",
        title: "Payment failed",
        message:
          "We couldn't process your latest payment. Update your payment method to keep your subscription active.",
      },
    });
  }
  async getSubscription(userId: string) {
    return db.subscription.findUnique({ where: { userId } });
  }
  async getPaymentHistory(userId: string) {
    return db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}
export const billingService = new BillingService();
