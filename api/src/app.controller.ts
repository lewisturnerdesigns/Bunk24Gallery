import {
  Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus,
  Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { memoryStorage } from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { PrismaService } from "./prisma.service";

const stripe = () => process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const jwtSecret = () => {
  if (!process.env.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY.length < 32) throw new Error("JWT_SECRET_KEY must contain at least 32 characters.");
  return process.env.JWT_SECRET_KEY;
};
const money = (n: number) => Math.round(n);

@Controller()
export class AppController {
  constructor(private readonly db: PrismaService) {}

  private admin(req: Request) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpException("Authentication required", 401);
    try { return jwt.verify(token, jwtSecret()) as { sub: string }; }
    catch { throw new HttpException("Invalid or expired session", 401); }
  }

  @Get("health") health() { return { status: "ok" }; }

  @Get("health/ready")
  async readiness() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected" };
  }

  @Get("api/artworks")
  async artworks(@Query("artist") artist?: string) {
    return this.db.artwork.findMany({
      where: { published: true, ...(artist ? { artist: { slug: artist } } : {}) },
      include: { variants: { where: { active: true }, select: { id: true, sku: true, label: true, priceCents: true, inventoryQuantity: true } }, artist: true },
      orderBy: [{ siteFeatured: "desc" }, { siteFeaturedOrder: "asc" }, { createdAt: "desc" }],
    }).then(rows => rows.map(row => this.artworkOut(row)));
  }

  private artworkOut(row: any) {
    const { priceCents, inventoryQuantity, artistId, artistFeatured, artistFeaturedOrder, siteFeatured, siteFeaturedOrder, createdAt, imageData, imageContentType, ...rest } = row;
    return { ...rest, artist_id: artistId, artist_featured: artistFeatured, artist_featured_order: artistFeaturedOrder, site_featured: siteFeatured, site_featured_order: siteFeaturedOrder, created_at: createdAt, variants: row.variants?.map((v: any) => ({ id: v.id, sku: v.sku, label: v.label, price_cents: v.priceCents, inventory_quantity: v.inventoryQuantity, active: v.active })) };
  }

  @Post("auth/token")
  async login(@Body() body: any) {
    const email = process.env.ADMIN_EMAIL || "";
    if (!email || String(body.username || "").toLowerCase() !== email.toLowerCase() || !process.env.ADMIN_PASSWORD_HASH || !(await bcrypt.compare(String(body.password || ""), process.env.ADMIN_PASSWORD_HASH))) throw new HttpException("Incorrect email or password", 401);
    return { access_token: jwt.sign({ sub: email }, jwtSecret(), { expiresIn: process.env.JWT_EXPIRE_MINUTES ? Number(process.env.JWT_EXPIRE_MINUTES) * 60 : 3600 }), token_type: "bearer" };
  }

  @Get("admin/artists")
  async adminArtists(@Req() req: Request) { this.admin(req); return this.db.artist.findMany({ orderBy: { name: "asc" } }); }

  @Post("admin/artists")
  async createArtist(@Req() req: Request, @Body() body: any) {
    this.admin(req);
    return this.db.artist.create({ data: { name: body.name, slug: body.slug, bio: body.bio || "" } });
  }

  @Get("admin/artworks")
  async adminArtworks(@Req() req: Request) {
    this.admin(req);
    const rows = await this.db.artwork.findMany({ include: { variants: true, artist: true }, orderBy: { createdAt: "desc" } });
    return rows.map(row => ({ ...this.artworkOut(row), artist_name: row.artist?.name ?? null, published: row.published }));
  }

  @Post("admin/artworks")
  async createArtwork(@Req() req: Request, @Body() body: any) {
    this.admin(req);
    const row = await this.db.artwork.create({ data: this.artworkData(body) });
    return this.artworkOut({ ...row, variants: [] });
  }

  @Patch("admin/artworks/:id")
  async updateArtwork(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    this.admin(req);
    const row = await this.db.artwork.update({ where: { id: Number(id) }, data: this.artworkData(body, true), include: { variants: true } });
    return this.artworkOut(row);
  }

  private artworkData(body: any, partial = false) {
    const fields: Record<string, any> = { slug: body.slug, title: body.title, description: body.description, imageUrl: body.image_url, published: body.published, artistId: body.artist_id, artistFeatured: body.artist_featured, artistFeaturedOrder: body.artist_featured_order, siteFeatured: body.site_featured, siteFeaturedOrder: body.site_featured_order };
    for (const k of Object.keys(fields)) if (fields[k] === undefined || (partial && fields[k] === null && k !== "artistId")) delete fields[k];
    return fields;
  }

  @Post("admin/artworks/:id/image")
  @UseInterceptors(FileInterceptor("image", { storage: memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) }))
  async uploadImage(@Req() req: Request, @Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    this.admin(req);
    if (!file) throw new HttpException("Upload a JPG, PNG, WebP, or GIF image under 4 MB.", 415);
    const row = await this.db.artwork.update({ where: { id: Number(id) }, data: { imageData: file.buffer, imageContentType: file.mimetype, imageUrl: `${process.env.PUBLIC_API_URL || "http://localhost:8000"}/api/artworks/${id}/image` } });
    return { image_url: row.imageUrl };
  }

  @Get("api/artworks/:id/image")
  async image(@Param("id") id: string, @Res() res: Response) {
    const row = await this.db.artwork.findUnique({ where: { id: Number(id) }, select: { imageData: true, imageContentType: true } });
    if (!row?.imageData || !row.imageContentType) throw new HttpException("Image not found", 404);
    res.setHeader("Content-Type", row.imageContentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(row.imageData);
  }

  @Post("admin/artworks/:id/variants")
  async createVariant(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    this.admin(req);
    const v = await this.db.printVariant.create({ data: { artworkId: Number(id), sku: body.sku, label: body.label, priceCents: money(body.price_cents), inventoryQuantity: Number(body.inventory_quantity || 0), active: body.active ?? true } });
    return this.variantOut(v);
  }

  @Patch("admin/variants/:id")
  async updateVariant(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    this.admin(req);
    const data: any = {};
    if (body.sku !== undefined) data.sku = body.sku;
    if (body.label !== undefined) data.label = body.label;
    if (body.price_cents !== undefined) data.priceCents = money(body.price_cents);
    if (body.inventory_quantity !== undefined) data.inventoryQuantity = Number(body.inventory_quantity);
    if (body.active !== undefined) data.active = Boolean(body.active);
    return this.variantOut(await this.db.printVariant.update({ where: { id: Number(id) }, data }));
  }

  private variantOut(v: any) { return { id: v.id, artwork_id: v.artworkId, sku: v.sku, label: v.label, price_cents: v.priceCents, inventory_quantity: v.inventoryQuantity, active: v.active }; }

  @Get("admin/orders")
  async orders(@Req() req: Request) {
    this.admin(req);
    const rows = await this.db.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(o => ({ id: o.id, email: o.email, status: o.status, currency: o.currency, total_cents: o.totalCents, created_at: o.createdAt, items: o.items.map(i => ({ variant_id: i.variantId, quantity: i.quantity, unit_price_cents: i.unitPriceCents })) }));
  }

  @Patch("admin/orders/:id/status")
  async orderStatus(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    this.admin(req);
    if (["paid", "refunded", "pending"].includes(body.status)) throw new HttpException("This status can only be changed by a verified payment or refund workflow.", 409);
    const order = await this.db.order.findUnique({ where: { id: Number(id) } });
    if (!order) throw new HttpException("Order not found", 404);
    if (["shipped", "cancelled", "refunded"].includes(order.status) && body.status !== order.status) throw new HttpException("This order status is final.", 409);
    return this.db.order.update({ where: { id: Number(id) }, data: { status: body.status } });
  }

  @Post("api/checkout")
  async checkout(@Body() body: any) {
    const client = stripe();
    if (!client) throw new HttpException("Checkout is not configured yet.", 503);
    const email = String(body.email || "");
    const items = Array.isArray(body.items) ? body.items : [];
    if (!email || !items.length) throw new HttpException("Email and cart items are required.", 400);
    const ids = items.map((i: any) => Number(i.variant_id));
    const variants = await this.db.printVariant.findMany({ where: { id: { in: ids }, active: true }, include: { artwork: true } });
    if (variants.length !== ids.length) throw new HttpException("One or more print options are unavailable.", 409);
    let total = 0;
    const lineItems = items.map((item: any) => {
      const v = variants.find(row => row.id === Number(item.variant_id))!;
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      if (v.inventoryQuantity < quantity) throw new HttpException("Insufficient inventory for " + v.label, 409);
      total += v.priceCents * quantity;
      return { price_data: { currency: "usd", product_data: { name: v.artwork.title + " — " + v.label }, unit_amount: v.priceCents }, quantity };
    });
    const order = await this.db.order.create({ data: { email, totalCents: total, items: { create: items.map((item: any) => { const v = variants.find(row => row.id === Number(item.variant_id))!; return { variantId: v.id, quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)), unitPriceCents: v.priceCents }; }) } } });
    try {
      const session = await client.checkout.sessions.create({ mode: "payment", customer_email: email, line_items: lineItems, success_url: process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/checkout/success", cancel_url: process.env.STRIPE_CANCEL_URL || "http://localhost:3000/shop", metadata: { order_id: String(order.id) } });
      await this.db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
      return { checkout_url: session.url };
    } catch (error) { await this.db.order.delete({ where: { id: order.id } }); throw new HttpException("Could not start checkout.", 502); }
  }

  @Post("webhooks/stripe")
  @HttpCode(200)
  async stripeWebhook(@Req() req: Request, @Headers("stripe-signature") signature?: string) {
    const client = stripe();
    if (!client || !signature || !process.env.STRIPE_WEBHOOK_SECRET) throw new HttpException("Webhook is not configured.", 400);
    let event: Stripe.Event;
    try { event = client.webhooks.constructEvent((req as any).rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET); }
    catch { throw new HttpException("Invalid webhook signature.", 400); }
    const exists = await this.db.stripeEvent.findUnique({ where: { id: event.id } });
    if (exists) return { received: true };
    await this.db.stripeEvent.create({ data: { id: event.id, type: event.type } });
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = Number(session.metadata?.order_id);
      if (orderId) await this.db.order.update({ where: { id: orderId }, data: { status: "paid" } });
    }
    return { received: true };
  }
}
