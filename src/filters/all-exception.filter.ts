import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: Error | HttpException, host: ArgumentsHost) {
    if (process.env.NODE_ENV === 'development') {
      Logger.error(exception.stack);
    } else {
      Logger.error(exception);
    }

    const response = host.switchToHttp().getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.BAD_REQUEST;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception.message;

    const errorResponse = {
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message,
    };

    response.status(status).json(errorResponse);
  }
}
