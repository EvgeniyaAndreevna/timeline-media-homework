import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinates } from '../src/coordinates.js';

test('Принимает координаты с пробелом после запятой и Unicode-минусом', () => {
  assert.deepEqual(parseCoordinates('51.50851, −0.12572'), {
    latitude: 51.50851,
    longitude: -0.12572
  });
});

test('Принимает координаты без пробела', () => {
  assert.deepEqual(parseCoordinates('51.50851,−0.12572'), {
    latitude: 51.50851,
    longitude: -0.12572
  });
});

test('Принимает координаты в квадратных скобках', () => {
  assert.deepEqual(parseCoordinates('[51.50851, −0.12572]'), {
    latitude: 51.50851,
    longitude: -0.12572
  });
});

test('Принимает обычный минус, пробелы и граничные значения', () => {
  assert.deepEqual(parseCoordinates(' [ -90, 180 ] '), { latitude: -90, longitude: 180 });
});

test('Принимает нулевые и целочисленные координаты', () => {
  assert.deepEqual(parseCoordinates('0,0'), { latitude: 0, longitude: 0 });
});

for (const input of [
  '', '51.50851', '51.50851;-0.12572',
  '[51.50851, -0.12572', '51.50851, -0.12572]',
  '51.5, abc', '51.5, -0.1, 12', '1e2, 3', '12, NaN',
  '{51.50851, -0.12572}'
]) {
  test(`Отклоняет неправильный формат: ${JSON.stringify(input)}`, () => {
    assert.throws(() => parseCoordinates(input), TypeError);
  });
}

test('Отклоняет широту больше 90 градусов', () => {
  assert.throws(() => parseCoordinates('90.1, 0'), RangeError);
});

test('Отклоняет долготу меньше −180 градусов', () => {
  assert.throws(() => parseCoordinates('0, -180.1'), RangeError);
});

test('Отклоняет ввод не строкой', () => {
  assert.throws(() => parseCoordinates(null), TypeError);
});
