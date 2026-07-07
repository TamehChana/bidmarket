import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import type { User } from "@bidmarket/shared";
import {
  auctions,
  becomeSeller,
  createAuthResponse,
  createListing,
  findUserById,
  getAuctionBids,
  getSellerAuctions,
  getSellerStats,
  getUserBidAuctions,
  loginUser,
  placeBid,
  registerUser,
  users,
  passwords,
  bids,
} from "./store.js";
import { resolveUserFromToken, createSessionToken } from "./auth-tokens.js";
import { refreshAuthStore } from "./persistence.js";
import { refreshMarketplaceStore } from "./marketplace-persistence.js";
import { refreshPaymentStore } from "./payment-persistence.js";
import {
  endAuctionEarly,
  getAdminAuctions,
  getAdminPayments,
  getAdminStats,
  getAdminUsers,
  removeAuction,
  updateUserSellerRole,
} from "./admin.js";
import {
  createPaymentOrder,
  findOrderByAuction,
  findOrderById,
  findOrderByTransId,
  getBuyerOrders,
  getPaymentStatusForAuction,
  getSellerRevenue,
  paymentOrders,
  syncOrderWithFapshi,
  syncPaymentOrderInternal,
  syncPendingPaymentsForSeller,
  updateOrderStatus,
} from "./payments.js";
import {
  verifyWebhookSecret,
  isFapshiConfigured,
  getFapshiConfigStatus,
  parseFapshiWebhookPayload,
  normalizeFapshiStatus,
} from "./fapshi.js";
import { ensureUploadDir, saveListingImage, uploadDir, usesBlobStorage } from "./uploads.js";
import { isOpenAiConfigured } from "./openai.js";
import { generateListingDraft } from "./ai/listing.js";
import { searchAuctions } from "./ai/search.js";
import { answerBidCoach } from "./ai/bid-coach.js";
import { moderateAuctions } from "./ai/moderation.js";

function getFrontendOrigin() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function getUserFromAuthHeader(authorization?: string): User | undefined {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.replace("Bearer ", "");
  return resolveUserFromToken(token, findUserById);
}

function requireAdmin(
  authorization: string | undefined,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const user = getUserFromAuthHeader(authorization);
  if (!user) {
    reply.status(401).send({ message: "Sign in required" });
    return null;
  }
  if (!user.isAdmin) {
    reply.status(403).send({ message: "Admin access required" });
    return null;
  }
  return user;
}

function requireSeller(
  authorization: string | undefined,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
) {
  const user = getUserFromAuthHeader(authorization);
  if (!user) {
    reply.status(401).send({ message: "Sign in required" });
    return null;
  }
  if (!user.isSeller) {
    reply.status(403).send({ message: "Seller account required" });
    return null;
  }
  return user;
}

