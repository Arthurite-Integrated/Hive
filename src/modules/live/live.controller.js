import { sendSuccessResponse } from "#helpers/responses/index";
import { LiveService } from "#modules/live/live.service";

export class LiveController {
	static instance = null;

	/** @returns {LiveController} */
	static getInstance() {
		if (!LiveController.instance)
			LiveController.instance = new LiveController();
		return LiveController.instance;
	}

	constructor() {
		this.liveService = LiveService.getInstance();
	}

	joinLive = async (req, res) => {
		const data = await this.liveService.joinLive(
			req.params.lessonId,
			req.user._id,
		);
		return sendSuccessResponse(res, { message: "Joined live class.", data });
	};

	leaveLive = async (req, res) => {
		const data = await this.liveService.leaveLive(
			req.body.attendanceId,
			req.user._id,
		);
		return sendSuccessResponse(res, { message: "Left live class.", data });
	};

	uploadRecording = async (req, res) => {
		const data = await this.liveService.uploadRecording(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Recording uploaded.",
			data,
		});
	};

	getAttendance = async (req, res) => {
		const data = await this.liveService.getAttendance(
			req.params.lessonId,
			req.user._id,
		);
		return sendSuccessResponse(res, { data });
	};
}
