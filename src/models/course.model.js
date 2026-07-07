import { CourseDifficulty, CourseStatus } from "#enums/community/course.enums";
import { ModelCollections } from "#enums/models/index";
import { randomBytes } from "crypto";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.COURSE;

const CourseSchema = new Schema(
	{
		communityId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COMMUNITY,
			required: true,
		},
		instructorId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.INSTRUCTOR,
			required: true,
		},

		title: {
			type: String,
			required: true,
			trim: true,
		},
		slug: {
			type: String,
		},
		description: String,
		coverImage: String,
		category: String,
		difficulty: {
			type: String,
			enum: {
				values: Object.values(CourseDifficulty),
				message: "Invalid course difficulty: {{VALUE}}",
			},
		},
		status: {
			type: String,
			enum: {
				values: Object.values(CourseStatus),
				message: "Invalid course status: {{VALUE}}",
			},
			default: "draft",
		},

		isFree: {
			type: Boolean,
			default: true,
		},
		price: {
			type: Number,
			default: 0,
		},
		monthlyPrice: {
			type: Number,
			default: 0,
		},

		settings: {
			sequentialAccess: {
				type: Boolean,
				default: false,
			},
			dripContent: {
				type: Boolean,
				default: false,
			},
			allowComments: {
				type: Boolean,
				default: true,
			},
			allowDownloads: {
				type: Boolean,
				default: true,
			},
		},

		certificateRequirements: {
			eligible: {
				type: Boolean,
				default: false,
			},
			minCompletion: {
				type: Number,
				default: 100,
			},
			minQuizScore: {
				type: Number,
				default: 70,
			},
			minAttendance: {
				type: Number,
				default: 80,
			},
		},

		enrollmentCount: {
			type: Number,
			default: 0,
		},
		averageRating: {
			type: Number,
			default: 0,
		},

		publishedAt: Date,
	},
	{ timestamps: true },
);

CourseSchema.pre("validate", async function () {
	if (!this.isNew && !this.isModified("title")) return;

	const slugBase = this.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.substring(0, 60);

	const exists = await this.constructor.findOne({
		communityId: this.communityId,
		slug: slugBase,
		_id: { $ne: this._id },
	});

	if (!exists) {
		this.slug = slugBase;
	} else {
		const suffix = randomBytes(2).toString("hex");
		this.slug = `${slugBase.substring(0, 55)}-${suffix}`;
	}
});

// Compound unique index: slug is unique within a community
CourseSchema.index({ communityId: 1, slug: 1 }, { unique: true });

// Index for listing published courses in a community
CourseSchema.index({ communityId: 1, status: 1 });

// Index for "my courses" queries
CourseSchema.index({ instructorId: 1 });

// Text index for search E.g Searching by title and description within a community
CourseSchema.index({ title: "text", description: "text" });

// Index for filtered browsing
CourseSchema.index({ category: 1, difficulty: 1 });

export const Course = model(collectionName, CourseSchema);
