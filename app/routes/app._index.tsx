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
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>{rules.length}</s-heading>
            <s-paragraph>Total rules</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>{activeRules}</s-heading>
            <s-paragraph>Active rules</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
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
            <Link to="/app/bundles/new">Create a bundle rule</Link>
          </s-stack>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {rules.map((rule) => (
              <s-box
                key={rule.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
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
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <Link to={`/app/bundles/${rule.id}`}>Edit</Link>
                      <Form method="post">
                        <input type="hidden" name="id" value={rule.id} />
                        <input
                          type="hidden"
                          name="intent"
                          value={
                            rule.status === "active" ? "deactivate" : "activate"
                          }
                        />
                        <button type="submit">
                          {rule.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </Form>
                      <Form method="post">
                        <input type="hidden" name="id" value={rule.id} />
                        <input type="hidden" name="intent" value="delete" />
                        <button type="submit">Delete</button>
                      </Form>
                    </div>
                  </div>
                  <s-paragraph>
                    {rule.groups.map((group) => group.title).join(" + ")}
                  </s-paragraph>
                </div>
              </s-box>
            ))}
          </div>
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
