// @ts-expect-error test harness uses the installed browser runtime
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../src/i18n';
import { AuthForm } from '../src/auth/AuthForm';
import { actions, fixture } from './password-mocks';
const query = new URLSearchParams(location.search);
void i18n.changeLanguage(query.get('locale') === 'en' ? 'en' : 'it');
Object.assign(window, { passwordFixture: fixture, passwordActions: actions });
createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <AuthForm mode={query.has('reset') ? 'forgot-password' : 'sign-up'} />
  </I18nextProvider>,
);
