# Mix-and-match bundle implementation plan

Source requirement: `docs/mix-and-match-bundle-discount-prd.md`, recommended v1 scope.

## Plan

1. Admin rule management: replace the template demo with bundle rule list/create/edit/delete/activate flows for collection, product, variant, and SKU eligibility.
2. Shared rule contract: keep validation, persistence mapping, PDP relevance, cart messaging, and discount qualification on the same `BundleRule` shape.
3. Runtime APIs: expose active relevant rules to the PDP block, cart qualification messages, and light event counters.
4. Discount function scaffold: evaluate all active rules from one function-owned config payload and target qualifying cart lines only.
5. Theme app extension: provide a PDP app block that hides on unrelated products, renders relevant offers, collects missing variant selections, and adds bundle items to cart.
6. Verification: cover bundle matching behavior with tests and run type/build validation.

## To-do trace

- [x] PRD 6.1, 10.1: Bundle rule data model and admin CRUD.
- [x] PRD 6.2, 10.2: PDP widget app block scaffold and relevant-rule API.
- [x] PRD 6.3, 10.3: Shared discount qualification engine and function scaffold.
- [x] PRD 6.4: Basic cart messaging API.
- [x] PRD 12: Light widget/add-to-cart/discount metric counters.
- [x] Production hardening: wire automatic discount creation/sync once the Shopify function extension ID is available after deployment.
- [x] Pilot fixes: sync Function input variables, refresh cart sections after PDP widget add-to-cart, and polish lowercase/centered carousel presentation.

## Runtime notes

- Set `SHOPIFY_BUNDLE_DISCOUNT_FUNCTION_ID` in the app environment to the deployed Discount Function ID before activating rules.
- Re-authorize the app after deploying the updated `read_discounts,write_discounts` scopes in `shopify.app.toml`.
- The Function reads `discount.metafield(namespace: "$app:bundler", key: "bundle_rules")`; the same JSON metafield supplies both `rules` and the `collectionIds` input-query variable.
