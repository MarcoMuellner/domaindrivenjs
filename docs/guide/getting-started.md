                                                                                                                                                       # Getting Started with Domainify

Domainify is a JavaScript library that empowers developers to implement Domain-Driven Design (DDD) principles using a modern, composition-based approach. Instead of relying on deep inheritance hierarchies, Domainify leverages functional composition and Zod for schema validation.

## What is Domain-Driven Design?

Domain-Driven Design is an approach to software development that focuses on understanding the business domain and using that understanding to inform the design of software systems. It emphasizes:

- Creating a shared language between developers and domain experts
- Focusing on the core domain and domain logic
- Basing complex designs on a model of the domain
- Iterating on the model through creative collaboration between developers and domain experts

Domainify provides the building blocks to implement a domain model that adheres to these principles.

## Installation

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

Since Domainify uses Zod for schema validation, you'll also need to install Zod if you haven't already:

::: code-group
```bash [npm]
npm install zod
```

```bash [yarn]
yarn add zod
```

```bash [pnpm]
pnpm add zod
```
:::

## Key Features

- **Composition over Inheritance**: Build domain objects through functional composition
- **Runtime Validation with Static Types**: Use Zod for both runtime validation and type inference
- **Immutability by Default**: All domain objects are immutable for safer state management
- **Minimal Boilerplate**: Intuitive, concise APIs that reduce ceremony
- **Framework Agnostic**: Use with any JavaScript or TypeScript project
- **Developer Experience First**: Clear error messages and debugging support

## Next Steps

Now that you have Domainify installed, check out the [Quick Start guide](./quick-start.md) or dive deeper into [Domain-Driven Design concepts](./ddd/).
