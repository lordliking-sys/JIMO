import { useAccount } from './profile-mocks';
export function AvatarFixtureControls() {
  const account = useAccount();
  Object.assign(window, { profileFixtureLoginAs: account.loginAs });
  return null;
}
