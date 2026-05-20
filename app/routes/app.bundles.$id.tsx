import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import BundleRuleForm from "../components/bundle-rule-form";
import { syncBundleDiscount } from "../models/bundle-discount-sync.server";
import {
  deleteBundleRule,
  getBundleRule,
  listActiveBundleRules,
  parseBundleRuleFormData,
  updateBundleRule,
} from "../models/bundle-rule.server";
import { authenticate } from "../shopify.server";
import { resolveResourceTitles } from "../lib/resource-resolver.server";

const getRuleId = (params: LoaderFunctionArgs["params"] | ActionFunctionArgs["params"]): string => {
  if (!params.id) {
    throw new Response("Bundle rule not found", { status: 404 });
  }

  return params.id;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const rule = await getBundleRule(session.shop, getRuleId(params));

  if (!rule) {
    throw new Response("Bundle rule not found", { status: 404 });
  }

  const allIds = new Set<string>();
  rule.triggerProductIds.forEach(id => allIds.add(id));
  rule.triggerCollectionIds.forEach(id => allIds.add(id));
  rule.excludedProductIds.forEach(id => allIds.add(id));
  rule.excludedCollectionIds.forEach(id => allIds.add(id));
  
  rule.groups.forEach(group => {
    group.eligibility.forEach(e => {
      if (e.type === 'product') {
        e.productIds.forEach(id => allIds.add(id));
        e.variantIds.forEach(id => allIds.add(id));
      } else if (e.type === 'collection') {
        e.collectionIds.forEach(id => allIds.add(id));
      }
    });
  });

  const resourceTitles = await resolveResourceTitles(admin, Array.from(allIds));

  return { rule, resourceTitles };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const id = getRuleId(params);
  const clone = request.clone();
  const formData = await clone.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteBundleRule(session.shop, id);
    const activeRules = await listActiveBundleRules(session.shop);
    const syncResult = await syncBundleDiscount({ shop: session.shop, admin, activeRules });

    if (!syncResult.success) {
      return { errors: syncResult.errors };
    }

    return redirect("/app");
  }

  const payload = await parseBundleRuleFormData(request);
  const result = await updateBundleRule(session.shop, id, payload);

  if (!result.success) {
    return { errors: result.errors };
  }

  const activeRules = await listActiveBundleRules(session.shop);
  const syncResult = await syncBundleDiscount({ shop: session.shop, admin, activeRules });

  if (!syncResult.success) {
    return { errors: syncResult.errors };
  }

  return redirect(`/app/bundles/${result.rule.id}`);
};

export default function EditBundleRulePage() {
  const { rule, resourceTitles } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading={`Edit ${rule.title}`}>
      <Form method="post">
        <BundleRuleForm rule={rule} resourceTitles={resourceTitles} errors={actionData?.errors} submitLabel="Save bundle" />
      </Form>
      <s-section slot="aside" heading="Danger zone">
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <s-button variant="primary" tone="critical" type="submit">Delete bundle rule</s-button>
        </Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
