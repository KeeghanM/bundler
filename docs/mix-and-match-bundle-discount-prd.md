# PRD: Mix-and-match bundle discount app for Shopify
## 1. Overview

Build a Shopify app that lets a merchant create bundle offers where customers can select qualifying products from different product groups, usually collections, exact products, or SKUs, and receive an automatic discount when the cart meets the rule.

The first version should use a discount-led approach rather than a true cart-transform bundle. Products remain as normal cart lines, while a Shopify Discount Function applies the saving at cart/checkout when the selected items qualify. Shopify's Discount Function API supports custom discounts across cart lines, order subtotal, and shipping rates, and is the right fit for this MVP.

The app will also provide a product detail page widget so merchants can promote relevant bundle offers directly on PDPs, for example:

"Add shorts and sunglasses to complete the summer bundle and get 15% off."

The bundle logic should support both broad mix-and-match rules and exact product selection. These should be interchangeable, so a merchant can create rules such as:

- "SKU 1234 and any product from T-Shirts"
- "SKU 1234 and SKU 5678"
- "Any product from T-Shirts and any product from Shorts"

## 2. Goals

The app should allow merchants to:

Create mix-and-match bundle rules.
Define required product groups, such as "1 item from T-shirts, 1 item from Shorts, 1 item from Accessories".
Define exact product or SKU requirements.
Combine collection-based requirements with exact product/SKU requirements.
Apply a percentage or fixed discount when the cart qualifies.
Show relevant bundle offers on product detail pages.
Let customers add the missing bundle items from the PDP widget.
Apply the discount automatically through checkout.
Manage bundle rules from an embedded Shopify admin app.
## 3. Non-goals for v1

The first version should not attempt to:

Merge bundle items into a single cart line.
Create native Shopify bundle products.
Override individual product prices directly.
Support complex subscription bundles.
Support fixed bundle pricing unless it proves simple during the spike.
Provide deep analytics beyond basic bundle rule status and usage count.
Support every possible theme/cart drawer integration.

Cart presentation changes, merged bundle lines, and price manipulation belong more to Shopify Cart Transform Functions. Shopify's Cart Transform API is specifically for changing pricing and presentation of cart items, but some operations, such as line updates, can have Shopify Plus limitations, so this should not be the v1 foundation for a non-Plus store.

## 4. Target users
Merchant / store admin

A Shopify merchant who wants to create merchandising-led bundle offers without needing Shopify Plus.

Example needs:

"Create a summer outfit bundle."
"Let customers pick any T-shirt, any shorts, and any cap."
"Give 15% off if all three categories are represented in the cart."
"Create a bundle for SKU 1234 and SKU 5678."
"Create a bundle for SKU 1234 and any item from T-Shirts."
"Show this offer on relevant product pages."
Customer

A shopper browsing a product page who can be encouraged to add related products to unlock a discount.

Example behaviour:

Customer views a T-shirt PDP.
Widget shows: "Complete the summer bundle."
Customer selects shorts and sunglasses.
App adds all selected items to cart.
Discount appears in cart/checkout once requirements are met.
## 5. Core use case
Bundle example

Bundle name: Summer outfit bundle
Rule: Buy 1 T-shirt, 1 pair of shorts, and 1 accessory
Discount: 15% off bundle items
Display: Show on eligible T-shirt, shorts, and accessory PDPs
Eligibility:

Group 1: products from "T-shirts" collection
Group 2: products from "Shorts" collection
Group 3: products from "Accessories" collection

Exact product/SKU bundle example

Bundle name: Signature set bundle
Rule: Buy SKU 1234 and SKU 5678
Discount: £10 off bundle items
Display: Show on PDPs for either exact product/SKU
Eligibility:

Group 1: SKU 1234
Group 2: SKU 5678

Mixed exact and collection bundle example

Bundle name: Hero tee bundle
Rule: Buy SKU 1234 and any item from the "T-Shirts" collection
Discount: 15% off bundle items
Display: Show on the SKU 1234 PDP and eligible T-Shirt PDPs
Eligibility:

Group 1: SKU 1234
Group 2: any product from "T-Shirts" collection

