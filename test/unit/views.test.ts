import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle';
import { Document } from '../../src/domain/Document';
import { Group } from '../../src/domain/Group';
import { Line } from '../../src/domain/Line';
import { Rect } from '../../src/domain/Rect';
import { TextShape } from '../../src/domain/TextShape';
import { HELP_LINES } from '../../src/view/HelpText';
import { ShowRenderer } from '../../src/view/ShowRenderer';
import { TreeRenderer } from '../../src/view/TreeRenderer';

function sampleDocument(): { document: Document; group: Group; circle: Circle } {
  const document = new Document(800, 600);
  const bg = new Rect('bg', 0, 0, 800, 600, '#ffffff');
  const title = new TextShape('title', 20, 40, 'My Diagram');
  const group = new Group('markers');
  const circle = new Circle('c1', 100, 100, 20, 'red');
  const box = new Rect('box', 200, 80, 60, 60, '#3366ff');
  group.appendChild(circle);
  group.appendChild(box);
  document.appendChild(bg);
  document.appendChild(title);
  document.appendChild(group);
  return { document, group, circle };
}

describe('TreeRenderer', () => {
  it('matches the documented tree format', () => {
    const { document } = sampleDocument();
    expect(new TreeRenderer().render(document)).toEqual([
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('renders a subtree without the svg header', () => {
    const { group } = sampleDocument();
    expect(new TreeRenderer().renderSubtree(group)).toEqual([
      'g#markers',
      '├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('prints line endpoints and does not print stroke in the tree', () => {
    const document = new Document(400, 200);
    const line = new Line('arrow1', 280, 130, 520, 130, 'black');
    document.appendChild(line);
    expect(new TreeRenderer().render(document)).toEqual([
      'svg (400x200)',
      '└── line#arrow1  (280,130) -> (520,130)',
    ]);
  });
});

describe('ShowRenderer', () => {
  it('shows geometry, style and parent', () => {
    const { circle } = sampleDocument();
    expect(new ShowRenderer().render(circle)).toEqual([
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('shows a group child count', () => {
    const { group } = sampleDocument();
    expect(new ShowRenderer().render(group)).toEqual([
      'g#markers  parent=svg',
      '  children=2',
    ]);
  });

  it('shows text content and preserved extras', () => {
    const document = new Document(100, 100);
    const text = new TextShape('t1', 10, 20, 'Hello');
    text.setExtra('font-size', '16');
    document.appendChild(text);
    expect(new ShowRenderer().render(text)).toEqual([
      'text#t1  parent=svg',
      '  x=10 y=20',
      '  text="Hello"',
      '  font-size=16',
    ]);
  });
});

describe('help', () => {
  it('documents every command group', () => {
    const help = HELP_LINES.join('\n');
    for (const command of [
      'init',
      'read',
      'save',
      'canvas',
      'create',
      'delete',
      'move',
      'scale',
      'set',
      'group',
      'ungroup',
      'addto',
      'front',
      'back',
      'tree',
      'show',
      'help',
      'undo',
      'redo',
    ]) {
      expect(help).toContain(command);
    }
  });
});
