(function () {
  const selector = ".bundler-widget";

  const parseJson = (value, fallback) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const toNumericId = (gid) => {
    const parts = String(gid || "").split("/");
    return parts[parts.length - 1];
  };

  const formatDiscount = (discount, context) => {
    if (discount.type === "percentage") {
      const template = context.discountPercentageText !== undefined && context.discountPercentageText !== null 
        ? context.discountPercentageText 
        : "{discount}% off qualifying bundle items";
      return template ? template.replace("{discount}", discount.value) : "";
    }
    const template = context.discountFixedText !== undefined && context.discountFixedText !== null
      ? context.discountFixedText 
      : "{discount} off qualifying bundle items";
    return template ? template.replace("{discount}", discount.value) : "";
  };

  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: window.Shopify?.currency?.active || "USD" }).format(amount);
  };

  const getDiscountedPriceHtml = (price, rule) => {
    if (rule.discount.type === "percentage") {
      const discounted = price * (1 - (rule.discount.value / 100));
      return `<s>${formatMoney(price)}</s> <strong>${formatMoney(discounted)}</strong>`;
    }
    // For fixed amounts we can't reliably do per-item breakdown as it applies to the bundle
    return `<strong>${formatMoney(price)}</strong>`;
  };

  const escapeHtml = (value) => {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(value || "").replace(/[&<>"']/g, (character) => escapeMap[character]);
  };

  const groupMatchesProduct = (group, context) => {
    return group.eligibility.some((eligibility) => {
      if (eligibility.type === "collection") {
        return eligibility.collectionIds.some((id) => context.collectionIds.includes(id));
      }
      if (eligibility.type === "product") {
        return (
          eligibility.productIds.includes(context.productId) ||
          eligibility.variantIds.includes(context.variantId)
        );
      }
      return context.sku && eligibility.skus.includes(context.sku.toUpperCase());
    });
  };

  const calculateAllocation = (rule, context) => {
    let currentQty = 1;
    const selected = [];
    const missing = [];

    for (const group of rule.groups) {
      let requiredQty = group.minQuantity;

      if (currentQty > 0 && groupMatchesProduct(group, context)) {
        selected.push(group);
        requiredQty -= 1;
        currentQty -= 1;
      }

      if (requiredQty > 0) {
        missing.push({ ...group, missingQuantity: requiredQty });
      }
    }

    return { selectedGroups: selected, missingGroups: missing };
  };

  const postEvent = (apiBase, shop, ruleId, event) => {
    fetch(`${apiBase}/bundle-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, ruleId, event }),
    }).catch(function () {});
  };

  const addBundleToCart = async (block, rule, context) => {
    const selectedInputs = Array.from(block.querySelectorAll("[data-bundler-variant-input]"));
    const selectedVariants = selectedInputs.map((input) => input.value.trim()).filter(Boolean);
    
    // Check if there is an active variant selector for the CURRENT product on the PDP page
    // Shopify forms typically use name="id" for the main variant selector
    const pageVariantInput = document.querySelector('form[action^="/cart/add"] [name="id"]');
    const currentVariant = pageVariantInput ? pageVariantInput.value : toNumericId(context.variantId);
    
    const collectionIds = JSON.stringify(context.collectionIds);
    const items = [currentVariant, ...selectedVariants].map((variantId) => ({
      id: variantId,
      quantity: 1,
      properties: {
        _bundle_rule_id: rule.id,
        _bundle_collection_ids: collectionIds,
      },
    }));

    postEvent(context.apiBase, context.shop, rule.id, "add_to_cart_clicked");

    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error("Could not add the bundle to cart. Check selections and try again.");
    }

    postEvent(context.apiBase, context.shop, rule.id, "add_to_cart_succeeded");
  };

  const renderRule = (block, rule, context) => {
    const { selectedGroups, missingGroups } = calculateAllocation(rule, context);
    const mode = context.mode; // dropdowns or message_only
    
    const card = document.createElement("div");
    card.className = "bundler-widget__card";
    
    let html = `
      ${context.eyebrow ? `<p class="bundler-widget__eyebrow">${escapeHtml(context.eyebrow)}</p>` : ""}
      <h3 class="bundler-widget__title">${escapeHtml(rule.title)}</h3>
      ${rule.description ? `<p class="bundler-widget__description">${escapeHtml(rule.description)}</p>` : ""}
    `;
    const discountText = formatDiscount(rule.discount, context);
    if (discountText) {
      html += `<p class="bundler-widget__discount">${escapeHtml(discountText)}</p>`;
    }

    if (missingGroups.length === 0) {
      const unlockedTpl = context.unlockedText !== undefined && context.unlockedText !== null ? context.unlockedText : "{title} offers unlocked!";
      if (unlockedTpl) {
        html += `<p class="bundler-widget__hint">${escapeHtml(unlockedTpl.replace("{title}", rule.title))}</p>`;
      }
    } else {
      if (selectedGroups.length > 0) {
        const groupsString = selectedGroups.map((g) => g.title).join(", ");
        const currentProdTpl = context.currentProductText !== undefined && context.currentProductText !== null ? context.currentProductText : "Current product selected for {groups}.";
        if (currentProdTpl) {
          html += `<p class="bundler-widget__hint">${escapeHtml(currentProdTpl.replace("{groups}", groupsString))}</p>`;
        }
      }
    }

    if ((mode === "dropdowns" || mode === "carousel") && missingGroups.length > 0) {
      html += `<div class="bundler-widget__groups"></div>`;
    }

    if (mode === "dropdowns" || mode === "carousel" || missingGroups.length === 0) {
      html += `<button class="bundler-widget__button" type="button">${escapeHtml(context.buttonText)}</button>`;
    } else if (mode === "message_only" && missingGroups.length > 0) {
      const msgs = missingGroups.map(g => `${g.missingQuantity} from ${g.title}`).join(" and ");
      const addToUnlockTpl = context.addToUnlockText !== undefined && context.addToUnlockText !== null ? context.addToUnlockText : "Add {missing} to unlock.";
      if (addToUnlockTpl) {
        html += `<p class="bundler-widget__hint">${escapeHtml(addToUnlockTpl.replace("{missing}", msgs))}</p>`;
      }
    }

    html += `<p class="bundler-widget__status" role="status"></p>`;
    card.innerHTML = html;

    const button = card.querySelector(".bundler-widget__button");
    const status = card.querySelector(".bundler-widget__status");

    if ((mode === "dropdowns" || mode === "carousel") && missingGroups.length > 0) {
      const groupsContainer = card.querySelector(".bundler-widget__groups");
      
      missingGroups.forEach((group) => {
        for (let i = 0; i < group.missingQuantity; i++) {
          const wrapper = document.createElement("div");
          
          if (mode === "dropdowns") {
            wrapper.className = "bundler-widget__group";
            let selectHtml = `<select class="bundler-widget__input" data-bundler-variant-input>`;
            selectHtml += `<option value="">Select ${escapeHtml(group.title)}...</option>`;
            
            if (group.variants && group.variants.length > 0) {
              const eligible = group.variants.filter(v => v.productId !== context.productId && v.id !== context.variantId);
              
              const productsMap = new Map();
              eligible.forEach(v => {
                if (!productsMap.has(v.productId)) {
                  productsMap.set(v.productId, {
                    productId: v.productId,
                    productTitle: v.productTitle || v.title,
                    variants: []
                  });
                }
                productsMap.get(v.productId).variants.push(v);
              });
              
              const eligibleProducts = Array.from(productsMap.values());

              eligibleProducts.forEach(prod => {
                if (context.showVariantSelector && prod.variants.length > 1) {
                  selectHtml += `<optgroup label="${escapeHtml(prod.productTitle)}">`;
                  prod.variants.forEach(v => {
                    selectHtml += `<option value="${escapeHtml(toNumericId(v.id))}">${escapeHtml(v.title)}</option>`;
                  });
                  selectHtml += `</optgroup>`;
                } else {
                  const v = prod.variants[0];
                  let label = prod.productTitle;
                  if (!context.showVariantSelector && prod.variants.length > 1) {
                    label += ` (${context.selectOptionsText})`;
                  } else if (prod.variants.length === 1 && v.title !== "Default Title") {
                    label += ` - ${v.title}`;
                  }
                  selectHtml += `<option value="${escapeHtml(toNumericId(v.id))}">${escapeHtml(label)}</option>`;
                }
              });
            }
            selectHtml += `</select>`;

            wrapper.innerHTML = `
              <span class="bundler-widget__group-title">Add 1 ${escapeHtml(group.title)}</span>
              ${selectHtml}
            `;
            groupsContainer.appendChild(wrapper);
            
          } else if (mode === "carousel") {
            wrapper.className = "bundler-widget__carousel-wrapper";
            wrapper.innerHTML = `<span class="bundler-widget__group-title">Add 1 ${escapeHtml(group.title)}</span>`;
            
            const hiddenInput = document.createElement("input");
            hiddenInput.type = "hidden";
            hiddenInput.setAttribute("data-bundler-variant-input", "true");
            hiddenInput.value = "";
            wrapper.appendChild(hiddenInput);

            const carousel = document.createElement("div");
            carousel.className = "bundler-widget__carousel";
            
            if (group.variants && group.variants.length > 0) {
              const eligibleVariants = group.variants.filter(v => v.productId !== context.productId && v.id !== context.variantId);
              
              const productsMap = new Map();
              eligibleVariants.forEach(v => {
                if (!productsMap.has(v.productId)) {
                  productsMap.set(v.productId, {
                    productId: v.productId,
                    productTitle: v.productTitle || v.title,
                    productImage: v.productImage || v.image,
                    variants: []
                  });
                }
                productsMap.get(v.productId).variants.push(v);
              });
              
              const eligibleProducts = Array.from(productsMap.values());

              eligibleProducts.forEach(prod => {
                const item = document.createElement("div");
                item.className = "bundler-widget__carousel-item";
                
                const firstVariant = prod.variants[0];
                const hasMultipleVariants = prod.variants.length > 1;

                let variantSelectorHtml = "";
                if (hasMultipleVariants) {
                  if (context.showVariantSelector) {
                    variantSelectorHtml = `<select class="bundler-widget__carousel-variant-select">`;
                    prod.variants.forEach(v => {
                      variantSelectorHtml += `<option value="${escapeHtml(toNumericId(v.id))}" data-price="${escapeHtml(v.price)}" data-image="${escapeHtml(v.image || prod.productImage || '')}">${escapeHtml(v.title)}</option>`;
                    });
                    variantSelectorHtml += `</select>`;
                  } else {
                    variantSelectorHtml = `<p class="bundler-widget__carousel-options-text">${escapeHtml(context.selectOptionsText)}</p>`;
                  }
                }

                let cardHtml = "";
                if (context.customCardHtml) {
                  cardHtml = context.customCardHtml
                    .replace(/{image}/g, `<img class="bundler-widget__carousel-image" src="${escapeHtml(firstVariant.image || prod.productImage || '')}" alt="${escapeHtml(prod.productTitle)}" />`)
                    .replace(/{title}/g, escapeHtml(prod.productTitle))
                    .replace(/{price}/g, getDiscountedPriceHtml(firstVariant.price, rule))
                    .replace(/{button}/g, `<button type="button" class="bundler-widget__carousel-btn" data-variant-id="${escapeHtml(toNumericId(firstVariant.id))}">Select</button>`);
                } else {
                  cardHtml = `
                    <img class="bundler-widget__carousel-image" src="${escapeHtml(firstVariant.image || prod.productImage || '')}" alt="${escapeHtml(prod.productTitle)}" />
                    <div class="bundler-widget__carousel-content">
                      <p class="bundler-widget__carousel-title">${escapeHtml(prod.productTitle)}</p>
                      <div class="bundler-widget__carousel-price-wrapper">
                        <p class="bundler-widget__carousel-price">${getDiscountedPriceHtml(firstVariant.price, rule)}</p>
                      </div>
                      ${variantSelectorHtml}
                      <button type="button" class="bundler-widget__carousel-btn" data-variant-id="${escapeHtml(toNumericId(firstVariant.id))}">Select</button>
                    </div>
                  `;
                }
                item.innerHTML = cardHtml;

                const selectEl = item.querySelector(".bundler-widget__carousel-variant-select");
                const btn = item.querySelector(".bundler-widget__carousel-btn");
                const priceWrapper = item.querySelector(".bundler-widget__carousel-price");
                const imgEl = item.querySelector(".bundler-widget__carousel-image");

                if (selectEl) {
                  selectEl.addEventListener("change", () => {
                    const selectedOption = selectEl.options[selectEl.selectedIndex];
                    if (btn) btn.setAttribute("data-variant-id", selectedOption.value);
                    if (priceWrapper) priceWrapper.innerHTML = getDiscountedPriceHtml(selectedOption.getAttribute("data-price"), rule);
                    if (imgEl && selectedOption.getAttribute("data-image")) {
                       imgEl.src = selectedOption.getAttribute("data-image");
                    }
                    
                    if (item.classList.contains("is-selected") && hiddenInput) {
                      hiddenInput.value = toNumericId(selectedOption.value);
                      hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                  });
                }

                if (btn) {
                  btn.addEventListener("click", () => {
                    carousel.querySelectorAll(".bundler-widget__carousel-item").forEach(el => el.classList.remove("is-selected"));
                    carousel.querySelectorAll(".bundler-widget__carousel-btn").forEach(el => el.textContent = "Select");
                    
                    item.classList.add("is-selected");
                    btn.textContent = "Selected";
                    hiddenInput.value = toNumericId(btn.getAttribute("data-variant-id"));
                    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
                  });
                }
                
                carousel.appendChild(item);
              });
              if (eligibleProducts.length === 0) {
                carousel.innerHTML = `<p class="bundler-widget__hint">No additional eligible products found.</p>`;
              }
            } else {
              carousel.innerHTML = `<p class="bundler-widget__hint">No eligible products found.</p>`;
            }

            wrapper.appendChild(carousel);
            groupsContainer.appendChild(wrapper);
          }
        }
      });
    }

    const updateButton = () => {
      if (!button) return;
      const inputs = Array.from(card.querySelectorAll("[data-bundler-variant-input]"));
      button.disabled = inputs.some((input) => !input.value.trim());
    };

    if (mode === "dropdowns" || mode === "carousel") {
      card.addEventListener("input", updateButton);
    }

    if (button) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = context.loadingText !== undefined ? context.loadingText : "Adding bundle...";

        try {
          await addBundleToCart(card, rule, context);
          status.className = "bundler-widget__status bundler-widget__success";
          status.innerHTML = context.successText;
        } catch (error) {
          status.className = "bundler-widget__status bundler-widget__error";
          status.textContent = error instanceof Error ? error.message : "Could not add the bundle to cart.";
          updateButton();
        }
      });
      updateButton();
    }

    return card;
  };

  const loadBlock = async (block) => {
    const context = {
      shop: block.dataset.shop,
      apiBase: block.dataset.apiBase || "/apps/bundler",
      productId: block.dataset.productId,
      variantId: block.dataset.variantId,
      sku: block.dataset.sku,
      collectionIds: parseJson(block.dataset.collectionIds || "[]", []),
      mode: block.dataset.mode || "dropdowns",
      showVariantSelector: block.dataset.showVariantSelector !== "false",
      selectOptionsText: block.dataset.selectOptionsText !== undefined && block.dataset.selectOptionsText !== null ? block.dataset.selectOptionsText : "Select Options in Basket",
      customCardHtml: block.dataset.customCardHtml,
      eyebrow: block.dataset.eyebrow,
      buttonText: block.dataset.buttonText !== undefined ? block.dataset.buttonText : "Add bundle to cart",
      currentProductText: block.dataset.currentProductText,
      addToUnlockText: block.dataset.addToUnlockText,
      successText: block.dataset.successText !== undefined && block.dataset.successText !== null ? block.dataset.successText : 'Bundle added. <a href="/cart">View cart</a>',
      unlockedText: block.dataset.unlockedText,
      discountPercentageText: block.dataset.discountPercentageText,
      discountFixedText: block.dataset.discountFixedText,
      loadingText: block.dataset.loadingText
    };
    
    const params = new URLSearchParams({
      shop: context.shop,
      productId: context.productId,
      variantId: context.variantId,
      sku: context.sku || "",
      collectionIds: context.collectionIds.join(","),
      mode: context.mode,
      limit: "100"
    });
    
    const response = await fetch(`${context.apiBase}/bundle-rules?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Could not load bundle offers.");
    }

    const payload = await response.json();
    const rules = Array.isArray(payload.rules) ? payload.rules : [];

    block.innerHTML = "";

    if (rules.length === 0) {
      return;
    }

    rules.forEach((rule) => block.appendChild(renderRule(block, rule, context)));
  };

  document.querySelectorAll(selector).forEach((block) => {
    loadBlock(block).catch(() => {
      block.innerHTML = "";
    });
  });
})();
