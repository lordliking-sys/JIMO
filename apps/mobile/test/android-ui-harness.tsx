import { Children, Fragment, createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DateField } from '../src/programs/DateField';
import { ProgramBackgroundWash } from '../src/programs/ProgramBackgroundWash';
import extractGradient from './native-gradient-parser';
import { device, resetDevice, programInk } from './android-ui-fixture';
export { device, resetDevice };
export function openDate(value: string, changes: string[]) {
  resetDevice();
  renderToStaticMarkup(
    <DateField value={value} onChange={(date) => changes.push(date)} />,
  );
  device.buttons.find((b) => b.accessibilityLabel?.startsWith('startsOn:'))!
    .onPress!();
}
export function nativeGradient(dark: boolean) {
  const svg = ProgramBackgroundWash({
    id: 'test-wash',
    height: 330,
    dark,
    palette: programInk,
  });
  const defs = (svg.props as { children: ReactElement[] }).children[0]!;
  const gradient = (
    defs.props as {
      children: ReactElement<Parameters<typeof extractGradient>[0]>;
    }
  ).children;
  return extractGradient(gradient.props, {});
}
export function fragmentRegression() {
  const fragment = createElement(
    Fragment,
    {},
    createElement('Stop', { offset: 0.45, stopColor: programInk.paper }),
  );
  return extractGradient({ id: 'old-wash', children: [fragment] }, {});
}
export function stopTypes(dark: boolean) {
  return Children.toArray(nativeGradient(dark)!.children).map(
    (c) => (c as ReactElement).type,
  );
}
