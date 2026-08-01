/**
 * Extrait un identifiant Mongo sous forme de chaîne, que la valeur soit déjà
 * une chaîne, un ObjectId, ou un sous-document populé (qui expose `_id`).
 *
 * Nécessaire car `req.user.pharmacyId` (issu du JWT + populate dans
 * AuthService.validateUser) est un document Pharmacy peuplé, pas un ObjectId :
 * appeler `.toString()` dessus renvoie une représentation d'objet et non
 * l'identifiant hexadécimal, ce qui fait échouer silencieusement toute
 * comparaison d'égalité avec un id brut.
 */
export function toIdString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  const obj = value as { _id?: unknown };
  if (obj._id !== undefined) return String(obj._id);
  return String(value);
}
