/* global module*/
import * as React from 'react';
import { render } from 'react-dom';
import { LanguagesProvider } from '../Components/Contexts/LanguagesProvider';
import '../css/global.css';
import Layout from './Components/Layout';
import { Theme } from '../Components/Theme';
import { LibrariesLoader } from './Components/LibrariesLoader';
import { ClassesProvider } from '../Components/Contexts/ClassesProvider';
import { FeaturesProvider } from '../Components/Contexts/FeaturesProvider';

function mount() {
  render(
    <FeaturesProvider>
      <LanguagesProvider>
        <ClassesProvider>
          <LibrariesLoader>
            <Theme>
              <Layout />
            </Theme>
          </LibrariesLoader>
        </ClassesProvider>
      </LanguagesProvider>
    </FeaturesProvider>,
    document.getElementById('root'),
  );
}
mount();

if (module.hot) {
  module.hot.accept('./Components/Layout', () => {
    mount();
  });
}
