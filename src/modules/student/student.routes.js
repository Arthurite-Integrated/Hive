import Router from "express";
import { JwtService } from "#services/jwt.service";

export const studentRouter = Router();
const jwtService = JwtService.getInstance();

studentRouter.use(jwtService.validateToken);
