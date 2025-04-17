# Strategic Design in Domain-Driven Design

Strategic design is the foundation of Domain-Driven Design, focusing on the "big picture" of your software. While tactical design (entities, value objects, etc.) helps with code-level decisions, strategic design helps you organize your entire system according to business realities.

<!-- DIAGRAM: Visual showing strategic design concepts as a map/landscape with bounded contexts as territories, context mapping as bridges/paths between them, and core domain highlighted in the center -->

## Why Is Strategic Design Important?

Before diving into the patterns, let's understand why strategic design matters:

1. **Large systems become unmanageable without boundaries** - As systems grow, a single unified model becomes unwieldy and contradictory
2. **Different parts of your business have different priorities** - Some areas require more investment than others
3. **Teams need clear boundaries for autonomy** - Explicit boundaries help teams work independently
4. **Integration between subsystems requires clarity** - Well-defined relationships prevent miscommunication

## Bounded Contexts

A bounded context is a conceptual boundary around a specific model. Within this boundary, terms, concepts, and rules are consistently defined and used.

### Key Characteristics

- **Explicit boundary** - Clear definition of what's inside vs. outside
- **Linguistic consistency** - Terms have a single meaning inside the boundary
- **Unified model** - All concepts within the context form a cohesive model
- **Dedicated team ownership** - Typically owned by a single team
- **Physical manifestation** - Often manifests as separate codebases or modules

### Real World Example

Consider an e-commerce system:

- **Product Catalog Context** - Here "Product" means something with a description, price, and categories
- **Inventory Context** - Here "Product" relates to physical items with stock levels and locations
- **Order Context** - Here "Product" is just a line item with a SKU, price, and quantity

While all three use the term "Product," its meaning, attributes, and behaviors differ in each context.

### Identifying Bounded Contexts

Look for these signals to identify potential bounded context boundaries:

- Different teams using the same terms differently
- Awkward translations between parts of the system
- Concepts that make sense in one area but not another
- Natural divisions in business processes
- Areas with different rates of change
- Legacy systems that need integration

### Practical Tips

1. **Draw context boundaries on a whiteboard** - Visualize where your contexts begin and end
2. **Create a glossary for each context** - Document terms and their meanings
3. **Identify "translation" points** - Where do concepts cross boundaries?
4. **Start broader, refine later** - Begin with larger contexts and subdivide as needed

## Context Mapping

Context mapping is the process of identifying relationships between bounded contexts. It helps you understand how different parts of your system interact and influence each other.

### Common Context Map Relationships

<!-- DIAGRAM: Visual showing different types of context relationships with simple icons or symbols for each -->

1. **Partnership** (🤝) - Two teams collaborate closely with mutual dependencies
   ```
   Team A 🤝 Team B
   ```

2. **Shared Kernel** (⚙️) - Multiple contexts share a subset of the model
   ```
   Context A ⚙️ Context B
   ```

3. **Customer-Supplier** (🔄) - Upstream provides what downstream needs
   ```
   Supplier Context ➡️ Customer Context
   ```

4. **Conformist** (📋) - Downstream adopts upstream's model without influence
   ```
   Upstream Context ➡️📋 Downstream Context
   ```

5. **Anti-Corruption Layer** (🛡️) - Translation layer protects a model from external concepts
   ```
   External System ➡️🛡️ Your Context
   ```

6. **Open Host Service** (🔌) - Well-defined API for integration
   ```
   Core System 🔌 Multiple Consumers
   ```

7. **Published Language** (📢) - Shared documented interchange format
   ```
   Multiple Systems 📢 Published Schema
   ```

8. **Separate Ways** (↔️) - No integration (cut off relationship)
   ```
   Context A ↔️ Context B
   ```

9. **Big Ball of Mud** (🧶) - Undefined/ambiguous boundaries (anti-pattern)
   ```
   System 🧶
   ```

### Drawing a Context Map

Create a visual representation of your system's contexts and their relationships:

1. **Draw each bounded context as a circle or box**
2. **Connect them with arrows showing relationships**
3. **Label the nature of each relationship** (using patterns above)
4. **Add notes about integration points and translations**

### Real Example

```
Catalog Context 🔌📢 ➡️ Order Context
       ⬇️
Inventory Context 🛡️ ➡️ Shipping Context
       ⬆️
  Legacy ERP ↔️ Modern Analytics Platform
```

## Domain Types

Not all parts of your system are equally valuable. DDD identifies different types of domains to help you allocate effort appropriately.

### Core Domain

The core domain is your competitive advantage - it's what makes your business unique and provides the most value.

**Characteristics:**
- Differentiates your business from competitors
- Requires specialized knowledge
- Changes frequently as business evolves
- Worth significant investment
- Should be built in-house

**Examples:**
- Recommendation algorithm for a streaming service
- Risk assessment for an insurance company
- Matching algorithm for a dating app

