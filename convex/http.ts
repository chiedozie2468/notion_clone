import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error("CLERK_WEBHOOK_SIGNING_SECRET is not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const payload = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing Svix headers", { status: 400 });
    }

    let event: { type: string; data: Record<string, unknown> };
    try {
      const wh = new Webhook(signingSecret);
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as { type: string; data: Record<string, unknown> };
    } catch (error) {
      console.error("Clerk webhook verification failed", error);
      return new Response("Verification failed", { status: 400 });
    }

    const data = event.data;

    const syncOrgBilling = async (
      clerkOrgId: string,
      billingPlanSlug: string,
      billingStatus: string,
      billingSubscriptionId?: string,
    ) => {
      await ctx.runMutation(internal.clerkSync.updateOrganizationBilling, {
        clerkOrgId,
        billingPlanSlug,
        billingStatus,
        billingSubscriptionId,
      });
    };

    const orgIdFromPayer = (): string | undefined => {
      const payer = data.payer as
        | { organization_id?: string; user_id?: string }
        | undefined;
      return payer?.organization_id;
    };

    const planSlugFromPayload = (): string => {
      const items = data.items as
        | Array<{ plan?: { slug?: string } }>
        | undefined;
      const fromItems = items?.[0]?.plan?.slug;
      if (fromItems) {
        return fromItems;
      }
      const plan = data.plan as { slug?: string } | undefined;
      return plan?.slug ?? "free_org";
    };

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const clerkUserId = data.id as string;
        const emailAddresses = data.email_addresses as
          | Array<{ email_address: string }>
          | undefined;
        const email = emailAddresses?.[0]?.email_address ?? "";
        const firstName = data.first_name as string | null | undefined;
        const lastName = data.last_name as string | null | undefined;
        const name = [firstName, lastName].filter(Boolean).join(" ").trim();
        const imageUrl = data.image_url as string | undefined;

        await ctx.runMutation(internal.clerkSync.upsertUser, {
          clerkUserId,
          email,
          name: name || undefined,
          imageUrl,
        });
        break;
      }
      case "user.deleted": {
        const clerkUserId = data.id as string;
        await ctx.runMutation(internal.clerkSync.softDeleteUser, {
          clerkUserId,
        });
        break;
      }
      case "organization.created":
      case "organization.updated": {
        const clerkOrgId = data.id as string;
        const name = (data.name as string) ?? "Organization";
        const slug = data.slug as string | undefined;
        const imageUrl = data.image_url as string | undefined;

        await ctx.runMutation(internal.clerkSync.upsertOrganization, {
          clerkOrgId,
          name,
          slug,
          imageUrl,
        });
        break;
      }
      case "organization.deleted": {
        const clerkOrgId = data.id as string;
        await ctx.runMutation(internal.clerkSync.softDeleteOrganization, {
          clerkOrgId,
        });
        break;
      }
      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const organization = data.organization as { id: string };
        const publicUserData = data.public_user_data as { user_id: string };
        const role = (data.role as string) ?? "org:member";

        await ctx.runMutation(internal.clerkSync.upsertMembership, {
          clerkOrgId: organization.id,
          clerkUserId: publicUserData.user_id,
          role,
        });
        break;
      }
      case "organizationMembership.deleted": {
        const organization = data.organization as { id: string };
        const publicUserData = data.public_user_data as { user_id: string };

        await ctx.runMutation(internal.clerkSync.softDeleteMembership, {
          clerkOrgId: organization.id,
          clerkUserId: publicUserData.user_id,
        });
        break;
      }
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active": {
        const clerkOrgId = orgIdFromPayer();
        if (!clerkOrgId) {
          break;
        }
        await syncOrgBilling(
          clerkOrgId,
          planSlugFromPayload(),
          (data.status as string) ?? "active",
          data.id as string,
        );
        break;
      }
      case "subscription.pastDue": {
        const clerkOrgId = orgIdFromPayer();
        if (!clerkOrgId) {
          break;
        }
        await syncOrgBilling(
          clerkOrgId,
          planSlugFromPayload(),
          "past_due",
          data.id as string,
        );
        break;
      }
      case "subscriptionItem.canceled":
      case "subscriptionItem.ended":
      case "subscriptionItem.expired": {
        const clerkOrgId = orgIdFromPayer();
        if (!clerkOrgId) {
          break;
        }
        await syncOrgBilling(clerkOrgId, "free_org", "canceled");
        break;
      }
      case "subscriptionItem.active": {
        const clerkOrgId = orgIdFromPayer();
        if (!clerkOrgId) {
          break;
        }
        await syncOrgBilling(
          clerkOrgId,
          planSlugFromPayload(),
          "active",
        );
        break;
      }
      default:
        break;
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
