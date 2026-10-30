/**
 * MiseEnPlace (backend) — Erreur HTTP personnalisée.
 */

class HttpError extends Error {
  /**
   * @param {number} status  code HTTP (400, 404, 409...)
   * @param {string} message message lisible, affiché par le frontend
   * @param {object} [details] informations supplémentaires (ex. erreurs par champ)
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

module.exports = { HttpError };
