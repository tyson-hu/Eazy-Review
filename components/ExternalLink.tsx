import { Link, type ExternalPathString } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

export type ExternalLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: ExternalPathString;
};

export function ExternalLink({ href, ...props }: ExternalLinkProps) {
  return (
    <Link
      target="_blank"
      {...props}
      href={href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(href);
        }
      }}
    />
  );
}
