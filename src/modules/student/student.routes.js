import Router from "express";
import { JwtService } from "#services/jwt.service";
import { StudentController } from "./student.controller.js";

export const studentRouter = Router();
const jwtService = JwtService.getInstance();

const controller = StudentController.getInstance();

studentRouter.use(jwtService.validateToken);

studentRouter.get("/me", controller.getProfile);
