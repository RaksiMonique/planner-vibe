import { describe, expect, it } from 'vitest';
import {
  consolidateIngredients,
  contributionsForMeals,
  formatQuantity,
  scaleIngredients,
  scaleQuantity,
} from './consolidate';

describe('scaling', () => {
  it('scales quantities by the serving ratio and leaves blanks alone', () => {
    expect(scaleQuantity(500, 2, 4)).toBe(1000);
    expect(scaleQuantity(1, 4, 6)).toBe(1.5);
    expect(scaleQuantity(null, 2, 4)).toBeNull();
    expect(scaleQuantity(3, 0, 4)).toBe(3);
  });
  it('maps over a recipe without touching other fields', () => {
    const scaled = scaleIngredients(
      [{ name: 'Rice', quantity: 200, unit: 'g', category: 'pantry' }],
      2,
      3
    );
    expect(scaled).toEqual([{ name: 'Rice', quantity: 300, unit: 'g', category: 'pantry' }]);
  });
});

describe('consolidateIngredients', () => {
  it('adds up the same name and unit, scaled by factor', () => {
    const lines = consolidateIngredients([
      { name: 'Chicken', quantity: 500, unit: 'g', recipeId: 'a', factor: 1 },
      { name: 'chicken', quantity: 250, unit: 'G', recipeId: 'b', factor: 2 },
    ]);
    expect(lines).toEqual([
      { name: 'Chicken', quantity: 1000, unit: 'g', category: null, recipeIds: ['a', 'b'] },
    ]);
  });
  it('keeps different units separate and blanks once', () => {
    const lines = consolidateIngredients([
      { name: 'Milk', quantity: 1, unit: 'l', recipeId: 'a', factor: 1 },
      { name: 'Milk', quantity: 2, unit: 'cups', recipeId: 'a', factor: 1 },
      { name: 'Salt', quantity: null, unit: null, recipeId: 'a', factor: 1 },
      { name: 'salt', quantity: null, unit: 'pinch', recipeId: 'b', factor: 3 },
    ]);
    expect(lines.map((l) => [l.name, l.quantity, l.unit])).toEqual([
      ['Milk', 2, 'cups'],
      ['Milk', 1, 'l'],
      ['Salt', null, null],
    ]);
  });
  it('sorts by aisle then name and takes the first aisle seen', () => {
    const lines = consolidateIngredients([
      { name: 'Eggs', quantity: 6, unit: null, category: 'dairy & eggs', recipeId: 'a', factor: 1 },
      { name: 'Apples', quantity: 4, unit: null, category: 'produce', recipeId: 'a', factor: 1 },
      { name: 'Flour', quantity: 1, unit: 'kg', category: null, recipeId: 'a', factor: 1 },
      { name: 'Flour', quantity: 1, unit: 'kg', category: 'pantry', recipeId: 'b', factor: 1 },
    ]);
    expect(lines.map((l) => `${l.category}:${l.name}:${l.quantity}`)).toEqual([
      'dairy & eggs:Eggs:6',
      'pantry:Flour:2',
      'produce:Apples:4',
    ]);
  });
});

describe('contributionsForMeals', () => {
  it('uses the entry servings over the recipe base servings', () => {
    const contributions = contributionsForMeals(
      [
        { recipeId: 'r1', servings: 4 },
        { recipeId: null, servings: 2 },
        { recipeId: 'missing', servings: 2 },
      ],
      { r1: { servings: 2, ingredients: [{ name: 'Rice', quantity: 100, unit: 'g' }] } }
    );
    expect(contributions).toEqual([
      { name: 'Rice', quantity: 100, unit: 'g', category: null, recipeId: 'r1', factor: 2 },
    ]);
  });
});

describe('formatQuantity', () => {
  it('reads naturally', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(1.5)).toBe('1.5');
    expect(formatQuantity(0.333)).toBe('0.33');
    expect(formatQuantity(null)).toBe('');
  });
});
