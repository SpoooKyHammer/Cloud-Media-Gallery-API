import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, Result } from 'express-validator';

/**
 * Middleware to run validation chains and handle errors.
 * Returns standardized validation error response.
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors: Result = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    const extractedErrors = errors.array().map((err) => ({
      field: err.path as string,
      message: err.msg as string,
    }));

    res.status(400).json({
      success: false,
      errors: extractedErrors,
    });
  };
};
