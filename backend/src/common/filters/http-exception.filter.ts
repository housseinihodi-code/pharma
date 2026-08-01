import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erreur interne du serveur';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message || exception.message
          : exception.message;
    } else if (exception instanceof Error) {
      const name = (exception as any).name;
      if (name === 'CastError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Identifiant invalide';
      } else if (name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else if (name === 'MongoServerError' && (exception as any).code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'Cette ressource existe déjà';
      } else {
        this.logger.error(`Unhandled exception: ${exception.message}`, (exception as Error).stack);
      }
    }

    this.logger.error(`[${status}] ${Array.isArray(message) ? message.join(', ') : message}`);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
