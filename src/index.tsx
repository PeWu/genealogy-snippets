import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Button, Card } from 'semantic-ui-react';
import { DataEntry, ExtensionMessage, Page } from './data_entry';
import { Fact, Person } from './gedcomx';
import { render } from 'react-dom';
import { useEffect, useState } from 'react';
import 'fomantic-ui-css/semantic.css';

/** Stores data list in local storage. */
function storeList(list: DataEntry[]) {
  localStorage.setItem('list', JSON.stringify(list));
}

/** Retrieves data list from local storage. */
function retrieveList(): DataEntry[] {
  return JSON.parse(localStorage.getItem('list') || '[]');
}

function getDisplayName(person: Person) {
  const nameForm = person.names[0].nameForms[0];
  if (nameForm.fullText) {
    return nameForm.fullText;
  }
  return nameForm.parts?.map((part) => part.value).join(' ');
}

/** Returns the domain name without the www. prefix for a given URL. */
function getDomain(url: string) {
  return url.replace(/.*:\/\/(www\.)?([^/]*)\/.*/, '$2');
}

function PersonLink(props: { person: Person }) {
  return (
    <>
      <a href="#">{getDisplayName(props.person) || '[unknown]'}</a>,{' '}
    </>
  );
}

function FactDescription(props: { fact: Fact }) {
  return (
    <p>
      <b>
        {props.fact.type
          .replace(/.*\//g, '')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^ /, '')}
        :{' '}
      </b>
      {[props.fact.value, props.fact.date?.original, props.fact.place?.original]
        .filter((x) => !!x)
        .join('; ')}
    </p>
  );
}

interface PersonEntry {
  page: Page;
  person: Person;
  parents?: Person[];
  children?: Person[];
  spouses?: Person[];
  siblings?: Person[];
}

function PersonEntryDescription(props: { entry: PersonEntry }) {
  return (
    <Card style={{ width: 500 }}>
      <Card.Content
        header={getDisplayName(props.entry.person) || '[unknown]'}
        style={{ width: 500 }}
      />
      <Card.Content>
        {props.entry.person.facts?.map((fact) => (
          <FactDescription fact={fact} />
        ))}
      </Card.Content>
      <Card.Content>
        {props.entry.parents ? (
          <p>
            <b>Parents: </b>
            {props.entry.parents?.map((person) => (
              <PersonLink person={person} />
            ))}
          </p>
        ) : null}
        {props.entry.spouses ? (
          <p>
            <b>Spouses: </b>
            {props.entry.spouses?.map((person) => (
              <PersonLink person={person} />
            ))}
          </p>
        ) : null}
        {props.entry.children ? (
          <p>
            <b>Children: </b>
            {props.entry.children?.map((person) => (
              <PersonLink person={person} />
            ))}
          </p>
        ) : null}
        {props.entry.siblings ? (
          <p>
            <b>Siblings: </b>
            {props.entry.siblings?.map((person) => (
              <PersonLink person={person} />
            ))}
          </p>
        ) : null}
      </Card.Content>
      <Card.Content extra>
        <a href={props.entry.page.url}>
          <img
            src={props.entry.page.favicon}
            style={{ width: 16, height: 16, marginRight: 5 }}
          />
          {getDomain(props.entry.page.url)}
        </a>
      </Card.Content>
    </Card>
  );
}

function addToMultiMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key) || [];
  list.push(value);
  map.set(key, list);
}

/**
 * Displays one PersonEntry per person together with their closest family,
 * i.e. parents, children and siblings. Seperate entries are not displayed
 * for people included as close family.
 */
function Entry(props: { entry: DataEntry }) {
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const spouses = new Map<string, string[]>();
  props.entry.data.relationships?.forEach((relationship) => {
    const p1 = relationship.person1.resource.substring(1);
    const p2 = relationship.person2.resource.substring(1);
    if (relationship.type === 'http://gedcomx.org/Couple') {
      addToMultiMap(spouses, p1, p2);
      addToMultiMap(spouses, p2, p1);
    } else if (relationship.type === 'http://gedcomx.org/ParentChild') {
      addToMultiMap(children, p1, p2);
      addToMultiMap(parents, p2, p1);
    }
  });
  const nonUniqueSiblings = new Map<string, string[]>();
  children.forEach((value) =>
    value.forEach((child) =>
      value.forEach((person) => {
        if (child !== person) {
          addToMultiMap(nonUniqueSiblings, child, person);
        }
      })
    )
  );
  const siblings = new Map<string, string[]>();
  nonUniqueSiblings.forEach((value, key) =>
    siblings.set(key, Array.from(new Set(value)))
  );

  const seen = new Set<string>();
  const personEntries: PersonEntry[] = [];

  const people = new Map<string, Person>();
  props.entry.data.persons?.forEach((person) => people.set(person.id, person));

  props.entry.data.persons?.forEach((person) => {
    if (seen.has(person.id)) {
      return;
    }
    const entry: PersonEntry = {
      page: props.entry.page,
      person,
      children: children
        .get(person.id)
        ?.map((id) => people.get(id)!)
        .filter((x) => !!x),
      parents: parents
        .get(person.id)
        ?.map((id) => people.get(id)!)
        .filter((x) => !!x),
      spouses: spouses
        .get(person.id)
        ?.map((id) => people.get(id)!)
        .filter((x) => !!x),
      siblings: siblings
        .get(person.id)
        ?.map((id) => people.get(id)!)
        .filter((x) => !!x),
    };
    entry.children?.forEach((x) => seen.add(x.id));
    entry.parents?.forEach((x) => seen.add(x.id));
    entry.spouses?.forEach((x) => seen.add(x.id));
    entry.siblings?.forEach((x) => seen.add(x.id));
    seen.add(person.id);
    personEntries.push(entry);
  });

  return (
    <>
      {personEntries.map((entry) => (
        <PersonEntryDescription entry={entry} key={entry.person.id} />
      ))}
    </>
  );
}

/** Main application component displaying the list of person entries. */
function App() {
  const [list, setList] = useState<DataEntry[]>([]);

  useEffect(() => setList(retrieveList()), []);

  function handleStorageEvent(event: StorageEvent) {
    if (event.key === 'list') {
      setList(retrieveList());
    }
  }

  useEffect(() => {
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [handleStorageEvent]);

  function handleClear() {
    storeList([]);
    setList([]);
  }

  return (
    <>
      <h1>Genealogy Snippets</h1>
      <Button color="red" onClick={handleClear}>
        Clear all
      </Button>
      {list.map((entry) => (
        <Entry entry={entry} key={entry.page.url} />
      ))}
    </>
  );
}

/**
 * Handles communication with the browser extension.
 * The extension opens this view in an iframe.
 */
function ExtensionIframe() {
  /** Adds data to list sent from extension. */
  function handleMessage(event: MessageEvent<ExtensionMessage>) {
    const list = retrieveList();
    const urls = list.map((entry) => entry.page.url);
    let added = false;
    for (const data of event.data.data) {
      if (!urls.includes(data.page.url)) {
        list.push(data);
        added = true;
      }
    }
    storeList(list);
    // Respond to extension whether the data was added or not.
    window.parent.postMessage({ response: added ? 'added' : 'not_added' }, '*');
  }

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return <h1>Extension iframe</h1>;
}

render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="extension-iframe" element={<ExtensionIframe />} />
    </Routes>
  </BrowserRouter>,
  document.querySelector('#root')
);
