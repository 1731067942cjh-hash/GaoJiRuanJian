import { describe, expect, it } from 'vitest';
import { AddToCommand } from '../../src/command/AddToCommand';
import { CreateCommand } from '../../src/command/CreateCommand';
import { DeleteCommand } from '../../src/command/DeleteCommand';
import { GroupCommand } from '../../src/command/GroupCommand';
import { History } from '../../src/command/History';
import { MoveCommand } from '../../src/command/MoveCommand';
import { ReorderCommand } from '../../src/command/ReorderCommand';
import { ScaleCommand } from '../../src/command/ScaleCommand';
import { SetCommand } from '../../src/command/SetCommand';
import { UngroupCommand } from '../../src/command/UngroupCommand';
import { Circle } from '../../src/domain/Circle';
import { Document } from '../../src/domain/Document';
import { Group } from '../../src/domain/Group';
import { Rect } from '../../src/domain/Rect';
import { TextShape } from '../../src/domain/TextShape';

function docWithRect(): { document: Document; rect: Rect } {
  const document = new Document(800, 600);
  const rect = new Rect('r1', 10, 20, 30, 40);
  document.appendChild(rect);
  return { document, rect };
}

describe('create / delete', () => {
  it('creates a shape and undoes it', () => {
    const document = new Document(800, 600);
    const rect = new Rect('r1', 0, 0, 10, 10);
    const command = new CreateCommand(rect, document);
    expect(command.execute(document)).toBe('rect#r1 created');
    expect(document.find('r1')).toBe(rect);
    expect(command.undo(document)).toBe('rect#r1 deleted');
    expect(document.find('r1')).toBeUndefined();
  });

  it('deletes and restores at the original position', () => {
    const { document, rect } = docWithRect();
    const other = new Rect('r2', 0, 0, 5, 5);
    document.appendChild(other);
    const command = new DeleteCommand(rect);
    expect(command.execute(document)).toBe('rect#r1 deleted');
    expect(document.children.map((shape) => shape.id)).toEqual(['r2']);
    expect(command.undo(document)).toBe('rect#r1 restored into svg');
    expect(document.children.map((shape) => shape.id)).toEqual(['r1', 'r2']);
  });
});

