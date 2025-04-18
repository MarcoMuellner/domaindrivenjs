# Ubiquitous Language

Imagine a software project where developers talk about "users" but business people refer to "customers," where engineers discuss "processing fees" while the finance team speaks of "transaction costs." In such an environment, miscommunication becomes inevitable, requirements get lost in translation, and the software gradually drifts away from solving real business problems.

This is where ubiquitous language comes to the rescue.

## What is Ubiquitous Language?

Ubiquitous language is a shared vocabulary that is consistently used by **both domain experts and technical team members** across all forms of communication: conversations, documentation, diagrams, and most importantly—in the code itself.

::: tip Real-world Analogy
Imagine building a house where the architect calls it a "living room," the builder calls it a "main hall," the electrician calls it a "front space," and the interior designer calls it a "primary area." Confusion would be inevitable, measurements would be misunderstood, and features would be implemented incorrectly. In contrast, when everyone uses the same term—"living room"—communication becomes clear and efficient. Similarly, ubiquitous language ensures that everyone on a software project uses the same terms for the same concepts, eliminating confusion and misalignment between how the business thinks and how the software is built.
:::

<!-- DIAGRAM: Visual showing how ubiquitous language bridges between domain experts, developers, documentation, and code, with the same terms flowing through all elements -->

It's called "ubiquitous" because it appears everywhere in your project:

- In **conversations** between team members
- In **documentation** and requirements
- In **diagrams** and visual models
- In **code** (class names, method names, variables)
- In **tests** that verify behavior
- In **user interfaces** presented to users

## Why Ubiquitous Language Transforms Projects

### 1. Eliminating Translation Layers

Without a shared language, each conversation requires translation:


> Domain Expert: "When a member reserves a book, we need to put it on hold for 48 hours."

>Developer's mental translation: "When a [user] [requests] a [product], we need to [flag it as unavailable] for [2 days]."


Code result:
```javascript
User.requestProduct(productId, dayCount);
```

With each translation, meaning is lost or distorted, like a game of telephone. Ubiquitous language eliminates these translation layers:

> Domain Expert: "When a member reserves a book, we need to put it on hold for 48 hours."

>Developer: "Got it, members can reserve books with a 48-hour hold period."

Code result:
```javascript
Member.reserveBook(bookId, HoldPeriod.hours(48));
```

### 2. Surfacing Hidden Concepts

By paying careful attention to language, you often discover important domain concepts that might otherwise remain hidden:


Without ubiquitous language:
> "The system should check if users can access content."

With ubiquitous language:
> The system should verify that members have an active subscription to access premium content."

The second statement reveals several important concepts: membership status, subscription, and content categorization.

### 3. Creating a Living Glossary

Ubiquitous language creates a common reference point:

| Term | Definition | Usage Context |
|------|------------|---------------|
| Member | A person with an account in the system | Replaces generic "user" term |
| Reserve | Request a book be set aside for later pickup | Distinct from "borrow" which means taking possession |
| Hold Period | Time a reserved book is kept before being released back to available status | Standard is 48 hours |

## Building a Ubiquitous Language

Creating a shared language doesn't happen automatically. It requires deliberate effort and ongoing refinement.

### 1. Listen to Domain Experts

Start by listening to how experts naturally talk about their domain:

- What **nouns** do they use repeatedly? (These often become entities or value objects)
- What **verbs** describe important actions? (These often become methods or services)
- What **adjectives** or **states** do they mention? (These might be properties or states)
- What **rules or constraints** do they emphasize? (These become validations or invariants)

Pay close attention to:
- **Specialized terminology** and jargon
- **Distinctions** they make that might seem subtle to outsiders
- **Categories** they use to organize concepts
- **Processes** they describe as having specific steps or stages

### 2. Experiment with the Language

Once you've collected terms, work together to refine them:

> Domain Expert: "We have regular riders and premium riders."

> Developer: "So we have two types of users with different privileges?"

> Domain Expert: "No, they're all members. But some have basic plans and others have premium subscriptions."