Customer flow
Customer lands on a T-shirt PDP.
PDP widget detects that the product belongs to an active bundle rule.
Widget shows the current product as selected.
Widget prompts the customer to choose one item from the missing groups.
Customer selects shorts and an accessory.
Customer clicks "Add bundle to cart".
App adds selected variants to cart.
Discount Function checks cart contents.
If all requirements are met, discount is applied to qualifying cart lines.
Cart/checkout shows the discount.
## 6. Product requirements
### 6.1 Bundle rule management

The merchant must be able to create, edit, activate, deactivate, and delete bundle rules.

Fields
| Field | Requirement |
|---|---|
| Bundle name | Required |
| Status | Draft / active |
| Bundle description | Optional |
| Trigger products | Optional |
| Trigger collections | Optional |
| Required groups | Required, minimum 2 |
| Discount type | Required |
| Discount value | Required |
| Discount applies to | Required |
| Start date | Optional |
| End date | Optional |
| Excluded products | Optional |
| Excluded collections | Optional |
| Allow multiple applications | Optional |
| Priority | Optional, for conflict handling |
Required group configuration

Each bundle group should support:

| Field | Requirement |
|---|---|
| Group name | Required |
| Eligibility rules | Collection, exact product, exact SKU, or mixed |
| Source IDs | Required |
| Minimum quantity | Required, default 1 |
| Maximum quantity | Optional |
| Variant selection required | Yes |
| Allow sale items | Optional |
| Allow out-of-stock items | No by default |

Each required group should allow the merchant to define eligibility using one or more interchangeable source rules.

A group can be configured as:

- Any product from one or more collections.
- One or more exact products.
- One or more exact SKUs.
- A combination of collection, product, and SKU-based eligibility.

Examples:

- "SKU 1234 and any product from T-Shirts"
- "SKU 1234 and SKU 5678"
- "Any product from T-Shirts and any product from Shorts"
- "SKU 1234 and any product from Accessories"

The rule builder should let merchants mix exact product selection and collection-based selection within the same bundle rule. This gives merchants the flexibility to create broad merchandising bundles as well as tightly controlled product pairings.

Discount configuration

Supported in v1:

Percentage discount, for example 15% off.
Fixed amount discount, for example £10 off.

Possible later:

Fixed bundle price.
Cheapest item free.
Tiered bundle discount.
Subscription-specific discount.

For v1, discount should apply to qualifying bundle items only, not the whole order.

### 6.2 PDP bundle widget

The app must expose a theme app extension/app block that merchants can place on product pages. Shopify theme app extensions allow apps to add dynamic storefront elements through the theme editor without requiring the merchant to edit Liquid code directly.

Widget behaviour

The widget should:

Detect the current product.
Find active bundle rules relevant to the product.
Match relevant rules through collection membership, exact product selection, or SKU selection.
Show one or more applicable bundle offers.
Show the current product as already selected where possible.
Let the customer select missing items from each required group.
Support variant selection.
Hide unavailable variants or mark them unavailable.
Add selected products to the cart.
Display clear discount messaging.
Example widget copy
Complete the summer bundle

You have selected:
- Classic T-shirt

Add:
- 1 pair of shorts
- 1 accessory

Get 15% off these items when you buy all three.
Widget states
| State | Behaviour |
|---|---|
| No relevant bundle | Widget hidden |
| Product belongs to one bundle | Show bundle card |
| Product belongs to multiple bundles | Show multiple bundle cards or a selector |
| Missing required selections | Disable add button |
| Variant unavailable | Prevent selection |
| Exact required product unavailable | Prevent selection or show unavailable state |
| Add to cart success | Show success message and cart link/drawer trigger |
| Add to cart error | Show clear error and allow retry |
### 6.3 Cart and checkout discounting

The app must provide a Shopify Discount Function that evaluates the cart and applies the relevant discount.

The function should:

Read cart lines.
Identify product IDs, variant IDs, SKUs, and collection membership where available.
Match cart lines against active bundle rules.
Support collection-based requirements.
Support exact product requirements.
Support exact SKU requirements.
Support mixed rules, for example "SKU 1234 and any product from T-Shirts".
Calculate qualifying bundle sets.
Apply discount to the correct lines.
Avoid double-discounting the same cart line unless explicitly allowed.
Respect Shopify discount combination rules.
Return no discount if no bundle rule qualifies.

