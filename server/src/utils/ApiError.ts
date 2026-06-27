export class ApiError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(statusCode: number, message: string, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string, code = "BAD_REQUEST") {
    return new ApiError(400, msg, code);
  }
  static unauthorized(msg = "Unauthorized") {
    return new ApiError(401, msg, "UNAUTHORIZED");
  }
  static forbidden(msg = "Forbidden") {
    return new ApiError(403, msg, "FORBIDDEN");
  }
  static notFound(msg: string, code = "NOT_FOUND") {
    return new ApiError(404, msg, code);
  }
  static conflict(msg: string, code = "CONFLICT") {
    return new ApiError(409, msg, code);
  }
  static internal(msg = "Internal server error") {
    return new ApiError(500, msg, "INTERNAL_ERROR");
  }
}
