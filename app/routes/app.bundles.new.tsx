import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import BundleRuleForm from "../components/bundle-rule-form";
import { createBundleRule, parseBundleRuleFormData } from "../models/bundle-rule.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return {};
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const payload = await parseBundleRuleFormData(request);
  const result = await createBundleRule(session.shop, payload);

  if (!result.success) {
    return { errors: result.errors };
  }

  return redirect(`/app/bundles/${result.rule.id}`);
};

export default function NewBundleRulePage() {
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading="Create bundle rule">
      <Form method="post">
        <BundleRuleForm errors={actionData?.errors} submitLabel="Create bundle" />
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
