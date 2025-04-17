---
home: true
heroImage: /images/logo.svg
heroText: DomainDrivenJS
tagline: A modern, composition-based approach to Domain-Driven Design in JavaScript
actions:
  - text: Get Started
    link: /guide/getting-started.html
    type: primary
  - text: View on GitHub
    link: https://github.com/MarcoMuellner/DomainDrivenJS
    type: secondary
features:
  - title: Composition Over Inheritance
    details: Build domain models through functional composition patterns that are natural in JavaScript, rather than deep class hierarchies.
  - title: Type-Safe with Runtime Validation
    details: Leverage Zod schemas for both compile-time type inference and runtime validation to ensure your domain objects are always valid.
  - title: Immutable by Design
    details: All domain objects are immutable, preventing unexpected state changes and making your code more predictable and easier to reason about.
  - title: Domain Events Built-In
    details: First-class support for domain events, enabling loosely coupled, event-driven architectures that accurately model business processes.
  - title: Framework Agnostic
    details: Works with any JavaScript or TypeScript project regardless of framework, allowing you to focus on modeling your domain.
  - title: Developer Experience First
    details: Clear error messages, minimal boilerplate, and intuitive APIs designed to make DDD approachable and practical.
footer: MIT Licensed | Copyright © 2023-present Marco Müllner
---

<!-- DIAGRAM: An animated diagram showing the layers of DDD concepts (Value Objects, Entities, Aggregates, etc.) with example code snippets for each, transitioning between them to show how they build on each other -->

## What is Domain-Driven Design?

Domain-Driven Design (DDD) is an approach to software development that focuses on creating a model that reflects your business domain. It gives you tools to tackle complex business logic and build maintainable software that closely aligns with business needs.

With DDD, you'll:
- Build a **shared language** between developers and domain experts
- Create a **flexible model** that evolves with your understanding
- Focus development efforts on the **core domain** that provides the most value
- Establish clear **boundaries** within a complex system

## Why DomainDrivenJS?

Traditional DDD implementations often rely heavily on class inheritance, which can lead to rigid and complex hierarchies. DomainDrivenJS takes a different approach:

```javascript
// Create a Money value object using composition
const Money = valueObject({
  name: 'Money',
  schema: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().length(3)
  }),
  methods: {
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error('Cannot add different currencies');
      }
      return Money.create({ 
        amount: this.amount + other.amount, 
        currency: this.currency 
      });
    }
  }
});

// Use the value object in your domain
const price = Money.create({ amount: 10.99, currency: 'USD' });
const tax = Money.create({ amount: 0.55, currency: 'USD' });
const total = price.add(tax); // Returns a new Money instance
```

## Getting Started

DomainDrivenJS makes it easy to implement DDD in your JavaScript projects:

::: code-tabs
@tab npm
```bash
npm install domaindrivenjs
```
@tab yarn
```bash
yarn add domaindrivenjs
```
@tab pnpm
```bash
pnpm add domaindrivenjs
```
:::

## Learning Path

<!-- DIAGRAM: A visual learning path showing progression from DDD Fundamentals → Core Concepts → Advanced Topics, with branching paths for different expertise levels -->

**New to DDD?** Start with [DDD Fundamentals](/guide/ddd/) to learn the core concepts.

**Ready to code?** The [Quick Start](/guide/quick-start.html) will get you building immediately.

**Looking for examples?** Check out complete applications in our [Examples](/examples/) section.

**Need specific guidance?** Dive into our comprehensive [API Reference](/api/).
