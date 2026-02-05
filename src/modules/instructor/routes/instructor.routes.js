import Router from "express";
import { JwtService } from "#services/jwt.service";

export const instructorRouter = Router();
const jwtService = JwtService.getInstance();

instructorRouter.use(jwtService.validateToken);
