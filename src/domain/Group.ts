import { Container } from './Container';
import type { AttributeMap } from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';

const NO_GEOMETRY_ATTRIBUTES: ReadonlySet<string> = new Set();

export class Group extends Container {
  static readonly type = 'g';
  static readonly requiredParams = 0;
  static readonly optionalParams = 0;

  constructor(id: string) {
    super(id);
  }

  readonly tag = 'g';

  static fromArgs(id: string): Group {
    return new Group(id);
  }

  static fromAttributes(id: string, attrs: AttributeMap, _text: string | null): Group {
    const group = new Group(id);
    group.loadCommonAttributes(attrs, NO_GEOMETRY_ATTRIBUTES);
    return group;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitGroup(this);
  }
}
