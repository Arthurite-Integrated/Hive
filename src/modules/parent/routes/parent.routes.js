import Router from "express";
import { JwtService } from "#services/jwt.service";

export const parentRouter = Router();
const jwtService = JwtService.getInstance();

parentRouter.use(jwtService.validateToken);
