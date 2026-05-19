const appRoot = document.querySelector<HTMLDivElement>('#app');

if (appRoot === null) {
  throw new Error('Application root element #app was not found.');
}

const appTitle = import.meta.env.VITE_APP_TITLE ?? 'ZeroClaw';

appRoot.innerHTML = `
  <main>
    <h1>${appTitle}</h1>
    <p>Vite and TypeScript are ready.</p>
  </main>
`;