> Developer: "I see, so we have members with different subscription plans."


Through this dialogue, you've refined the terms from "regular/premium riders" to "members with basic/premium subscription plans."

### 3. Document the Language

Create a living glossary that evolves as your understanding deepens:

```markdown
# Project Glossary

## Core Concepts

### Member
A person who has signed up for our service.

### Subscription Plan
The level of service a member has paid for.
- **Basic Plan**: Allows weekday rides only
- **Premium Plan**: Allows unlimited rides

### Ride
A single journey from pickup to destination.

### Fare
The amount charged for a ride based on distance, time, and subscription plan.
```

Make this glossary accessible to everyone and treat it as a living document.

### 4. Embed the Language in Code

The most important step is making the language live in your code:

```javascript
// WITHOUT ubiquitous language
class User {
  requestRide(startLocation, endLocation, paymentMethod) {
    // Implementation...
  }
}

// WITH ubiquitous language
class Member {
  bookRide(pickupLocation, destination, farePaymentMethod) {
    // Implementation using domain concepts directly
  }
}
```

With DomainDrivenJS, you can express the language directly in your domain model:

```javascript
import { z } from 'zod';
import { entity, valueObject } from 'domaindrivenjs';

// Value objects using domain language
const SubscriptionPlan = valueObject({
  name: 'SubscriptionPlan',
  schema: z.enum(['BASIC', 'PREMIUM']),
  methods: {
    allowsWeekendRides() {
      return this === 'PREMIUM';
    }
  }
});

// Entity using domain language
const Member = entity({
  name: 'Member',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    subscriptionPlan: SubscriptionPlan.schema,
    activeUntil: z.date()
  }),
  identity: 'id',
  methods: {
    canBookRide(rideDateTime) {
      const isWeekend = rideDateTime.getDay() === 0 || rideDateTime.getDay() === 6;
      const hasActiveSubscription = new Date() < this.activeUntil;
      
      if (!hasActiveSubscription) return false;
      if (isWeekend && !this.subscriptionPlan.allowsWeekendRides()) return false;
      
      return true;
    },
    
    upgradeToPremium() {
      return Member.update(this, { 
        subscriptionPlan: SubscriptionPlan.create('PREMIUM') 
      });
    }
  }
});
```

## Evolving the Language

Ubiquitous language isn't static—it evolves as your understanding of the domain deepens:

### 1. Recognize Evolution Signals

Watch for signs that the language needs to change:

- **Awkward workarounds** in code to express concepts
- **Confusion** in discussions about certain terms
- **Repeated explanations** needed for the same concepts
- **New distinctions** emerging in the domain
- **Inconsistent usage** of terms across the team

### 2. Refine Through Dialogue

When the language needs to evolve, engage domain experts:

> Developer: "We're modeling 'ride cancellations,' but our code feels awkward because we're handling so many special cases."

> Domain Expert: "That's because we distinguish between 'member cancellations,' which might incur a fee, and 'system cancellations' due to driver issues, which don't have a fee."

> Developer: "I see! So we have different types of cancellations with different rules."

### 3. Refactor Code to Reflect New Understanding

Once the language evolves, update your code to match:

```javascript
// BEFORE: Single cancellation concept
class Ride {
  cancel(reason, cancellationTime) {
    if (reason === 'member-request') {
      // Check time and possibly apply fee
    } else if (reason === 'driver-unavailable') {
      // No fee
    }
    // etc.
  }
}

// AFTER: Explicit cancellation types
class Ride {
  memberCancellation(cancellationTime) {
    // Apply cancellation rules for members
    return new CancellationFee(this, cancellationTime);
  }
  
  systemCancellation(reason) {
    // Log reason, no fee
    return null;
  }
}
```

## Common Pitfalls and Solutions

### 1. Technical Concepts Leaking Into the Language

**Problem**: Implementation details become part of what's supposed to be the domain language.

