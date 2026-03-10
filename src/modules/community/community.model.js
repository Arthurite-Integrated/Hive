import { config } from "#config/config";
import { COMMUNITY_STATUS, COMMUNITY_VISIBILITY } from "#enums/community/index";
import { ModelCollections } from "#enums/models/index";
import { randomBytes } from "crypto";
import { Schema, model } from "monggose";

const collectionName = ModelCollections.COMMUNITY;

const CommunitySchema = new Schema(
	{
		ownerId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.INSTRUCTOR,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		slug: {
			type: String,
			required: true,
			unique: true,
		},
		description: String,
		coverImage: String,
		category: String,
		status: {
			type: String,
			enum: {
				values: Object.values(COMMUNITY_STATUS),
				message: "Invalid community status: {{VALUE}}",
			},
			default: "active",
		},
		visibility: {
			type: String,
			enum: {
				values: Object.values(COMMUNITY_VISIBILITY),
				message: "Invalid community visibility: {{VALUE}}",
			},
			default: "public",
		},
		requireApproval: {
			type: Boolean,
			default: false,
		},
		allowInvites: {
			type: Boolean,
			default: true,
		},
		paymentRequired: {
			type: Boolean,
			default: false,
		},
		monthlyPrice: {
			type: Number,
			default: 0,
		},
		settings: {
			sequentialCourses: Boolean,
			allowDownloads: Boolean,
			maxConcurrentDevices: Number,
			gracePeriodDays: Number,
		},
		memberCount: {
			type: Number,
			default: 0,
		},
		courseCount: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

CommunitySchema.index({ slug: 1 });

CommunitySchema.virtual("url").get(function () {
	return `${config.server.rootDomain}/communities/${this.slug}`;
});

CommunitySchema.pre("validate", async function () {
	if (!this.isNew && !this.isModified("name")) return;

	const slugBase = this.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.substring(0, 50);

	const exists = await this.constructor.findOne({
		slug: slugBase,
		_id: { $ne: this._id },
	});

	if (!exists) {
		this.slug = slugBase;
	} else {
		const suffix = randomBytes(3).toString("hex");
		this.slug = `${slugBase}-${suffix}`;
	}
});

export const Community = model(collectionName, CommunitySchema);
