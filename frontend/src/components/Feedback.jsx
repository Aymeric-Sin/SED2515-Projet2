/**
 * MiseEnPlace (frontend) — Petits composants partagés : chargement, erreur, badge de statut.
 */

import { statusLabel } from '../utils/format.js';

export function Loading({ label = 'Chargement…' }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{statusLabel(status)}</span>;
}
