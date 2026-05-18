import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { listBundleRules } from "../models/bundle-rule.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rules = await listBundleRules(session.shop);

  return {
    totalRules: rules.length,
    activeRules: rules.filter((rule) => rule.status === "active").length,
    widgetViews: rules.reduce((total, rule) => total + rule.widgetViews, 0),
    successfulAddsToCart: rules.reduce((total, rule) => total + rule.successfulAddsToCart, 0),
  };
};

export default function Index() {
  const { totalRules, activeRules, widgetViews, successfulAddsToCart } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="Mix-and-match bundles">
      <s-button slot="primary-action" href="/app/bundles/new">
        Create bundle
      </s-button>

      <s-section heading="Build discounted bundles without cart transforms">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Create rules that require products from collections, exact products, exact SKUs, or any
            mix of those sources. Active rules power the PDP app block and the discount-function
            runtime.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <Link to="/app/bundles">Manage bundle rules</Link>
            <Link to="/app/bundles/new">Create a new rule</Link>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Pilot metrics">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>{totalRules}</s-heading>
            <s-paragraph>Total rules</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>{activeRules}</s-heading>
            <s-paragraph>Active rules</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>{widgetViews}</s-heading>
            <s-paragraph>Widget views</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>{successfulAddsToCart}</s-heading>
            <s-paragraph>Bundle adds</s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="V1 scope">
        <s-unordered-list>
          <s-list-item>Collection, product, and SKU rule sources</s-list-item>
          <s-list-item>Percentage and fixed amount discounts</s-list-item>
          <s-list-item>PDP app block for relevant offers</s-list-item>
          <s-list-item>Basic cart qualification messaging</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
