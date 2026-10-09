// Browser-only runtime; native dependencies do not include react-dom types.
// @ts-expect-error test harness uses the installed browser runtime
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../src/i18n';
import ProfileScreen from '../src/progress-profile/Profile';
import { actions, FixtureProvider } from './profile-mocks';
import { AvatarFixtureControls } from './avatar-fixture-controls';
void i18n.changeLanguage('it');
Object.assign(window, { profileFixtureActions: actions });
createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <FixtureProvider>
      <AvatarFixtureControls />
      <ProfileScreen />
    </FixtureProvider>
  </I18nextProvider>,
);
