import { Server as SocketIOServer } from "socket.io";
import { JwtService } from "#services/jwt.service";
import { logger } from "#utils/logger";

export class WebSocketService {
	static instance = null;

	/** @returns {WebSocketService} */
	static getInstance() {
		if (!WebSocketService.instance) {
			WebSocketService.instance = new WebSocketService();
		}
		return WebSocketService.instance;
	}

	/** @private */
	constructor() {
		this.io = null;
	}

	/**
	 * Attach socket.io to the HTTP server.
	 * Must be called once after server.listen().
	 * @param {import("node:http").Server} httpServer
	 */
	attach(httpServer) {
		if (this.io) {
			logger.warn(
				"WebSocketService.attach() called more than once — skipping.",
			);
			return;
		}

		this.io = new SocketIOServer(httpServer, {
			cors: { origin: true, credentials: true },
			path: "/ws",
			transports: ["websocket", "polling"],
		});

		// ── Auth middleware ─────────────────────────────────────────────────────
		this.io.use(async (socket, next) => {
			try {
				const token =
					socket.handshake.auth?.token || socket.handshake.query?.token;
				if (!token) return next(new Error("Authentication required"));

				const jwtService = JwtService.getInstance();
				const decoded = jwtService.verifyToken(token);

				const userId = decoded.userId || decoded.authId;
				const userType = decoded.userType;
				if (!userId) return next(new Error("Invalid token"));

				socket.userId = String(userId);
				socket.userType = userType || null;
				return next();
			} catch {
				return next(new Error("Invalid token"));
			}
		});

		// ── Connection handler ──────────────────────────────────────────────────
		this.io.on("connection", async (socket) => {
			const userId = socket.userId;

			// Each user has a private room named after their userId.
			socket.join(userId);
			logger.info(`WS connected: ${userId}`);

			// Join community rooms for all active memberships
			try {
				const { CommunityMember } = await import(
					"#models/community-member.model"
				);
				const memberships = await CommunityMember.find({
					userId,
					status: "active",
				})
					.select("communityId")
					.lean();
				for (const m of memberships) {
					socket.join(`community:${m.communityId}`);
				}
			} catch (err) {
				logger.error("WS community room join error", err);
			}

			// ── Typing indicator ──────────────────────────────────────────────
			socket.on("typing", ({ receiverId }) => {
				if (!receiverId) return;
				this.io.to(String(receiverId)).emit("typing", { userId });
			});

			// ── Mark message as read (real-time) ─────────────────────────────
			socket.on("read", async ({ messageId }) => {
				if (!messageId) return;
				try {
					const { Message } = await import("#models/message.model");
					const msg = await Message.findByIdAndUpdate(
						messageId,
						{ isRead: true, readAt: new Date() },
						{ new: true },
					);
					if (msg) {
						this.io
							.to(String(msg.senderId))
							.emit("read", { messageId, readAt: msg.readAt });
					}
				} catch (err) {
					logger.error("WS read event error", err);
				}
			});

			socket.on("disconnect", () => {
				logger.info(`WS disconnected: ${userId}`);
			});
		});

		logger.info("WebSocket server attached on path /ws");
	}

	/**
	 * Emit an event to all sockets belonging to a user.
	 * Users are identified by their userId room.
	 * @param {string|import("mongoose").Types.ObjectId} userId
	 * @param {{ type: string, data: unknown }} payload
	 */
	sendToUser(userId, payload) {
		if (!this.io) {
			logger.warn("WebSocketService.sendToUser called before attach()");
			return;
		}
		this.io.to(String(userId)).emit(payload.type, payload.data);
	}

	/**
	 * Broadcast a community message to all sockets in a community room.
	 * @param {string|import("mongoose").Types.ObjectId} communityId
	 * @param {unknown} payload
	 */
	broadcastToCommunity(communityId, payload) {
		if (!this.io) {
			logger.warn(
				"WebSocketService.broadcastToCommunity called before attach()",
			);
			return;
		}
		this.io.to(`community:${communityId}`).emit("community_message", payload);
	}
}