function requireOpenAi(reply: {
  status: (code: number) => { send: (body: unknown) => unknown };
}) {
  if (!isOpenAiConfigured()) {
    reply.status(503).send({
      message: "AI features are not configured. Set OPENAI_API_KEY.",
    });
    return false;
  }
  return true;
}

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "production",
  });

  try {
    await Promise.all([
      refreshAuthStore(users, passwords),
      refreshMarketplaceStore(auctions, bids),
      refreshPaymentStore(paymentOrders),
    ]);
  } catch (error) {
    console.error("Store hydration failed during startup:", error);
  }

  await app.register(cors, {
    origin: [
      getFrontendOrigin(),
      "http://localhost:3000",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    ].filter(Boolean),
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  if (!usesBlobStorage()) {
    await ensureUploadDir();
    await app.register(fastifyStatic, {
      root: uploadDir,
      prefix: "/uploads/",
      decorateReply: false,
    });
  }

  app.get("/health", async () => {
    const payments = getFapshiConfigStatus();
    return {
      status: "ok",
      payments: {
        mode: payments.mode,
        fapshiConfigured: payments.configured,
        missing: payments.missing,
      },
    };
  });

  app.get("/auctions", async () => {
    await refreshMarketplaceStore(auctions, bids);
    return auctions;
  });

  app.get<{ Params: { id: string } }>("/auctions/:id", async (request, reply) => {
    await refreshMarketplaceStore(auctions, bids);
    const auction = auctions.find((item) => item.id === request.params.id);
    if (!auction) {
      return reply.status(404).send({ message: "Auction not found" });
    }
    return auction;
  });

  app.get<{ Params: { id: string } }>(
    "/auctions/:id/bids",
    async (request, reply) => {
      await refreshMarketplaceStore(auctions, bids);
      const auction = auctions.find((item) => item.id === request.params.id);
      if (!auction) {
        return reply.status(404).send({ message: "Auction not found" });
      }
      return getAuctionBids(request.params.id);
    },
  );

  app.post<{ Body: { email: string; password: string; name?: string } }>(
    "/auth/register",
    async (request, reply) => {
      try {
        const { email, password, name } = request.body;
        if (!email || !password || !name) {
          return reply.status(400).send({ message: "Missing required fields" });
        }
        const user = await registerUser({ email, password, name });
        return createAuthResponse(user);
      } catch (error) {
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Registration failed",
        });
      }
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    "/auth/login",
    async (request, reply) => {
      try {
        return await loginUser(request.body);
      } catch {
        return reply.status(401).send({ message: "Invalid email or password" });
      }
    },
  );

  app.get("/auth/me", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    return { user };
  });

  app.get("/me/bids", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }

    await refreshMarketplaceStore(auctions, bids);
    return getUserBidAuctions(user.id);
  });

  app.post<{ Params: { id: string }; Body: { amount: number } }>(
    "/auctions/:id/bids",
    async (request, reply) => {
      const user = getUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.status(401).send({ message: "Sign in to place a bid" });
      }

      try {
        const result = await placeBid(request.params.id, user, request.body);
        return result;
      } catch (error) {
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Bid failed",
        });
      }
    },
  );

  app.post("/seller/become", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }

    const updated = await becomeSeller(user);
    return { user: updated, token: createSessionToken(updated) };
  });

  app.get("/seller/auctions", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }
    if (!user.isSeller) {
      return reply.status(403).send({ message: "Seller account required" });
    }

    await refreshMarketplaceStore(auctions, bids);
    await refreshPaymentStore(paymentOrders);
    await syncPendingPaymentsForSeller(user.id);
    const sellerAuctions = getSellerAuctions(user.id);
    return sellerAuctions.map((auction) => ({
      ...auction,
      paymentStatus: getPaymentStatusForAuction(auction.id),
    }));
  });

  app.get("/seller/stats", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }
    if (!user.isSeller) {
      return reply.status(403).send({ message: "Seller account required" });
    }

    await refreshMarketplaceStore(auctions, bids);
    await refreshPaymentStore(paymentOrders);
    await syncPendingPaymentsForSeller(user.id);
    const stats = getSellerStats(user.id);
    return {
      ...stats,
      totalRevenue: getSellerRevenue(user.id),
    };
  });

  app.post("/seller/uploads", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }
    if (!user.isSeller) {
      return reply.status(403).send({ message: "Seller account required" });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ message: "Image file is required" });
    }

    try {
      const saved = await saveListingImage(file);
      return { url: saved.publicPath };
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  });

  app.post<{
    Body: {
      title: string;
      description: string;
      category: string;
      imageUrl: string;
      startPrice: number;
      bidIncrement: number;
      durationMinutes: number;
    };
  }>("/seller/auctions", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }
    if (!user.isSeller) {
      return reply.status(403).send({ message: "Seller account required" });
    }

    try {
      const auction = await createListing(user, request.body);
      return auction;
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Failed to create listing",
      });
    }
  });

  app.post<{ Params: { auctionId: string } }>(
    "/payments/auctions/:auctionId/initiate",
    async (request, reply) => {
      const user = getUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.status(401).send({ message: "Sign in required" });
      }

      const redirectUrl = `${getFrontendOrigin()}/payments/callback`;

      try {
        const result = await createPaymentOrder({
          auctionId: request.params.auctionId,
          buyerId: user.id,
          buyerEmail: user.email,
          redirectUrl,
        });
        return result;
      } catch (error) {
        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Payment initiation failed",
        });
      }
    },
  );

  app.get("/payments/orders", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }
    await refreshPaymentStore(paymentOrders);
    return getBuyerOrders(user.id);
  });

  app.get<{ Params: { id: string } }>(
    "/payments/orders/:id",
    async (request, reply) => {
      const user = getUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.status(401).send({ message: "Sign in required" });
      }

      await refreshPaymentStore(paymentOrders);
      let order = findOrderById(request.params.id);
      if (!order || order.buyerId !== user.id) {
        return reply.status(404).send({ message: "Order not found" });
      }

      if (order.status === "pending") {
        try {
          const synced = await syncOrderWithFapshi(order.id, user.id);
          if (synced) {
            order = synced;
          }
        } catch {
          // Keep showing the last known status if Fapshi is unreachable.
        }
      }

      return order;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/payments/orders/:id/sync",
    async (request, reply) => {
      const user = getUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.status(401).send({ message: "Sign in required" });
      }

      try {
        const order = await syncOrderWithFapshi(request.params.id, user.id);
        if (!order) {
          return reply.status(404).send({ message: "Order not found" });
        }
        return order;
      } catch (error) {
        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to sync payment",
        });
      }
    },
  );

  app.get<{ Params: { auctionId: string } }>(
    "/payments/auctions/:auctionId/status",
    async (request, reply) => {
      const user = getUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.status(401).send({ message: "Sign in required" });
      }

      await refreshPaymentStore(paymentOrders);
      const order = findOrderByAuction(request.params.auctionId);
      if (!order) {
        return { status: null };
      }

      if (order.buyerId === user.id && order.status === "pending") {
        try {
          const synced = await syncOrderWithFapshi(order.id, user.id);
          return { status: synced?.status ?? order.status };
        } catch {
          return { status: order.status };
        }
      }

      return { status: order.status };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/payments/orders/:id/mock-confirm",
    async (request, reply) => {
      if (isFapshiConfigured()) {
        return reply.status(403).send({ message: "Not available in production mode" });
      }

      const user = getUserFromAuthHeader(request.headers.authorization);
      if (!user) {
        return reply.status(401).send({ message: "Sign in required" });
      }

      const order = findOrderById(request.params.id);
      if (!order || order.buyerId !== user.id) {
        return reply.status(404).send({ message: "Order not found" });
      }

      const updated = await updateOrderStatus(order.id, "successful");
      return updated;
    },
  );

  app.post("/webhooks/fapshi", async (request, reply) => {
    if (!verifyWebhookSecret(request.headers["x-wh-secret"] as string | undefined)) {
      return reply.status(403).send({ message: "Invalid webhook secret" });
    }

    await refreshPaymentStore(paymentOrders);
    await refreshMarketplaceStore(auctions, bids);

    const payload = parseFapshiWebhookPayload(request.body);
    if (!payload) {
      return reply.status(400).send({ message: "Invalid webhook payload" });
    }

    const order =
      (payload.externalId ? findOrderById(payload.externalId) : undefined) ??
      findOrderByTransId(payload.transId);

    if (!order) {
      return reply.status(404).send({ message: "Order not found" });
    }

    const status = normalizeFapshiStatus(payload.status);
    if (status === "pending") {
      return { received: true, status: order.status };
    }

    const updated = await updateOrderStatus(order.id, status);
    return updated ?? { success: true };
  });

  app.get("/admin/stats", async (request, reply) => {
    if (!requireAdmin(request.headers.authorization, reply)) return;
    await refreshMarketplaceStore(auctions, bids);
    await refreshPaymentStore(paymentOrders);
    return getAdminStats();
  });

  app.get("/admin/users", async (request, reply) => {
    if (!requireAdmin(request.headers.authorization, reply)) return;
    return getAdminUsers();
  });

  app.get("/admin/auctions", async (request, reply) => {
    if (!requireAdmin(request.headers.authorization, reply)) return;
    return getAdminAuctions();
  });

  app.get("/admin/payments", async (request, reply) => {
    if (!requireAdmin(request.headers.authorization, reply)) return;
    await refreshPaymentStore(paymentOrders);
    return getAdminPayments();
  });

  app.post<{ Params: { id: string } }>(
    "/admin/payments/:id/sync",
    async (request, reply) => {
      if (!requireAdmin(request.headers.authorization, reply)) return;

      try {
        const order = await syncPaymentOrderInternal(request.params.id);
        if (!order) {
          return reply.status(404).send({ message: "Order not found" });
        }
        return order;
      } catch (error) {
        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to sync payment",
        });
      }
    },
  );

  app.post("/seller/payments/sync", async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }
    if (!user.isSeller) {
      return reply.status(403).send({ message: "Seller account required" });
    }

    await syncPendingPaymentsForSeller(user.id);
    return { synced: true };
  });

  app.post<{ Params: { id: string } }>(
    "/admin/auctions/:id/end",
    async (request, reply) => {
      if (!requireAdmin(request.headers.authorization, reply)) return;
      try {
        return await endAuctionEarly(request.params.id);
      } catch (error) {
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Failed to end auction",
        });
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/admin/auctions/:id",
    async (request, reply) => {
      if (!requireAdmin(request.headers.authorization, reply)) return;
      try {
        await removeAuction(request.params.id);
        return { success: true };
      } catch (error) {
        return reply.status(400).send({
          message:
            error instanceof Error ? error.message : "Failed to remove auction",
        });
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { isSeller?: boolean };
  }>("/admin/users/:id/roles", async (request, reply) => {
    if (!requireAdmin(request.headers.authorization, reply)) return;
    if (typeof request.body.isSeller !== "boolean") {
      return reply.status(400).send({ message: "isSeller boolean required" });
    }
    try {
      return await updateUserSellerRole(request.params.id, request.body.isSeller);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Failed to update user",
      });
    }
  });

  app.post<{
    Body: { keywords: string; imageUrl?: string; conditionHint?: string };
  }>("/ai/listing-draft", async (request, reply) => {
    if (!requireOpenAi(reply)) return;
    if (!requireSeller(request.headers.authorization, reply)) return;

    const { keywords, imageUrl, conditionHint } = request.body;
    if (!keywords?.trim()) {
      return reply.status(400).send({ message: "Keywords are required" });
    }

    try {
      return await generateListingDraft({
        keywords: keywords.trim(),
        imageUrl,
        conditionHint,
      });
    } catch (error) {
      return reply.status(502).send({
        message:
          error instanceof Error ? error.message : "Listing assistant failed",
      });
    }
  });

  app.post<{ Body: { query: string } }>("/ai/search", async (request, reply) => {
    if (!requireOpenAi(reply)) return;

    const query = request.body.query?.trim();
    if (!query) {
      return reply.status(400).send({ message: "Search query is required" });
    }

    try {
      return await searchAuctions(query, auctions);
    } catch (error) {
      return reply.status(502).send({
        message: error instanceof Error ? error.message : "Smart search failed",
      });
    }
  });

  app.post<{ Body: { auctionId: string; question: string } }>(
    "/ai/bid-coach",
    async (request, reply) => {
      if (!requireOpenAi(reply)) return;

      const { auctionId, question } = request.body;
      if (!auctionId || !question?.trim()) {
        return reply
          .status(400)
          .send({ message: "auctionId and question are required" });
      }

      const auction = auctions.find((item) => item.id === auctionId);
      if (!auction) {
        return reply.status(404).send({ message: "Auction not found" });
      }

      try {
        const bids = getAuctionBids(auctionId);
        const answer = await answerBidCoach({
          auction,
          bids,
          question: question.trim(),
        });
        return { answer };
      } catch (error) {
        return reply.status(502).send({
          message: error instanceof Error ? error.message : "Bid coach failed",
        });
      }
    },
  );

  app.post<{ Body: { auctionIds?: string[] } }>(
    "/admin/ai/moderate",
    async (request, reply) => {
      if (!requireAdmin(request.headers.authorization, reply)) return;
      if (!requireOpenAi(reply)) return;

      try {
        const results = await moderateAuctions(
          auctions,
          request.body.auctionIds,
        );
        return { results };
      } catch (error) {
        return reply.status(502).send({
          message:
            error instanceof Error ? error.message : "Moderation scan failed",
        });
      }
    },
  );

  return app;
}
