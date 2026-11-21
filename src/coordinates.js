/**
 * Convert latitude/longitude entered by a person into numeric coordinates.
 * Accepted: 51.50851, −0.12572; 51.50851,−0.12572;
 *           [51.50851, −0.12572]
 * Throws a RangeError for out-of-range values; TypeError for invalid syntax.
 * This function is deliberately DOM-free so it can be unit-tested.
 * @param {string} input
 * @returns {{latitude: number, longitude: number}}
 */
export function parseCoordinates(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Введите координаты в формате «широта, долгота».');
  }

  let normalized = input.trim().replace(/\u2212/g, '-');
  const opens = normalized.startsWith('[');
  const closes = normalized.endsWith(']');

  if (opens !== closes) {
    throw new TypeError('Проверьте квадратные скобки вокруг координат.');
  }
  if (opens) normalized = normalized.slice(1, -1).trim();

  const number = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
  const match = normalized.match(new RegExp(`^(${number})\\s*,\\s*(${number})$`));
  if (!match) {
    throw new TypeError('Укажите две координаты через запятую, например 51.50851, −0.12572.');
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('Координаты должны быть числами.');
  }
  if (latitude < -90 || latitude > 90) {
    throw new RangeError('Широта должна быть от −90 до 90.');
  }
  if (longitude < -180 || longitude > 180) {
    throw new RangeError('Долгота должна быть от −180 до 180.');
  }

  return { latitude, longitude };
}
