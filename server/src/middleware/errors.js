export function notFound(req, _res, next) {
  next(Object.assign(new Error(`Route not found: ${req.method} ${req.path}`), { status: 404 }));
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === 'ZodError') {
    error.status = 400;
    error.message = error.issues?.[0]?.message || 'Invalid request data';
  }
  const status = error.status || (error.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Unexpected server error' : error.message });
}
