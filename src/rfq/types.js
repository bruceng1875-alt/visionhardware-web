// Adapted from the user-owned NEXKITRA inquiry implementation.
class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export {
  ApiError
};