describe('move / scale / set', () => {
  it('moves and restores absolute geometry', () => {
    const { document, rect } = docWithRect();
    const command = new MoveCommand(rect, 30, -5);
    expect(command.execute(document)).toBe('rect#r1 moved to (40,15)');
    expect(command.undo(document)).toBe('rect#r1 moved back to (10,20)');
    expect(rect.readGeometry()).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('moves a group by moving its descendants', () => {
    const document = new Document(800, 600);
    const group = new Group('g1');
    const rect = new Rect('r1', 10, 20, 30, 40);
    group.appendChild(rect);
    document.appendChild(group);
    const command = new MoveCommand(group, 5, 5);
    expect(command.execute(document)).toBe('g#g1 moved by (5,5)');
    expect(rect.readGeometry()).toEqual({ x: 15, y: 25, width: 30, height: 40 });
    expect(command.undo(document)).toBe('g#g1 moved back by (-5,-5)');
  });

  it('rejects a non-positive scale factor', () => {
    const { rect } = docWithRect();
    expect(() => new ScaleCommand(rect, 0)).toThrow('scale factor must be positive');
    expect(() => new ScaleCommand(rect, -2)).toThrow('scale factor must be positive');
  });

  it('scales a group recursively and restores it', () => {
    const document = new Document(800, 600);
    const group = new Group('g1');
    const rect = new Rect('r1', 10, 20, 30, 40);
    group.appendChild(rect);
    document.appendChild(group);
    const command = new ScaleCommand(group, 2);
    expect(command.execute(document)).toBe('g#g1 scaled by 2 (1 shapes)');
    expect(rect.readGeometry()).toEqual({ x: 20, y: 40, width: 60, height: 80 });
    expect(command.undo(document)).toBe('g#g1 scaled back (1 shapes)');
    expect(rect.readGeometry()).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('sets an attribute and restores the old value', () => {
    const document = new Document(800, 600);
    const text = new TextShape('t1', 0, 0, 'old');
    document.appendChild(text);
    const command = new SetCommand(text, 'text', 'new');
    expect(command.execute(document)).toBe('text#t1 updated: text="new"');
    expect(command.undo(document)).toBe('text#t1 updated: text="old"');
    expect(text.content).toBe('old');
  });

  it('removes an attribute that did not exist before', () => {
    const { document, rect } = docWithRect();
    const command = new SetCommand(rect, 'fill', 'red');
    command.execute(document);
    expect(rect.fill).toBe('red');
    expect(command.undo(document)).toBe('rect#r1 updated: fill unset');
    expect(rect.fill).toBeUndefined();
  });

  it('rejects unknown attributes without changing state', () => {
    const { document, rect } = docWithRect();
    const command = new SetCommand(rect, 'opacity', '0.5');
    expect(() => command.execute(document)).toThrow('unknown attribute: opacity');
    expect(rect.getAttribute('opacity')).toBeUndefined();
  });
});

describe('group / ungroup / addto / reorder', () => {
  function twoRects(): { document: Document; a: Rect; b: Rect } {
    const document = new Document(800, 600);
    const a = new Rect('a', 0, 0, 10, 10);
    const b = new Rect('b', 20, 0, 10, 10);
    document.appendChild(a);
    document.appendChild(b);
    return { document, a, b };
  }

  it('groups shapes in document order and restores their positions', () => {
    const { document, a, b } = twoRects();
    const command = new GroupCommand('g1', [b, a]);
    expect(command.execute(document)).toBe('g#g1 created with 2 children');
    const group = document.find('g1') as Group;
    expect(group.children.map((shape) => shape.id)).toEqual(['a', 'b']);
    expect(document.children.map((shape) => shape.id)).toEqual(['g1']);

    expect(command.undo(document)).toBe('g#g1 removed, 2 children restored');
    expect(document.children.map((shape) => shape.id)).toEqual(['a', 'b']);
    expect(document.find('g1')).toBeUndefined();
  });

  it('rejects grouping a container into its own descendant', () => {
    const document = new Document(800, 600);
    const markers = new Group('markers');
    const circle = new Circle('c1', 0, 0, 1);
    markers.appendChild(circle);
    document.appendChild(markers);
    const command = new GroupCommand('bad', [circle, markers]);
    expect(() => command.execute(document)).toThrow(
      'cannot group a container into its own descendant: markers',
    );
    expect(document.find('markers')).toBe(markers);
  });

  it('ungroups a nested container and undoes it', () => {
    const document = new Document(800, 600);
    const outer = new Group('outer');
    const inner = new Group('inner');
    const rect = new Rect('r1', 0, 0, 10, 10);
    inner.appendChild(rect);
    outer.appendChild(inner);
    document.appendChild(outer);
    const command = new UngroupCommand(inner);
    expect(command.execute(document)).toBe('g#inner ungrouped (1 children)');
    expect(outer.children.map((shape) => shape.id)).toEqual(['r1']);
    expect(command.undo(document)).toBe('g#inner regrouped (1 children)');
    expect(outer.children.map((shape) => shape.id)).toEqual(['inner']);
    expect((outer.children[0] as Group).children.map((shape) => shape.id)).toEqual(['r1']);
  });

  it('refuses to ungroup a top-level container', () => {
    const document = new Document(800, 600);
    const group = new Group('scene');
    document.appendChild(group);
    expect(() => new UngroupCommand(group).execute(document)).toThrow(
      'cannot ungroup top-level container: scene',
    );
  });

  it('moves a shape into a group and back', () => {
    const { document, a } = twoRects();
    const group = new Group('g1');
    document.appendChild(group);
    const command = new AddToCommand(a, group);
    expect(command.execute(document)).toBe('rect#a moved into g#g1');
    expect(group.children.map((shape) => shape.id)).toEqual(['a']);
    expect(command.undo(document)).toBe('rect#a moved back into svg');
    expect(document.children.map((shape) => shape.id)).toEqual(['a', 'b', 'g1']);
  });

  it('refuses to move a container into its own descendant', () => {
    const document = new Document(800, 600);
    const outer = new Group('outer');
    const inner = new Group('inner');
    outer.appendChild(inner);
    document.appendChild(outer);
    expect(() => new AddToCommand(outer, inner).execute(document)).toThrow(
      'cannot add container into its own descendant: outer',
    );
  });

  it('reorders siblings and restores the old index', () => {
    const { document, a } = twoRects();
    const command = new ReorderCommand(a, true);
    expect(command.execute(document)).toBe('rect#a moved to front');
    expect(document.children.map((shape) => shape.id)).toEqual(['b', 'a']);
    expect(command.undo(document)).toBe('rect#a moved back');
    expect(document.children.map((shape) => shape.id)).toEqual(['a', 'b']);
  });
});

describe('history', () => {
  it('undoes and redoes a command', () => {
    const { document, rect } = docWithRect();
    const history = new History();
    const move = new MoveCommand(rect, 5, 0);
    expect(history.run(move, document)).toBe('rect#r1 moved to (15,20)');
    expect(history.undo(document)).toBe('rect#r1 moved back to (10,20)');
    expect(history.redo(document)).toBe('rect#r1 moved to (15,20)');
  });

  it('clears redo after a new edit', () => {
    const { document, rect } = docWithRect();
    const history = new History();
    history.run(new MoveCommand(rect, 5, 0), document);
    history.undo(document);
    history.run(new MoveCommand(rect, 1, 1), document);
    expect(() => history.redo(document)).toThrow('nothing to redo');
  });

  it('locks undo/redo after an IO command until the next edit', () => {
    const { document, rect } = docWithRect();
    const history = new History();
    history.run(new MoveCommand(rect, 5, 0), document);
    history.lock();
    expect(() => history.undo(document)).toThrow('undo not allowed after io command');
    expect(() => history.redo(document)).toThrow('undo not allowed after io command');
    history.run(new MoveCommand(rect, 1, 0), document);
    expect(history.undo(document)).toBe('rect#r1 moved back to (15,20)');
  });

  it('reports empty history', () => {
    const { document } = docWithRect();
    const history = new History();
    expect(() => history.undo(document)).toThrow('nothing to undo');
    expect(() => history.redo(document)).toThrow('nothing to redo');
  });
});

describe('structural edge cases', () => {
  it('deletes a container with its subtree and restores it', () => {
    const document = new Document(800, 600);
    const group = new Group('g1');
    group.appendChild(new Rect('a', 0, 0, 10, 10));
    group.appendChild(new Rect('b', 10, 0, 10, 10));
    document.appendChild(group);
    const command = new DeleteCommand(group);
    command.execute(document);
    expect(document.find('g1')).toBeUndefined();
    expect(document.find('a')).toBeUndefined();
    expect(command.undo(document)).toBe('g#g1 restored into svg');
    expect(document.find('a')?.parent?.id).toBe('g1');
  });

  it('groups across parents and restores both parents on undo', () => {
    const document = new Document(800, 600);
    const left = new Group('left');
    const right = new Group('right');
    const a = new Rect('a', 0, 0, 10, 10);
    const b = new Rect('b', 20, 0, 10, 10);
    left.appendChild(a);
    right.appendChild(b);
    document.appendChild(left);
    document.appendChild(right);
    const command = new GroupCommand('g', [a, b]);
    command.execute(document);
    expect(document.find('a')?.parent?.id).toBe('g');
    expect(document.find('b')?.parent?.id).toBe('g');
    expect(document.find('g')?.parent?.id).toBe('left');
    command.undo(document);
    expect(document.find('a')?.parent?.id).toBe('left');
    expect(document.find('b')?.parent?.id).toBe('right');
    expect(document.find('g')).toBeUndefined();
  });

  it('keeps the group at the position of the first target', () => {
    const document = new Document(800, 600);
    const x = new Rect('x', 0, 0, 1, 1);
    const a = new Rect('a', 1, 0, 1, 1);
    const y = new Rect('y', 2, 0, 1, 1);
    const b = new Rect('b', 3, 0, 1, 1);
    const z = new Rect('z', 4, 0, 1, 1);
    for (const shape of [x, a, y, b, z]) document.appendChild(shape);
    const command = new GroupCommand('g', [a, b]);
    command.execute(document);
    expect(document.children.map((shape) => shape.id)).toEqual(['x', 'g', 'y', 'z']);
    command.undo(document);
    expect(document.children.map((shape) => shape.id)).toEqual(['x', 'a', 'y', 'b', 'z']);
  });

  it('sets style on a container', () => {
    const document = new Document(800, 600);
    const group = new Group('g1');
    document.appendChild(group);
    const command = new SetCommand(group, 'fill', 'red');
    expect(command.execute(document)).toBe('g#g1 updated: fill=red');
    expect(group.fill).toBe('red');
  });
});
