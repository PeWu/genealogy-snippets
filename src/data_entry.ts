import { GedcomXData } from './gedcomx';

export interface Page {
  url: string;
  favicon: string;
  title: string;
}

export interface DataEntry {
  page: Page;
  data: GedcomXData;
}

export interface ExtensionMessage {
  message: 'addData';
  data: DataEntry[];
}
