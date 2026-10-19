import { describe, expect, it } from 'vitest';
import { ShapeFactory } from '../../src/shape/ShapeFactory';
import { Tokenizer } from '../../src/cli/Tokenizer';

describe('Tokenizer', () => {
  const tokenizer = new Tokenizer();

  it('splits whitespace and keeps quoted groups', () => {
    expect(tokenizer.tokenize('create text t 0 0 "hello world"')).toEqual([
      'create',
      'text',
      't',
      '0',
      '0',
      'hello world',
    ]);
  });

  it('treats a leading hash as a comment but not a colour', () => {
    expect(tokenizer.tokenize('# comment')).toEqual([]);
    expect(tokenizer.tokenize('   # comment')).toEqual([]);
    expect(tokenizer.tokenize('create rect r 0 0 10 10 #ffffff')).toContain('#ffffff');
  });

  it('handles escaped quotes inside quoted arguments', () => {
    expect(tokenizer.tokenize('set t text "say \\"hi\\""')).toEqual([
      'set',
      't',
      'text',
      'say "hi"',
    ]);
  });

  it('keeps an empty quoted argument', () => {
    expect(tokenizer.tokenize('set t text ""')).toEqual(['set', 't', 'text', '']);
  });

  it('rejects an unterminated quote', () => {
    expect(() => tokenizer.tokenize('create text t 0 0 "oops')).toThrow('unterminated quote');
  });

  it('returns no tokens for a blank line', () => {
    expect(tokenizer.tokenize('   ')).toEqual([]);
  });
});

describe('ShapeFactory', () => {
  const factory = new ShapeFactory();

  it('creates every built-in shape from command arguments', () => {
    expect(factory.createFromArgs('rect', 'r', ['0', '0', '10', '20']).tag).toBe('rect');
    expect(factory.createFromArgs('circle', 'c', ['1', '2', '3']).tag).toBe('circle');
    expect(factory.createFromArgs('ellipse', 'e', ['1', '2', '3', '4']).tag).toBe('ellipse');
    expect(factory.createFromArgs('line', 'l', ['0', '0', '1', '1']).tag).toBe('line');
    expect(factory.createFromArgs('text', 't', ['0', '0', 'hi']).tag).toBe('text');
    expect(factory.createFromArgs('g', 'g', []).tag).toBe('g');
  });

  it('reports unknown types with the plugin hint', () => {
    expect(() => factory.createFromArgs('box', 'b', [])).toThrow(
      'unknown shape type: box (is the plugin loaded?)',
    );
  });

  it('validates argument counts', () => {
    expect(() => factory.createFromArgs('rect', 'r', ['0', '0', '10'])).toThrow(
      'invalid number of parameters for rect',
    );
    expect(() => factory.createFromArgs('text', 't', ['0', '0'])).toThrow(
      'invalid number of parameters for text',
    );
    expect(() => factory.createFromArgs('g', 'g', ['extra'])).toThrow(
      'invalid number of parameters for g',
    );
  });

  it('accepts optional fill/stroke arguments', () => {
    const rect = factory.createFromArgs('rect', 'r', ['0', '0', '1', '1', 'red']);
    expect(rect.getAttribute('fill')).toBe('red');
    const line = factory.createFromArgs('line', 'l', ['0', '0', '1', '1', 'black']);
    expect(line.getAttribute('stroke')).toBe('black');
  });
});