Shopify notes that stores can have up to 25 active discount functions, and that functions run concurrently without knowledge of each other. This suggests the app should consolidate bundle rules into one function-backed discount where possible, rather than creating one function per bundle rule.

### 6.4 Cart messaging

The app should provide basic cart messaging, either through a theme app block or optional snippet.

Examples:

"Bundle complete. Your discount will apply at checkout."
"Add 1 item from Accessories to unlock 15% off."
"Add SKU 5678 to unlock £10 off."
"You qualify for 2 summer bundle discounts."

This is important because the discount calculation may happen later in the cart/checkout flow, and customers need confirmation that the offer has been recognised.

## 7. Data model

A structured data model is needed for both admin configuration and runtime function logic. Shopify metaobjects are useful for reusable structured data, while metafields are better suited to attaching custom fields to existing Shopify resources. Shopify describes metaobjects as custom data structures with multiple related fields, compared with metafields as individual custom fields.

Proposed model
```ts
type BundleRule = {
  id: string
  shopId: string
  title: string
  description?: string
  status: "draft" | "active"

  triggerProductIds?: string[]
  triggerCollectionIds?: string[]

  groups: BundleGroup[]

  discount: BundleDiscount

  startsAt?: string
  endsAt?: string

  allowMultipleApplications: boolean
  priority: number

  excludedProductIds?: string[]
  excludedCollectionIds?: string[]

  createdAt: string
  updatedAt: string
}

type BundleGroup = {
  id: string
  title: string
  eligibility: BundleEligibility[]
  minQuantity: number
  maxQuantity?: number
}

type BundleEligibility =
  | {
      type: "collection"
      collectionIds: string[]
    }
  | {
      type: "product"
      productIds: string[]
      variantIds?: string[]
    }
  | {
      type: "sku"
      skus: string[]
    }

type BundleDiscount = {
  type: "percentage" | "fixed_amount"
  value: number
  appliesTo: "bundle_items"
}
```
## 8. Technical architecture
### 8.1 Shopify embedded admin app

Purpose:

Manage bundle rules.
Persist app configuration.
Publish configuration needed by the discount function and storefront widget.

Likely stack:

Shopify Remix app template.
Polaris for admin UI.
App database, for example PostgreSQL.
Shopify Admin GraphQL API for product/collection lookup.
App-owned metafields or metaobjects for function-readable configuration.
### 8.2 Theme app extension

Purpose:

Render PDP widget.
Expose app block in Shopify theme editor.
Fetch relevant active bundle rules.
Let customer select variants and add items to cart.

Components:

Liquid app block.
JavaScript bundle selector.
CSS scoped to the widget.
Storefront API or app proxy endpoint, depending on implementation.
Cart AJAX API for adding selected variants.
### 8.3 Discount Function

Purpose:

Apply the bundle discount based on cart contents.

Responsibilities:

Parse bundle configuration.
Match cart lines to rule groups.
Calculate eligible bundle sets.
Apply the discount to qualifying cart lines.

Important design choice:

Use one discount function to evaluate all active bundle rules where possible.
Avoid creating separate discount functions per bundle.
### 8.4 App backend

Purpose:

