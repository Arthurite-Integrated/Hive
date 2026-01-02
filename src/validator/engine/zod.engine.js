import { sendErrorResponse } from "#helpers/responses/index";
import { StatusCodes } from "http-status-codes";
import z from "zod";

/**
/**
 * @info This is a validation engine for Zod
 * @description - Provides middleware for validating request bodies, query parameters, and route parameters using Zod schemas. 
 */
export class ZodEngine {
  static instance = null;

  /** @returns {ZodEngine} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new ZodEngine();
    }
    return this.instance;
  }

  constructor() {}

  validate = {
    body: (schema) => this.validateBody(schema),
    params: (schema) => this.validateParams(schema),
    query: (schema) => this.validateQuery(schema),
  }

  /** @private */
  validateBody = (schema) => {
    return (req, res, next) => {
      try {
        const body = req.body || {};
        const output = schema.parse(body);
        
        req.body = output;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const { issues } = error;
          const errorMessages = {};
          console.log(issues);

          issues.forEach((issue) => {
            const { path, message, code } = issue;
            errorMessages[path] = { message, code };
          });
          sendErrorResponse(res, { errors: errorMessages }, StatusCodes.BAD_REQUEST);
        }
        next(error);
      }
    }
  }

  /** @private */
  validateParams = (schema) => {
    return (req, res, next) => {
      try {
        const params = req.params || {};
        const output = schema.parse(params);

        Object.keys(output).forEach((key) => {
          req.params[key] = output[key];
        });
        
        next();
      } catch (error) {
      if (error instanceof z.ZodError) {
        const { issues } = error;
        const errorMessages = {};
        issues.forEach((issue) => {
          const { path, message, code } = issue;
          errorMessages[path] = { message, code };
        });
        sendErrorResponse(res,  { errors: errorMessages }, StatusCodes.BAD_REQUEST);
      }
        next(error);
      }
    }
  }

  /** @private */
  validateQuery = (schema) => {
    return (req, res, next) => {
      try {
        const query = req.query || {};
        const output = schema.parse(query);

        Object.keys(output).forEach((key) => {
          req.query[key] = output[key];
        });

        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const { issues } = error;
          const errorMessages = {};
          issues.forEach((issue) => {
            const { path, message, code } = issue;
            errorMessages[path] = { message, code };
          });
          sendErrorResponse(res,  { errors: errorMessages }, StatusCodes.BAD_REQUEST);
        }
        next(error);
      }
    }
  }
}