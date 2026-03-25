import Router from "express";
import { JwtService } from "#services/jwt.service";
import { ParentController } from "./parent.controller.js";

export const parentRouter = Router();
const jwtService = JwtService.getInstance();

const controller = ParentController.getInstance();

parentRouter.use(jwtService.validateToken);

parentRouter.get("/me", controller.getProfile);
