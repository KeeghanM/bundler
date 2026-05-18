declare module "*.css";

import type * as React from "react";

type ShopifyElementProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  [key: string]: unknown;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: `s-${string}`]: ShopifyElementProps;
    }
  }
}