### Supporting Domains

Supporting domains are necessary for your business but don't provide competitive advantage.

**Characteristics:**
- Important to operations
- Specific to your business
- May be implemented in-house or outsourced
- Deserves some investment, but less than core

**Examples:**
- Customer management for an e-commerce site
- Reporting for a financial service
- Content management for a media company

### Generic Subdomains

Generic subdomains represent well-understood, common business problems.

**Characteristics:**
- Common across many businesses
- Well-understood solutions exist
- Best implemented using off-the-shelf solutions
- Low investment priority

**Examples:**
- Authentication and authorization
- Email sending
- Payment processing
- Calendar management

### Allocation Matrix

Combine domain types with investment strategies:

| Domain Type | Build Strategy | Documentation | Testing | Refactoring |
|-------------|----------------|---------------|---------|-------------|
| Core        | In-house, best developers | Extensive | Comprehensive | Frequent |
| Supporting  | In-house or outsource | Good | Solid coverage | As needed |
| Generic     | Buy or open source | Minimal | Basic | Rarely |

## Tools and Techniques

Let's explore practical tools for applying strategic DDD:

### 1. Event Storming

Event storming is a workshop technique for discovering domain knowledge:

1. **Gather diverse participants** (developers, domain experts, product owners)
2. **Use a large modeling space** (wall with butcher paper or digital whiteboard)
3. **Start with domain events** (orange sticky notes for "things that happen")
4. **Add commands** that trigger events (blue sticky notes)
5. **Identify aggregates** that handle commands and emit events (yellow sticky notes)
6. **Look for bounded context boundaries** where language or concepts shift

<!-- DIAGRAM: Simple illustration of event storming wall with colored sticky notes representing different elements -->

**Resources:**
- [Event Storming Cheat Sheet](https://www.eventstorming.com/)
- [Miro Event Storming Template](https://miro.com/templates/event-storming/)

### 2. Domain Storytelling

Domain storytelling uses pictographic language to tell stories about the domain:

1. **Gather domain experts** who know the processes
2. **Set up symbols** for actors, work objects, and activities
3. **Record stories** as domain experts narrate processes
4. **Draw the flow** visually using the symbols
5. **Look for bounded contexts** where terminology changes

**Resources:**
- [Domain Storytelling Website](https://domainstorytelling.org/)
- [Online Domain Storytelling Tool](https://egon.io/)

### 3. Context Mapping Workshop

A workshop focused specifically on mapping relationships:

1. **List all known contexts** on sticky notes
2. **Arrange contexts** spatially based on relevance
3. **Draw connections** between related contexts
4. **Label relationships** with context mapping patterns
5. **Identify integration challenges** at boundaries
6. **Discover missing contexts** through the process

### 4. Domain Message Flow Modeling

This technique focuses on the messages that flow between contexts:

1. **Identify key business processes** that span multiple contexts
2. **List the sequence of messages** that flow between contexts
3. **Specify the content** of each message
4. **Validate translations** at context boundaries
5. **Look for process inefficiencies** and coupling issues

## Strategic Design in Practice

### Common Pitfalls

1. **Too many bounded contexts** - Creates excessive integration overhead
2. **Too few bounded contexts** - Results in a "big ball of mud"
3. **Ignoring team boundaries** - Organizational structure influences effective boundaries
4. **Overemphasizing technical concerns** - Business concepts should drive boundaries
5. **Neglecting core domain** - Failing to identify and invest in what matters most

### Signs of Success

1. **Team autonomy** - Teams can work independently within their contexts
2. **Clear translations** - Boundary crossing points have explicit translations
3. **Evolving core domain** - Core domain continuously improves with business focus
4. **Stable interfaces** - Context relationships remain stable even as implementations change
5. **Reduced coordination overhead** - Less need for cross-team synchronization

## Summary and Next Steps

Strategic design helps you organize your system according to business realities, set boundaries, and prioritize investments. To get started:

1. **Identify bounded contexts** in your system
2. **Map the relationships** between them
3. **Classify domains** as core, supporting, or generic
4. **Set appropriate investment levels** for each area
5. **Implement bounded contexts** with clear boundaries

Next, learn about [Tactical Design](./tactical-design.md) to implement the patterns within each bounded context, turning strategic insights into code.

## Recommended Resources

- **Books:**
    - "Domain-Driven Design" by Eric Evans
    - "Strategic Monoliths and Microservices" by Vaughn Vernon

- **Tools:**
    - [Miro](https://miro.com/) for collaborative modeling
    - [EventStorming.com](https://www.eventstorming.com/) for event storming resources
    - [Context Mapper](https://contextmapper.org/) for DSL-based context mapping

- **Communities:**
    - [DDD Community on Discord](https://discord.gg/eQ8TcAM)
    - [DDD-CQRS-ES Slack](https://ddd-cqrs-es.slack.com/)
