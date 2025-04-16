# Strategic Design in DDD

Strategic design is one of the two main aspects of Domain-Driven Design (the other being [tactical design](./tactical-design.md)). While tactical design focuses on implementation patterns, strategic design is about understanding the big picture - how to organize your domain model to reflect the reality of your business.

## What is Strategic Design?

Strategic design involves:

- Identifying and organizing the different areas of your domain
- Defining clear boundaries and relationships between these areas
- Creating a shared language between technical and domain experts
- Focusing development efforts on the areas that matter most to the business

## Core Concepts of Strategic Design

### Bounded Contexts

A bounded context is a conceptual boundary around a specific model. Within this boundary, terms and concepts have a clear, consistent meaning. Different bounded contexts might use the same term to mean something different, or different terms to mean the same thing.

![Bounded Contexts Diagram](../../.vuepress/public/images/bounded-contexts.png)

For example, in an e-commerce system:

- In the **Order Management Context**, a "Product" might simply be an item with a SKU, price, and inventory count
- In the **Catalog Context**, a "Product" might have detailed attributes, categories, images, and related products
- In the **Shipping Context**, a "Product" might be defined by its weight, dimensions, and fragility

Each context can independently define what a "Product" means within its boundaries.

#### Benefits of Bounded Contexts

- **Reduces complexity**: Each team can focus on a smaller, cohesive model
- **Enables parallel work**: Different teams can work on different contexts
- **Enables specialized models**: Each context can use a model that best fits its needs
- **Clarifies communication**: Avoids confusion when the same term means different things in different departments

### Context Mapping

Context mapping identifies the relationships between different bounded contexts and how they interact. These relationships clarify how models in different contexts relate to each other and how changes in one context might affect another.

![Context Map Diagram](../../.vuepress/public/images/context-map.png)

#### Types of Context Relationships

- **Partnership**: Two contexts are developed together with aligned goals
- **Shared Kernel**: Different contexts share a subset of their domain models
- **Customer-Supplier**: One context acts as a service provider to another
- **Conformist**: One context must conform to the model of another
- **Anticorruption Layer**: A layer that translates between incompatible models
- **Open Host Service**: A context defines a protocol for integration
- **Published Language**: A shared, documented format for communication between contexts
- **Separate Ways**: Contexts have no connection and can evolve independently

#### Context Map Example

In an e-commerce system:

- **Customer Service** í **Order Management**: Customer Service uses an Anticorruption Layer to access order data
- **Order Management** î **Inventory**: Partnership relationship with shared integration points
- **Payments** ê **Order Management**: Order Management conforms to the Payment context's model
- **Marketing** í **Catalog**: Marketing uses Catalog as a service through an Open Host Service

### Core Domain

The core domain is the part of your system that represents your organization's competitive advantage or key differentiator. It's where you should focus your most experienced team members and invest in creating a deep, rich model.

#### Identifying the Core Domain

Ask these questions:
- What gives our business a competitive advantage?
- What would we never outsource?
- What part of our system would cause the most damage if it failed?
- Where would we get the most value from improvements?

#### Core vs. Supporting vs. Generic Subdomains

- **Core Domain**: Your competitive advantage (e.g., recommendation algorithm for an e-commerce site)
- **Supporting Subdomains**: Important to your business but not a differentiator (e.g., inventory management)
- **Generic Subdomains**: Common business problems with off-the-shelf solutions (e.g., authentication, logging)

![Domain Types Diagram](../../.vuepress/public/images/domain-types.png)

### Ubiquitous Language

Ubiquitous language is a shared vocabulary between domain experts and developers that's used consistently throughout code, documentation, and conversation. It helps ensure everyone has the same understanding of the domain concepts.

For more details, see our [Ubiquitous Language](./ubiquitous-language.md) guide.

## Strategic Design Process

### 1. Conduct Domain Discovery Workshops

Domain discovery workshops bring together domain experts and developers to explore the domain. Techniques include:

