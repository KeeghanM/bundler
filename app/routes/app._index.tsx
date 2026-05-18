import { boundary } from "@shopify/shopify-app-react-router/server";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import {
  deleteBundleRule,
  listBundleRules,
  setBundleRuleStatus,
} from "../models/bundle-rule.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rules = await listBundleRules(session.shop);

  return { rules };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  if (typeof id !== "string") {
    return { errors: ["Bundle rule ID is missing."] };
  }

  if (intent === "delete") {
    await deleteBundleRule(session.shop, id);
    return { errors: [] };
  }

  if (intent === "activate" || intent === "deactivate") {
    const result = await setBundleRuleStatus(
      session.shop,
      id,
      intent === "activate" ? "active" : "draft",
    );

    return result.success ? { errors: [] } : { errors: result.errors };
  }

  return { errors: ["Unsupported bundle action."] };
};

export default function BundleRulesPage() {
  const { rules } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const activeRules = rules.filter((rule) => rule.status === "active").length;

  return (
    <s-page heading="Bundle rules">
      <s-button slot="primary-action" href="/app/bundles/new">
        Create bundle
      </s-button>

      {actionData?.errors && actionData.errors.length > 0 && (
        <s-section heading="Action failed">
          <s-unordered-list>
            {actionData.errors.map((error) => (
              <s-list-item key={error}>{error}</s-list-item>
            ))}
          </s-unordered-list>
        </s-section>
      )}

      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>{rules.length}</s-heading>
            <s-paragraph>Total rules</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>{activeRules}</s-heading>
            <s-paragraph>Active rules</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>
              {rules.reduce(
                (total, rule) => total + rule.successfulAddsToCart,
                0,
              )}
            </s-heading>
            <s-paragraph>Bundle adds</s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Rules">
        {rules.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Create your first mix-and-match bundle to combine collections,
              products, and SKUs.
            </s-paragraph>
            <s-link href="/app/bundles/new">Create a bundle rule</s-link>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            {rules.map((rule) => (
              <s-box
                key={rule.id}
                padding="base"
                border="base"
                border-radius="base"
              >
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base" align-items="center" style={{ justifyContent: "space-between" }}>
                    <div>
                      <s-heading>{rule.title}</s-heading>
                      <s-paragraph>
                        {rule.status === "active" ? "Active" : "Draft"} ·{" "}
                        {rule.groups.length} groups ·{" "}
                        {rule.discount.type === "percentage"
                          ? `${rule.discount.value}% off`
                          : `${rule.discount.value} off`}
                      </s-paragraph>
                    </div>
                    <s-stack direction="inline" gap="base" align-items="center">
                      <s-link href={`/app/bundles/${rule.id}`}>Edit</s-link>
                      <Form method="post">
                        <input type="hidden" name="id" value={rule.id} />
                        <input
                          type="hidden"
                          name="intent"
                          value={
                            rule.status === "active" ? "deactivate" : "activate"
                          }
                        />
                        <s-button type="submit">
                          {rule.status === "active" ? "Deactivate" : "Activate"}
                        </s-button>
                      </Form>
                      <Form method="post">
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="intent" value="delete" />
                        <s-button type="submit" variant="tertiary" tone="critical">Delete</s-button>
                      </Form>
                    </s-stack>
                  </s-stack>
                  <s-paragraph>
                    {rule.groups.map((group) => group.title).join(" + ")}
                  </s-paragraph>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Runtime status">
        <s-paragraph>
          Active rules are exposed to the PDP widget API and discount-function
          runtime config.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
