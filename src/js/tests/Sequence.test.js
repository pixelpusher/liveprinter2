/**
* @vitest-environment jsdom
*/

import { default as Sequence } from '../Sequence.js';
import { expect, test, describe } from 'vitest';

describe('Sequence', () => {
    test('should accept an array', () => {
        const seq = new Sequence([1, 2, 3]);
        expect(seq.length).toBe(3);
        expect(seq.array).toEqual([1, 2, 3]);
    });
    test('should accept a single note string', () => {
        const seq = new Sequence('c4');
        expect(seq.length).toBe(1);
        expect(seq.array).toEqual(["c4"]);
        seq.set('c5');
        expect(seq.length).toBe(1);
        expect(seq.array).toEqual(["c5"]);
    });
    test('should accept a comma-separated string', () => {
        const seq = new Sequence('a,b,c');
        expect(seq.length).toBe(3);
        expect(seq.array).toEqual(['a', 'b', 'c']);
    });
    
    test('should accept a space-separated string', () => {
        const seq = new Sequence('x y z');
        expect(seq.length).toBe(3);
        expect(seq.get(1)).toBe('y');
    });
    
    test('should accept a strudel pattern string', () => {
        const seq = new Sequence('[1 2 3]', 3);
        expect(seq.length).toBe(3);
        expect(seq.get(2)).toEqual(['3', '1b']);
        
    });
    
    test('should handle nested patterns', () => {
        const seq = new Sequence('[1 [2 3] 4]');
        expect(seq.length).toBe(4);
    });
    
    test('should handle numeric sequences', () => {
        const seq = new Sequence('1 2 3 4 5');
        expect(seq.length).toBe(5);
    });
    
    test('should handle multiple elements', () => {
        const seq = new Sequence('1', '2', '3', '4', '5');
        expect(seq.length).toBe(5);
    });
    
    test('should handle mixed types', () => {
        const seq = new Sequence(['note1', 0.5, 'note2']);
        expect(seq.length).toBe(3);
    });
    
    test('should handle empty input gracefully', () => {
        const seq = new Sequence([]);
        expect(seq.length).toBe(0);
    });
});