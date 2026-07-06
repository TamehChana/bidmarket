import Fastify from "fastify";
import cors from "@fastify/cors";
import type { User } from "@bidmarket/shared";
import {
  auctions,
  becomeSeller,
  createListing,
  getAuctionBids,
  getSellerAuctions,
  getSellerStats,
  loginUser,
  placeBid,
  registerUser,
  users,
} from "./store.js";
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
  findOrderById,
  findOrderByTransId,
  getBuyerOrders,
  updateOrderStatus,
} from "./payments.js";
import {
  mapFapshiStatus,
  verifyWebhookSecret,
  type FapshiWebhookPayload,
} from "./fapshi.js";

const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_URL ?? "http://localhost:3000";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [frontendOrigin, "http://localhost:3000"],
  credentials: true,
});

function getUserFromAuthHeader(
  authorization?: string,
): User | undefined {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.replace("Bearer ", "");
  const userId = token.replace("mock-token-", "");
  return users.find((user) => user.id === userId);
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

app.get("/health", async () => ({ status: "ok" }));

app.get("/auctions", async () => auctions);

app.get<{ Params: { id: string } }>("/auctions/:id", async (request, reply) => {
  const auction = auctions.find((item) => item.id === request.params.id);
  if (!auction) {
    return reply.status(404).send({ message: "Auction not found" });
  }
  return auction;
});

app.get<{ Params: { id: string } }>(
  "/auctions/:id/bids",
  async (request, reply) => {
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
      const user = registerUser({ email, password, name });
      return { user, token: `mock-token-${user.id}` };
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
      return loginUser(request.body);
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

app.post<{ Params: { id: string }; Body: { amount: number } }>(
  "/auctions/:id/bids",
  async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in to place a bid" });
    }

    try {
      const result = placeBid(request.params.id, user, request.body);
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

  const updated = becomeSeller(user);
  return { user: updated };
});

app.get("/seller/auctions", async (request, reply) => {
  const user = getUserFromAuthHeader(request.headers.authorization);
  if (!user) {
    return reply.status(401).send({ message: "Sign in required" });
  }
  if (!user.isSeller) {
    return reply.status(403).send({ message: "Seller account required" });
  }

  return getSellerAuctions(user.id);
});

app.get("/seller/stats", async (request, reply) => {
  const user = getUserFromAuthHeader(request.headers.authorization);
  if (!user) {
    return reply.status(401).send({ message: "Sign in required" });
  }
  if (!user.isSeller) {
    return reply.status(403).send({ message: "Seller account required" });
  }

  return getSellerStats(user.id);
});

app.post<{
  Body: {
    title: string;
    description: string;
    category: string;
    imageUrl: string;
    startPrice: number;
    bidIncrement: number;
    durationHours: number;
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
    const auction = createListing(user, request.body);
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

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const redirectUrl = `${frontendUrl}/payments/callback`;

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
  return getBuyerOrders(user.id);
});

app.get<{ Params: { id: string } }>(
  "/payments/orders/:id",
  async (request, reply) => {
    const user = getUserFromAuthHeader(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ message: "Sign in required" });
    }

    const order = findOrderById(request.params.id);
    if (!order || order.buyerId !== user.id) {
      return reply.status(404).send({ message: "Order not found" });
    }

    return order;
  },
);

app.post<{ Params: { id: string } }>(
  "/payments/orders/:id/mock-confirm",
  async (request, reply) => {
    if (process.env.FAPSHI_API_USER) {
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

    const updated = updateOrderStatus(order.id, "successful");
    return updated;
  },
);

app.post("/webhooks/fapshi", async (request, reply) => {
  if (!verifyWebhookSecret(request.headers["x-wh-secret"] as string | undefined)) {
    return reply.status(403).send({ message: "Invalid webhook secret" });
  }

  const payload = request.body as FapshiWebhookPayload;
  const order =
    (payload.externalId ? findOrderById(payload.externalId) : undefined) ??
    findOrderByTransId(payload.transId);

  if (!order) {
    return reply.status(404).send({ message: "Order not found" });
  }

  const status = mapFapshiStatus(payload.status);
  updateOrderStatus(order.id, status);
  return { received: true };
});

app.get("/admin/stats", async (request, reply) => {
  if (!requireAdmin(request.headers.authorization, reply)) return;
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
  return getAdminPayments();
});

app.post<{ Params: { id: string } }>(
  "/admin/auctions/:id/end",
  async (request, reply) => {
    if (!requireAdmin(request.headers.authorization, reply)) return;
    try {
      return endAuctionEarly(request.params.id);
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
      removeAuction(request.params.id);
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
    return updateUserSellerRole(request.params.id, request.body.isSeller);
  } catch (error) {
    return reply.status(400).send({
      message: error instanceof Error ? error.message : "Failed to update user",
    });
  }
});

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
