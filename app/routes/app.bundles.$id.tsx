import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import BundleRuleForm from "../components/bundle-rule-form";
import {
  deleteBundleRule,
  getBundleRule,
  parseBundleRuleFormData,
  updateBundleRule,
} from "../models/bundle-rule.server";
import { authenticate } from "../shopify.server";

const getRuleId = (params: LoaderFunctionArgs["params"] | ActionFunctionArgs["params"]): string => {
  if (!params.id) {
    throw new Response("Bundle rule not found", { status: 404 });
  }

  return params.id;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rule = await getBundleRule(session.shop, getRuleId(params));

  if (!rule) {
    throw new Response("Bundle rule not found", { status: 404 });
  }

  return { rule };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = getRuleId(params);
  const clone = request.clone();
  const formData = await clone.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteBundleRule(session.shop, id);
    return redirect("/app");
  }

  const payload = await parseBundleRuleFormData(request);
  const result = await updateBundleRule(session.shop, id, payload);

  if (!result.success) {
    return { errors: result.errors };
  }

  return redirect(`/app/bundles/${result.rule.id}`);
};

export default function EditBundleRulePage() {
  const { rule } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading={`Edit ${rule.title}`}>
      <Form method="post">
        <BundleRuleForm rule={rule} errors={actionData?.errors} submitLabel="Save bundle" />
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