- **Event Storming**: Map out business processes using sticky notes to represent domain events, commands, and more
- **Domain Storytelling**: Have domain experts tell stories about their work
- **Example Mapping**: Create examples of business scenarios and rules
- **Concept Mapping**: Visualize relationships between domain concepts

These workshops help you:
- Understand the domain from the experts' perspective
- Identify bounded contexts
- Begin creating a ubiquitous language
- Discover business rules and processes

### 2. Draw Context Maps

Once you've identified bounded contexts:

1. List all bounded contexts in your system
2. Identify the relationships between them
3. Document the communication patterns and integrations
4. Visualize this as a context map
5. Identify potential issues or friction points

### 3. Prioritize the Core Domain

After mapping the domain:

1. Classify areas as core, supporting, or generic
2. Focus resources on the core domain
3. Consider buying or outsourcing solutions for generic subdomains
4. Document your decisions and reasoning

### 4. Define Integration Strategies

For each relationship between contexts:

1. Choose appropriate integration patterns (APIs, events, shared database, etc.)
2. Design anticorruption layers where needed
3. Define contracts and team responsibilities
4. Create mechanisms for handling conflicts or changes

## Strategic Design in Practice

### Example: E-commerce System

Let's explore how strategic design might work for an e-commerce company:

#### Bounded Contexts
- **Product Catalog**: Managing product information, categories, attributes
- **Order Processing**: Handling orders, payments, and fulfillment
- **Customer Management**: Customer accounts, preferences, and history
- **Inventory Management**: Stock levels, warehouses, and procurement
- **Shipping & Delivery**: Shipping options, carriers, and tracking
- **Reviews & Ratings**: Product reviews, ratings, and Q&A
- **Marketing & Promotions**: Discounts, campaigns, and recommendations

#### Core Domain Analysis
- **Core**: Personalized product recommendations (key differentiator)
- **Supporting**: Order processing, product catalog
- **Generic**: Authentication, email notifications, payment processing

#### Sample Context Map

![E-commerce Context Map Example](../../.vuepress/public/images/ecommerce-context-map-example.png)

#### Integration Examples
- **Product Catalog í Order Processing**: Product Catalog publishes an Open Host Service API for order processing to look up product details
- **Order Processing í Inventory**: Partnership relationship with shared events for inventory updates
- **Order Processing í Payment**: Order Processing conforms to the Payment gateway's requirements
- **Customer Management í All Other Contexts**: Customer Management offers a shared view of customer data through a Published Language (JSON schema)

## Common Challenges in Strategic Design

### Identifying Bounded Context Boundaries

- **Problem**: It's not always clear where to draw the line between contexts
- **Solution**: Focus on language changes, team boundaries, and data ownership; refine boundaries as you learn more

### Managing Changes Across Contexts

- **Problem**: Changes in one context can impact others
- **Solution**: Clear contracts, versioning, and communication channels between teams

### Organizational Alignment

- **Problem**: Conway's Law - software structure tends to mirror org structure
- **Solution**: Align teams with bounded contexts; use architecture team to coordinate

### Legacy Systems Integration

- **Problem**: Existing systems often don't follow DDD principles
- **Solution**: Use anticorruption layers to protect new models from legacy concepts

## Best Practices

1. **Start with business value**: Focus on areas most important to the business
2. **Embrace refinement**: Your understanding will evolve, so refine your models over time
3. **Map to team structure**: Align bounded contexts with team responsibilities
4. **Document context boundaries**: Make context maps and integration points explicit
5. **Invest in the core domain**: Put your best people and most effort into your competitive advantage
6. **Keep learning**: Regularly revisit your understanding with domain experts

## Next Steps

Now that you understand the strategic aspects of DDD, learn about [Tactical Design](./tactical-design.md) - the implementation patterns that help you build your domain model within each bounded context.

You can also dive deeper into [Ubiquitous Language](./ubiquitous-language.md), a key concept that connects strategic and tactical design.