```
// Domain contaminated with technical details
"We need to serialize the customer entity, update the customer record in the database, then invalidate the cache."
```

**Solution**: Maintain a strict separation between domain concepts and technical implementation:

```
// Domain language free of implementation details
"We need to update the customer's address and notify them of the change."
```

### 2. Multiple Meanings for the Same Term

**Problem**: The same term means different things in different contexts.

```
"Account" could mean:
- A user account (authentication)
- A financial account (banking)
- An account with a supplier (purchasing) 
```

**Solution**:

1. **Qualify the terms** with context: "UserAccount" vs. "FinancialAccount"
2. Or better, **separate into different bounded contexts**, each with its own language

### 3. Ambiguous or Vague Terminology

**Problem**: Terms that lack precise definitions lead to confusion.

```
"The system should handle bad orders."
What does "bad" mean? Invalid? Cancelled? Suspicious?
```

**Solution**: Press for specificity and clear definitions:

```
"The system should identify fraudulent orders based on our risk assessment criteria."
```

### 4. Resistance to Domain Terminology

**Problem**: Developers resist using domain terms that seem "strange" to them.

**Solution**:
- Explain how using domain terminology reduces misunderstandings
- Start with the most important or most frequently used terms
- Create a glossary as reference
- Lead by example in code reviews

## Practical Techniques

### 1. Event Storming for Language Discovery

Event storming is a collaborative modeling technique that can uncover domain language:

1. Gather diverse stakeholders in a room
2. Use orange sticky notes to identify domain events (things that happen)
3. For each event, identify commands (blue) that triggered it
4. Identify entities (yellow) that handle commands and emit events
5. Look for consistent terminology and capture it

### 2. Glossary Workshops

Dedicate sessions specifically to building a shared glossary:

1. Begin with terms everyone already agrees on
2. Add terms where there's confusion or inconsistency
3. Discuss until reaching consensus on definitions
4. Document the outcome
5. Review and refine periodically

### 3. "Language Police" Role Rotation

Take turns having someone serve as the "language consistency checker":

1. Assign the role on a rotating basis
2. When inconsistent terminology appears, they politely point it out
3. The team discusses and agrees on the correct term
4. Update the glossary if needed

### 4. Code Review for Language Consistency

Add ubiquitous language checks to your code review process:

- Do class, method, and variable names reflect the domain language?
- Do tests use the same terminology as the code and domain experts?
- Could a domain expert understand the high-level code structure?

## Implementing with DomainDrivenJS

DomainDrivenJS supports ubiquitous language through its design:

### 1. Explicit Naming

```javascript
// Value objects named after domain concepts
const ReservationStatus = valueObject({
  name: 'ReservationStatus', // Explicit name matching domain
  schema: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  methods: {
    canBeModified() {
      return this === 'PENDING';
    }
  }
});
```

### 2. Behavior Reflecting Domain Rules

```javascript
// Methods named using domain verbs
const Reservation = entity({
  // ...
  methods: {
    confirm() {
      if (this.status !== 'PENDING') {
        throw new Error('Only pending reservations can be confirmed');
      }
      return Reservation.update(this, { status: 'CONFIRMED' });
    },
    
    cancel() {
      if (this.status === 'CANCELLED') {
        throw new Error('Reservation is already cancelled');
      }
      return Reservation.update(this, { status: 'CANCELLED' });
    }
  }
});
```

### 3. Domain Events Using Domain Language

```javascript
const ReservationConfirmed = domainEvent({
  name: 'ReservationConfirmed', // Event name from domain
  schema: z.object({
    reservationId: z.string().uuid(),
    confirmedAt: z.date(),
    // Other relevant details
  })
});
```

## Real-World Example: Library Domain

Let's look at a more complete example of how ubiquitous language shapes code in a library domain:

### Domain Glossary (Extract)

| Term | Definition |
|------|------------|
| Patron | A person registered with the library |
| Item | Any material that can be borrowed (book, DVD, etc.) |
| Checkout | The process of a patron borrowing an item |
| Due Date | The date by which an item must be returned |
| Hold | A request to reserve an item that is currently checked out |
| Overdue | Status of an item not returned by its due date |
| Fine | Monetary penalty for overdue items |

