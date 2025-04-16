   ---
home: true
heroImage: /images/logo.png
heroText: Domainify
tagline: A modern, composition-based Domain-Driven Design library
actions:
- text: Get Started →
  link: /guide/getting-started.html
  type: primary
- text: View on GitHub
  link: https://github.com/MarcoMuellner/Domainify
  type: secondary
  features:
- title: Composition Over Inheritance
  details: Build domain objects through functional composition, not class hierarchies.
- title: Type-Safe
  details: Full TypeScript compatibility with Zod for runtime validation and type inference.
- title: Framework Agnostic
  details: Works with any JavaScript or TypeScript project, regardless of framework.
- title: Immutability by Default
  details: All domain objects are immutable for safer state management.
- title: Minimal Boilerplate
  details: Intuitive, concise APIs that reduce ceremony.
- title: Developer Experience First
  details: Clear error messages, debugging support, and comprehensive documentation.
  footer: MIT Licensed | Copyright © 2023-present Marco Müllner
---

### Write Expressive Domain Models

```javascript
const Order = aggregate({
  name: "Order",
  schema: orderSchema,
  invariants: [
    { name: "Valid Status", check: order => validStatuses.includes(order.status) }
  ],
  methods: {
    placeOrder() {
      return Order.update(this, { status: "PLACED" })
        .emitEvent("OrderPlaced", { orderId: this.id });
    }
  }
});
```

### Install Domainify

::: code-group
```bash [npm]
npm install domainify
```

```bash [yarn]
yarn add domainify
```

```bash [pnpm]
pnpm add domainify
```
:::
