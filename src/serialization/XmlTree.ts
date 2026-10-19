/** A minimal element tree, independent from the XML library in use. */
export interface XmlElement {
  readonly tagName: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly text: string;
  readonly children: readonly XmlElement[];
}

export interface XmlTreeParser {
  parse(source: string): XmlElement;
}