### Code Using This Language

```javascript
import { z } from 'zod';
import { entity, valueObject, aggregate } from 'domaindrivenjs';

// Value Objects
const LibraryCardNumber = valueObject({
  name: 'LibraryCardNumber',
  schema: z.string().regex(/^LIB-\d{6}$/),
  methods: {
    isExpired(currentDate) {
      const year = parseInt(this.substring(4, 6));
      const currentYear = currentDate.getFullYear() % 100;
      return year < currentYear;
    }
  }
});

const ISBN = valueObject({
  name: 'ISBN',
  schema: z.string().regex(/^978-\d{10}$/),
  methods: {
    getPublisherCode() {
      return this.split('-')[1].substring(0, 4);
    }
  }
});

// Entities
const Patron = entity({
  name: 'Patron',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    cardNumber: LibraryCardNumber.schema,
    status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
    fines: z.number().default(0)
  }),
  identity: 'id',
  methods: {
    canCheckout() {
      return this.status === 'ACTIVE' && this.fines < 10;
    },
    
    assessFine(amount) {
      return Patron.update(this, { 
        fines: this.fines + amount 
      });
    },
    
    payFines(amount) {
      if (amount > this.fines) {
        throw new Error('Payment amount exceeds fines due');
      }
      return Patron.update(this, { 
        fines: this.fines - amount 
      });
    }
  }
});

// Aggregates
const Checkout = aggregate({
  name: 'Checkout',
  schema: z.object({
    id: z.string().uuid(),
    patronId: z.string().uuid(),
    itemId: z.string().uuid(),
    checkedOutAt: z.date(),
    dueDate: z.date(),
    returnedAt: z.date().optional(),
    status: z.enum(['CHECKED_OUT', 'RETURNED', 'OVERDUE', 'LOST'])
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Due date must be after checkout date',
      check: checkout => checkout.dueDate > checkout.checkedOutAt
    }
  ],
  methods: {
    isOverdue(currentDate) {
      return this.status === 'CHECKED_OUT' && 
             currentDate > this.dueDate;
    },
    
    markReturned() {
      if (this.status === 'RETURNED') {
        throw new Error('Item already returned');
      }
      
      return Checkout.update(this, {
        returnedAt: new Date(),
        status: 'RETURNED'
      }).emitEvent('ItemReturned', {
        checkoutId: this.id,
        itemId: this.itemId,
        returnedAt: new Date()
      });
    },
    
    markOverdue() {
      if (this.status !== 'CHECKED_OUT') {
        throw new Error('Only checked out items can be marked overdue');
      }
      
      return Checkout.update(this, {
        status: 'OVERDUE'
      }).emitEvent('ItemOverdue', {
        checkoutId: this.id,
        itemId: this.itemId,
        patronId: this.patronId,
        daysOverdue: Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24))
      });
    }
  }
});
```

Notice how the code directly reflects the domain language from the glossary. A domain expert could read class and method names and recognize their own terminology.

## Conclusion

Ubiquitous language is more than just a glossary of terms—it's a shared understanding embedded in every aspect of your project. By consciously developing and maintaining this language, you create a powerful bridge between domain expertise and technical implementation.

Remember these key principles:

1. **Listen** to domain experts and how they naturally describe their work
2. **Document** terms and definitions in a living glossary
3. **Use** the language consistently in all communication
4. **Embed** the language directly in your code
5. **Evolve** the language as your understanding deepens

Building a ubiquitous language takes time and effort, but it pays enormous dividends in reduced misunderstandings, more accurate implementations, and software that truly solves business problems.

## Next Steps

Now that you understand ubiquitous language, explore how to organize your domain model using:
- [Strategic Design](./strategic-design.md) for the big picture of your system
- [Tactical Design](./tactical-design.md) for implementing the details
