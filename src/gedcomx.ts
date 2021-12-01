export interface Date {
  original: string;
}

export interface PlaceReference {
  original: string;
}

export interface Fact {
  type: string;
  value: string;
  date: Date;
  place: PlaceReference;
}

export interface NamePart {
  value: string;
}

export interface NameForm {
  fullText: string;
  parts: NamePart[];
}

export interface Name {
  nameForms: NameForm[];
}

export interface Person {
  id: string;
  names: Name[];
  facts: Fact[];
}

export interface ResourceReference {
  resource: string;
}

export interface Relationship {
  type: string;
  person1: ResourceReference;
  person2: ResourceReference;
}

export interface GedcomXData {
  persons: Person[];
  relationships: Relationship[];
}