Serve admin app.
Store bundle rules.
Provide widget/runtime APIs.
Sync selected configuration into Shopify-native storage if needed by Functions.
Handle installation, OAuth, and shop-specific settings.
## 9. User stories
Merchant stories
As a merchant, I want to create a bundle rule using collections so that I do not need to manually maintain product lists.
As a merchant, I want to require one product from each group so that I can create outfit/build-a-box offers.
As a merchant, I want to create a bundle rule using exact products so that I can promote specific product pairings.
As a merchant, I want to create a bundle rule using SKUs so that I can control eligibility at product/variant level.
As a merchant, I want to combine exact products/SKUs with collections so that I can create rules like "SKU 1234 and any from T-Shirts".
As a merchant, I want to choose percentage or fixed discount so that I can control margin.
As a merchant, I want to preview the offer before publishing so that I can validate the customer experience.
As a merchant, I want to activate/deactivate offers so that I can run seasonal promotions.
As a merchant, I want the PDP widget to show only on relevant products so that it does not clutter unrelated pages.
As a merchant, I want discounts to apply automatically so that customers do not need a code.
Customer stories
As a customer, I want to see bundle offers on a product page so that I can understand related savings.
As a customer, I want to choose eligible products from each group so that I can build my own bundle.
As a customer, I want to see which selections are required so that I know how to qualify.
As a customer, I want unavailable products to be hidden or disabled so that I do not select something I cannot buy.
As a customer, I want the discount to apply automatically so that I trust the offer.
## 10. Acceptance criteria
### 10.1 Admin
Merchant can create a bundle with at least two required groups.
Merchant can select collections as group sources.
Merchant can create a bundle group using exact product selection.
Merchant can create a bundle group using exact SKU selection where SKU data is available.
Merchant can combine collection-based and exact product/SKU-based requirements in the same bundle rule.
Merchant can create rules such as "SKU 1234 and any product from T-Shirts" or "SKU 1234 and SKU 5678".
Merchant can set percentage discount.
Merchant can set fixed amount discount.
Merchant can activate/deactivate a bundle.
Merchant cannot activate an invalid bundle.
Merchant can edit an active bundle.
Merchant can delete or archive a bundle.
### 10.2 PDP widget
Widget appears on PDPs for products included in active bundle rules.
Widget appears on PDPs for exact products/SKUs included in active bundle rules.
Widget does not appear on unrelated PDPs.
Widget shows required groups.
Widget recognises the current product where it belongs to one required group.
Widget recognises the current product where it matches an exact product/SKU requirement.
Customer can select variants from missing groups.
Add-to-cart action adds all selected variants.
Errors are shown clearly.
Widget works on mobile.
### 10.3 Discounting
Discount applies when cart contains the required products.
Discount applies when cart contains exact required products/SKUs.
Discount applies when cart contains a valid mix of exact products/SKUs and collection-based selections.
Discount applies for rules such as "SKU 1234 and any product from T-Shirts".
Discount applies for rules such as "SKU 1234 and SKU 5678".
Discount does not apply when cart is missing a required group.
Discount does not apply when the cart contains a product from the right collection but is missing a required exact product/SKU.
Discount applies only to qualifying bundle items.
Discount handles multiple quantities correctly.
Discount handles products that belong to multiple collections.
Discount does not double-discount lines unless configured.
Discount works through checkout.
## 11. Edge cases
Product eligibility
Product belongs to multiple eligible collections.
Product qualifies for more than one bundle rule.
Product is eligible both by exact selection and collection membership.
Product is excluded from a bundle despite being in an eligible collection.
Product is unpublished.
Product has unavailable variants.
Product has only one available variant.
SKU changes after a bundle rule has been created.
Product has multiple variants with different SKUs.
Merchant selects a product but not all variants should qualify.
Cart contains a product from the right collection but not the required exact SKU.
Exact product requirement is out of stock or unpublished.
Cart logic
Customer adds items manually, not through widget.
Customer removes one required item after bundle is added.
Customer changes quantity in cart.
Customer qualifies for two bundle sets.
Customer qualifies for two different bundle rules.
Existing discount code is also applied.
Automatic discount from another app exists.
Sale products should be excluded.
Gift cards should be excluded.
UX
PDP has multiple bundle offers.
Theme does not support app blocks in the desired section.
Cart drawer does not expose an easy insertion point.
JavaScript fails.
Customer switches variant after selecting bundle items.
## 12. Analytics and reporting

V1 should keep analytics light.

Track:

Bundle rule created.
Bundle rule activated.
PDP widget viewed.
Bundle add-to-cart clicked.
Bundle add-to-cart succeeded.
Discount applied.
Discount rejected/no qualification.
Exact product/SKU bundle rule created.
Mixed collection and exact product/SKU bundle rule created.

Admin reporting can initially show:

Active/inactive rules.
Number of bundle widget interactions.
Number of successful bundle add-to-cart events.
Number of discounted orders, if available.
## 13. Permissions and API needs

Likely app permissions:

Read products.
Read collections.
Read/write discounts.
Read/write metafields or metaobjects, if used.
Theme app extension deployment.
Possibly read orders for reporting, if analytics includes completed orders.

The app will need access to product, variant, and SKU data to support exact product/SKU-based rules.

Keep permissions minimal for v1.

## 14. Milestones
### Milestone 1: Technical spike

Goal: prove the core discounting path works.

Tasks:

Create Shopify development app.
Create simple Discount Function.
Hardcode one rule:
1 product from collection A
1 product from collection B
10% off qualifying lines
Hardcode one exact product/SKU rule:
SKU 1234
SKU 5678
10% off qualifying lines
Hardcode one mixed rule:
SKU 1234
1 product from collection A
10% off qualifying lines
Test cart and checkout behaviour.
Confirm target store/non-Plus compatibility.
Document any limitations.

Deliverable:

Working proof of concept discount.
### Milestone 2: Admin MVP

Goal: create and manage bundle rules.

Tasks:

Build embedded admin shell.
Add bundle rules list.
Add create/edit form.
Add product/collection picker.
Add exact product/SKU selection.
Add validation.
Store rules in app database.
Add activation status.

Deliverable:

Merchant can create and activate a valid bundle rule using collection-based, exact product/SKU-based, or mixed eligibility.
### Milestone 3: Function integration

Goal: connect real rules to discount logic.

Tasks:

Define runtime config format.
Sync active rules to function-readable storage.
Update Discount Function to process multiple active rules.
Add collection, product, variant, and SKU matching.
Add quantity and conflict handling.
Test edge cases.

Deliverable:

Discount applies based on merchant-created rules.
### Milestone 4: PDP widget MVP

Goal: expose bundle offers on product pages.

Tasks:

Build theme app extension/app block.
Detect current product.
Fetch relevant bundle rules.
Match bundle relevance by collection, exact product, or SKU.
Render bundle selection UI.
Add selected variants to cart.
Add loading/error states.
Test on mobile.

Deliverable:

Customer can build and add a bundle from PDP.
### Milestone 5: Cart messaging and polish

Goal: improve customer confidence.

Tasks:

Add cart messaging block or lightweight integration.
Show "bundle complete" and "missing item" messages.
Support missing exact product/SKU messages.
Add basic styling controls.
Improve empty/unavailable states.
Add analytics events.

Deliverable:

End-to-end MVP ready for pilot store.
### Milestone 6: Pilot and hardening

Goal: validate with real merchandising use cases.

Tasks:

Test real bundle campaigns.
Validate discount behaviour with existing discounts.
Test exact product/SKU campaigns.
Test mixed collection and exact product/SKU campaigns.
Test across key themes.
Fix edge cases.
Add admin help text.
Prepare production deployment process.

Deliverable:

Production-ready v1.
## 15. Open questions
Should the discount apply to all qualifying bundle items or only selected items added through the widget?
Should customers be allowed to qualify by adding items manually, without using the widget?
Should one cart line be allowed to satisfy multiple bundle rules?
How should conflicts be handled when multiple bundle rules qualify?
Should bundle rules be collection-based only in v1, or should manual product lists be included from the start?
Should exact product/SKU selection be included from the start?
Should exact product matching happen at product level, variant level, SKU level, or all three?
What should happen if a SKU changes after a rule is created?
Does the merchant need fixed bundle pricing, or are percentage/fixed discounts enough?
Should sale items be excluded by default?
Should the widget show product cards, dropdowns, or a modal picker?
Should the cart message be mandatory for v1?
Is this app for one store only, or should it be built as a reusable/public Shopify app?
## 16. Recommended v1 scope

The leanest useful v1 is:

Embedded admin app.
Collection-based bundle groups.
Exact product/SKU-based bundle requirements.
Interchangeable bundle rules, for example "SKU 1234 and any from T-Shirts" or "SKU 1234 and SKU 5678".
Percentage discount.
Fixed amount discount.
PDP app block.
Add selected variants to cart.
Discount Function applies discount to qualifying lines.
Basic cart messaging.
No cart transform.
No merged bundle line.
No fixed bundle price.
No subscription logic.

---
Project structure

Roughly:

```text
bundle-app/
  app/
    routes/
      app._index.tsx
      app.bundles.tsx
      app.bundles.new.tsx
      app.bundles.$id.tsx
      api.bundle-rules.ts
    models/
      bundle-rule.server.ts
    shopify.server.ts

  extensions/
    bundle-discount-function/
      src/
        run.graphql
        run.ts

    pdp-bundle-widget/
      blocks/
        bundle-widget.liquid
      assets/
        bundle-widget.js
        bundle-widget.css

  prisma/
    schema.prisma

  shopify.app.toml
  package.json
```