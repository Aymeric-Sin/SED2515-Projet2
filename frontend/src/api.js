/**
 * MiseEnPlace (frontend) — Module M11 : tous les appels au serveur (Axios).
 *
 * Les composants n'appellent jamais Axios directement : ils passent par ces fonctions.
 * Par défaut, les appels vont vers /api (redirigé vers le port 3001 par Vite en
 * développement). VITE_API_URL permet de pointer vers un autre serveur.
 */

import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 8000,
});

export const getRecipes = (params = {}) => client.get('/recipes', { params }).then((r) => r.data);
export const getRecipe = (id) => client.get(`/recipes/${id}`).then((r) => r.data);
export const getIngredients = (params = {}) => client.get('/ingredients', { params }).then((r) => r.data);
export const createIngredient = (data) => client.post('/ingredients', data).then((r) => r.data);
export const updateIngredient = (id, data) => client.put(`/ingredients/${id}`, data).then((r) => r.data);
export const deleteIngredient = (id) => client.delete(`/ingredients/${id}`).then((r) => r.data);
export const createRecipe = (data) => client.post('/recipes', data).then((r) => r.data);
export const deleteRecipe = (id) => client.delete(`/recipes/${id}`).then((r) => r.data);
export const getStats = () => client.get('/stats').then((r) => r.data);

// Message lisible pour l'utilisateur, quelle que soit l'erreur.
export function getErrorMessage(error) {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre.';
  if (error?.request) return "Impossible de joindre le serveur. Vérifiez qu'il est démarré (npm start dans backend/).";
  return 'Une erreur inattendue est survenue.';
}

// Erreurs champ par champ renvoyées par la validation du serveur (400), sinon {}.
export function getFieldErrors(error) {
  const details = error?.response?.data?.details;
  return error?.response?.status === 400 && details && typeof details === 'object' ? details : {};
}
