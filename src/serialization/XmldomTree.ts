import { DOMParser, type Element } from '@xmldom/xmldom';
import { XmlParseError } from './XmlParseError';
import type { XmlElement, XmlTreeParser } from './XmlTree';

/** Adapter that hides @xmldom/xmldom behind the small XmlTree port. */
export class XmldomTree implements XmlTreeParser {
  parse(source: string): XmlElement {
    const errors: string[] = [];
    const parser = new DOMParser({
      onError: (level, message) => {
        if (level !== 'warning') {
          errors.push(message);
        }
      },
    });

    let document: ReturnType<DOMParser['parseFromString']>;
    try {
      document = parser.parseFromString(source, 'text/xml');
    } catch (error) {
      throw new XmlParseError(error instanceof Error ? error.message : String(error));
    }
    if (errors.length > 0) {
      throw new XmlParseError(errors.join('; '));
    }
    const root = document.documentElement;
    if (root === null || root === undefined) {
      throw new XmlParseError('missing root element');
    }
    return this.convert(root);
  }

  private convert(node: Element): XmlElement {
    const attributes = new Map<string, string>();
    for (let index = 0; index < node.attributes.length; index += 1) {
      const attribute = node.attributes.item(index);
      if (attribute !== null) {
        attributes.set(attribute.name, attribute.value);
      }
    }

    const children: XmlElement[] = [];
    let text = '';
    for (let child = node.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === 1) {
        children.push(this.convert(child as Element));
      } else if (child.nodeType === 3 || child.nodeType === 4) {
        text += child.nodeValue ?? '';
      }
    }

    return {
      tagName: node.localName ?? node.nodeName,
      attributes,
      text,
      children,
    };
  }
}
